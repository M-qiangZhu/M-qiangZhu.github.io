const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const C=require('../portfolio-core.js');
const UI=fs.existsSync('editor-publish.js')?require('../editor-publish.js'):{};
const context={window:{}};vm.runInNewContext(fs.readFileSync('content.js','utf8'),context);
const base=()=>C.clone(context.window.PORTFOLIO),sha='a'.repeat(40),next='b'.repeat(40);
function setup(){
 const elements={};const doc={querySelector(selector){return elements[selector]||=( {hidden:false,disabled:false,value:'',dataset:{},textContent:'',listeners:{},addEventListener(type,fn){this.listeners[type]=fn;},focus(){},scrollIntoView(){}});}};
 const s={state:base(),baseline:base(),remote:{sha,data:base()},saved:0,puts:0,timers:[],published:false};
 const client={async connect(){return C.clone(s.remote);},async read(){return C.clone(s.remote);},async publish(data,expected){s.puts++;assert.equal(expected,s.remote.sha);if(s.wait)await s.wait;s.remote={sha:next,data:C.clone(data)};return {sha:next,commit:'c'.repeat(40),remote:C.clone(s.remote)};},disconnect(){s.disconnected=true;}};
 s.ui=()=>UI.mount({document:doc,client,getState:()=>s.state,getBaseline:()=>s.baseline,valid:()=>true,onRemote(remote,replace){s.baseline=C.clone(remote.data);if(replace)s.state=C.clone(remote.data);},saveDraft(){s.saved++;},confirm:()=>true,checkPublished:async()=>s.published,schedule(fn){s.timers.push(fn);return s.timers.length;},cancel(){}});
 s.el=id=>doc.querySelector('#'+id);s.click=async(id,type='click')=>s.el(id).listeners[type]({preventDefault(){}});
 s.connect=async()=>{s.el('github-token').value='github_pat_TEST_ONLY';await s.click('github-connect-form','submit');};
 return s;
}
test('connect clears the input and a save keeps edits made while the request is in flight',async()=>{
 assert.equal(typeof UI.mount,'function');const s=setup(),ui=s.ui();await s.connect();
 assert.equal(s.el('github-token').value,'');s.state.profile.zh.name='保存的姓名';
 let finish;s.wait=new Promise(r=>finish=r);const saving=s.click('publish-online');
 s.state.profile.zh.name='保存期间继续编辑';finish();await saving;
 assert.equal(s.remote.data.profile.zh.name,'保存的姓名');assert.equal(s.state.profile.zh.name,'保存期间继续编辑');
 assert.match(s.el('publish-status').textContent,/未发布/);assert.equal(ui.getPublication().sha,next);
 s.published=true;await s.click('check-publication');assert.match(s.el('publish-status').textContent,/已上线/);
 assert.match(s.el('publish-status').textContent,/未发布/);
});
test('new remote content blocks save until the user resolves the conflict',async()=>{
 const s=setup();s.state.profile.en.name='Local';s.remote.data.profile.en.name='Remote';s.ui();await s.connect();
 assert.equal(s.el('remote-conflict').hidden,false);assert.equal(s.el('publish-online').disabled,true);
 await s.click('publish-online');assert.equal(s.puts,0);
 await s.click('use-remote');assert.equal(s.state.profile.en.name,'Remote');assert.equal(s.el('remote-conflict').hidden,true);
});
test('explicit keep-local choice adopts the latest baseline without discarding the draft',async()=>{
 const s=setup();s.state.profile.en.name='Local';s.remote.data.profile.en.name='Remote';s.ui();await s.connect();
 await s.click('keep-local');assert.equal(s.state.profile.en.name,'Local');assert.equal(s.baseline.profile.en.name,'Remote');
 await s.click('publish-online');assert.equal(s.remote.data.profile.en.name,'Local');
});
test('disconnect clears credentials and disables publishing without deleting the local draft',async()=>{
 const s=setup();s.ui();await s.connect();s.state.profile.en.name='Draft';await s.click('github-disconnect');
 assert.equal(s.disconnected,true);assert.equal(s.el('publish-online').disabled,true);assert.equal(s.state.profile.en.name,'Draft');
 assert.equal(s.el('github-connect-form').hidden,false);
});
