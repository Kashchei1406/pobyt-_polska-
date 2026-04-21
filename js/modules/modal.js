import { delegate, on } from '../shared/dom.js';
import { scheduleCityAutofillSync } from './city-autofill.js';

export function initModals(root = document) {
  delegate(root, '[data-open]', 'click', (_event, trigger) => {
    const id = trigger.getAttribute('data-open');
    if (!id) return;
    const dialog = document.getElementById(id);
    if (!dialog || typeof dialog.showModal !== 'function') return;
    dialog.showModal();
  });

  delegate(root, '[data-modal-close]', 'click', (_event, trigger) => {
    const dialog = trigger.closest('dialog');
    if (!dialog) return;
    if (typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
  });

  document.querySelectorAll('dialog.modal').forEach((dialog) => {
    on(dialog, 'click', (event) => {
      if (event.target === dialog) {
        if (typeof dialog.close === 'function') dialog.close();
        else dialog.removeAttribute('open');
      }
    });
  });
}

export function initLeadModalBridge(root = document) {
  const modal = root.querySelector('[data-modal]');
  if (!modal) return;

  function openLeadModal(source, messageText) {
    const form = modal.querySelector('[data-lead-form]');
    const sourceInput = form && form.querySelector('input[name="source"]');
    const messageField = form && form.querySelector('textarea[name="message"]');
    if (sourceInput) sourceInput.value = source || 'modal';
    if (messageField) messageField.value = messageText || '';
    scheduleCityAutofillSync(form);
  }

  root.addEventListener('click', (e) => {
    const btn = e.target instanceof Element ? e.target.closest('[data-open-lead]') : null;
    if (!btn) return;
    const source = btn.getAttribute('data-open-lead') || 'modal';
    const msgAttr = btn.getAttribute('data-lead-message');
    openLeadModal(source, msgAttr !== null ? msgAttr : '');
  });

  root.addEventListener('pobyt:open-lead', (e) => {
    const d = e.detail;
    if (!d || typeof d !== 'object') return;
    openLeadModal(d.source || 'modal', d.message != null ? String(d.message) : '');
    if (typeof modal.showModal === 'function') modal.showModal();
    else modal.setAttribute('open', '');
  });

  modal.addEventListener('close', () => {
    const rootEl = document.documentElement;
    rootEl.classList.add('modal-just-closed');

    const tryBlur = (triesLeft) => {
      requestAnimationFrame(() => {
        const el = document.activeElement;
        if (el && typeof el.blur === 'function' && el.closest) {
          if (el.closest('dialog#svc-modal') || el.closest('dialog#all-services-modal') || el.closest('[data-service]')) el.blur();
        }
        if (triesLeft > 0) setTimeout(() => tryBlur(triesLeft - 1), 30);
      });
    };

    tryBlur(2);
    setTimeout(() => {
      rootEl.classList.remove('modal-just-closed');
    }, 900);
  });
}

