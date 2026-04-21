/**
 * POBYT POLSKA — animations.js
 * ---------------------------------------------------------------
 * Пара мелких хелперов для анимаций, которым нужен JS: ripple,
 * magnetic, shake, loading, success-morph, reveal on scroll,
 * header shadow, counter. Каждая функция — самостоятельная,
 * можно подключать только те, что нужны.
 *
 * Подключение (одной строкой в main.js):
 *   import { initAnimations } from './shared/animations.js';
 *   initAnimations();
 *
 * Или адресно:
 *   import { initRipple, initReveal } from './shared/animations.js';
 *   initRipple();
 *   initReveal();
 *
 * Требует animations.css — классы .is-loading / .is-done / .is-error /
 * .is-in / .is-scrolled / переменные --mx/--my/--x/--y.
 * Все функции no-op, если DOM нужных элементов не нашёл.
 */

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/* ---------------------------------------------------------------
 * RIPPLE — волна из точки клика
 * Вешаем на все [data-ripple] один делегированный listener.
 * --------------------------------------------------------------- */
export function initRipple(root = document) {
  root.addEventListener('click', (e) => {
    const btn = e.target.closest?.('[data-ripple]');
    if (!btn) return;
    if (prefersReducedMotion()) return;

    const r = btn.getBoundingClientRect();
    const span = document.createElement('span');
    span.className = 'ripple';
    span.style.setProperty('--x', e.clientX - r.left + 'px');
    span.style.setProperty('--y', e.clientY - r.top + 'px');
    btn.append(span);
    setTimeout(() => span.remove(), 500);
  });
}

/* ---------------------------------------------------------------
 * MAGNETIC — кнопка «притягивается» к курсору
 * Вешается на элементы [data-magnetic]. Сила — data-strength="0.25"
 * (по умолчанию 0.25). Отключается на тач-устройствах и при
 * reduced motion.
 * --------------------------------------------------------------- */
export function initMagnetic(root = document) {
  if (prefersReducedMotion()) return;
  if (window.matchMedia?.('(pointer: coarse)').matches) return;

  root.querySelectorAll('[data-magnetic]').forEach((el) => {
    const strength = parseFloat(el.dataset.strength || '0.25');
    const reset = () => {
      el.style.setProperty('--mx', 0);
      el.style.setProperty('--my', 0);
    };
    el.addEventListener('mousemove', (e) => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left - r.width / 2;
      const y = e.clientY - r.top - r.height / 2;
      el.style.setProperty('--mx', x * strength);
      el.style.setProperty('--my', y * strength);
    });
    el.addEventListener('mouseleave', reset);
    el.addEventListener('blur', reset);
  });
}

/* ---------------------------------------------------------------
 * SHAKE — вызывать из кода валидации формы
 *   import { shake } from './shared/animations.js';
 *   if (!valid) shake(submitBtn);
 * --------------------------------------------------------------- */
export function shake(el) {
  if (!el) return;
  el.classList.remove('is-error');
  // force reflow чтобы анимация запустилась повторно
  void el.offsetWidth;
  el.classList.add('is-error');
  setTimeout(() => el.classList.remove('is-error'), 500);
}

/* ---------------------------------------------------------------
 * LOADING — ставит/снимает состояние ожидания
 * Использование:
 *   setLoading(btn, true);
 *   try { await send(); } finally { setLoading(btn, false); }
 * --------------------------------------------------------------- */
export function setLoading(el, loading = true) {
  if (!el) return;
  el.classList.toggle('is-loading', loading);
  el.toggleAttribute('aria-busy', loading);
  if (loading) el.setAttribute('data-prev-disabled', el.disabled ? '1' : '0');
  if (!loading && el.getAttribute('data-prev-disabled') === '0') {
    el.disabled = false;
    el.removeAttribute('data-prev-disabled');
  }
  if (loading) el.disabled = true;
}

/* ---------------------------------------------------------------
 * SUCCESS — успех с авто-откатом
 * Использование:
 *   await markSuccess(btn, 1800);
 * --------------------------------------------------------------- */
export function markSuccess(el, resetAfter = 1800) {
  if (!el) return Promise.resolve();
  el.classList.remove('is-loading');
  el.classList.add('is-done');
  return new Promise((resolve) =>
    setTimeout(() => {
      el.classList.remove('is-done');
      resolve();
    }, resetAfter)
  );
}

/* ---------------------------------------------------------------
 * REVEAL ON SCROLL — показывает элементы с [data-reveal]
 * Один observer на страницу, отписывается после первого показа.
 * --------------------------------------------------------------- */
export function initReveal(root = document) {
  const elements = root.querySelectorAll('[data-reveal]');
  if (!elements.length) return;

  if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
    elements.forEach((el) => el.classList.add('is-in'));
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
  );

  elements.forEach((el) => io.observe(el));
}

/* ---------------------------------------------------------------
 * HEADER SHADOW — тень появляется после скролла
 * --------------------------------------------------------------- */
export function initHeaderShadow(selector = '.header', offset = 8) {
  const header = document.querySelector(selector);
  if (!header) return;

  let ticking = false;
  const update = () => {
    const scrolled = window.scrollY > offset;
    header.classList.toggle('is-scrolled', scrolled);
    ticking = false;
  };
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
  }, { passive: true });
  update();
}

/* ---------------------------------------------------------------
 * COUNTER — плавное «накручивание» числа при появлении в viewport
 * Разметка:
 *   <span data-counter data-counter-target="2500" data-counter-format="+{n}">
 *     0
 *   </span>
 * --------------------------------------------------------------- */
export function initCounters(root = document) {
  const counters = root.querySelectorAll('[data-counter]');
  if (!counters.length) return;

  const reduced = prefersReducedMotion();

  const animate = (el) => {
    el.classList.add('is-in');
    const target = parseFloat(el.dataset.counterTarget || el.textContent) || 0;
    const format = el.dataset.counterFormat || '{n}';
    if (reduced) {
      el.textContent = format.replace('{n}', Math.round(target));
      return;
    }
    const duration = parseFloat(el.dataset.counterDuration || '1200');
    const start = performance.now();
    const from = 0;
    const step = (now) => {
      const p = Math.min(1, (now - start) / duration);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - p, 3);
      const value = Math.round(from + (target - from) * eased);
      el.textContent = format.replace('{n}', value.toLocaleString('ru-RU'));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  if (!('IntersectionObserver' in window)) {
    counters.forEach(animate);
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          animate(e.target);
          io.unobserve(e.target);
        }
      });
    },
    { threshold: 0.4 }
  );
  counters.forEach((el) => io.observe(el));
}

/* ---------------------------------------------------------------
 * ACCORDION — общий делегирующий обработчик для .acc-item
 * Кликабельный .acc-head, состояние — aria-expanded на .acc-item.
 * (Плавное раскрытие — чистый CSS через grid-template-rows.)
 * --------------------------------------------------------------- */
export function initAccordion(root = document) {
  root.addEventListener('click', (e) => {
    const head = e.target.closest?.('.acc-head');
    if (!head) return;
    const item = head.closest('.acc-item');
    const group = head.closest('[data-accordion]');
    if (!item) return;
    const open = item.getAttribute('aria-expanded') === 'true';

    // если стоит data-accordion="single" — закрываем соседей
    if (group && group.dataset.accordion === 'single') {
      group.querySelectorAll('.acc-item').forEach((i) => {
        if (i !== item) i.setAttribute('aria-expanded', 'false');
      });
    }
    item.setAttribute('aria-expanded', String(!open));
  });
}

/* ---------------------------------------------------------------
 * Init-all: удобный shortcut для main.js
 * --------------------------------------------------------------- */
export function initAnimations(root = document) {
  initRipple(root);
  initMagnetic(root);
  initReveal(root);
  initHeaderShadow('.header', 8);
  initCounters(root);
  initAccordion(root);
}
