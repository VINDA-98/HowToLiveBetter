(function () {
  'use strict';
  const release = window.__LIFE_RELEASE__ || {};
  const base = new URL(release.corpusBase || './', location.href);
  const cache = new Map();
  const asset = path => {
    const url = new URL(path, base);
    if (url.origin !== location.origin || !url.pathname.startsWith(base.pathname)) {
      throw new Error('资源地址不在当前版本内');
    }
    return url.href;
  };

  async function readText(path, tries = 3) {
    if (cache.has(path)) return cache.get(path);
    for (let attempt = 1; attempt <= tries; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12000);
      try {
        const response = await fetch(asset(path), { signal: controller.signal, cache: 'no-cache' });
        if (!response.ok) {
          const error = new Error(`正文加载失败（HTTP ${response.status}）`);
          error.retryable = response.status >= 500 || response.status === 429;
          throw error;
        }
        const text = (await response.text()).replace(/\r\n?/g, '\n').replace(/^\uFEFF/, '');
        if (!text.trim() || /^\s*(?:<!doctype\s+html|<html)/i.test(text)) {
          const error = new Error('正文内容未完整加载');
          error.retryable = false;
          throw error;
        }
        cache.set(path, text);
        return text;
      } catch (error) {
        const retryable = error.retryable ?? (error instanceof TypeError || error.name === 'AbortError');
        if (!retryable || attempt === tries) {
          error.net = true;
          throw error;
        }
      } finally {
        clearTimeout(timer);
      }
      await new Promise(resolve => setTimeout(resolve, attempt * 300));
    }
  }

  function migrateAnswers() {
    try {
      const key = 'vinda-life:selfcheck:v1';
      if (localStorage.getItem(key) !== null) return;
      const legacy = localStorage.getItem('selfcheck-v1');
      if (!legacy) return;
      const data = JSON.parse(legacy);
      if (!data || Array.isArray(data) || typeof data !== 'object') return;
      if (!Object.keys(data).every(key => /^(?:p:(?:age|sex|kid)$|mod:|\d+:)/.test(key))) return;
      if (!Object.values(data).every(value => typeof value === 'string')) return;
      localStorage.setItem(key, legacy);
    } catch (_) {}
  }
  migrateAnswers();
  window.VindaLife = Object.freeze({ asset, readText, release });

  function icon(name, className) {
    const element = document.createElement('i');
    element.dataset.lucide = name;
    if (className) element.className = className;
    element.setAttribute('aria-hidden', 'true');
    return element;
  }

  async function sponsor() {
    const target = document.getElementById('life-sponsor');
    if (!target || location.protocol === 'file:') return;
    try {
      const response = await fetch(asset('vinda-life.json'));
      if (!response.ok) return;
      const data = (await response.json()).sponsor;
      if (!data?.enabled || typeof data.title !== 'string' || !data.title.trim()) return;
      const destination = new URL(data.href);
      if (destination.protocol !== 'https:' || destination.username || destination.password) return;
      const now = Date.now();
      const start = data.startsAt ? Date.parse(data.startsAt) : -Infinity;
      const end = data.endsAt ? Date.parse(data.endsAt) : Infinity;
      if (Number.isNaN(start) || Number.isNaN(end) || now < start || now >= end) return;
      const label = document.createElement('span');
      label.className = 'life-sponsor-label';
      label.textContent = '赞助';
      const link = document.createElement('a');
      link.href = destination.href;
      link.target = '_blank';
      link.rel = 'sponsored noopener noreferrer';
      const title = document.createElement('strong');
      title.textContent = data.title;
      link.append(title);
      if (typeof data.description === 'string' && data.description.trim()) {
        const description = document.createElement('span');
        description.textContent = data.description;
        link.append(description);
      }
      if (typeof data.image === 'string' && data.image) {
        if (!/^sponsor-[a-z0-9-]+\.(?:webp|png|jpe?g)$/.test(data.image)) return;
        const image = document.createElement('img');
        image.src = asset(data.image);
        image.alt = data.title;
        image.width = 160;
        image.height = 96;
        image.loading = 'lazy';
        image.addEventListener('error', () => { target.hidden = true; });
        link.prepend(image);
      }
      target.replaceChildren(label, link);
      target.hidden = false;
    } catch (_) {}
  }

  document.addEventListener('DOMContentLoaded', () => {
    const brand = document.querySelector('.life-brand img');
    if (brand && !brand.src.startsWith('data:')) brand.src = asset('vinda-brand.svg');
    const menu = document.getElementById('menu');
    if (menu) { menu.replaceChildren(icon('sliders-horizontal')); menu.title = '章节与筛选'; }
    const search = document.querySelector('.search > svg');
    if (search) search.replaceWith(icon('search'));
    const theme = document.getElementById('theme');
    if (theme) {
      theme.className = 'icon-btn life-theme';
      theme.replaceChildren(icon('sun', 'life-sun'), icon('moon', 'life-moon'));
      const updateThemeLabel = () => {
        const dark = document.documentElement.classList.contains('dark');
        theme.title = dark ? '切换浅色模式' : '切换深色模式';
        theme.setAttribute('aria-label', theme.title);
        theme.setAttribute('aria-pressed', String(dark));
      };
      updateThemeLabel();
      new MutationObserver(updateThemeLabel).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
      if (document.body.classList.contains('life-selfcheck')) {
        theme.addEventListener('click', () => {
          const dark = document.documentElement.classList.toggle('dark');
          try { localStorage.setItem('vinda-life:theme', dark ? 'dark' : 'light'); } catch (_) {}
          theme.setAttribute('aria-pressed', String(dark));
        });
      }
    }
    const footer = document.querySelector('.life-credit');
    if (footer && release.sourceCommit) {
      const note = document.createElement('span');
      note.className = 'life-version';
      note.textContent = `同步于 ${release.syncedAt} · ${release.sourceCommit.slice(0, 7)}`;
      footer.append(note);
    }
    const mitLink = document.querySelector('[data-life-code-license]');
    if (mitLink) mitLink.href = location.protocol === 'file:'
      ? 'https://github.com/eternity4719/HowToLiveBetter/blob/main/LICENSE-CODE'
      : asset('LICENSE-CODE');
    window.VindaLifeIcons?.();
    sponsor();
  });
})();
