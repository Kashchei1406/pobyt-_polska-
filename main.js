import { $, $$ } from './js/shared/dom.js';
import { storage } from './js/shared/storage.js';
import { initDropdowns } from './js/modules/dropdowns.js';
import { initLeadModalBridge, initModals as initModalController } from './js/modules/modal.js';
import { initPpFaq, initPpFaqSearch } from './js/modules/faq.js';
import { initMobileMenu } from './js/modules/header.js?v=5';
import { initThemeToggle } from './js/modules/theme.js';
import { initContactPrefRadios, initForms, submitToGoogleWebApp } from './js/modules/forms.js';
import { initCityAutofill, initCitySelectAppearance } from './js/modules/city-autofill.js';
import { initReviews } from './js/modules/reviews.js';
import { MSG } from './js/config/messages.js';
import { initQuiz } from './js/modules/quiz.js';
import { initServicesModals } from './js/modules/services-modal.js?v=4';

function setYear() {
  const el = $('[data-year]');
  if (el) el.textContent = String(new Date().getFullYear());
}


function initCrestRevealScroll() {
  const targets = $$('[data-crest-reveal]');
  if (!targets.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!(entry.target instanceof HTMLElement)) return;
        if (entry.intersectionRatio >= 0.18) entry.target.classList.add('crest-on');
        else entry.target.classList.remove('crest-on');
      });
    },
    { threshold: [0, 0.12, 0.18, 0.35, 0.6, 0.9] },
  );

  targets.forEach((t) => observer.observe(t));
}

function initCookies() {
  const bar = $('[data-cookie]');
  if (!bar) return;
  const key = 'cookie_consent_v1';

  const show = () => (bar.hidden = false);
  const hide = () => (bar.hidden = true);
  const stored = storage.get(key);
  if (!stored) show();

  const accept = $('[data-cookie-accept]');
  if (accept) {
    accept.addEventListener('click', () => {
      storage.setJSON(key, { acceptedAt: Date.now() });
      hide();
    });
  }

  const settings = $('[data-cookie-settings]');
  if (settings) {
    settings.addEventListener('click', () => {
      storage.remove(key);
      // TODO(part-3): заменить alert(...) на toast(message, variant)
      alert(MSG.cookiesSettingsStub);
    });
  }
}

function initMapLoader() {
  const wrapper = document.querySelector('[data-map-wrapper]');
  if (!wrapper) return;
  const iframe = wrapper.querySelector('[data-map-iframe]');
  const loader = wrapper.querySelector('[data-map-loader]');
  if (!iframe || !loader) return;

  const hide = () => {
    loader.hidden = true;
  };

  iframe.addEventListener('load', hide, { once: true });
  iframe.addEventListener('error', hide, { once: true });

  // На всякий случай скрываем лоудер, если карта грузится слишком долго
  setTimeout(hide, 8000);
}

function initPageLoader() {
  const loader = document.querySelector('[data-page-loader]');
  if (!loader) return;

  const hide = () => {
    loader.hidden = true;
  };

  if (document.readyState === 'complete') {
    hide();
    return;
  }

  window.addEventListener('load', hide, { once: true });
  setTimeout(hide, 6000);
}

function initAnimatedText() {
  const el = document.querySelector('[data-animated-text]');
  if (!el) return;
  const text = el.textContent || '';
  el.textContent = '';
  const frag = document.createDocumentFragment();
  let index = 0;
  const words = text.split(/(\s+)/);
  words.forEach(function (token) {
    if (/^\s+$/.test(token)) {
      frag.appendChild(document.createTextNode(token));
      return;
    }
    const wordSpan = document.createElement('span');
    wordSpan.className = 'hero__word';
    Array.from(token).forEach(function (ch) {
      const span = document.createElement('span');
      span.textContent = ch;
      span.style.animationDelay = (index++ * 0.06) + 's';
      wordSpan.appendChild(span);
    });
    frag.appendChild(wordSpan);
  });
  el.appendChild(frag);
  el.classList.add('text-spark');
}

setYear();
initMobileMenu();
initThemeToggle();
initDropdowns();
initServicesModals();
initModalController();
initLeadModalBridge();
initPpFaq();
initPpFaqSearch();
initCityAutofill();
initCitySelectAppearance();
initCrestRevealScroll();
initForms();
initContactPrefRadios();
initCookies();
initMapLoader();
initPageLoader();
initAnimatedText();
initQuiz({ submitToGoogleWebApp });
initReviews();

