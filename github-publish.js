/* GitHub Pages publishing: fixed repository, per-tab credentials, no dependencies. */
(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory(require('./portfolio-core.js'));
 else root.GitHubPublish=factory(root.PortfolioCore);
})(typeof globalThis!=='undefined'?globalThis:this,function(C){
 'use strict';
 const REPO='M-qiangZhu/M-qiangZhu.github.io';
 const API='https://api.github.com/repos/'+REPO+'/contents/content.js';
 const PUBLIC='https://m-qiangzhu.github.io/content.js';
 function error(code,message,remote){return Object.assign(new Error(message),{code,remote});}
 const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])])):value;
 const equal=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
 function reconcile(local,baseline,remote){
  if(equal(local,remote.data))return {conflict:false,loadRemote:false};
  if(baseline&&equal(local,baseline))return {conflict:false,loadRemote:true};
  return {conflict:!baseline||!equal(baseline,remote.data),loadRemote:false};
 }
 function encode(text){
  const bytes=new TextEncoder().encode(text);let binary='';
  // The base64 Contents API only serves files up to 1 MB. Keep every write readable.
  if(bytes.length>1000000)throw error('data','在线发布资料不能超过 1 MB，请精简较长的文字后再发布。');
  for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
  return btoa(binary);
 }
 const isSHA=sha=>/^[a-f0-9]{40}$/.test(sha||'');
 function createClient(fetcher=globalThis.fetch.bind(globalThis)){
  let token='';
  async function request(url,options={}){
   if(!token)throw error('auth','请先连接 GitHub。');
   let response;
   try{response=await fetcher(url,{...options,credentials:'omit',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(20000),headers:{Accept:'application/vnd.github+json',Authorization:'Bearer '+token,'X-GitHub-Api-Version':'2022-11-28',...(options.method==='PUT'?{'Content-Type':'application/json'}:{})}});}
   catch{throw error('network','无法连接 GitHub，或请求超时。草稿已保留；请检查网络后重试。若上次已提交，重试不会重复提交相同资料。');}
   if(!response.ok){
    if(response.status===401)throw error('auth','令牌无效或已过期，请重新连接 GitHub。');
    if(response.status===403)throw error('permission','GitHub 拒绝访问。请确认令牌仅选中了此仓库，并授予 Contents 的 Read and write 权限；若达到请求限额，请稍后重试。');
    if(response.status===409||response.status===422)throw error('conflict','GitHub 版本已变化，或提交被分支规则拒绝。请载入最新版本后检查；若仍失败，请查看仓库分支规则。');
    if(response.status===404)throw error('permission','无法访问主页仓库或资料文件，请检查令牌授权的仓库。');
    throw error('api','GitHub 暂时无法完成请求（'+response.status+'），请稍后重试。');
   }
   try{return await response.json();}catch{throw error('data','GitHub 返回的内容无法读取，请稍后重试。');}
  }
  async function read(){
   const file=await request(API+'?ref=main');
   try{
    if(file.encoding!=='base64'||!isSHA(file.sha)||typeof file.content!=='string'||file.content.length>2800000)throw new Error();
    const bytes=Uint8Array.from(atob(file.content.replace(/\s/g,'')),c=>c.charCodeAt(0));
    return {sha:file.sha,data:C.parseImport(new TextDecoder('utf-8',{fatal:true}).decode(bytes))};
   }catch{throw error('data','远端 content.js 格式不符合本站资料规范，当前草稿未改变。');}
  }
  async function connect(value){
   token='';
   if(!/^github_pat_[A-Za-z0-9_]{10,}$/.test(value.trim()))throw error('token','请填写以 github_pat_ 开头的细粒度访问令牌，不要填写 GitHub 密码。');
   token=value.trim();
   try{
    const user=await request('https://api.github.com/user');
    if(String(user.login).toLowerCase()!=='m-qiangzhu')throw error('account','请使用 M-qiangZhu 账号创建的令牌连接此主页。');
    return await read();
   }catch(e){token='';throw e;}
  }
  async function publish(data,expectedSHA){
   const text=C.serialize(data),content=encode(text);
   const remote=await read();
   // Check equality first: safe recovery when a successful PUT response was lost.
   if(equal(data,remote.data))return {unchanged:true,sha:remote.sha,remote};
   if(!isSHA(expectedSHA)||remote.sha!==expectedSHA)throw error('conflict','GitHub 上已有更新，请先处理版本差异。',remote);
   const result=await request(API,{method:'PUT',body:JSON.stringify({message:'Update profile from online editor',branch:'main',sha:remote.sha,content})});
   if(!isSHA(result.content?.sha)||!isSHA(result.commit?.sha))throw error('network','GitHub 可能已保存，但未返回完整结果。请重试检查；相同资料不会重复提交。');
   return {unchanged:false,sha:result.content.sha,commit:result.commit.sha,remote:{sha:result.content.sha,data:C.clone(data)}};
  }
  return {connect,read,publish,disconnect(){token='';}};
 }
 async function checkPublished(expectedSHA,fetcher=globalThis.fetch.bind(globalThis)){
  if(!isSHA(expectedSHA))throw error('data','无法检查无效的发布版本。');
  const response=await fetcher(PUBLIC+'?published='+expectedSHA+'&t='+Date.now(),{cache:'no-store',credentials:'omit',redirect:'error',signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw error('network','公开网站暂时无法访问。');
  const text=await response.text(),bytes=new TextEncoder().encode(text);
  if(bytes.length>2000000)throw error('data','公开资料文件过大。');
  const header=new TextEncoder().encode('blob '+bytes.length+'\0'),blob=new Uint8Array(header.length+bytes.length);
  blob.set(header);blob.set(bytes,header.length);
  const digest=await crypto.subtle.digest('SHA-1',blob);
  return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('')===expectedSHA;
 }
 return {createClient,reconcile,equal,checkPublished,REPO};
});
