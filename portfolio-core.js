/* Shared data rules; browser global and Node export, no dependencies. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PortfolioCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const DRAFT_KEY = 'mz-portfolio-draft-v2';
  const clone = value => JSON.parse(JSON.stringify(value));
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
  function dateValue(value) {
    const m = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/.exec(String(value || ''));
    if (!m) return null;
    const y=+m[1], month=+(m[2]||0), day=+(m[3]||0);
    if (y<1900 || y>2199 || (m[2] && (month<1||month>12))) return null;
    if(m[3] && (day<1 || day>new Date(Date.UTC(y,month,0)).getUTCDate())) return null;
    return y*10000+month*100+day;
  }
  function sortDated(items) {
    const value = p => p.end==='present' ? Infinity : dateValue(p.end)||dateValue(p.start)||-1;
    return [...items].sort((a,b)=>{const x=value(a),y=value(b);return x===y ? (dateValue(b.start)||-1)-(dateValue(a.start)||-1) : y-x;});
  }
  const sortPapers = items => [...items].sort((a,b)=>(dateValue(b.published)||-1)-(dateValue(a.published)||-1));
  function safeURL(value) {try {const u=new URL(String(value));return ['https:','http:'].includes(u.protocol)?u.href:'';} catch {return '';}}
  function authorRole(paper, lang='zh') {
    const i=paper.authors.findIndex(a=>a.self);if(i<0)return lang==='zh'?'作者':'Author';
    const a=paper.authors[i];const role=a.coFirst?(lang==='zh'?'共同第一作者':'Co-first author'):i===0?(lang==='zh'?'第一作者':'First author'):i===1?(lang==='zh'?'第二作者':'Second author'):(lang==='zh'?'共同作者':'Co-author');
    return role+(a.corresponding?(lang==='zh'?' · 通讯作者':' · Corresponding author'):'');
  }
  function authorsHTML(paper) {return paper.authors.map(a=>{let s=escape(a.name);if(a.self)s='<strong>'+s+'</strong>';const flags=(a.coFirst?'†':'')+(a.corresponding?'*':'');return s+(flags?'<sup>'+flags+'</sup>':'');}).join(', ');}
  function dateLabel(value,lang='zh') {return value==='present'?(lang==='zh'?'至今':'Present'):String(value||'').replaceAll('-','.');}
  function dateRange(item,lang='zh') {if(!item.start&&!item.end)return lang==='zh'?'日期未提供':'Date not provided';if(!item.start)return dateLabel(item.end,lang);return item.start===item.end||!item.end?dateLabel(item.start,lang):`${dateLabel(item.start,lang)}–${dateLabel(item.end,lang)}`;}
  function validate(data) {
    const errors=[];const add=x=>errors.push(x);const object=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
    if(!object(data))return ['资料必须是 JSON 对象'];
    const scan=(v,depth=0)=>{if(depth>30){add('资料嵌套过深');return;}if(v&&typeof v==='object')for(const k of Object.keys(v)){if(['__proto__','prototype','constructor'].includes(k))add('资料含危险字段');scan(v[k],depth+1);}};scan(data);
    if(errors.length)return errors;
    if(data.version!==2)return ['资料格式版本不受支持，请导入本站导出的资料文件'];
    const str=(v,label,required=false)=>{if(typeof v!=='string'||(required&&!v.trim()))add(label+'需要填写文字');};
    const fieldNames={name:'姓名',alternateName:'另一语言姓名',headline:'方向',summary:'简介',background:'背景',title:'名称',subtitle:'说明',body:'详情',role:'职责或岗位',organization:'单位'};
    const bi=(v,keys,label)=>{for(const lang of ['zh','en'])for(const key of keys)str(v?.[lang]?.[key],label+'（'+(lang==='zh'?'中文':'英文')+'）'+fieldNames[key],key==='name'||key==='title');};
    bi(data.profile,['name','alternateName','headline','summary','background'],'个人姓名与介绍');
    for(const k of ['github','researchCode']){str(data.profile?.[k],'个人链接');if(data.profile?.[k]&&!safeURL(data.profile[k]))add('个人链接仅支持 http/https');}
    str(data.profile?.email,'邮箱');if(data.profile?.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.profile.email))add('邮箱格式不正确');
    if(!object(data.translations)||!object(data.translations.zh)||!object(data.translations.en))add('缺少双语界面文字');
    const names={projects:'项目',papers:'论文',patents:'专利',credentials:'认证',experience:'工作经历',expertise:'技能'};
    for(const [key,label] of Object.entries(names)){
      const list=data[key];if(!Array.isArray(list)){add(label+'必须为数组');continue;}
      if(list.length>500){add(label+'条目过多');continue;}
      const ids=new Set();for(const item of list){if(!object(item)){add(label+'条目格式错误');continue;}
        if(key!=='expertise'){str(item.id,label+' ID',true);if(ids.has(item.id))add(label+' ID 重复');ids.add(item.id);}
        const checkDate=(value,name,ongoing=false)=>{if(typeof value!=='string'||(value!==''&&!(ongoing&&value==='present')&&dateValue(value)===null))add(label+name+'日期无效，请使用 YYYY、YYYY-MM 或 YYYY-MM-DD');};
        if(key==='projects'||key==='experience'){
          checkDate(item.start,'开始');checkDate(item.end,'结束',true);
          if(item.start&&item.end&&item.end!=='present'&&dateValue(item.start)!==null&&dateValue(item.end)!==null){const left=item.start.split('-').map(Number),right=item.end.split('-').map(Number);const first=Date.UTC(left[0],(left[1]||1)-1,left[2]||1);const last=right[2]?Date.UTC(right[0],right[1]-1,right[2]):right[1]?Date.UTC(right[0],right[1],0):Date.UTC(right[0],11,31);if(first>last)add(label+'结束日期不能早于开始日期');}
          bi(item,key==='projects'?['title','subtitle','body','role']:['organization','role','body'],label);
        }
        if(key==='projects'){
          if(!Array.isArray(item.category)||item.category.some(c=>!['ai','data','quantum'].includes(c)))add('项目分类无效');
          if(!Array.isArray(item.tags)||item.tags.some(t=>typeof t!=='string'))add('项目标签必须为文字数组');
          if(typeof item.cvSelected!=='boolean')add('项目简历选择无效');
        }
        if(key==='papers'){
          str(item.title,'论文题名',true);str(item.venue,'论文出处');checkDate(item.published,'出版');checkDate(item.online,'在线');str(item.url,'论文链接');if(item.url&&!safeURL(item.url))add('论文链接仅支持 http/https');
          if(!Array.isArray(item.authors)||!item.authors.length)add('论文至少需要一位作者');else{
            if(item.authors.filter(a=>a.self).length!==1)add('每篇论文需勾选且仅勾选一位本人作者');
            const authorNames=new Set();for(const a of item.authors){str(a?.name,'作者姓名',true);if(authorNames.has(a?.name))add('作者姓名不能重复');authorNames.add(a?.name);for(const flag of ['self','coFirst','corresponding'])if(typeof a?.[flag]!=='boolean')add('作者贡献标记无效');}
          }
          for(const lang of ['zh','en']){str(item.note?.[lang],'论文备注');str(item.description?.[lang],'论文说明');}
        }
        if(key==='patents'){checkDate(item.applied,'申请');str(item.zh,'专利中文名称',true);str(item.en,'专利英文名称',true);str(item.number,'专利申请号');if(item.inventors)for(const lang of ['zh','en'])str(item.inventors[lang],'专利发明人');}
        if(key==='credentials'){checkDate(item.date,'取得');bi(item,['title','subtitle'],'认证');str(item.mark,'认证简称');}
        if(key==='expertise'){for(const lang of ['zh','en'])if(!Array.isArray(item[lang])||item[lang].length!==2||item[lang].some(s=>typeof s!=='string'))add('技能需要中英名称和说明');str(item.tools,'技能工具');}
      }
    }
    return errors;
  }
  function parseImport(text) {
    if(typeof text!=='string'||text.length>2000000)throw new Error('资料文件过大或格式错误');
    let source=text.replace(/^\uFEFF/,'').trim();
    if(!source.startsWith('{')){const m=/^(?:\/\/[^\n]*\n\s*)*window\.PORTFOLIO\s*=\s*(\{[\s\S]*\})\s*;?\s*$/.exec(source);if(!m)throw new Error('仅接受 JSON 或本站导出的资料脚本');source=m[1];}
    let parsed;try{parsed=JSON.parse(source);}catch{throw new Error('JSON 资料格式错误');}
    const errors=validate(parsed);if(errors.length)throw new Error(errors.slice(0,8).join('；'));
    return parsed;
  }
  const serialize = data => {const errors=validate(data);if(errors.length)throw new Error(errors.slice(0,8).join('；'));return 'window.PORTFOLIO = '+JSON.stringify(data,null,2)+';\n';};
  function readDraft(){try{const raw=localStorage.getItem(DRAFT_KEY);return raw?JSON.parse(raw):null;}catch{return null;}}
  function pageData(base){const preview=new URLSearchParams(location.search).get('preview')==='1';if(!preview)return {data:base,preview:false};const draft=readDraft();if(!draft)return {data:base,preview:false,error:'没有可预览的草稿。'};const errors=validate(draft.data);return errors.length?{data:base,preview:false,error:errors.slice(0,3).join('；')}:{data:draft.data,preview:true};}
  const paragraph = text => escape(text).replace(/\n/g,'<br>');
  const link = (url,label) => safeURL(url)?`<a href="${escape(safeURL(url))}" target="_blank" rel="noopener noreferrer">${label}</a>`:label;
  return {DRAFT_KEY,clone,escape,dateValue,sortDated,sortPapers,safeURL,authorRole,authorsHTML,dateLabel,dateRange,validate,parseImport,serialize,readDraft,pageData,paragraph,link};
});
