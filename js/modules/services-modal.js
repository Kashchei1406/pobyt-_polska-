import { FAMILY_PRICES, SERVICE_ORDER, SERVICES } from '../config/services.config.js?v=2';

let currentFamily = '2+1';
let currentServiceKey = null;

function openDialogById(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  if (typeof modal.showModal === 'function') {
    try {
      modal.showModal();
      return;
    } catch (_) {}
  }
  modal.setAttribute('open', '');
}

function closeDialogById(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  if (typeof modal.close === 'function') {
    try {
      modal.close();
      return;
    } catch (_) {}
  }
  modal.removeAttribute('open');
}

function createEl(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text != null) el.textContent = text;
  return el;
}

function renderIncludes(listEl, includes) {
  if (!listEl) return;
  const tpl = document.getElementById('tpl-svc-row');
  if (!tpl || !('content' in tpl)) {
    const fallbackFrag = document.createDocumentFragment();
    includes.forEach((item) => {
      const row = createEl('div', 'svc-modal__inc-row');
      row.appendChild(createEl('div', '', item));
      fallbackFrag.appendChild(row);
    });
    listEl.replaceChildren(fallbackFrag);
    return;
  }
  const frag = document.createDocumentFragment();
  includes.forEach((item) => {
    const node = tpl.content.cloneNode(true);
    const textEl = node.querySelector('.svc-modal__inc-text');
    if (textEl) textEl.textContent = item;
    frag.appendChild(node);
  });
  listEl.replaceChildren(frag);
}

function appendPaySection(parent, compactPayAndGuarantee, hidePaySection) {
  if (hidePaySection) return;
  const payment = createEl('div', 'svc-modal__payment');
  const row1 = createEl('div', 'svc-modal__pay-row');
  row1.appendChild(createEl('span', 'svc-modal__pay-badge', compactPayAndGuarantee ? '100%' : '50%'));
  row1.appendChild(
    createEl(
      'span',
      '',
      compactPayAndGuarantee
        ? 'Оплата при подписании договора — фиксируем условия и начинаем работу'
        : 'При подписании договора — фиксируем условия и начинаем работу',
    ),
  );
  payment.appendChild(row1);
  if (!compactPayAndGuarantee) {
    const row2 = createEl('div', 'svc-modal__pay-row');
    row2.appendChild(createEl('span', 'svc-modal__pay-badge', '50%'));
    row2.appendChild(createEl('span', '', 'При сдаче отпечатков — дело передано в миграционный орган'));
    payment.appendChild(row2);
  }
  parent.appendChild(payment);
}

function appendGuarantee(parent, compactPayAndGuarantee, hidePaySection) {
  const guarantee = createEl('div', 'svc-modal__guarantee');
  if (hidePaySection || compactPayAndGuarantee) {
    guarantee.textContent = 'Цена фиксирована в договоре.';
  } else {
    guarantee.appendChild(document.createTextNode('Цена фиксирована в договоре.'));
    guarantee.appendChild(document.createElement('br'));
    guarantee.appendChild(
      document.createTextNode(
        'Если придёт отказ или карта выдана на неполный срок — меньше, чем позволяет ваше основание — продолжаем работу без доплат.',
      ),
    );
  }
  parent.appendChild(guarantee);
}

function appendPriceSection(parent, key, service) {
  if (key === 'family') {
    parent.appendChild(createEl('div', 'svc-modal__family-label', 'Состав семьи'));
    const optsWrap = createEl('div', 'svc-modal__family-opts');
    Object.keys(FAMILY_PRICES).forEach((familyKey) => {
      const btn = createEl('button', 'svc-modal__family-opt' + (familyKey === currentFamily ? ' active' : ''), familyKey);
      btn.type = 'button';
      btn.setAttribute('data-family-key', familyKey);
      optsWrap.appendChild(btn);
    });
    parent.appendChild(optsWrap);
    parent.appendChild(createEl('div', 'svc-modal__family-note', '2 взрослых + количество детей'));
    const familyPriceRow = createEl('div', 'svc-modal__price-row');
    familyPriceRow.appendChild(createEl('span', 'svc-modal__price-label', 'Стоимость'));
    const familyPrice = createEl('span', 'svc-modal__price-val');
    familyPrice.id = 'svc-family-price';
    familyPrice.textContent = FAMILY_PRICES[currentFamily].toLocaleString('ru') + ' ';
    familyPrice.appendChild(createEl('span', '', 'zł'));
    familyPriceRow.appendChild(familyPrice);
    parent.appendChild(familyPriceRow);
    return;
  }

  const priceRow = createEl('div', 'svc-modal__price-row');
  priceRow.appendChild(createEl('span', 'svc-modal__price-label', 'Стоимость'));
  const priceVal = createEl('span', 'svc-modal__price-val');
  if (typeof service.price === 'number') {
    priceVal.textContent = service.price.toLocaleString('ru') + ' ';
    priceVal.appendChild(createEl('span', '', 'zł'));
  } else {
    priceVal.textContent = 'по запросу';
  }
  priceRow.appendChild(priceVal);
  parent.appendChild(priceRow);
}

function buildModalContent(key) {
  const s = SERVICES[key];
  if (!s) return document.createDocumentFragment();

  const compactPayAndGuarantee = key === 'appeal' || key === 'speed' || key === 'karta' || key === 'start';
  const hidePaySection = Boolean(s.noPay);
  const frag = document.createDocumentFragment();

  frag.appendChild(createEl('div', 'svc-modal__badge', s.badge));
  frag.appendChild(createEl('div', 'svc-modal__title', s.title));
  frag.appendChild(createEl('div', 'svc-modal__sub', s.sub));
  frag.appendChild(createEl('div', 'svc-modal__section-label', 'Что входит в услугу'));
  const includesEl = createEl('div', 'svc-modal__inc-list');
  includesEl.setAttribute('data-svc-inc-list', '');
  frag.appendChild(includesEl);
  frag.appendChild(createEl('div', 'svc-modal__divider'));

  appendPaySection(frag, compactPayAndGuarantee, hidePaySection);
  appendGuarantee(frag, compactPayAndGuarantee, hidePaySection);
  appendPriceSection(frag, key, s);

  const cta = createEl('button', 'btn btn--primary btn--block', 'Записаться на консультацию');
  cta.type = 'button';
  cta.setAttribute('data-svc-cta', '');
  frag.appendChild(cta);
  return frag;
}

function openServiceModal(key) {
  if (!key || !SERVICES[key]) return;
  currentServiceKey = key;
  const content = document.getElementById('svc-modal-content');
  if (content) content.replaceChildren(buildModalContent(key));
  const includesEl = content && content.querySelector('[data-svc-inc-list]');
  if (includesEl && Array.isArray(SERVICES[key].includes)) {
    renderIncludes(includesEl, SERVICES[key].includes);
  }
  openDialogById('svc-modal');
}

function renderAllServicesList(list) {
  if (!list) return;
  const tpl = document.getElementById('tpl-svc-all-item');
  const frag = document.createDocumentFragment();
  SERVICE_ORDER.forEach((key) => {
    if (!SERVICES[key]) return;
    const title = SERVICES[key].formTitle || SERVICES[key].title || key;
    let node;
    if (tpl && 'content' in tpl) {
      node = tpl.content.cloneNode(true);
    } else {
      const fallback = document.createElement('div');
      fallback.className = 'svc-all-list__item';
      const titleWrap = document.createElement('div');
      titleWrap.className = 'svc-all-list__title-wrap';
      const dot = document.createElement('span');
      dot.className = 'svc-all-list__dot';
      dot.setAttribute('aria-hidden', 'true');
      const titleText = document.createElement('span');
      titleText.className = 'svc-all-list__title';
      titleWrap.appendChild(dot);
      titleWrap.appendChild(titleText);
      const fallbackBtn = document.createElement('button');
      fallbackBtn.type = 'button';
      fallbackBtn.className = 'btn btn--primary svc-all-list__btn';
      fallbackBtn.setAttribute('data-svc-key', '');
      fallbackBtn.textContent = 'Что входит и цена';
      fallback.appendChild(titleWrap);
      fallback.appendChild(fallbackBtn);
      const fallbackFrag = document.createDocumentFragment();
      fallbackFrag.appendChild(fallback);
      node = fallbackFrag;
    }
    const titleEl = node.querySelector('.svc-all-list__title');
    const btn = node.querySelector('[data-svc-key]');
    if (titleEl) titleEl.textContent = title;
    if (btn) btn.setAttribute('data-svc-key', key);
    frag.appendChild(node);
  });
  list.replaceChildren(frag);
}

function openAllServicesModal() {
  const list = document.getElementById('svc-all-list');
  renderAllServicesList(list);
  openDialogById('all-services-modal');
}

function bookConsult() {
  const key = currentServiceKey;
  if (!key || !SERVICES[key]) return;
  let msg = SERVICES[key].formTitle;
  if (key === 'family') {
    msg = `${msg} · состав ${currentFamily}`;
  }
  document.dispatchEvent(
    new CustomEvent('pobyt:open-lead', {
      detail: { source: 'services-modal', message: msg },
    }),
  );
}

export function initServicesModals(root = document) {
  root.addEventListener('click', (e) => {
    const target = e.target;
    if (!(target instanceof Element)) return;

    const familyBtn = target.closest('.svc-modal__family-opt[data-family-key]');
    if (familyBtn) {
      const k = familyBtn.getAttribute('data-family-key');
      if (!k) return;
      currentFamily = k;
      document.querySelectorAll('.svc-modal__family-opt').forEach((btn) => {
        btn.classList.toggle('active', btn.getAttribute('data-family-key') === k);
      });
      const priceEl = document.getElementById('svc-family-price');
      if (priceEl) {
        priceEl.textContent = FAMILY_PRICES[k].toLocaleString('ru') + ' ';
        priceEl.appendChild(createEl('span', '', 'zł'));
      }
      return;
    }

    const cta = target.closest('#svc-modal-content [data-svc-cta]');
    if (cta) {
      bookConsult();
      return;
    }

    const itemBtn = target.closest('.svc-all-list__btn[data-svc-key]');
    if (itemBtn) {
      const key = itemBtn.getAttribute('data-svc-key');
      if (!key || !SERVICES[key]) return;
      closeDialogById('all-services-modal');
      openServiceModal(key);
      return;
    }

    const serviceBtn = target.closest('[data-service]');
    if (serviceBtn) {
      const key = serviceBtn.getAttribute('data-service');
      openServiceModal(key);
      return;
    }

    const openAllBtn = target.closest('[data-open-all-services]');
    if (openAllBtn) {
      openAllServicesModal();
    }
  });
}

