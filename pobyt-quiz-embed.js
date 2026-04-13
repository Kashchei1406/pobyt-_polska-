(function () {

  /* ── Вопросы ── */
  var Q = [
    {
      id: 'q1', text: 'Где вы сейчас находитесь?', hint: '',
      opts: [
        { val: 'pl',        label: 'В Польше' },
        { val: 'abroad',    label: 'За пределами Польши' },
        { val: 'submitted', label: 'Уже подал документы — жду решения' }
      ]
    },
    {
      id: 'q2', text: 'Какой у вас сейчас документ или статус?', hint: 'Выберите актуальный на сегодня',
      opts: [
        { val: 'visa',    label: 'Действующая виза (D или C)' },
        { val: 'karta',   label: 'Карта побыту (действующая)' },
        { val: 'bezviz',  label: 'Безвизовый въезд — 90 дней' },
        { val: 'expired', label: 'Документы просрочены',  hint: 'Часто встречается — не паникуйте, варианты есть' },
        { val: 'none',    label: 'Нет никакого документа' }
      ]
    },
    {
      id: 'q3', text: 'Есть ли у вас основание для легализации?', hint: 'Основание — это причина, по которой вы можете остаться в Польше',
      opts: [
        { val: 'work',     label: 'Официальная работа (umowa o pracę / zlecenie / o dzieło)' },
        { val: 'jdg',      label: 'Собственный бизнес / JDG' },
        { val: 'family',   label: 'Воссоединение с супругом(ой) / партнёром' },
        { val: 'study',    label: 'Учёба в польском вузе' },
        { val: 'karty',    label: 'Польские корни / карта поляка' },
        { val: 'searching',label: 'Пока ищу работу' },
        { val: 'none',     label: 'Нет никакого основания' }
      ]
    },
    {
      id: 'q4', text: 'Были ли у вас проблемы с документами раньше?', hint: '',
      opts: [
        { val: 'clean',    label: 'Нет, всё в порядке' },
        { val: 'refusal',  label: 'Был отказ' },
        { val: 'wezwanie', label: 'Получал wezwanie (запрос документов)' },
        { val: 'overstay', label: 'Нарушал сроки пребывания' },
        { val: 'deport',   label: 'Есть постановление о депортации', hint: 'Серьёзная ситуация — но мы работаем и с такими' }
      ]
    },
    {
      id: 'q5', text: 'Вы подаёте документы один или вместе с семьёй?', hint: '',
      opts: [
        { val: 'solo',    label: 'Только я' },
        { val: 'spouse',  label: 'Я и супруг(а)',          hint: 'Сопровождаем обоих — один процесс, один контакт' },
        { val: 'kids',    label: 'Я, супруг(а) и дети',    hint: 'Оформляем на всю семью сразу' },
        { val: 'notsure', label: 'Пока не определился' }
      ]
    },
    {
      id: 'q6', text: 'Сколько времени вы уже в Польше?', hint: 'Считайте текущий или последний непрерывный период',
      opts: [
        { val: 'less5', label: 'Менее 5 лет' },
        { val: '5plus', label: '5 лет и более', hint: 'Возможно, уже можно претендовать на ПМЖ' }
      ]
    }
  ];

  var TOTAL   = Q.length;
  var current = 0;
  var answers = {};

  /* Тот же ключ, что в main.js — заявки подмешивают ответы в поле message */
  var PPQ_STORAGE_KEY = 'pobyt_quiz_result';

  function parseStoredAnswerPairs(pairsStr) {
    var out = {};
    if (!pairsStr || !String(pairsStr).trim()) return out;
    String(pairsStr)
      .split(/,\s*/)
      .map(function (s) {
        return s.trim();
      })
      .filter(Boolean)
      .forEach(function (pair) {
        var idx = pair.indexOf('=');
        if (idx < 1) return;
        var k = pair.slice(0, idx).trim();
        var v = pair.slice(idx + 1).trim();
        if (k) out[k] = v;
      });
    return out;
  }

  /**
   * Снимок для заявки: localStorage + актуальные ответы в памяти (если setItem падал — всё равно уйдёт в форму).
   */
  window.ppqGetQuizSnapshotForLead = function () {
    var base = {};
    try {
      var raw = localStorage.getItem(PPQ_STORAGE_KEY);
      if (raw) {
        var prev = JSON.parse(raw);
        if (prev && prev.answers != null) {
          base = parseStoredAnswerPairs(
            typeof prev.answers === 'string' ? prev.answers : String(prev.answers),
          );
        }
      }
    } catch (e) {}
    try {
      Object.keys(answers).forEach(function (k) {
        base[k] = answers[k];
      });
    } catch (e2) {}
    var keys = Object.keys(base).sort();
    if (!keys.length) return null;
    return {
      answers: keys
        .map(function (k) {
          return k + '=' + base[k];
        })
        .join(', '),
    };
  };

  window.ppqClearQuizAfterLeadSent = function () {
    try {
      localStorage.removeItem(PPQ_STORAGE_KEY);
    } catch (e) {}
    answers = {};
  };

  /* Сливаем с тем, что уже в storage: при повторном проходе новые ответы перезаписывают q1…q6 по мере выбора. */
  function persistPpqQuiz() {
    try {
      var base = {};
      var raw = localStorage.getItem(PPQ_STORAGE_KEY);
      if (raw) {
        try {
          var prev = JSON.parse(raw);
          if (prev && prev.answers) base = parseStoredAnswerPairs(prev.answers);
        } catch (e2) {}
      }
      Object.keys(answers).forEach(function (k) {
        base[k] = answers[k];
      });
      var keys = Object.keys(base);
      if (!keys.length) {
        localStorage.removeItem(PPQ_STORAGE_KEY);
        return;
      }
      keys.sort();
      var pairs = keys.map(function (k) {
        return k + '=' + base[k];
      }).join(', ');
      localStorage.setItem(
        PPQ_STORAGE_KEY,
        JSON.stringify({ answers: pairs, variant: 'ppq_embed', savedAt: Date.now() }),
      );
    } catch (e) {}
  }

  /* ── Старт ── */
  window.ppqStart = function () {
    current = 0;
    answers = {};
    document.getElementById('ppq-intro').style.display = 'none';
    document.getElementById('ppq-body').style.display  = 'block';
    render();
  };

  /* ── Рендер вопроса ── */
  function render() {
    var q   = Q[current];
    var pct = Math.round((current / TOTAL) * 100);

    document.getElementById('ppq-bar').style.width        = pct + '%';
    document.getElementById('ppq-prog-lbl').textContent   = (current + 1) + ' из ' + TOTAL;
    document.getElementById('ppq-back').style.visibility  = current === 0 ? 'hidden' : 'visible';

    var nextBtn = document.getElementById('ppq-next');
    nextBtn.disabled    = !answers[q.id];
    nextBtn.textContent = current === TOTAL - 1 ? 'Узнать результат →' : 'Далее →';

    var html = '<div class="ppq-anim">';
    html += '<p class="ppq-q-num">Вопрос ' + (current + 1) + ' из ' + TOTAL + '</p>';
    html += '<p class="ppq-q-text">' + q.text + '</p>';
    if (q.hint) html += '<p class="ppq-q-hint">' + q.hint + '</p>';
    html += '<div class="ppq-opts">';

    q.opts.forEach(function (o) {
      var sel = answers[q.id] === o.val ? ' selected' : '';
      html += '<div class="ppq-opt' + sel + '" data-ppq-val="' + o.val + '" role="button" tabindex="0" onclick="ppqPick(\'' + q.id + '\',\'' + o.val + '\')">';
      html += '<div class="ppq-opt-mark"></div>';
      html += '<div><div class="ppq-opt-label">' + o.label + '</div>';
      if (o.hint) html += '<div class="ppq-opt-hint">' + o.hint + '</div>';
      html += '</div></div>';
    });

    html += '</div></div>';
    document.getElementById('ppq-question').innerHTML = html;
  }

  /* ── Выбор ответа (без полного render — только подсветка вариантов) ── */
  window.ppqPick = function (qid, val) {
    answers[qid] = val;
    persistPpqQuiz();
    document.getElementById('ppq-next').disabled = false;
    var wrap = document.getElementById('ppq-question');
    if (!wrap) return;
    var nodes = wrap.querySelectorAll('.ppq-opt');
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      node.classList.toggle('selected', node.getAttribute('data-ppq-val') === val);
    }
  };

  /* ── Навигация ── */
  window.ppqNext = function () {
    if (current < TOTAL - 1) { current++; render(); }
    else showResult();
  };
  window.ppqBack = function () {
    if (current > 0) { current--; render(); }
  };

  /* ── Показать результат ── */
  function showResult() {
    persistPpqQuiz();
    document.getElementById('ppq-body').style.display  = 'none';
    var el = document.getElementById('ppq-result');
    el.innerHTML    = buildResult(calcResult());
    el.style.display = 'block';
  }

  /* ── Логика результатов ── */
  function calcResult() {
    var a = answers;
    var abroad     = a.q1 === 'abroad';
    var expired    = a.q2 === 'expired';
    var noBase     = a.q3 === 'none';
    var searching  = a.q3 === 'searching';
    var karty      = a.q3 === 'karty';
    var familyBase = a.q3 === 'family';
    var deport     = a.q4 === 'deport';
    var hadRefusal = a.q4 === 'refusal';
    var overstay   = a.q4 === 'overstay';
    var withFamily = a.q5 === 'spouse' || a.q5 === 'kids';
    var withKids   = a.q5 === 'kids';
    var longStay   = a.q6 === '5plus';
    var goodBase   = ['work','jdg','family','study','karty'].indexOf(a.q3) !== -1;

    var refusalNote = hadRefusal
      ? 'Учтём историю отказа при подготовке пакета — разберём причину и исправим'
      : null;

    /* 1. Депортация */
    if (deport) return {
      badgeColor: '#854F0B', badgeBg: '#FAEEDA',
      badge: 'Срочная ситуация — нужно действовать быстро',
      title: 'Депортация — серьёзно, но варианты есть',
      body:  'Постановление о депортации не закрывает все пути, но требует грамотных и быстрых действий. Самостоятельные шаги здесь могут ухудшить ситуацию.',
      items: ['Разберём постановление и найдём решение в вашем случае',
              refusalNote,
              'Рассмотрим гуманитарную защиту, если есть основания',
              'Проработаем вариант выезда и законного возвращения']
              .filter(Boolean),
      dotColor: '#BA7517',
      cta: 'Получить срочную консультацию', alts: []
    };

    /* 2. Нет основания */
    if (noBase) return {
      badgeColor: '#854F0B', badgeBg: '#FAEEDA',
      badge: 'Нужно найти основание',
      title: 'Легализация возможна — но сначала нужно основание',
      body:  'Без официального основания карта побыту не выдаётся. Хорошая новость: основание часто можно оформить быстрее, чем кажется.',
      items: ['Официальное трудоустройство (umowa o pracę / zlecenie) — самый быстрый путь',
              refusalNote,
              'JDG — подходит для фрилансеров и IT-специалистов',
              'Учёба в польском вузе даёт право на студенческий ВНЖ',
              'Польские корни или карта поляка — отдельный упрощённый путь']
              .filter(Boolean),
      dotColor: '#BA7517',
      cta: 'Подобрать основание вместе',
      alts: ['Национальная виза типа D — пока оформляете работу',
             'Временный выезд и повторный въезд для сброса срока']
    };

    /* 3. Карта поляка */
    if (karty) return {
      badgeColor: '#0F6E56', badgeBg: '#E1F5EE',
      badge: 'Упрощённый путь к легализации',
      title: 'Польские корни или карта поляка — это серьёзное преимущество',
      body:  'Наличие карты поляка или подтверждённых польских корней открывает упрощённый путь к ПМЖ и даже к гражданству.',
      items: ['Карта поляка даёт право на ПМЖ по упрощённой процедуре',
              refusalNote,
              'Польское происхождение может стать основанием для ПМЖ',
              'Расскажем, какие документы нужны именно в вашем случае']
              .filter(Boolean),
      dotColor: '#0F6E56',
      cta: 'Узнать подробнее о своём пути', alts: []
    };

    /* 4. Wezwanie — срочный запрос ужонда */
    if (a.q4 === 'wezwanie') return {
      badgeColor: '#854F0B', badgeBg: '#FAEEDA',
      badge: 'Требуется срочное действие',
      title: 'Wezwanie — у вас есть ограниченное время на ответ',
      body:  'Wezwanie означает, что ужонд запросил документы или разъяснения по делу — без ответа в срок ситуация может закончиться отказом.',
      items: ['Разберём запрос ужонда',
              'Определим нужные документы и форму ответа',
              'Подготовим пакет документов',
              withFamily ? 'Учтём семью — при необходимости подготовим документы для всех' : null,
              'Уложимся в срок (часто 7–21 дней — сверим с вашим wezwaniem)']
              .filter(Boolean),
      dotColor: '#BA7517',
      cta: 'Разобрать wezwanie срочно', alts: []
    };

    /* 5. Просроченные / нарушение */
    if (expired || overstay) return {
      badgeColor: '#854F0B', badgeBg: '#FAEEDA',
      badge: 'Ситуация поправимая — важно не тянуть',
      title: 'Легализация возможна, но нужно действовать сейчас',
      body:  'Просроченный статус или нарушение сроков усложняют процесс, но не закрывают его. Чем дольше ждёте — тем меньше вариантов.',
      items: ['Оценим, сколько дней прошло и какие последствия реальны',
              refusalNote,
              'Подберём путь: новая подача, апелляция или выезд с возвратом',
              withFamily ? 'Учтём семейную ситуацию — скоординируем документы для всех' : null,
              'В большинстве случаев находим рабочее решение даже в сложных ситуациях']
              .filter(Boolean),
      dotColor: '#BA7517',
      cta: 'Разобрать ситуацию бесплатно'
    };

    /* 6. За границей */
    if (abroad) return {
      badgeColor: '#e41b4a', badgeBg: '#fceef2',
      badge: 'Начать можно уже сейчас — из-за границы',
      title: 'Подготовиться к легализации можно дистанционно',
      body:  'Документы подаются только в Польше, но собрать пакет и спланировать въезд можно заранее. Помогаем дистанционно.',
      items: ['Определим основание и тип разрешения до въезда',
              refusalNote,
              'Составим точный список документов под ваш миграционный орган',
              withFamily ? 'Подготовим пакет сразу для всей семьи' : null,
              'Спланируем въезд так, чтобы сразу начать процесс']
              .filter(Boolean),
      dotColor: '#e41b4a',
      cta: 'Начать подготовку дистанционно'
    };

    /* 7. 5+ лет + хорошее основание → ПМЖ */
    if (longStay && goodBase) return {
      badgeColor: '#0F6E56', badgeBg: '#E1F5EE',
      badge: 'Хорошие шансы — возможно, уже на резидентство ЕС',
      title: 'Вы можете претендовать на постоянный вид на жительство для занятых в экономике',
      body:  '5 лет с официальным основанием — это уже путь к резидентству ЕС. Постоянный статус не нужно продлевать каждые 3 года(как ВНЖ), а через 3 года можно подавать на гражданство.',
      items: ['Проверим стаж, доходы и возможные перерывы в пребывании',
              refusalNote,
              'Статус резидента ЕС выдаётся бессрочно — никаких регулярных продлений',
              withFamily ? 'Поможем с легализацией для всей семьи' : null,
              'Через 3 года ПМЖ можно подать на польское гражданство']
              .filter(Boolean),
      dotColor: '#0F6E56',
      cta: 'Обсудить путь к резидентству ЕС'
    };

    /* 8. Стандартный позитивный */
    var familyNote = withKids
      ? 'Оформим карты для всей семьи — родители и дети в одном процессе'
      : withFamily
      ? 'Сопроводим вас и супруга(у) — один контакт, скоординированные сроки'
      : null;

    return {
      badgeColor: '#0F6E56', badgeBg: '#E1F5EE',
      badge: 'Хорошие шансы на легализацию',
      title: 'Скорее всего вы можете получить карту побыту',
      body:  'По вашим ответам основные условия для легализации есть. Следующий шаг — проверить документы и правильно собрать пакет для миграционного органа.',
      items: [searching    ? 'Поможем оформить основание — это первый шаг'
                           : 'Подберём подходящий тип разрешения под ваше основание',
              refusalNote,
              familyBase   ? 'Воссоединение с супругом(ой) — проверим документы обоих и скоординируем подачу' : null,
              'Составим точный список документов под ваш миграционный орган',
              familyNote,
              'Сопроводим весь процесс — от консультации до получения карты']
              .filter(Boolean),
      dotColor: '#0F6E56',
      cta: 'Получить план действий бесплатно', alts: []
    };
  }

  /* ── Сборка HTML результата ── */
  function buildResult(r) {
    var h = '<div class="ppq-anim">';

    /* Бейдж */
    h += '<div class="ppq-result-badge" style="background:' + r.badgeBg + ';color:' + r.badgeColor + '">' + r.badge + '</div>';

    /* Заголовок + тело */
    h += '<h3 class="ppq-result-title">' + r.title + '</h3>';
    h += '<p class="ppq-result-body">' + r.body + '</p>';

    /* Пункты */
    if (r.items.length) {
      h += '<div class="ppq-result-items">';
      r.items.forEach(function (i) {
        h += '<div class="ppq-result-item"><div class="ppq-result-dot" style="background:' + r.dotColor + '"></div><div>' + i + '</div></div>';
      });
      h += '</div>';
    }

    /* Альтернативы */
    if (r.alts.length) {
      h += '<div class="ppq-divider"></div>';
      h += '<p class="ppq-alts-label">Альтернативные варианты:</p>';
      h += '<div class="ppq-result-items">';
      r.alts.forEach(function (a) {
        h += '<div class="ppq-result-item"><div class="ppq-result-dot" style="background:#bbb"></div><div>' + a + '</div></div>';
      });
      h += '</div>';
    }

    /* CTA-блок */
    h += '<div class="ppq-cta-box">';
    h += '<p class="ppq-cta-title">Разберём вашу ситуацию подробнее — бесплатно</p>';
    h += '<p class="ppq-cta-sub">Первая консультация без давления и обязательств. Объясним, что реально в вашем случае и сколько это займёт.</p>';
    h += '<div class="ppq-cta-row">';

    h += '<button type="button" class="ppq-btn ppq-btn-primary" data-open-lead="quiz">' + r.cta + '</button>';
    h += '<button class="ppq-restart" onclick="ppqRestart()">Пройти заново</button>';
    h += '</div></div>';
    h += '</div>';
    return h;
  }

  /* ── Рестарт ── */
  window.ppqRestart = function () {
    current = 0;
    answers = {};
    document.getElementById('ppq-result').style.display = 'none';
    document.getElementById('ppq-intro').style.display  = 'block';
  };

})();
