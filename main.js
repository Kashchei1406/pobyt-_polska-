const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/** Совпадает с pobyt-quiz-embed.js (PPQ_STORAGE_KEY) */
const QUIZ_STORAGE_KEY = 'pobyt_quiz_result';

/**
 * Данные квиза для заявки: сначала снимок из скрипта квиза (память + merge с LS),
 * иначе только localStorage — на случай сбоя записи в storage или устаревшего парсинга.
 */
function getQuizPayloadForLeadForm() {
  try {
    if (typeof window.ppqGetQuizSnapshotForLead === 'function') {
      const snap = window.ppqGetQuizSnapshotForLead();
      if (snap && snap.answers && String(snap.answers).trim()) return snap;
    }
  } catch (_) {}
  try {
    const stored = localStorage.getItem(QUIZ_STORAGE_KEY);
    if (!stored) return null;
    const quiz = JSON.parse(stored);
    if (quiz && quiz.answers && String(quiz.answers).trim()) return quiz;
  } catch (_) {}
  return null;
}

function setYear() {
  const el = $('[data-year]');
  if (el) el.textContent = String(new Date().getFullYear());
}

function initMobileMenu() {
  const burger = $('[data-burger]');
  const mobile = $('#mobileMenu');
  if (!burger || !mobile) return;

  const setOpen = (open) => {
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    mobile.hidden = !open;
  };

  burger.addEventListener('click', () => {
    const open = burger.getAttribute('aria-expanded') !== 'true';
    setOpen(open);
  });

  $$('[data-mobile-link]', mobile).forEach((a) => {
    a.addEventListener('click', () => setOpen(false));
  });
}

function initAccordion() {
  const root = $('[data-accordion]');
  if (!root) return;

  root.addEventListener('toggle', (e) => {
    const target = e.target;
    if (!(target instanceof HTMLDetailsElement)) return;
    if (!target.open) return;
    $$('.qa', root).forEach((d) => {
      if (d !== target) d.open = false;
    });
  });
}

function initModals() {
  const modal = $('[data-modal]');
  const policy = $('[data-policy]');
  if (!modal || !policy) return;

  const openPolicy = () => {
    if (typeof policy.showModal === 'function') policy.showModal();
  };

  function openLeadModal(source, messageText) {
    const form = modal.querySelector('[data-lead-form]');
    const sourceInput = form && form.querySelector('input[name="source"]');
    const messageField = form && form.querySelector('textarea[name="message"]');
    if (sourceInput) sourceInput.value = source || 'modal';
    if (messageField) messageField.value = messageText || '';
    if (typeof modal.showModal === 'function') modal.showModal();
    scheduleCityAutofillSync(form);
  }

  /* Делегирование: кнопка CTA в результате квиза вставляется позже через innerHTML */
  document.addEventListener('click', (e) => {
    const btn = e.target instanceof Element ? e.target.closest('[data-open-lead]') : null;
    if (!btn) return;
    const source = btn.getAttribute('data-open-lead') || 'modal';
    openLeadModal(source, '');
  });

  $$('[data-service-tile]').forEach((tile) => {
    const onTileClick = () => {
      const titleEl = tile.querySelector('h3');
      const descEl = tile.querySelector('p');
      const title = titleEl ? titleEl.textContent.trim() : '';
      const desc = descEl ? descEl.textContent.trim() : '';
      const messageText = title && desc ? 'Услуга: ' + title + '\n\n' + desc : title || desc || '';
      openLeadModal('service', messageText);
    };
    tile.addEventListener('click', onTileClick);
    tile.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onTileClick();
      }
    });
  });

  const policyBtn = $('[data-open-policy]');
  if (policyBtn) policyBtn.addEventListener('click', openPolicy);

  const closeBtn = $('[data-close-modal]', modal);
  if (closeBtn) closeBtn.addEventListener('click', () => modal.close());

  modal.addEventListener('click', (e) => {
    const card = $('[data-modal-card]', modal);
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const inCard =
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom;
    if (!inCard) modal.close();
  });

  // После close() фокус возвращается на карточку услуги — убираем, чтобы не оставалась красная рамка
  modal.addEventListener('close', () => {
    const root = document.documentElement;
    root.classList.add('modal-just-closed');

    const tryBlur = (triesLeft) => {
      requestAnimationFrame(() => {
        const el = document.activeElement;
        const tile = el && el.closest ? el.closest('[data-service-tile]') : null;
        if (tile) tile.blur();
        if (triesLeft > 0) {
          setTimeout(() => tryBlur(triesLeft - 1), 30);
        }
      });
    };

    tryBlur(2);

    setTimeout(() => {
      root.classList.remove('modal-just-closed');
    }, 900);
  });
}

function normalizePhone(value) {
  return value.replace(/[^\d+]/g, '').replace(/^00/, '+');
}

/** Нормализация для сопоставления города из автозаполнения (латиница/польские знаки) */
function cityAutofillNormKey(s) {
  if (!s || typeof s !== 'string') return '';
  try {
    return s
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .toLowerCase()
      .trim();
  } catch (_) {
    return s.toLowerCase().trim();
  }
}

/** Псевдонимы → значение option[name=city] на сайте */
function buildCityAutofillMap() {
  /** @type {Record<string, string>} */
  const m = {};
  const add = (/** @type {string[]} */ aliases, /** @type {string} */ value) => {
    aliases.forEach((a) => {
      const k = cityAutofillNormKey(a);
      if (k) m[k] = value;
    });
  };
  add(['Варшава', 'Warszawa', 'Warsaw', 'Varshava'], 'Варшава');
  add(['Kraków', 'Krakow', 'Cracow', 'Krakau'], 'Краков');
  add(['Łódź', 'Lodz'], 'Лодзь');
  add(['Wrocław', 'Wroclaw', 'Breslau'], 'Вроцлав');
  add(['Poznań', 'Poznan', 'Posen'], 'Познань');
  add(['Gdańsk', 'Gdansk', 'Danzig'], 'Гданьск');
  add(['Szczecin', 'Stettin'], 'Щецин');
  add(['Bydgoszcz', 'Bromberg'], 'Быдгощ');
  add(['Lublin'], 'Люблин');
  add(['Białystok', 'Bialystok'], 'Белосток');
  add(['Katowice', 'Kattowitz'], 'Катовице');
  add(['Gdynia', 'Gdingen'], 'Гдыня');
  return m;
}

const CITY_AUTOFILL_MAP = buildCityAutofillMap();

/**
 * Подставляет город в select из скрытого поля с autocomplete=address-level2
 * (как имя/телефон из сохранённых данных Chrome и др.).
 */
function syncCityFromAutofillHook(form) {
  if (!form) return;
  const hook = form.querySelector('[data-city-autofill]');
  const select = /** @type {HTMLSelectElement | null} */ (form.querySelector('select[name="city"]'));
  if (!hook || !select) return;
  const raw = (hook.value || '').trim();
  if (!raw) return;

  const tokens = new Set();
  const push = (/** @type {string} */ t) => {
    const k = cityAutofillNormKey(t);
    if (k.length >= 2) tokens.add(k);
  };
  push(raw);
  raw.split(',').forEach((p) => push(p));
  raw.split(/[\s/]+/).forEach((p) => {
    if (p.replace(/\d/g, '').trim().length >= 3) push(p);
  });

  let chosen = '';
  for (const t of tokens) {
    if (CITY_AUTOFILL_MAP[t]) {
      chosen = CITY_AUTOFILL_MAP[t];
      break;
    }
  }
  if (!chosen) {
    for (const t of tokens) {
      for (const key of Object.keys(CITY_AUTOFILL_MAP)) {
        if (t.length >= 4 && (t.includes(key) || key.includes(t))) {
          chosen = CITY_AUTOFILL_MAP[key];
          break;
        }
      }
      if (chosen) break;
    }
  }

  if (!chosen) return;
  const opt = Array.from(select.options).find((o) => o.value === chosen);
  if (opt) {
    select.value = chosen;
    updateCitySelectFilledState(select);
  }
}

/** Цвет текста как у имя/телефон после выбора города (Chrome и др.) */
function updateCitySelectFilledState(/** @type {HTMLSelectElement} */ select) {
  const wrap = select.closest('.field-select');
  if (!wrap) return;
  wrap.classList.toggle('field-select--filled', Boolean(select.value && String(select.value).trim()));
}

function initCitySelectAppearance() {
  $$('select[name="city"]').forEach((sel) => {
    updateCitySelectFilledState(/** @type {HTMLSelectElement} */ (sel));
    sel.addEventListener('change', () => updateCitySelectFilledState(/** @type {HTMLSelectElement} */ (sel)));
  });
  $$('[data-lead-form]').forEach((form) => {
    form.addEventListener('reset', () => {
      setTimeout(() => {
        const s = form.querySelector('select[name="city"]');
        if (s) updateCitySelectFilledState(/** @type {HTMLSelectElement} */ (s));
      }, 0);
    });
  });
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

function scheduleCityAutofillSync(form) {
  if (!form) return;
  [0, 100, 400, 1000, 2500].forEach((ms) => {
    setTimeout(() => syncCityFromAutofillHook(form), ms);
  });
}

function initCityAutofill() {
  $$('[data-lead-form]').forEach((form) => {
    const hook = form.querySelector('[data-city-autofill]');
    if (!hook) return;
    hook.addEventListener('input', () => syncCityFromAutofillHook(form));
    hook.addEventListener('change', () => syncCityFromAutofillHook(form));
    form.addEventListener('focusin', () => scheduleCityAutofillSync(form));
  });
  window.addEventListener('load', () => {
    $$('[data-lead-form]').forEach(scheduleCityAutofillSync);
  });
}

function validateForm(form) {
  const name = /** @type {HTMLInputElement | null} */ (form.querySelector('input[name="name"]'));
  const phone = /** @type {HTMLInputElement | null} */ (form.querySelector('input[name="phone"]'));
  const city = /** @type {HTMLSelectElement | null} */ (form.querySelector('select[name="city"]'));
  const message = /** @type {HTMLTextAreaElement | null} */ (form.querySelector('textarea[name="message"]'));
  const ok = /** @type {HTMLElement | null} */ (form.querySelector('.form__ok'));

  const fields = [name, phone, city, message].filter(Boolean);
  fields.forEach((el) => el.setAttribute('aria-invalid', 'false'));
  if (ok) ok.hidden = true;

  let valid = true;
  if (name && name.value.trim().length < 2) {
    name.setAttribute('aria-invalid', 'true');
    valid = false;
  }
  if (phone) {
    const p = normalizePhone(phone.value.trim());
    phone.value = p;
    const digits = p.replace(/[^\d]/g, '');
    if (digits.length < 9) {
      phone.setAttribute('aria-invalid', 'true');
      valid = false;
    }
  }
  if (city && !city.value.trim()) {
    city.setAttribute('aria-invalid', 'true');
    valid = false;
  }
  return { valid, ok };
}

function getFormSource(form) {
  const input = form.querySelector('input[name="source"]');
  if (input && input.value.trim()) return input.value.trim();
  return form.getAttribute('data-form-source') || 'site';
}

/**
 * Отправка в Google Apps Script (веб-приложение).
 * Для GAS надёжнее всего обычный POST формы в именованный iframe (как в документации Google).
 * В Network может быть 403 на script.googleusercontent.com при редиректе ответа — это не значит,
 * что doPost не выполнился; проверяйте строку в таблице / «Выполнения» в Apps Script.
 *
 * Если iframe недоступен — запасной вариант fetch(no-cors).
 */
function submitToGoogleWebApp(url, data, onDone) {
  try {
    if (typeof localStorage !== 'undefined' && localStorage.getItem('debugForm') === '1') {
      console.log('[lead-form] POST →', url, data);
    }
  } catch (_) {}

  const iframe = document.getElementById('form-submit-iframe');
  if (iframe && iframe.name) {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = url;
    form.target = iframe.name;
    form.enctype = 'application/x-www-form-urlencoded';
    form.acceptCharset = 'UTF-8';
    form.style.cssText = 'position:absolute;left:-9999px;top:-9999px;opacity:0;';

    ['name', 'phone', 'city', 'message', 'source'].forEach((key) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = data[key] != null ? String(data[key]) : '';
      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();

    setTimeout(() => {
      try {
        form.remove();
      } catch (_) {}
      onDone();
    }, 2200);
    return;
  }

  const params = new URLSearchParams();
  ['name', 'phone', 'city', 'message', 'source'].forEach((key) => {
    params.append(key, data[key] != null ? String(data[key]) : '');
  });

  fetch(url, {
    method: 'POST',
    mode: 'no-cors',
    cache: 'no-cache',
    credentials: 'omit',
    body: params,
  })
    .then(() => onDone())
    .catch((err) => {
      onDone(err instanceof Error ? err : new Error(String(err)));
    });
}

function initForms() {
  const submitUrl = typeof window.FORM_SUBMIT_URL === 'string' && window.FORM_SUBMIT_URL.trim()
    ? window.FORM_SUBMIT_URL.trim()
    : '';

  $$('[data-lead-form]').forEach((form) => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const { valid, ok } = validateForm(form);
      if (!valid) return;

      const name = (form.querySelector('input[name="name"]') || {}).value || '';
      const phone = (form.querySelector('input[name="phone"]') || {}).value || '';
      const cityEl = form.querySelector('select[name="city"]');
      const city = cityEl && cityEl.value ? cityEl.value.trim() : '';
      let message = (form.querySelector('textarea[name="message"]') || {}).value || '';
      const source = getFormSource(form);

      let quizClearAfterOk = false;
      const quiz = getQuizPayloadForLeadForm();
      if (quiz && quiz.answers && String(quiz.answers).trim()) {
        const formatted = formatQuizAnswersForMessage(quiz);
        const raw = String(quiz.answers).trim();
        const quizBlock = formatted
          ? '\n\n' + formatted
          : '\n\nКвиз (ответы):\n' + raw;
        if (quizBlock.trim()) {
          message = message.trim() ? message.trim() + quizBlock : quizBlock.trim();
          quizClearAfterOk = true;
        }
      }

      const submitBtn = form.querySelector('button[type="submit"]');
      const submitLabelDefault =
        (submitBtn && submitBtn.getAttribute('data-submit-label')) || 'Отправить';
      if (submitUrl) {
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Отправка…';
        }
        submitToGoogleWebApp(
          submitUrl,
          { name: name.trim(), phone: phone.trim(), city, message: message.trim(), source },
          (err) => {
            if (ok) {
              ok.textContent = err ? 'Ошибка отправки. Попробуйте позже.' : 'Готово! Мы получили заявку и скоро свяжемся.';
              ok.hidden = false;
            }
            if (!err) {
              form.reset();
              if (quizClearAfterOk) {
                try {
                  localStorage.removeItem(QUIZ_STORAGE_KEY);
                } catch (_) {}
                if (typeof window.ppqClearQuizAfterLeadSent === 'function') {
                  window.ppqClearQuizAfterLeadSent();
                }
              }
            }
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.textContent = submitLabelDefault;
            }
          },
        );
      } else {
        if (ok) {
          ok.textContent = 'Готово! Мы получили заявку и скоро свяжемся.';
          ok.hidden = false;
        }
        form.reset();
        if (quizClearAfterOk) {
          try {
            localStorage.removeItem(QUIZ_STORAGE_KEY);
          } catch (_) {}
          if (typeof window.ppqClearQuizAfterLeadSent === 'function') {
            window.ppqClearQuizAfterLeadSent();
          }
        }
      }
    });
  });
}

function initCookies() {
  const bar = $('[data-cookie]');
  if (!bar) return;
  const key = 'cookie_consent_v1';

  const show = () => (bar.hidden = false);
  const hide = () => (bar.hidden = true);
  const stored = localStorage.getItem(key);
  if (!stored) show();

  const accept = $('[data-cookie-accept]');
  if (accept) {
    accept.addEventListener('click', () => {
      localStorage.setItem(key, JSON.stringify({ acceptedAt: Date.now() }));
      hide();
    });
  }

  const settings = $('[data-cookie-settings]');
  if (settings) {
    settings.addEventListener('click', () => {
      localStorage.removeItem(key);
      alert('Заглушка настроек cookies. Подключите ваш баннер/категории при необходимости.');
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

const QUIZ_SCORES = {
  q1: { pl: 2, abroad: -1, submitted: 0 },
  q2: { 'umowa-prace': 2, 'umowa-zlecenie': 1, no: -1, searching: -1 },
  q3: { oswiadczenie: 2, 'zezwolenie-a': 2, none: -1 },
  q4: { visa: 1, bezviz: 0, karta: 2, expired: -2 },
  q5: { '3-12': 1, 'year-plus': 2, 'no-work': -1 },
  q6: { no: 2, refusal: -2, wezwanie: -1, deportation: -3 },
  q7: { karta: 1, prolong: 1, appeal: -1, check: 0 },
};

const QUIZ_LOCAL_COUNT_KEY = 'pobyt_quiz_count_local';

/* Подписи к встроенному квизу pobyt-quiz-embed.js (формат storage: q1=pl, q2=visa, …) */
const QUIZ_LABELS = {
  1: {
    q: 'Где вы сейчас находитесь?',
    opts: { pl: 'В Польше', abroad: 'За пределами Польши', submitted: 'Уже подал документы — жду решения' },
  },
  2: {
    q: 'Какой у вас сейчас документ или статус?',
    opts: {
      visa: 'Действующая виза (D или C)',
      karta: 'Карта побыту (действующая)',
      bezviz: 'Безвизовый въезд — 90 дней',
      expired: 'Документы просрочены',
      none: 'Нет никакого документа',
    },
  },
  3: {
    q: 'Есть ли у вас основание для легализации?',
    opts: {
      work: 'Официальная работа (umowa o pracę / zlecenie / o dzieło)',
      jdg: 'Собственный бизнес / JDG',
      family: 'Воссоединение с супругом(ой) / партнёром',
      study: 'Учёба в польском вузе',
      karty: 'Польские корни / карта поляка',
      searching: 'Пока ищу работу',
      none: 'Нет никакого основания',
    },
  },
  4: {
    q: 'Были ли у вас проблемы с документами раньше?',
    opts: {
      clean: 'Нет, всё в порядке',
      refusal: 'Был отказ',
      wezwanie: 'Получал wezwanie (запрос документов)',
      overstay: 'Нарушал сроки пребывания',
      deport: 'Есть постановление о депортации',
    },
  },
  5: {
    q: 'Вы подаёте документы один или вместе с семьёй?',
    opts: {
      solo: 'Только я',
      spouse: 'Я и супруг(а)',
      kids: 'Я, супруг(а) и дети',
      notsure: 'Пока не определился',
    },
  },
  6: {
    q: 'Сколько времени вы уже в Польше?',
    opts: {
      less5: 'Менее 5 лет',
      '5plus': '5 лет и более',
    },
  },
  /* Старый data-quiz (7 шагов) — если в storage остались записи */
  7: {
    q: 'Что вы хотите получить?',
    opts: { karta: 'Карту побыта', prolong: 'Продлить документы', appeal: 'Подать апелляцию', check: 'Только проверить шансы' },
  },
};

function formatQuizAnswersForMessage(quiz) {
  let rawAnswers = '';
  if (quiz && quiz.answers != null) {
    rawAnswers = Array.isArray(quiz.answers)
      ? quiz.answers.filter(Boolean).join(', ')
      : String(quiz.answers).trim();
  }
  if (!rawAnswers) return '';
  const lines = ['Квиз (ответы):'];
  const pairs = rawAnswers
    .split(/,\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
  for (const pair of pairs) {
    const eq = pair.indexOf('=');
    if (eq < 1) continue;
    const qn = pair.slice(0, eq).trim();
    const val = pair.slice(eq + 1).trim();
    if (!qn || !qn.startsWith('q')) continue;
    const num = parseInt(qn.slice(1), 10);
    const label = QUIZ_LABELS[num];
    const answerText =
      val && val !== '-' && label && label.opts && label.opts[val] ? label.opts[val] : (val || '—');
    lines.push(`${num}. ${answerText}`);
  }
  if (lines.length <= 1) return '';
  return lines.join('\n');
}

const QUIZ_RESULTS = {
  high: {
    title: 'Высокие шансы',
    titleClass: 'quiz__result-title--high',
    desc: '👉 можно подавать на карту побыта',
  },
  medium: {
    title: 'Средние шансы',
    titleClass: 'quiz__result-title--medium',
    desc: '👉 нужно подготовить документы',
  },
  risk: {
    title: 'Есть риски отказа',
    titleClass: 'quiz__result-title--risk',
    desc: '👉 нужна консультация',
  },
};

function initQuiz() {
  const wrapper = document.querySelector('[data-quiz]');
  if (!wrapper) return;
  const introEl = wrapper.querySelector('[data-quiz-intro]');
  const bodyEl = wrapper.querySelector('[data-quiz-body]');
  const questionsEl = wrapper.querySelector('[data-quiz-questions]');
  const progressEl = wrapper.querySelector('[data-quiz-progress]');
  const startBtn = wrapper.querySelector('[data-quiz-start]');
  const nextBtn = wrapper.querySelector('[data-quiz-next]');
  const resultEl = wrapper.querySelector('[data-quiz-result]');
  const resultTitle = wrapper.querySelector('[data-quiz-result-title]');
  const resultDesc = wrapper.querySelector('[data-quiz-result-desc]');

  if (!introEl || !bodyEl || !questionsEl || !startBtn || !nextBtn || !resultEl || !resultTitle || !resultDesc)
    return;

  const steps = Array.from(wrapper.querySelectorAll('[data-quiz-step]')).sort(
    (a, b) => Number(a.dataset.quizStep || 0) - Number(b.dataset.quizStep || 0),
  );
  const total = steps.length;
  let current = 0;

  const updateProgress = () => {
    if (!progressEl) return;
    progressEl.textContent = `Вопрос ${current + 1} из ${total}`;
  };

  const showStep = (index) => {
    wrapper.querySelectorAll('input[type="radio"]').forEach((input) => input.blur());
    steps.forEach((el, i) => {
      el.hidden = i !== index;
    });
    current = index;
    updateProgress();
  };

  function saveQuizProgress(upToStep, resultData) {
    const answers = [];
    for (let i = 1; i <= upToStep; i++) {
      const qName = `q${i}`;
      const checked = wrapper.querySelector(`input[name="${qName}"]:checked`);
      answers.push(checked ? `${qName}=${checked.value}` : `${qName}=-`);
    }
    try {
      const payload = {
        step: upToStep,
        answers: answers.join(', '),
        ...resultData,
      };
      localStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify(payload));
    } catch (_) {}
  }

  startBtn.addEventListener('click', () => {
    introEl.hidden = true;
    bodyEl.hidden = false;
    showStep(0);
    wrapper.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  const closeQuiz = () => {
    if (document.activeElement && wrapper.contains(document.activeElement)) {
      document.activeElement.blur();
    }
    resultEl.hidden = true;
    questionsEl.hidden = false;
    bodyEl.hidden = true;
    introEl.hidden = false;
    current = 0;
    steps.forEach((el, i) => {
      el.hidden = i !== 0;
    });
    wrapper.querySelectorAll('input[type="radio"]').forEach((input) => {
      input.checked = false;
    });
  };

  nextBtn.addEventListener('click', () => {
    const qName = `q${current + 1}`;
    const checked = wrapper.querySelector(`input[name="${qName}"]:checked`);
    if (!checked) {
      alert('Ответьте, пожалуйста, на этот вопрос.');
      return;
    }

    if (current < total - 1) {
      const nextStep = current + 1;
      showStep(nextStep);
      saveQuizProgress(nextStep);
      return;
    }

    let score = 0;
    for (let i = 1; i <= 7; i++) {
      const qName = `q${i}`;
      const checked = wrapper.querySelector(`input[name="${qName}"]:checked`);
      if (!checked) continue;
      const scores = QUIZ_SCORES[qName];
      if (scores && scores[checked.value] !== undefined) score += scores[checked.value];
    }

    let key = 'risk';
    if (score >= 8) key = 'high';
    else if (score >= 2) key = 'medium';

    const res = QUIZ_RESULTS[key];
    resultTitle.textContent = res.title;
    resultTitle.className = 'quiz__result-title ' + (res.titleClass || '');
    resultDesc.textContent = res.desc;

    questionsEl.hidden = true;
    bodyEl.hidden = true;
    resultEl.hidden = false;
    resultEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    const answers = [];
    for (let i = 1; i <= 7; i++) {
      const qName = `q${i}`;
      const checked = wrapper.querySelector(`input[name="${qName}"]:checked`);
      answers.push(checked ? `${qName}=${checked.value}` : `${qName}=-`);
    }
    saveQuizProgress(7, {
      key,
      title: res.title,
      score,
      completedAt: Date.now(),
    });

    try {
      const currentLocal = Number(localStorage.getItem(QUIZ_LOCAL_COUNT_KEY) || '0');
      localStorage.setItem(QUIZ_LOCAL_COUNT_KEY, String(currentLocal + 1));
    } catch (_) {}

    const submitUrl = typeof window.FORM_SUBMIT_URL === 'string' && window.FORM_SUBMIT_URL.trim()
      ? window.FORM_SUBMIT_URL.trim()
      : '';
    if (submitUrl) {
      submitToGoogleWebApp(
        submitUrl,
        {
          name: 'QuizCount',
          phone: '-',
          city: '',
          message: 'inc',
          source: 'quiz_count',
        },
        () => {},
      );
    }
  });

  wrapper.addEventListener('click', (e) => {
    if (e.target.closest('[data-quiz-close]')) closeQuiz();
  });
}

function escapeHtml(s) {
  if (s == null || s === '') return '';
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function starsFromRating(rating) {
  const n = Math.min(5, Math.max(0, Math.round(Number(rating) || 0)));
  return '★'.repeat(n) + '☆'.repeat(5 - n);
}

function initReviews() {
  const container = $('[data-reviews-container]');
  const track = $('[data-reviews-track]', container);
  const loading = $('[data-reviews-loading]', container);
  if (!track) return;

  function setFallback(message) {
    track.setAttribute('data-reviews-loaded', '0');
    track.innerHTML = '<div class="reviews-carousel__loading">' + escapeHtml(message) + ' <a href="https://www.google.com/maps/place/Pobyt+Polska" target="_blank" rel="noreferrer">Открыть в Google Maps</a></div>';
  }

  function render(data) {
    if (loading) loading.remove();
    if (!data || !data.ok || !Array.isArray(data.reviews) || data.reviews.length === 0) {
      var msg = 'Отзывы можно посмотреть в Google Maps.';
      if (data && data.error) msg += ' (Ошибка: ' + String(data.error) + ')';
      setFallback(msg);
      return;
    }
    const list = data.reviews;
    const cardSize = (100 / (list.length * 2)).toFixed(4);
    track.style.setProperty('--review-card-size', cardSize + '%');
    track.setAttribute('data-reviews-loaded', '1');
    const cards = list.map((r) => {
      const text = (r.text || '').trim() || '—';
      const author = escapeHtml((r.author_name || '').trim() || 'Гость');
      const stars = starsFromRating(r.rating);
      const time = (r.relative_time_description || '').trim();
      return (
        '<article class="review-card">' +
        '<div class="review-card__stars" aria-hidden="true">' + escapeHtml(stars) + '</div>' +
        '<div class="review-card__text-wrap">' +
        '<p class="review-card__text" data-review-text>' + escapeHtml(text) + '</p>' +
        '<button type="button" class="review-card__expand" data-review-expand aria-expanded="false" hidden>Развернуть</button>' +
        '</div>' +
        '<p class="review-card__author">' + author + (time ? ' · ' + escapeHtml(time) : '') + '</p>' +
        '<p class="review-card__source">Google Maps</p>' +
        '</article>'
      );
    });
    track.innerHTML = cards.concat(cards).join('');
    // Показать кнопку «Развернуть» только у карточек, где текст обрезан (после отрисовки)
    function showExpandIfOverflow() {
      track.querySelectorAll('.review-card').forEach(function (card) {
        var textEl = card.querySelector('[data-review-text]');
        var btn = card.querySelector('[data-review-expand]');
        if (textEl && btn && textEl.scrollHeight > textEl.clientHeight) btn.hidden = false;
      });
    }
    requestAnimationFrame(function () { requestAnimationFrame(showExpandIfOverflow); });
    track.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-review-expand]');
      if (!btn) return;
      var card = btn.closest('.review-card');
      if (!card) return;
      var expanded = card.classList.toggle('review-card--expanded');
      btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      btn.textContent = expanded ? 'Свернуть' : 'Развернуть';
    });
  }

  const reviewsApiUrl = typeof window.REVIEWS_API_URL === 'string' && window.REVIEWS_API_URL.trim()
    ? window.REVIEWS_API_URL.trim()
    : '';

  if (!reviewsApiUrl) {
    setFallback('Отзывы загружаются с Google Maps. Укажите REVIEWS_API_URL в index.html (отдельный скрипт отзывов).');
    return;
  }

  const scriptUrl = reviewsApiUrl + (reviewsApiUrl.indexOf('?') === -1 ? '?' : '&') + 'callback=';
  const callbackName = '__reviewsCb' + Date.now();
  window[callbackName] = function (data) {
    try {
      render(data);
    } finally {
      delete window[callbackName];
      if (script.parentNode) script.remove();
    }
  };
  const script = document.createElement('script');
  script.src = scriptUrl + callbackName;
  script.async = true;
  script.onerror = () => {
    setFallback('Не удалось загрузить отзывы.');
    delete window[callbackName];
  };
  document.body.appendChild(script);
}

setYear();
initMobileMenu();
initAccordion();
initModals();
initCityAutofill();
initCitySelectAppearance();
initCrestRevealScroll();
initForms();
initCookies();
initMapLoader();
initPageLoader();
initAnimatedText();
initQuiz();
initReviews();

