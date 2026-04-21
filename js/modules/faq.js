import { $, $$ } from '../shared/dom.js';
import { setDropdownOpen } from './dropdowns.js';

function closePpFaqItem(item) {
  if (!item) return;
  const btn = item.querySelector('.pp-faq__head');
  const panel = item.querySelector('.pp-faq__panel');
  item.classList.remove('pp-faq__item--open');
  if (btn) btn.setAttribute('aria-expanded', 'false');
  if (panel) panel.setAttribute('hidden', '');
}

function openPpFaqItem(item) {
  if (!item) return;
  const btn = item.querySelector('.pp-faq__head');
  const panel = item.querySelector('.pp-faq__panel');
  item.classList.add('pp-faq__item--open');
  if (btn) btn.setAttribute('aria-expanded', 'true');
  if (panel) panel.removeAttribute('hidden');
}

/** FAQ: один открытый пункт, клавиатура — нативно на <button> */
export function initPpFaq() {
  const root = $('[data-pp-faq]');
  if (!root) return;

  $$('[data-faq-item]', root).forEach((item, i) => {
    const btn = $('.pp-faq__head', item);
    const panel = $('.pp-faq__panel', item);
    if (!btn || !panel) return;
    const bid = `pp-faq-btn-${i + 1}`;
    const pid = `pp-faq-panel-${i + 1}`;
    btn.id = bid;
    panel.id = pid;
    btn.setAttribute('aria-controls', pid);
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-labelledby', bid);
  });

  root.addEventListener('click', (e) => {
    const btn = e.target instanceof Element ? e.target.closest('.pp-faq__head') : null;
    if (!btn || !root.contains(btn)) return;
    const item = btn.closest('[data-faq-item]');
    if (!item || !root.contains(item)) return;
    const willOpen = !item.classList.contains('pp-faq__item--open');
    if (root.dataset.ppFaqSearchActive === '1') {
      if (willOpen) openPpFaqItem(item);
      else closePpFaqItem(item);
      return;
    }
    if (willOpen) {
      $$('[data-faq-item].pp-faq__item--open', root).forEach((openItem) => {
        if (openItem !== item) closePpFaqItem(openItem);
      });
      openPpFaqItem(item);
    } else {
      closePpFaqItem(item);
    }
  });
}

/** Поиск и автодополнение по FAQ (логика из pobyt_faq_search.html, классы pp-faq) */
export function initPpFaqSearch() {
  const root = $('[data-pp-faq]');
  const input = document.getElementById('ppFaqSearch');
  const clearBtn = document.getElementById('ppFaqSearchClear');
  const countEl = document.getElementById('ppFaqSearchCount');
  const emptyEl = document.getElementById('ppFaqSearchEmpty');
  const sugBox = document.getElementById('ppFaqSuggestions');
  if (!root || !input || !clearBtn || !countEl || !emptyEl || !sugBox) return;
  const dropdownControl = input.matches('[data-dropdown-toggle]') ? input : null;
  function setSuggestionsOpen(open) {
    if (dropdownControl) setDropdownOpen(dropdownControl, open);
    else sugBox.hidden = !open;
  }

  const allItems = () => $$('[data-faq-item]', root);
  const allDividers = () => $$('.pp-faq__divider', root);

  let activeIdx = -1;

  function buildWordIndex() {
    const stopWords = new Set([
      'и',
      'в',
      'на',
      'по',
      'с',
      'из',
      'для',
      'это',
      'что',
      'как',
      'не',
      'то',
      'или',
      'но',
      'а',
      'же',
      'так',
      'при',
      'если',
      'ли',
      'до',
      'от',
      'за',
      'со',
      'об',
      'без',
      'уже',
      'ещё',
      'более',
      'вам',
      'вас',
      'вы',
      'мы',
      'нас',
      'нам',
      'они',
      'их',
      'им',
      'он',
      'она',
      'его',
      'её',
      'во',
      'все',
      'всех',
      'всем',
      'также',
      'через',
      'после',
      'который',
      'которые',
      'можно',
      'нужно',
      'этот',
      'этого',
      'этой',
      'этим',
      'такой',
      'таким',
      'только',
      'может',
      'будет',
      'было',
      'были',
      'есть',
      'быть',
      'иметь',
      'либо',
      'поэтому',
      'однако',
      'именно',
      'любой',
      'каждый',
      'того',
      'тем',
      'том',
      'вашей',
      'ваших',
      'ваше',
    ]);
    const words = new Map();
    allItems().forEach((q) => {
      const title = q.querySelector('.pp-faq__question')?.textContent.trim() || '';
      const body = q.querySelector('.pp-faq__panel')?.textContent || '';
      const full = `${title} ${body}`.toLowerCase();
      full
        .replace(/[^а-яёa-z0-9\-]/gi, ' ')
        .split(/\s+/)
        .filter((w) => w.length >= 3 && !stopWords.has(w))
        .forEach((w) => {
          if (!words.has(w)) words.set(w, { word: w, qs: [] });
          const entry = words.get(w);
          if (!entry.qs.find((x) => x.title === title)) {
            entry.qs.push({ title, body: body.trim().slice(0, 200) });
          }
        });
    });
    return words;
  }

  const wordIndex = buildWordIndex();

  function getSuggestions(raw) {
    if (!raw.trim()) return [];
    const tokens = raw.toLowerCase().split(/\s+/);
    const last = tokens[tokens.length - 1];
    if (last.length < 2) return [];
    const matches = [];
    for (const [word, entry] of wordIndex) {
      if (word.startsWith(last) && word !== last) {
        matches.push({ word, entry, prefix: last });
      }
    }
    matches.sort((a, b) => a.word.length - b.word.length);
    return matches.slice(0, 6);
  }

  function hlWord(word, prefix) {
    const idx = word.indexOf(prefix);
    if (idx === -1) return word;
    return word.slice(0, idx) + `<mark>${word.slice(idx, idx + prefix.length)}</mark>` + word.slice(idx + prefix.length);
  }

  function hlSnippet(text, term) {
    const lo = text.toLowerCase();
    const idx = lo.indexOf(term);
    if (idx === -1) return `${text.slice(0, 80)}…`;
    const start = Math.max(0, idx - 30);
    const end = Math.min(text.length, idx + term.length + 50);
    const snippet = (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
    const re = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    return snippet.replace(re, (m) => `<mark>${m}</mark>`);
  }

  function navigateSuggestions(dir) {
    const items = Array.from(sugBox.querySelectorAll('.pp-faq__suggestion-item'));
    if (!items.length) return false;
    items.forEach((el) => el.classList.remove('pp-faq__suggestion-item--active'));
    activeIdx = (activeIdx + dir + items.length) % items.length;
    items[activeIdx].classList.add('pp-faq__suggestion-item--active');
    return true;
  }

  function renderSuggestions(raw) {
    const suggestions = getSuggestions(raw);
    activeIdx = -1;
    if (!raw.trim() || suggestions.length === 0) {
      setSuggestionsOpen(false);
      sugBox.innerHTML = '';
      return;
    }
    const tokens = raw.toLowerCase().split(/\s+/);
    const lastToken = tokens[tokens.length - 1];
    sugBox.innerHTML = suggestions
      .map((s) => {
        const first = s.entry.qs[0];
        const extra = s.entry.qs.length > 1 ? ` <span class="pp-faq__sug-extra">+${s.entry.qs.length - 1} вопр.</span>` : '';
        const snippet = hlSnippet(first.body, s.word);
        return (
          `<div class="pp-faq__suggestion-item" role="option" data-word="${String(s.word).replace(/"/g, '&quot;')}">` +
          '<div class="pp-faq__sug-col">' +
          `<div class="pp-faq__sug-text">${hlWord(s.word, lastToken)}${extra}</div>` +
          `<div class="pp-faq__sug-snippet">${snippet}</div>` +
          '</div></div>'
        );
      })
      .join('');
    if (suggestions.length === 6) {
      sugBox.innerHTML += '<div class="pp-faq__sug-more">Продолжайте вводить для уточнения…</div>';
    }
    sugBox.querySelectorAll('.pp-faq__suggestion-item').forEach((el) => {
      el.addEventListener('mousedown', (e) => {
        e.preventDefault();
        pickSuggestion(el.getAttribute('data-word') || '');
      });
    });
    setSuggestionsOpen(true);
  }

  function pickSuggestion(word) {
    if (!word) return;
    const tokens = input.value.split(/\s+/);
    tokens[tokens.length - 1] = word;
    input.value = `${tokens.join(' ')} `;
    setSuggestionsOpen(false);
    sugBox.innerHTML = '';
    activeIdx = -1;
    doSearch();
    input.focus();
  }

  function stripMarks(el) {
    el.querySelectorAll('mark').forEach((m) => {
      m.replaceWith(document.createTextNode(m.textContent || ''));
    });
    el.normalize();
  }

  function highlightText(node, terms) {
    if (node.nodeType === 3) {
      const val = node.nodeValue || '';
      const lower = val.toLowerCase();
      const result = [];
      let last = 0;
      let found = false;
      for (const term of terms) {
        let idx = 0;
        while ((idx = lower.indexOf(term, last)) !== -1) {
          if (idx > last) result.push(document.createTextNode(val.slice(last, idx)));
          const m = document.createElement('mark');
          m.textContent = val.slice(idx, idx + term.length);
          result.push(m);
          last = idx + term.length;
          found = true;
        }
      }
      if (found && last < val.length) result.push(document.createTextNode(val.slice(last)));
      if (found) {
        const f = document.createDocumentFragment();
        result.forEach((n) => f.appendChild(n));
        node.parentNode.replaceChild(f, node);
      }
    } else if (node.nodeType === 1 && !['SCRIPT', 'STYLE', 'A', 'MARK', 'SVG', 'TEMPLATE'].includes(node.tagName)) {
      Array.from(node.childNodes).forEach((child) => highlightText(child, terms));
    }
  }

  function doSearch() {
    const raw = input.value.trim();
    const terms = raw
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length >= 2);
    clearBtn.hidden = raw.length === 0;
    if (raw.length === 0) {
      root.dataset.ppFaqSearchActive = '';
      allItems().forEach((q) => {
        stripMarks(q);
        q.classList.remove('pp-faq__item--hidden-by-search');
        closePpFaqItem(q);
      });
      allDividers().forEach((d) => d.classList.remove('pp-faq__divider--hidden'));
      countEl.textContent = '';
      countEl.classList.remove('pp-faq__search-count--active');
      emptyEl.hidden = true;
      return;
    }

    if (terms.length === 0) {
      root.dataset.ppFaqSearchActive = '';
      allItems().forEach((q) => {
        stripMarks(q);
        q.classList.remove('pp-faq__item--hidden-by-search');
      });
      allDividers().forEach((d) => d.classList.remove('pp-faq__divider--hidden'));
      countEl.textContent = '';
      countEl.classList.remove('pp-faq__search-count--active');
      emptyEl.hidden = true;
      return;
    }

    root.dataset.ppFaqSearchActive = '1';
    let matched = 0;
    allItems().forEach((q) => {
      stripMarks(q);
      const text = q.textContent.toLowerCase();
      const match = terms.every((t) => text.includes(t));
      if (match) {
        q.classList.remove('pp-faq__item--hidden-by-search');
        openPpFaqItem(q);
        highlightText(q, terms);
        matched += 1;
      } else {
        q.classList.add('pp-faq__item--hidden-by-search');
        closePpFaqItem(q);
      }
    });

    allDividers().forEach((divider) => {
      let next = divider.nextElementSibling;
      let has = false;
      while (next && !next.classList.contains('pp-faq__divider')) {
        if (next.matches('[data-faq-item]') && !next.classList.contains('pp-faq__item--hidden-by-search')) {
          has = true;
        }
        next = next.nextElementSibling;
      }
      divider.classList.toggle('pp-faq__divider--hidden', !has);
    });

    const pl = matched === 1 ? 'вопрос' : matched < 5 ? 'вопроса' : 'вопросов';
    countEl.textContent = matched === 0 ? '' : `Найдено: ${matched} ${pl}`;
    countEl.classList.toggle('pp-faq__search-count--active', matched > 0);
    emptyEl.hidden = matched !== 0;
  }

  function clearSearch() {
    input.value = '';
    setSuggestionsOpen(false);
    sugBox.innerHTML = '';
    activeIdx = -1;
    input.focus();
    doSearch();
  }

  input.addEventListener('input', () => {
    doSearch();
    renderSuggestions(input.value);
  });

  input.addEventListener('keydown', (e) => {
    if (!sugBox.hidden) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        navigateSuggestions(1);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        navigateSuggestions(-1);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        const active = sugBox.querySelector('.pp-faq__suggestion-item--active');
        if (active) {
          e.preventDefault();
          pickSuggestion(active.getAttribute('data-word') || '');
        }
      }
    }
    if (e.key === 'Escape') {
      if (!sugBox.hidden) {
        setSuggestionsOpen(false);
        sugBox.innerHTML = '';
      } else {
        clearSearch();
      }
    }
  });

  clearBtn.addEventListener('click', clearSearch);

  const resetBtn = $('[data-pp-faq-search-reset]');
  if (resetBtn) resetBtn.addEventListener('click', clearSearch);

  document.addEventListener('click', (e) => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    if (!t.closest('.pp-faq__search-wrap')) {
      setSuggestionsOpen(false);
      sugBox.innerHTML = '';
      activeIdx = -1;
    }
  });
}

