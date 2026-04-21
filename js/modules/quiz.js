import { getPpqResult, PPQ_QUESTIONS, QUIZ_LABELS, calculateQuizScore, getQuizResultByScore } from '../config/quiz.config.js';
import { MSG } from '../config/messages.js';
import { storage } from '../shared/storage.js';

export const QUIZ_STORAGE_KEY = 'pobyt_quiz_result';
export const QUIZ_LOCAL_COUNT_KEY = 'pobyt_quiz_count_local';

function parseStoredAnswerPairs(pairsStr) {
  const out = {};
  if (!pairsStr || !String(pairsStr).trim()) return out;
  String(pairsStr)
    .split(/,\s*/)
    .map((s) => s.trim())
    .filter(Boolean)
    .forEach((pair) => {
      const idx = pair.indexOf('=');
      if (idx < 1) return;
      const k = pair.slice(0, idx).trim();
      const v = pair.slice(idx + 1).trim();
      if (k) out[k] = v;
    });
  return out;
}

export function getQuizSnapshotForLead() {
  const raw = storage.get(QUIZ_STORAGE_KEY);
  if (!raw) return null;
  let parsed = null;
  try {
    parsed = JSON.parse(raw);
  } catch (_) {
    return null;
  }
  const base = parseStoredAnswerPairs(parsed && parsed.answers != null ? String(parsed.answers) : '');
  const keys = Object.keys(base).sort();
  if (!keys.length) return null;
  return {
    answers: keys.map((k) => `${k}=${base[k]}`).join(', '),
  };
}

export function clearQuizAfterLeadSent() {
  storage.remove(QUIZ_STORAGE_KEY);
}

export function formatQuizAnswersForMessage(quiz) {
  let rawAnswers = '';
  if (quiz && quiz.answers != null) {
    rawAnswers = Array.isArray(quiz.answers) ? quiz.answers.filter(Boolean).join(', ') : String(quiz.answers).trim();
  }
  if (!rawAnswers) return '';
  const lines = [MSG.quizAnswersTitle];
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
    const answerText = val && val !== '-' && label && label.opts && label.opts[val] ? label.opts[val] : val || '—';
    lines.push(`${num}. ${answerText}`);
  }
  if (lines.length <= 1) return '';
  return lines.join('\n');
}

export function initQuiz(options = {}) {
  const legacyRoot = document.getElementById('ppq-intro');
  if (legacyRoot) {
    initLegacyPpqQuiz();
    return;
  }

  const submitToGoogleWebApp = options.submitToGoogleWebApp;
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

  if (!introEl || !bodyEl || !questionsEl || !startBtn || !nextBtn || !resultEl || !resultTitle || !resultDesc) return;

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
    const payload = {
      step: upToStep,
      answers: answers.join(', '),
      ...resultData,
    };
    storage.setJSON(QUIZ_STORAGE_KEY, payload);
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
      // TODO(part-3): заменить alert(...) на toast(message, variant)
      alert(MSG.quizAnswerRequired);
      return;
    }

    if (current < total - 1) {
      const nextStep = current + 1;
      showStep(nextStep);
      saveQuizProgress(nextStep);
      return;
    }

    const answerMap = {};
    for (let i = 1; i <= 7; i++) {
      const scoreQName = `q${i}`;
      const scoreChecked = wrapper.querySelector(`input[name="${scoreQName}"]:checked`);
      if (!scoreChecked) continue;
      answerMap[scoreQName] = scoreChecked.value;
    }

    const score = calculateQuizScore(answerMap);
    const res = getQuizResultByScore(score);
    resultTitle.textContent = res.title;
    resultTitle.className = 'quiz__result-title ' + (res.titleClass || '');
    resultDesc.textContent = res.desc;

    questionsEl.hidden = true;
    bodyEl.hidden = true;
    resultEl.hidden = false;
    resultEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    saveQuizProgress(7, {
      key: res.key,
      title: res.title,
      score,
      completedAt: Date.now(),
    });

    const currentLocal = Number(storage.get(QUIZ_LOCAL_COUNT_KEY) || '0');
    storage.set(QUIZ_LOCAL_COUNT_KEY, String(currentLocal + 1));

    const submitUrl = typeof window.FORM_SUBMIT_URL === 'string' && window.FORM_SUBMIT_URL.trim() ? window.FORM_SUBMIT_URL.trim() : '';
    if (submitUrl && typeof submitToGoogleWebApp === 'function') {
      submitToGoogleWebApp(
        submitUrl,
        {
          name: 'QuizCount',
          phone: '-',
          city: '',
          message: 'inc',
          source: 'quiz_count',
          contact_pref: 'phone',
        },
        () => {},
      );
    }
  });

  wrapper.addEventListener('click', (e) => {
    if (e.target.closest('[data-quiz-close]')) closeQuiz();
  });
}

function initLegacyPpqQuiz() {
  const questions = PPQ_QUESTIONS;
  const total = questions.length;
  let current = 0;
  let answers = {};

  const introEl = document.getElementById('ppq-intro');
  const bodyEl = document.getElementById('ppq-body');
  const resultEl = document.getElementById('ppq-result');
  const questionEl = document.getElementById('ppq-question');
  const progressBarEl = document.getElementById('ppq-bar');
  const progressLabelEl = document.getElementById('ppq-prog-lbl');
  const backBtn = document.getElementById('ppq-back');
  const nextBtn = document.getElementById('ppq-next');
  if (!introEl || !bodyEl || !resultEl || !questionEl || !progressBarEl || !progressLabelEl || !backBtn || !nextBtn) return;

  function persistQuiz() {
    try {
      const base = {};
      const raw = storage.get(QUIZ_STORAGE_KEY);
      if (raw) {
        try {
          const prev = JSON.parse(raw);
          if (prev && prev.answers) Object.assign(base, parseStoredAnswerPairs(prev.answers));
        } catch (_) {}
      }
      Object.keys(answers).forEach((k) => {
        base[k] = answers[k];
      });
      const keys = Object.keys(base).sort();
      if (!keys.length) {
        storage.remove(QUIZ_STORAGE_KEY);
        return;
      }
      const pairs = keys.map((k) => `${k}=${base[k]}`).join(', ');
      storage.setJSON(QUIZ_STORAGE_KEY, { answers: pairs, variant: 'ppq_embed', savedAt: Date.now() });
    } catch (_) {}
  }

  function renderQuestion() {
    const q = questions[current];
    const pct = Math.round((current / total) * 100);
    progressBarEl.style.width = `${pct}%`;
    progressLabelEl.textContent = `${current + 1} из ${total}`;
    backBtn.style.visibility = current === 0 ? 'hidden' : 'visible';
    nextBtn.disabled = !answers[q.id];
    nextBtn.textContent = current === total - 1 ? 'Узнать результат →' : 'Далее →';

    const root = document.createElement('div');
    root.className = 'ppq-anim';
    const qNum = document.createElement('p');
    qNum.className = 'ppq-q-num';
    qNum.textContent = `Вопрос ${current + 1} из ${total}`;
    root.appendChild(qNum);
    const qText = document.createElement('p');
    qText.className = 'ppq-q-text';
    qText.textContent = q.text;
    root.appendChild(qText);
    if (q.hint) {
      const qHint = document.createElement('p');
      qHint.className = 'ppq-q-hint';
      qHint.textContent = q.hint;
      root.appendChild(qHint);
    }
    const opts = document.createElement('div');
    opts.className = 'ppq-opts';
    q.opts.forEach((o) => {
      const opt = document.createElement('div');
      opt.className = `ppq-opt${answers[q.id] === o.val ? ' selected' : ''}`;
      opt.setAttribute('data-ppq-pick', '');
      opt.setAttribute('data-ppq-qid', q.id);
      opt.setAttribute('data-ppq-val', o.val);
      opt.setAttribute('role', 'button');
      opt.tabIndex = 0;
      const mark = document.createElement('div');
      mark.className = 'ppq-opt-mark';
      opt.appendChild(mark);
      const textWrap = document.createElement('div');
      const label = document.createElement('div');
      label.className = 'ppq-opt-label';
      label.textContent = o.label;
      textWrap.appendChild(label);
      if (o.hint) {
        const hint = document.createElement('div');
        hint.className = 'ppq-opt-hint';
        hint.textContent = o.hint;
        textWrap.appendChild(hint);
      }
      opt.appendChild(textWrap);
      opts.appendChild(opt);
    });
    root.appendChild(opts);
    questionEl.replaceChildren(root);
  }

  function buildResultNode(r) {
    const wrap = document.createElement('div');
    wrap.className = 'ppq-anim';
    const badge = document.createElement('div');
    badge.className = 'ppq-result-badge';
    badge.style.background = r.badgeBg;
    badge.style.color = r.badgeColor;
    badge.textContent = r.badge;
    wrap.appendChild(badge);

    const title = document.createElement('h3');
    title.className = 'ppq-result-title';
    title.textContent = r.title;
    wrap.appendChild(title);

    const body = document.createElement('p');
    body.className = 'ppq-result-body';
    body.textContent = r.body;
    wrap.appendChild(body);

    if (r.items && r.items.length) {
      const items = document.createElement('div');
      items.className = 'ppq-result-items';
      r.items.forEach((i) => {
        const row = document.createElement('div');
        row.className = 'ppq-result-item';
        const dot = document.createElement('div');
        dot.className = 'ppq-result-dot';
        dot.style.background = r.dotColor;
        row.appendChild(dot);
        row.appendChild(document.createElement('div')).textContent = i;
        items.appendChild(row);
      });
      wrap.appendChild(items);
    }

    if (r.alts && r.alts.length) {
      const divider = document.createElement('div');
      divider.className = 'ppq-divider';
      wrap.appendChild(divider);
      const label = document.createElement('p');
      label.className = 'ppq-alts-label';
      label.textContent = 'Альтернативные варианты:';
      wrap.appendChild(label);
      const alts = document.createElement('div');
      alts.className = 'ppq-result-items';
      r.alts.forEach((a) => {
        const row = document.createElement('div');
        row.className = 'ppq-result-item';
        const dot = document.createElement('div');
        dot.className = 'ppq-result-dot';
        dot.style.background = '#bbb';
        row.appendChild(dot);
        row.appendChild(document.createElement('div')).textContent = a;
        alts.appendChild(row);
      });
      wrap.appendChild(alts);
    }

    const ctaBox = document.createElement('div');
    ctaBox.className = 'ppq-cta-box';
    ctaBox.appendChild(document.createElement('p')).className = 'ppq-cta-title';
    ctaBox.firstChild.textContent = 'Разберём вашу ситуацию подробнее — бесплатно';
    ctaBox.appendChild(document.createElement('p')).className = 'ppq-cta-sub';
    ctaBox.lastChild.textContent = 'Первая консультация без давления и обязательств. Объясним, что реально в вашем случае и сколько это займёт.';
    const row = document.createElement('div');
    row.className = 'ppq-cta-row';
    const ctaBtn = document.createElement('button');
    ctaBtn.type = 'button';
    ctaBtn.className = 'btn btn--primary';
    ctaBtn.setAttribute('data-open', 'lead-modal');
    ctaBtn.setAttribute('data-open-lead', 'quiz');
    ctaBtn.textContent = r.cta;
    row.appendChild(ctaBtn);
    const restart = document.createElement('button');
    restart.type = 'button';
    restart.className = 'btn btn--link ppq-restart';
    restart.setAttribute('data-quiz-action', 'restart');
    restart.textContent = 'Пройти заново';
    row.appendChild(restart);
    ctaBox.appendChild(row);
    wrap.appendChild(ctaBox);
    return wrap;
  }

  function showResult() {
    persistQuiz();
    bodyEl.hidden = true;
    resultEl.replaceChildren(buildResultNode(getPpqResult(answers)));
    resultEl.hidden = false;
  }

  function start() {
    current = 0;
    answers = {};
    introEl.hidden = true;
    resultEl.hidden = true;
    bodyEl.hidden = false;
    renderQuestion();
  }

  function pick(qid, val) {
    answers[qid] = val;
    persistQuiz();
    nextBtn.disabled = false;
    questionEl.querySelectorAll('.ppq-opt').forEach((node) => {
      node.classList.toggle('selected', node.getAttribute('data-ppq-val') === val);
    });
  }

  function next() {
    if (current < total - 1) {
      current += 1;
      renderQuestion();
    } else {
      showResult();
    }
  }

  function back() {
    if (current <= 0) return;
    current -= 1;
    renderQuestion();
  }

  function restart() {
    current = 0;
    answers = {};
    resultEl.hidden = true;
    introEl.hidden = false;
    bodyEl.hidden = true;
    questionEl.replaceChildren();
    progressBarEl.style.width = '0%';
    progressLabelEl.textContent = `1 из ${total}`;
    nextBtn.disabled = true;
    backBtn.style.visibility = 'hidden';
  }

  document.addEventListener('click', (e) => {
    const target = e.target;
    if (!(target instanceof Element)) return;

    const pickEl = target.closest('[data-ppq-pick]');
    if (pickEl) {
      const qid = pickEl.getAttribute('data-ppq-qid');
      const val = pickEl.getAttribute('data-ppq-val');
      if (qid && val) pick(qid, val);
      return;
    }

    const actionEl = target.closest('[data-quiz-action]');
    if (!actionEl) return;
    const action = actionEl.getAttribute('data-quiz-action');
    if (action === 'start') start();
    if (action === 'next') next();
    if (action === 'back') back();
    if (action === 'restart') restart();
  });

  document.addEventListener('keydown', (e) => {
    const target = e.target;
    if (!(target instanceof Element)) return;
    const pickEl = target.closest('[data-ppq-pick]');
    if (!pickEl) return;
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    const qid = pickEl.getAttribute('data-ppq-qid');
    const val = pickEl.getAttribute('data-ppq-val');
    if (qid && val) pick(qid, val);
  });
}

