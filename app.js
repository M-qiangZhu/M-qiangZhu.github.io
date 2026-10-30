'use strict';

(() => {
  const content = window.PORTFOLIO;
  let language = document.documentElement.lang === 'en' ? 'en' : 'zh';
  let filter = 'all';
  const openProjects = new Set();
  const root = document.documentElement;
  const translate = (key) => content.translations[language][key] ?? key;
  const escape = (value) => String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const persist = (key, value) => { try { localStorage.setItem(key, value); } catch { /* Preferences remain active for this visit. */ } };

  function renderExpertise() {
    document.querySelector('#expertise').innerHTML = content.expertise.map((item) => `<div class="expertise-item"><div><h3>${escape(item[language][0])}</h3><p>${escape(item[language][1])}</p><span class="tool-line">${escape(item.tools)}</span></div></div>`).join('');
  }

  function renderProjects() {
    const visible = content.projects.filter((p) => filter === 'all' || p.category.includes(filter));
    const groups = new Map();
    visible.forEach((p) => { if (!groups.has(p.year)) groups.set(p.year, []); groups.get(p.year).push(p); });
    document.querySelector('#project-list').innerHTML = [...groups].map(([year, projects]) => `<div class="project-group"><h3 class="project-year">${escape(year)}</h3><div class="project-group-items">${projects.map((p) => {
      const data = p[language];
      return `<details class="project-item" data-project-id="${p.id}"${openProjects.has(p.id) ? ' open' : ''}><summary><span class="project-summary"><span class="project-title">${escape(data.title)}</span><span class="project-subtitle">${escape(data.subtitle)}</span></span><span class="expand-mark" aria-hidden="true">+</span></summary><div class="project-detail"><p class="project-role">${escape(data.role)}</p><p>${escape(data.body)}</p><div class="tags">${p.tags.map((tag) => `<span>${escape(tag)}</span>`).join('')}</div></div></details>`;
    }).join('')}</div></div>`).join('');
    document.querySelector('#project-count').textContent = `${visible.length} ${translate('projects.count')}`;
    document.querySelectorAll('[data-filter]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.filter === filter)));
    document.querySelectorAll('[data-project-id]').forEach((details) => details.addEventListener('toggle', () => {
      if (details.open) openProjects.add(details.dataset.projectId); else openProjects.delete(details.dataset.projectId);
    }));
  }

  function highlightAuthor(authors) {
    return escape(authors).replace(/Mingqiang Zhu\*?|朱明强/g, (name) => `<strong>${name}</strong>`);
  }

  function renderResearch() {
    document.querySelector('#publication-list').innerHTML = content.papers.map((p, i) => `<article class="publication${i === 0 ? ' featured-publication' : ''}"><div class="publication-year">${p.year}</div><div class="publication-body"><div class="publication-meta"><span class="author-role">${escape(p.role[language])}</span><span>${escape(p.venue)}</span></div><h4><a href="${p.url}" target="_blank" rel="noopener noreferrer">${escape(p.title)}<span class="paper-arrow" aria-hidden="true"> ↗</span></a></h4><p class="authors">${highlightAuthor(p.authors)}</p><p class="paper-description">${escape(p.description[language])}</p><p class="paper-note">${escape(p.note[language])}</p></div></article>`).join('');
    document.querySelector('#patent-list').innerHTML = content.patents.map((p) => `<article class="patent-item"><span class="patent-year">${p.year}</span><div><h4>${escape(p[language])}</h4><p>${translate('research.application')} ${p.number} · ${translate('research.inventors')}</p></div></article>`).join('');
  }

  function renderCredentials() {
    document.querySelector('#credential-list').innerHTML = content.credentials.map((c) => `<article class="credential"><span class="credential-mark" aria-hidden="true">${c.mark}</span><div><h3>${escape(c[language].title)}</h3><p>${escape(c[language].subtitle)}</p></div></article>`).join('');
  }

  function updateThemeLabel() {
    const label = translate(root.dataset.theme === 'dark' ? 'theme.light' : 'theme.dark');
    const button = document.querySelector('[data-theme-toggle]');
    button.setAttribute('aria-label', label);
    button.title = label;
  }

  function updateMenuLabel() {
    const button = document.querySelector('.menu-toggle');
    button.setAttribute('aria-label', translate(button.getAttribute('aria-expanded') === 'true' ? 'menu.close' : 'menu'));
  }

  function applyLanguage(next) {
    language = next;
    root.lang = next === 'en' ? 'en' : 'zh-CN';
    document.title = next === 'en' ? 'Mingqiang Zhu · AI Engineering & Quantum Research' : '朱明强 · AI 工程与量子线路研究';
    document.querySelector('meta[name="description"]').content = translate('meta.description');
    document.querySelector('meta[property="og:title"]').content = document.title;
    document.querySelector('meta[property="og:description"]').content = translate('meta.description');
    document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = translate(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-aria]').forEach((el) => { el.setAttribute('aria-label', translate(el.dataset.i18nAria)); });
    document.querySelectorAll('[data-language]').forEach((button) => { button.setAttribute('aria-pressed', String(button.dataset.language === language)); });
    document.querySelector('#circuit-title').textContent = translate('figure.a11yTitle');
    document.querySelector('#circuit-desc').textContent = translate('figure.a11yDesc');
    renderExpertise(); renderProjects(); renderResearch(); renderCredentials(); updateThemeLabel(); updateMenuLabel();
    persist('mz-language', language);
  }

  document.querySelectorAll('[data-language]').forEach((button) => button.addEventListener('click', () => applyLanguage(button.dataset.language)));
  document.querySelectorAll('[data-filter]').forEach((button) => button.addEventListener('click', () => { filter = button.dataset.filter; renderProjects(); }));
  document.querySelector('[data-theme-toggle]').addEventListener('click', () => { root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark'; persist('mz-theme', root.dataset.theme); updateThemeLabel(); });
  const menuButton = document.querySelector('.menu-toggle');
  const mobileNav = document.querySelector('#mobile-nav');
  function closeMenu() { mobileNav.hidden = true; menuButton.setAttribute('aria-expanded', 'false'); updateMenuLabel(); }
  menuButton.addEventListener('click', () => { const open = menuButton.getAttribute('aria-expanded') !== 'true'; mobileNav.hidden = !open; menuButton.setAttribute('aria-expanded', String(open)); updateMenuLabel(); });
  mobileNav.querySelectorAll('a').forEach((a) => a.addEventListener('click', closeMenu));
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !mobileNav.hidden) { closeMenu(); menuButton.focus(); } });
  matchMedia('(min-width: 768px)').addEventListener('change', (event) => { if (event.matches) closeMenu(); });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (event) => { let saved; try { saved = localStorage.getItem('mz-theme'); } catch {} if (!saved) { root.dataset.theme = event.matches ? 'dark' : 'light'; updateThemeLabel(); } });

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => { if (entry.isIntersecting) document.querySelectorAll('.desktop-nav a').forEach((a) => { const active = a.hash === `#${entry.target.id}`; if (active) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current'); }); }), { rootMargin: '-10% 0px -65% 0px' });
    document.querySelectorAll('main > section[id]').forEach((section) => observer.observe(section));
  }
  document.querySelector('#copyright-year').textContent = new Date().getFullYear();
  applyLanguage(language);
})();
