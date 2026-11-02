const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const C=require('../portfolio-core.js');
const G=fs.existsSync('github-publish.js')?require('../github-publish.js'):{};
const context={window:{}};
vm.runInNewContext(fs.readFileSync('content.js','utf8'),context);
const base=()=>C.clone(context.window.PORTFOLIO);
const token='github_pat_TEST_ONLY_DO_NOT_USE';
const sha='a'.repeat(40),nextSha='b'.repeat(40),commit='c'.repeat(40);
const response=(status,data)=>({ok:status>=200&&status<300,status,json:async()=>data});
function server(){
 const s={data:base(),sha,calls:[],writes:0,failPut:0,race:false};
 s.fetch=async(url,options={})=>{
  s.calls.push({url,options});
  assert.match(url,/^https:\/\/api\.github\.com\//);
  assert.equal(options.credentials,'omit');assert.equal(options.redirect,'error');
  if(url.endsWith('/user'))return response(200,{login:'M-qiangZhu'});
  assert.match(url,/\/repos\/M-qiangZhu\/M-qiangZhu.github.io\/contents\/content.js/);
  if(options.method==='PUT'){
   if(s.failPut-- >0)throw new Error('network details must not be echoed '+token);
   if(s.race)return response(409,{message:'conflict'});
   const body=JSON.parse(options.body);assert.equal(body.branch,'main');
   assert.equal(body.sha,s.sha);
   s.data=C.parseImport(Buffer.from(body.content,'base64').toString('utf8'));
   s.sha=nextSha;s.writes++;
   if(s.loseResponse){s.loseResponse=false;throw new Error('response lost after commit');}
   return response(200,{content:{sha:nextSha},commit:{sha:commit}});
  }
  return response(200,{encoding:'base64',sha:s.sha,content:Buffer.from(C.serialize(s.data)).toString('base64')});
 };
 return s;
}
test('publishes bilingual data as UTF-8 to the fixed file using the observed SHA',async()=>{
 assert.equal(typeof G.createClient,'function');
 const s=server(),client=G.createClient(s.fetch);await client.connect(token);
 const changed=base();changed.profile.zh.name='朱明强 · 在线资料';
 const result=await client.publish(changed,sha);
 assert.equal(s.data.profile.zh.name,changed.profile.zh.name);
 assert.equal(s.writes,1);assert.equal(result.sha,nextSha);assert.equal(result.commit,commit);
 assert.ok(s.calls.every(c=>c.options.headers.Authorization==='Bearer '+token));
 assert.ok(!JSON.stringify(client).includes(token));
 client.disconnect();await assert.rejects(()=>client.read(),e=>e.code==='auth');
});
test('unchanged data is not committed again, including a retry after a lost response',async()=>{
 const s=server(),client=G.createClient(s.fetch);await client.connect(token);
 assert.equal((await client.publish(base(),sha)).unchanged,true);assert.equal(s.writes,0);
 const changed=base();changed.profile.zh.summary+=' 更新';
 await client.publish(changed,sha);
 assert.equal((await client.publish(changed,sha)).unchanged,true);assert.equal(s.writes,1);
});
test('detects a newer remote before writing and also handles a race during the PUT',async()=>{
 const s=server(),client=G.createClient(s.fetch);await client.connect(token);
 const changed=base();changed.profile.en.name='Changed';s.sha=nextSha;
 await assert.rejects(()=>client.publish(changed,sha),e=>e.code==='conflict'&&e.remote.sha===nextSha);
 assert.equal(s.writes,0);s.sha=sha;s.race=true;
 await assert.rejects(()=>client.publish(changed,sha),e=>e.code==='conflict');
 assert.equal(s.writes,0);
});
test('network failure keeps the baseline retryable and does not expose credentials',async()=>{
 const s=server(),client=G.createClient(s.fetch);await client.connect(token);
 const changed=base();changed.profile.en.name='Changed';s.failPut=1;
 await assert.rejects(()=>client.publish(changed,sha),e=>e.code==='network'&&!e.message.includes(token));
 assert.equal((await client.publish(changed,sha)).sha,nextSha);assert.equal(s.writes,1);
});
test('a lost response after GitHub commits is recovered without a duplicate commit',async()=>{
 const s=server(),client=G.createClient(s.fetch);await client.connect(token);
 const changed=base();changed.profile.en.name='Already committed';s.loseResponse=true;
 await assert.rejects(()=>client.publish(changed,sha),e=>e.code==='network');
 assert.equal(s.writes,1);assert.equal(s.sha,nextSha);
 const recovered=await client.publish(changed,sha);
 assert.equal(recovered.unchanged,true);assert.equal(recovered.sha,nextSha);assert.equal(s.writes,1);
});
test('rejects passwords, invalid authentication, wrong account and insufficient write permission',async()=>{
 const s=server(),client=G.createClient(s.fetch);
 await assert.rejects(()=>client.connect('a-password'),e=>e.code==='token');assert.equal(s.calls.length,0);
 for(const status of [401,403]){
  const denied=G.createClient(async()=>response(status,{message:token}));
  await assert.rejects(()=>denied.connect(token),e=>!e.message.includes(token));
 }
 const wrong=G.createClient(async()=>response(200,{login:'someone-else'}));
 await assert.rejects(()=>wrong.connect(token),e=>e.code==='account');
 const readonly=G.createClient((u,o)=>o.method==='PUT'?Promise.resolve(response(403,{message:token})):s.fetch(u,o));
 await readonly.connect(token);const changed=base();changed.profile.en.name='Changed';
 await assert.rejects(()=>readonly.publish(changed,sha),e=>e.code==='permission');
});
test('validates data before any write and rejects malformed remote files',async()=>{
 const s=server(),client=G.createClient(s.fetch);await client.connect(token);
 const invalid=base();invalid.papers[0].authors=[];
 await assert.rejects(()=>client.publish(invalid,sha));assert.equal(s.writes,0);
 const broken=G.createClient(async u=>u.endsWith('/user')?response(200,{login:'M-qiangZhu'}):response(200,{sha,encoding:'base64',content:btoa('alert(1)')}));
 await assert.rejects(()=>broken.connect(token),e=>e.code==='data');
});
test('rejects oversized profiles before any request so the result stays readable by GitHub',async()=>{
 const s=server(),client=G.createClient(s.fetch);await client.connect(token);
 const changed=base();changed.profile.zh.summary='大'.repeat(350000);
 const before=s.calls.length;
 await assert.rejects(()=>client.publish(changed,sha),e=>e.code==='data'&&/1 MB/.test(e.message));
 assert.equal(s.calls.length,before);assert.equal(s.writes,0);
});
test('restored drafts require conflict resolution when their baseline is missing or changed',()=>{
 const local=base(),remote=base();local.profile.en.name='local';remote.profile.en.name='remote';
 assert.equal(G.reconcile(local,base(),{data:remote,sha}).conflict,true);
 assert.equal(G.reconcile(local,null,{data:base(),sha}).conflict,true);
 assert.equal(G.reconcile(base(),base(),{data:remote,sha}).loadRemote,true);
 assert.equal(G.reconcile(local,base(),{data:base(),sha}).conflict,false);
 assert.equal(G.reconcile(local,null,{data:local,sha}).conflict,false);
});
test('checks actual public file bytes without sending authentication',async()=>{
 const text=C.serialize(base());const {createHash}=require('node:crypto');
 const expected=createHash('sha1').update('blob '+Buffer.byteLength(text)+'\0'+text).digest('hex');
 const fetch=async(url,options)=>{
  assert.match(url,/^https:\/\/m-qiangzhu.github.io\/content.js\?/);
  assert.equal(options.credentials,'omit');assert.ok(!options.headers?.Authorization);
  return {ok:true,text:async()=>text};
 };
 assert.equal(await G.checkPublished(expected,fetch),true);
 assert.equal(await G.checkPublished(sha,fetch),false);
});
