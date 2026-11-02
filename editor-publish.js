/* Publishing controls are separate from the form and its local draft. */
(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory(require('./portfolio-core.js'),require('./github-publish.js'));
 else root.GitHubEditor=factory(root.PortfolioCore,root.GitHubPublish);
})(typeof globalThis!=='undefined'?globalThis:this,function(C,G){
 'use strict';
 function mount(options){
  const doc=options.document||document,$=id=>doc.querySelector('#'+id);
  const client=options.client||G.createClient(),confirmChoice=options.confirm||globalThis.confirm.bind(globalThis);
  const schedule=options.schedule||setTimeout,cancel=options.cancel||clearTimeout,checkPublished=options.checkPublished||G.checkPublished;
  let connected=false,busy=false,remote=null,conflict=null,publication=null,timer=null,generation=0,phase='idle';
  const initial=options.initialPublication;
  if(initial&&/^[a-f0-9]{40}$/.test(initial.sha)&&initial.data&&!C.validate(initial.data).length){
   publication={sha:initial.sha,data:C.clone(initial.data),live:false};
   if(/^[a-f0-9]{40}$/.test(initial.commit||''))publication.commit=initial.commit;
  }
  function say(message,tone=''){ $('publish-status').textContent=message;$('publish-status').dataset.tone=tone; }
  function sync(){
   $('github-connect-form').hidden=connected;$('token-setup').hidden=connected;
   $('github-account').textContent=connected?'已连接 M-qiangZhu · 仅本标签页':'尚未连接 GitHub';
   $('github-connect').disabled=busy;$('github-token').disabled=busy;
   $('github-disconnect').hidden=!connected;$('github-disconnect').disabled=busy;
   $('publish-online').disabled=!connected||busy||!!conflict;
   $('publish-online').textContent=busy&&phase==='saving'?'正在保存…':'保存并发布';
   $('load-remote').disabled=!connected||busy;
   $('remote-conflict').hidden=!conflict;
   $('use-remote').disabled=busy;$('keep-local').disabled=busy;
   $('check-publication').hidden=!publication;$('check-publication').disabled=busy;
   $('published-commit').hidden=!publication?.commit;
   if(publication?.commit)$('published-commit').href='https://github.com/'+G.REPO+'/commit/'+publication.commit;
  }
  function stopMonitor(){generation++;if(timer!==null)cancel(timer);timer=null;}
  function publicationText(){
   if(!publication)return '';
   return (publication.live?'已上线：本次保存的资料已在公开网站生效。':'资料已保存到 GitHub，正在等待 Pages 更新。')+(!G.equal(options.getState(),publication.data)?'\n当前草稿仍有未发布修改，需再次点击“保存并发布”。':'');
  }
  function notifyDraftChanged(){
   if((phase==='pending'||phase==='live')&&publication)say(publicationText(),publication.live?'success':'');
   else if(phase==='idle'&&connected&&remote)say(G.equal(options.getState(),remote.data)?'当前资料与 GitHub 一致。':'当前草稿有未发布修改，检查后点击“保存并发布”。');
  }
  async function monitor(){
   if(!publication)return;stopMonitor();const ticket=generation,target=publication.sha;let tries=0;
   phase='pending';say(publicationText());sync();
   async function check(){
    let live=false,unreachable=false;
    try{live=await checkPublished(target);}catch{unreachable=true;}
    if(ticket!==generation||publication?.sha!==target)return;
    if(live){publication.live=true;phase='live';say(publicationText(),'success');options.saveDraft();return;}
    if(++tries>=38){phase='pending';say('资料已保存到 GitHub，但尚未确认公开网站更新。可点击“重新检查上线状态”，或查看部署记录。'+(!G.equal(options.getState(),publication.data)?'\n当前草稿仍有未发布修改。':''));return;}
    say(publicationText()+(unreachable?'\n暂时无法检查公开网站，会继续重试。':''));
    timer=schedule(check,8000);
   }
   await check();
  }
  function adopt(latest,replace){
   remote=latest;conflict=null;options.onRemote(latest,replace);options.saveDraft();sync();
  }
  function reconcile(latest){
   remote=latest;const result=G.reconcile(options.getState(),options.getBaseline(),latest);
   if(result.conflict){
    conflict=latest;phase='conflict';
    const names={profile:'基本信息',experience:'工作经历',expertise:'技术能力',projects:'项目经历',papers:'学术论文',patents:'专利申请',credentials:'专业认证'};
    const changed=Object.keys(names).filter(k=>!G.equal(options.getState()[k],latest.data[k])).map(k=>names[k]);
    $('conflict-message').textContent='GitHub 最新资料与当前草稿的基准不同，已暂停发布。差异栏目：'+changed.join('、')+'。请选择保留哪一份。';
    say('发现版本差异，请先在下方处理。');sync();return;
   }
   adopt(latest,result.loadRemote);phase='idle';notifyDraftChanged();
  }
  function fail(e){
   phase='error';say(e.message||'操作未完成，草稿已保留。','error');
   if(e.code==='auth'){client.disconnect();connected=false;}
   sync();
  }
  $('github-connect-form').addEventListener('submit',async event=>{
   event.preventDefault();if(busy)return;
   let value=$('github-token').value;$('github-token').value='';busy=true;phase='connecting';stopMonitor();say('正在连接 GitHub，并读取最新资料…');sync();
   try{const latest=await client.connect(value);value='';connected=true;reconcile(latest);}
   catch(e){value='';connected=false;fail(e);}
   finally{busy=false;sync();}
  });
  $('publish-online').addEventListener('click',async()=>{
   if(!connected||busy||conflict||!options.valid())return;
   const submitted=C.clone(options.getState());busy=true;phase='saving';stopMonitor();say('正在检查 GitHub 版本并保存…');sync();options.saveDraft();
   let succeeded=false;
   try{
    const result=await client.publish(submitted,remote?.sha);
    publication={sha:result.sha,data:C.clone(submitted),live:false,...(result.commit?{commit:result.commit}:{})};
    adopt(result.remote,false);options.saveDraft();succeeded=true;
   }catch(e){
    if(e.code==='conflict'){
     try{const latest=e.remote||await client.read();reconcile(latest);if(!conflict)say(e.message+' 请检查后重试。','error');}
     catch(readError){fail(readError);}
    }else fail(e);
   }finally{busy=false;sync();}
   if(succeeded)await monitor();
  });
  $('load-remote').addEventListener('click',async()=>{
   if(!connected||busy)return;busy=true;stopMonitor();say('正在读取 GitHub 最新资料…');sync();
   try{
    const latest=await client.read();
    if(!G.equal(options.getState(),latest.data)&&!confirmChoice('用 GitHub 最新资料替换当前草稿？当前内容可通过“撤销操作”找回。')){phase='idle';notifyDraftChanged();return;}
    adopt(latest,true);phase='idle';say('已载入 GitHub 最新资料。');
   }catch(e){fail(e);}finally{busy=false;sync();}
  });
  $('use-remote').addEventListener('click',()=>{if(!conflict||busy)return;adopt(conflict,true);phase='idle';say('已载入 GitHub 最新资料，原草稿可通过“撤销操作”找回。');});
  $('keep-local').addEventListener('click',()=>{
   if(!conflict||busy||!confirmChoice('保留当前整份草稿，并在下一次发布时替换 GitHub 最新资料？远端独有的修改不会自动合并，请先检查或备份。'))return;
   adopt(conflict,false);phase='idle';say('已保留当前草稿。检查后点击“保存并发布”，将替换刚才看到的 GitHub 版本。');
  });
  function disconnect(){client.disconnect();connected=false;conflict=null;remote=null;$('github-token').value='';sync();}
  $('github-disconnect').addEventListener('click',()=>{if(busy)return;disconnect();phase='idle';stopMonitor();say('已断开 GitHub。浏览器草稿仍保留，下次发布请重新连接。');});
  $('check-publication').addEventListener('click',()=>{if(!busy)return monitor();});
  if(typeof window!=='undefined')window.addEventListener('pagehide',()=>{stopMonitor();disconnect();});
  sync();if(publication)void monitor();
  return {getPublication:()=>publication,notifyDraftChanged,disconnect};
 }
 return {mount};
});
