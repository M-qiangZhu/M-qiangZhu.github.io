const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const C = fs.existsSync('portfolio-core.js') ? require('../portfolio-core.js') : {};
const data = () => {const context={window:{}};vm.runInNewContext(fs.readFileSync('content.js','utf8'),context);return JSON.parse(JSON.stringify(context.window.PORTFOLIO));};

test('fresh page data bypasses caches, validates remote content and falls back offline',async()=>{
 const base=data(),updated=data();updated.profile.en.name='Fresh online name';
 const fetched=await C.latestData(base,async(url,options)=>{assert.match(url,/content.js\?fresh=/);assert.equal(options.cache,'no-store');assert.equal(options.credentials,'omit');return {ok:true,text:async()=>C.serialize(updated)};});
 assert.equal(fetched.profile.en.name,'Fresh online name');
 assert.deepEqual(await C.latestData(base,async()=>{throw new Error('offline');}),base);
 assert.deepEqual(await C.latestData(base,async()=>({ok:true,text:async()=>'window.alert(1)'})),base);
});

test('sorts ongoing, ended, tied and undated projects without changing the input',()=>{
 const entries=[{id:'old',start:'2023',end:'2024'},{id:'unknown',start:'',end:''},{id:'year-only',start:'2026',end:'2026'},{id:'exact',start:'2025-02',end:'2026-09'},{id:'ongoing',start:'2024',end:'present'},{id:'same-a',start:'2026',end:'2026'},{id:'same-b',start:'2026',end:'2026'}];
 assert.deepEqual(C.sortDated(entries).map(p=>p.id),['ongoing','exact','year-only','same-a','same-b','old','unknown']);
 assert.equal(entries[0].id,'old');
});
test('rejects impossible dates and does not invent missing month precision',()=>{
 assert.equal(C.dateValue('2024-02-29'),20240229);
 assert.equal(C.dateValue('2023-02-29'),null);
 assert.equal(C.dateValue('2026-13'),null);
 assert.equal(C.dateValue('2026'),20260000);
});
test('publication order follows formal issue date even when online date differs',()=>{
 const papers=[{id:'online',published:'2023',online:'2022-12-08'},{id:'later',published:'2025-06-17'},{id:'issue',published:'2023-07'},{id:'undated',published:''}];
 assert.deepEqual(C.sortPapers(papers).map(p=>p.id),['later','issue','online','undated']);
});
test('second listed co-first author remains co-first independently of correspondence',()=>{
 const paper={authors:[{name:'Xinyu Chen',coFirst:true},{name:'Mingqiang Zhu',self:true,coFirst:true},{name:'Xueyun Cheng',corresponding:true}]};
 assert.equal(C.authorRole(paper,'zh'),'共同第一作者');
 assert.equal(C.authorRole(paper,'en'),'Co-first author');
 paper.authors[1].corresponding=true;
 assert.equal(C.authorRole(paper,'zh'),'共同第一作者 · 通讯作者');
 assert.match(C.authorsHTML(paper),/Mingqiang Zhu<\/strong><sup>†\*<\/sup>/);
});
test('author names and body text are escaped and unsafe URLs cannot become links',()=>{
 assert.equal(C.escape('<img onerror="x">'),'&lt;img onerror=&quot;x&quot;&gt;');
 assert.equal(C.safeURL('javascript:alert(1)'), '');
 assert.equal(C.safeURL('https://doi.org/10.1/test'),'https://doi.org/10.1/test');
 assert.equal(C.safeURL('data:text/html,x'),'');
});
test('all existing content survives strict JSON and exported script round trips',()=>{
 const original=data();
 assert.deepEqual(C.parseImport(C.serialize(original)),original);
 assert.deepEqual(C.parseImport(JSON.stringify(original)),original);
 assert.equal(C.validate(original).length,0);
});
test('script import rejects executable suffixes and malformed JSON instead of running them',()=>{
 assert.throws(()=>C.parseImport('window.PORTFOLIO = {}; alert("executed")'),/JSON|资料|格式|脚本/);
 assert.throws(()=>C.parseImport('{"__proto__":{"polluted":true}}'),/危险|字段|资料/);
 assert.equal({}.polluted,undefined);
});
test('import validation catches invalid bilingual records, duplicate IDs and invalid links',()=>{
 const broken=data();broken.projects[1].id=broken.projects[0].id;broken.papers[0].url='javascript:alert(1)';broken.projects[0].start='2026-17';delete broken.profile.zh.name;
 const errors=C.validate(broken).join('\n');
 assert.match(errors,/重复/);assert.match(errors,/链接/);assert.match(errors,/日期/);assert.match(errors,/姓名/);
});
test('an imported draft never silently drops whole content collections',()=>{
 const broken=data(); delete broken.papers; broken.projects='wrong';
 assert.throws(()=>C.parseImport(JSON.stringify(broken)),/论文|项目|数组/);
});

test('mixed date precision permits unknown end-month within a year but rejects definitely reversed ranges',()=>{
 const mixed=data();mixed.projects[0].start='2026-03';mixed.projects[0].end='2026';
 assert.equal(C.validate(mixed).filter(e=>e.includes('结束日期')).length,0);
 mixed.projects[0].start='2026-03';mixed.projects[0].end='2026-02';
 assert.equal(C.validate(mixed).filter(e=>e.includes('结束日期')).length,1);
});
test('a second author is labeled by position unless equal contribution overrides it',()=>{
 const paper={authors:[{name:'Lead'},{name:'Me',self:true}]};
 assert.equal(C.authorRole(paper,'zh'),'第二作者');assert.equal(C.authorRole(paper,'en'),'Second author');
});
test('date range with only a known end shows that date without a leading separator',()=>{
 assert.equal(C.dateRange({start:'',end:'2026'},'zh'),'2026');
});

function views(){const context={window:{PortfolioCore:C}};vm.runInNewContext(fs.readFileSync('portfolio-view.js','utf8'),context);return context.window.PortfolioView;}
test('new patent entries do not inherit an unrelated inventor list',()=>{
 const V=views();const item={id:'new',applied:'2027',zh:'独立发明',en:'New invention',number:'ABC'};
 const html=V.sections({patents:[item]},'zh',{sections:['patents']});
 assert.match(html,/独立发明/);assert.doesNotMatch(html,/程学云/);
 item.inventors={zh:'本人指定发明人',en:'Custom inventor'};
 assert.match(V.sections({patents:[item]},'zh',{sections:['patents']}),/本人指定发明人/);
});
test('editable project and paper descriptions appear in the shared output',()=>{
 const V=views(),d=data();d.projects[0].zh.subtitle='独特的一句话说明';d.projects[0].tags=['UniqueTool'];d.papers[0].description.zh='独特的研究说明';
 assert.match(V.projects(d.projects,'zh'),/独特的一句话说明/);assert.match(V.projects(d.projects,'zh'),/UniqueTool/);assert.match(V.papers(d,'zh'),/独特的研究说明/);
});
test('changing the structured online date updates the visible paper metadata',()=>{
 const d=data();d.papers[0].online='2024-11-03';assert.match(views().papers(d,'en'),/Online publication: 2024\.11\.03/);
});
