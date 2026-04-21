import { $$ } from '../shared/dom.js';

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

function buildCityAutofillMap() {
  const m = {};
  const add = (aliases, value) => {
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

function updateCitySelectFilledState(select) {
  const wrap = select.closest('.field-select');
  if (!wrap) return;
  wrap.classList.toggle('field-select--filled', Boolean(select.value && String(select.value).trim()));
}

function syncCityFromAutofillHook(form) {
  if (!form) return;
  const hook = form.querySelector('[data-city-autofill]');
  const select = form.querySelector('select[name="city"]');
  if (!hook || !select) return;
  const raw = (hook.value || '').trim();
  if (!raw) return;

  const tokens = new Set();
  const push = (t) => {
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

export function scheduleCityAutofillSync(form) {
  if (!form) return;
  [0, 100, 400, 1000, 2500].forEach((ms) => {
    setTimeout(() => syncCityFromAutofillHook(form), ms);
  });
}

export function initCityAutofill() {
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

export function initCitySelectAppearance() {
  $$('select[name="city"]').forEach((sel) => {
    updateCitySelectFilledState(sel);
    sel.addEventListener('change', () => updateCitySelectFilledState(sel));
  });
  $$('[data-lead-form]').forEach((form) => {
    form.addEventListener('reset', () => {
      setTimeout(() => {
        const s = form.querySelector('select[name="city"]');
        if (s) updateCitySelectFilledState(s);
      }, 0);
    });
  });
}

