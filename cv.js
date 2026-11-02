'use strict';
(()=>{
 const C=PortfolioCore,V=PortfolioView,result=C.pageData(window.PORTFOLIO),data=result.data,params=new URLSearchParams(location.search);let lang=params.get('lang')==='en'?'en':'zh';
 const sections=new Set(['about','experience','skills','projects','papers','patents','credentials']);let selected=new Set(data.projects.filter(p=>p.cvSelected).map(p=>p.id));
 const order=['about','experience','skills','projects','papers','patents','credentials'];
 const copy={zh:{title:'简历导出',back:'返回主页',featured:'精选项目',all:'全部项目',print:'导出 PDF',help:'点击导出后，在浏览器打印窗口选择“另存为 PDF”。建议关闭页眉和页脚。可在下方选择简历章节和项目。',choose:'选择项目',draft:'当前为本地草稿预览，尚未发布。'},en:{title:'Export CV',back:'Back to website',featured:'Featured projects',all:'All projects',print:'Export PDF',help:'Choose “Save as PDF” in your browser’s print dialog. Disable headers and footers for a clean CV. Select sections and projects below.',choose:'Choose projects',draft:'Local draft preview; not published.'}};
 function render(){const p=data.profile[lang],t=copy[lang];document.documentElement.lang=lang==='zh'?'zh-CN':'en';document.title=p.name+' - CV - '+(lang==='zh'?'中文':'English');
  for(const [id,key] of Object.entries({'cv-title':'title','back-home':'back','select-featured':'featured','select-all':'all','print-cv':'print','print-help':'help','project-selection-label':'choose'}))document.getElementById(id).textContent=t[key];
  document.querySelector('#cv-language').textContent=lang==='zh'?'English':'中文';document.querySelector('#back-home').href='./index.html'+(result.preview?'?preview=1':'');
  const notice=document.querySelector('#cv-draft-notice');notice.hidden=!(result.preview||result.error);notice.textContent=result.error||t.draft;
  document.querySelector('#section-options').innerHTML=order.map(id=>`<label><input type="checkbox" data-section="${id}" ${sections.has(id)?'checked':''}>${C.escape(V.UI[lang][id])}</label>`).join('');
  document.querySelector('#project-options').innerHTML=C.sortDated(data.projects).map(p=>`<label><input type="checkbox" data-project="${C.escape(p.id)}" ${selected.has(p.id)?'checked':''}>${C.escape(p[lang].title)}</label>`).join('');
  renderSheet();
 }
 function renderSheet(){const p=data.profile[lang];document.querySelector('#cv-sheet').innerHTML=`<header class="profile-header"><h1>${C.escape(p.name)} <span>${C.escape(p.alternateName)}</span></h1><p>${C.escape(p.headline)}</p><div class="profile-links">${V.contacts(data,lang)}</div></header>`+V.sections(data,lang,{sections:order.filter(id=>sections.has(id)),projects:data.projects.filter(p=>selected.has(p.id))});}
 document.querySelector('#section-options').addEventListener('change',e=>{if(!e.target.dataset.section)return;e.target.checked?sections.add(e.target.dataset.section):sections.delete(e.target.dataset.section);renderSheet();});
 document.querySelector('#project-options').addEventListener('change',e=>{if(!e.target.dataset.project)return;e.target.checked?selected.add(e.target.dataset.project):selected.delete(e.target.dataset.project);renderSheet();});
 document.querySelector('#cv-language').addEventListener('click',()=>{lang=lang==='zh'?'en':'zh';params.set('lang',lang);history.replaceState(null,'',location.pathname+'?'+params.toString());render();});
 document.querySelector('#select-featured').addEventListener('click',()=>{selected=new Set(data.projects.filter(p=>p.cvSelected).map(p=>p.id));render();});document.querySelector('#select-all').addEventListener('click',()=>{selected=new Set(data.projects.map(p=>p.id));render();});
 document.querySelector('#print-cv').addEventListener('click',()=>window.print());render();
})();
