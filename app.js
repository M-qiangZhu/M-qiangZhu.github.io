'use strict';
(async() => {
 const C=PortfolioCore,V=PortfolioView,result=C.pageData(await C.latestData(window.PORTFOLIO)),data=result.data;
 let lang;try{lang=localStorage.getItem('mz-language')==='en'?'en':'zh';}catch{lang='zh';}
 const labels={zh:{experience:'工作',projects:'项目',papers:'论文',cv:'简历 / CV',editor:'编辑资料',top:'回到顶部',dark:'深色',light:'浅色'},en:{experience:'Work',projects:'Projects',papers:'Papers',cv:'CV / PDF',editor:'Edit content',top:'Back to top',dark:'Dark',light:'Light'}};
 function updateTheme(){document.querySelector('#theme-toggle').textContent=labels[lang][document.documentElement.dataset.theme==='dark'?'light':'dark'];document.querySelector('#theme-toggle').setAttribute('aria-label',lang==='zh'?'切换浅深主题':'Toggle light/dark theme');}
 function render(){
  const p=data.profile[lang],t=labels[lang];document.documentElement.lang=lang==='zh'?'zh-CN':'en';document.title=p.name+' · '+p.headline;document.querySelector('meta[name="description"]').content=p.summary;document.querySelector('meta[property="og:title"]').content=document.title;
  document.querySelector('.site-name').textContent=p.name;document.querySelector('#profile-name').innerHTML=C.escape(p.name)+` <span>${C.escape(p.alternateName)}</span>`;document.querySelector('#profile-headline').textContent=p.headline;document.querySelector('#profile-links').innerHTML=V.contacts(data,lang);document.querySelector('#page-content').innerHTML=V.sections(data,lang);
  document.querySelectorAll('[data-label]').forEach(el=>el.textContent=t[el.dataset.label]);
  const suffix=`?lang=${lang}${result.preview?'&preview=1':''}`;for(const id of ['cv-link','footer-cv']){const el=document.getElementById(id);el.textContent=t.cv;el.href='./cv.html'+suffix;}
  document.querySelector('#language-toggle').textContent=lang==='zh'?'English':'中文';document.querySelector('#editor-link').textContent=t.editor;document.querySelector('#top-link').textContent=t.top;document.querySelector('#copyright').textContent=`© ${new Date().getFullYear()} ${p.name}`;updateTheme();
  const banner=document.querySelector('#draft-banner');if(result.preview||result.error){banner.hidden=false;banner.textContent=result.preview?(lang==='zh'?'草稿预览：仅此浏览器可见，尚未发布。':'Draft preview: local to this browser; not published.'):(lang==='zh'?'草稿无法预览，当前显示已发布资料：':'Draft unavailable; showing published data: ')+result.error;}
 }
 document.querySelector('#language-toggle').addEventListener('click',()=>{lang=lang==='zh'?'en':'zh';try{localStorage.setItem('mz-language',lang);}catch{}render();});
 document.querySelector('#theme-toggle').addEventListener('click',()=>{const root=document.documentElement;root.dataset.theme=root.dataset.theme==='dark'?'light':'dark';try{localStorage.setItem('mz-theme',root.dataset.theme);}catch{}updateTheme();});
 render();
})();
