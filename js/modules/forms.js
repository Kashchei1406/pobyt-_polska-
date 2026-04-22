import { $$ } from '../shared/dom.js';
import { storage } from '../shared/storage.js';
import { MSG } from '../config/messages.js';
import { formatQuizAnswersForMessage, getQuizSnapshotForLead, QUIZ_STORAGE_KEY } from './quiz.js';

const SUCCESS_MORPH_MS = 1800;
const MESSENGER_LABELS = {
  telegram: 'Telegram',
  whatsapp: 'WhatsApp',
  viber: 'Viber',
};

function ensureAnimatedSubmitMarkup(submitBtn, labelText) {
  if (!submitBtn) return;

  submitBtn.classList.add('btn--loading', 'btn--success', 'btn--shake');

  let label = submitBtn.querySelector('.btn__label');
  if (!label) {
    label = document.createElement('span');
    label.className = 'btn__label';
    label.textContent = labelText;
    submitBtn.replaceChildren(label);
  } else if (!label.textContent || !label.textContent.trim()) {
    label.textContent = labelText;
  }

  let check = submitBtn.querySelector('.btn__check');
  if (!check) {
    check = document.createElement('span');
    check.className = 'btn__check';
    check.setAttribute('aria-hidden', 'true');
    check.innerHTML =
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
    submitBtn.appendChild(check);
  }
}

function setSubmitButtonState(submitBtn, state) {
  if (!submitBtn) return;
  submitBtn.classList.remove('is-loading', 'is-done');
  if (state === 'loading') submitBtn.classList.add('is-loading');
  if (state === 'done') submitBtn.classList.add('is-done');
}

function triggerValidationShake(submitBtn) {
  if (!submitBtn) return;
  submitBtn.classList.remove('is-error');
  void submitBtn.offsetWidth;
  submitBtn.classList.add('is-error');
  setTimeout(() => submitBtn.classList.remove('is-error'), 500);
}

function getQuizPayloadForLeadForm() {
  const snap = getQuizSnapshotForLead();
  if (snap && snap.answers && String(snap.answers).trim()) return snap;
  try {
    const stored = storage.get(QUIZ_STORAGE_KEY);
    if (!stored) return null;
    const quiz = JSON.parse(stored);
    if (quiz && quiz.answers && String(quiz.answers).trim()) return quiz;
  } catch (_) {}
  return null;
}

function normalizePhone(value) {
  return value.replace(/[^\d+]/g, '').replace(/^00/, '+');
}

function validateForm(form) {
  const name = form.querySelector('input[name="name"]');
  const phone = form.querySelector('input[name="phone"]');
  const city = form.querySelector('select[name="city"]');
  const message = form.querySelector('textarea[name="message"]');
  const ok = form.querySelector('.form__ok');

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

export function submitToGoogleWebApp(url, data, onDone) {
  if (storage.get('debugForm') === '1') {
    console.log('[lead-form] POST →', url, data);
  }

  const iframe = document.getElementById('form-submit-iframe');
  if (iframe && iframe.name) {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = url;
    form.target = iframe.name;
    form.enctype = 'application/x-www-form-urlencoded';
    form.acceptCharset = 'UTF-8';
    form.style.cssText = 'position:absolute;left:-9999px;top:-9999px;opacity:0;';

    ['name', 'phone', 'city', 'message', 'source', 'contact_pref', 'messenger_channel', 'contact_method'].forEach((key) => {
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
  ['name', 'phone', 'city', 'message', 'source', 'contact_pref', 'messenger_channel', 'contact_method'].forEach((key) => {
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

export function initContactPrefRadios() {
  $$('[data-lead-form]').forEach((form) => {
    const prefInputs = $$('input[name="contact_pref"]', form);
    const picker = form.querySelector('[data-messenger-picker]');
    const messengerInputs = $$('input[name="messenger_channel"]', form);
    const messengerDefault = messengerInputs[0] || null;

    const syncPickerState = () => {
      const selectedPref = form.querySelector('input[name="contact_pref"]:checked');
      const messengerMode = !!selectedPref && selectedPref.value === 'messenger';
      if (picker) {
        picker.classList.toggle('is-open', messengerMode);
        picker.setAttribute('aria-hidden', messengerMode ? 'false' : 'true');
      }

      messengerInputs.forEach((input) => {
        input.required = false;
      });

      if (messengerMode) {
        if (!form.querySelector('input[name="messenger_channel"]:checked') && messengerDefault) {
          messengerDefault.checked = true;
        }
      } else {
        messengerInputs.forEach((input) => {
          input.checked = false;
        });
      }
    };

    prefInputs.forEach((input) => {
      input.addEventListener('change', () => {
        syncPickerState();
        requestAnimationFrame(() => {
          if (document.activeElement === input && !input.matches(':focus-visible')) {
            input.blur();
          }
        });
      });
    });

    syncPickerState();
  });
}

export function initForms() {
  const submitUrl = typeof window.FORM_SUBMIT_URL === 'string' && window.FORM_SUBMIT_URL.trim() ? window.FORM_SUBMIT_URL.trim() : '';

  $$('[data-lead-form]').forEach((form) => {
    form.noValidate = true;
    let successMorphTimer = null;
    const submitBtn = form.querySelector('button[type="submit"]');
    const submitLabelDefault = (submitBtn && submitBtn.getAttribute('data-submit-label')) || MSG.submitDefault;
    if (submitBtn) {
      ensureAnimatedSubmitMarkup(submitBtn, submitLabelDefault);
    }

    form.addEventListener(
      'invalid',
      () => {
        triggerValidationShake(submitBtn);
      },
      true,
    );

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const { valid, ok } = validateForm(form);
      if (!valid) {
        triggerValidationShake(submitBtn);
        return;
      }

      const name = (form.querySelector('input[name="name"]') || {}).value || '';
      const phone = (form.querySelector('input[name="phone"]') || {}).value || '';
      const cityEl = form.querySelector('select[name="city"]');
      const city = cityEl && cityEl.value ? cityEl.value.trim() : '';
      let message = (form.querySelector('textarea[name="message"]') || {}).value || '';
      const source = getFormSource(form);
      const prefEl = form.querySelector('input[name="contact_pref"]:checked');
      const contact_pref = prefEl && prefEl.value === 'messenger' ? 'messenger' : 'phone';
      const messengerEl = form.querySelector('input[name="messenger_channel"]:checked');
      const messenger_channel = contact_pref === 'messenger' && messengerEl ? messengerEl.value : '';
      const contact_method =
        contact_pref === 'messenger'
          ? MESSENGER_LABELS[messenger_channel] || 'Мессенджер'
          : 'Телефон';

      const quiz = getQuizPayloadForLeadForm();
      if (quiz && quiz.answers && String(quiz.answers).trim()) {
        const formatted = formatQuizAnswersForMessage(quiz);
        const raw = String(quiz.answers).trim();
        const quizBlock = formatted ? '\n\n' + formatted : `\n\n${MSG.quizAnswersTitle}\n` + raw;
        if (quizBlock.trim()) {
          message = message.trim() ? message.trim() + quizBlock : quizBlock.trim();
        }
      }

      if (submitBtn) {
        if (successMorphTimer) {
          clearTimeout(successMorphTimer);
          successMorphTimer = null;
        }
      }

      if (submitUrl) {
        if (submitBtn) {
          submitBtn.disabled = true;
          setSubmitButtonState(submitBtn, 'loading');
        }
        submitToGoogleWebApp(
          submitUrl,
          {
            name: name.trim(),
            phone: phone.trim(),
            city,
            message: message.trim(),
            source,
            contact_pref,
            messenger_channel,
            contact_method,
          },
          (err) => {
            if (ok) {
              // TODO(part-3): заменить inline-status на toast(message, variant)
              ok.textContent = err ? MSG.submitError : MSG.formSuccess;
              ok.hidden = false;
            }
            if (!err) {
              form.reset();
            }
            if (submitBtn) {
              submitBtn.disabled = false;
              if (err) {
                setSubmitButtonState(submitBtn, 'idle');
                triggerValidationShake(submitBtn);
              } else {
                setSubmitButtonState(submitBtn, 'done');
                successMorphTimer = setTimeout(() => {
                  setSubmitButtonState(submitBtn, 'idle');
                  successMorphTimer = null;
                }, SUCCESS_MORPH_MS);
              }
            }
          },
        );
      } else {
        if (ok) {
          // TODO(part-3): заменить inline-status на toast(message, variant)
          ok.textContent = MSG.formSuccess;
          ok.hidden = false;
        }
        form.reset();
        if (submitBtn) {
          setSubmitButtonState(submitBtn, 'done');
          successMorphTimer = setTimeout(() => {
            setSubmitButtonState(submitBtn, 'idle');
            successMorphTimer = null;
          }, SUCCESS_MORPH_MS);
        }
      }
    });
  });
}

