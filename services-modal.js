/**
 * Модальные окна услуг (блок #services). CTA → событие pobyt:open-lead (слушатель в main.js).
 */
(function () {
  var FAMILY_PRICES = {
    '2+1': 5000,
    '2+2': 6000,
    '2+3': 7000,
    '2+4': 8000,
    '2+5': 9000,
  };
  var currentFamily = '2+1';

  var SERVICES = {
    vnj: {
      formTitle: 'ВНЖ / карта побыту',
      badge: 'ВНЖ — первая/следующая карта',
      title: 'Карта побыту — первая или продление статуса',
      sub: 'Подбираем основание, собираем полный пакет документов и сопровождаем весь процесс до получения карты.',
      includes: [
        'Анализ ситуации и подбор основания для легализации',
        'Подготовка документов и сопроводительных писем',
        'Сопровождение подачи в миграционный орган',
        'Контроль статуса дела и ответы на запросы',
        'Ускорение процесса включено — без доплат',
        'Апелляция включена — без доплат',
      ],
      price: 2000,
    },
    pmj: {
      formTitle: 'ПМЖ / резидент ЕС',
      badge: 'ПМЖ / резидент ЕС',
      title: 'Постоянный вид на жительство',
      sub: 'Проверяем польское происхождение/стаж, доходы и перерывы в пребывании. Готовим полный пакет документов и сопровождаем до результата.',
      includes: [
        'Анализ документов, подтверждающих польское происхождение',
        'Проверка стажа и непрерывности пребывания',
        'Анализ доходов и подтверждающих документов',
        'Подготовка полного пакета документов для миграционного органа',
        'Сопровождение подачи и контроль статуса',
        'Ускорение процесса включено — без доплат',
        'Апелляция включена — без доплат',
      ],
      price: 2000,
    },
    appeal: {
      formTitle: 'Апелляция и отказ',
      badge: 'Апелляция',
      title: 'Обжалование отказа миграционного органа',
      sub: 'Разбираем причину отказа, готовим аргументированную жалобу и сопровождаем до положительного решения.',
      includes: [
        'Анализ решения об отказе',
        'Определение законных оснований для обжалования',
        'Подготовка и подача аргументированной жалобы в вышестоящий орган',
        'Сопровождение до положительного решения',
      ],
      price: 1000,
    },
    speed: {
      formTitle: 'Ускорение выдачи',
      badge: 'Ускорение выдачи',
      title: 'Ускорение рассмотрения дела',
      sub: 'Если дело рассматривается дольше установленных сроков — помогаем сдвинуть его с места.',
      includes: [
        'Проверка статуса и сроков рассмотрения',
        'Письма и жалобы на нарушение сроков',
        'Подготовка и подача жалобы в вышестоящий орган',
        'Контроль до получения ответа',
      ],
      price: 500,
    },
    karta: {
      formTitle: 'Карта поляка',
      badge: 'Карта поляка',
      title: 'Карта поляка — легализация по польским корням',
      sub: 'Ведём весь процесс получения карты поляка — от проверки документов до подготовки к экзамену.',
      includes: [
        'Проверка документов, подтверждающих польское происхождение',
        'Заполнение внёска и сбор полного пакета документов',
        'Запись на ближайшее доступное время подачи',
        'Материалы для подготовки к экзамену по истории и культуре Польши',
        'Тестовое собеседование: разберём частые вопросы и что лучше доучить',
      ],
      price: 1000,
    },
    start: {
      formTitle: 'Старт в Польше',
      badge: 'Старт в Польше',
      title: 'Старт в Польше — первые шаги под ключ',
      sub: 'Только приехали или планируете переезд? Берём на себя всё бумажное — чтобы вы занялись жизнью, а не очередями.',
      includes: [
        'Получение номера PESEL',
        'Оформление прописки (мельдунек)',
        'Помощь с открытием счёта в польском банке',
        'Консультация по польскому законодательству для мигрантов',
        'Разбор вашей ситуации и план следующих шагов по легализации',
      ],
      price: 1000,
    },
    jdg: {
      formTitle: 'JDG и компании',
      badge: 'JDG / Spółka',
      title: 'Легализация для JDG/Spółka и IT-специалистов',
      sub: 'Учитываем специфику бизнеса: подтверждение дохода, бизнес-план, история JDG/Spółka, документы от контрагентов.',
      includes: [
        'Анализ ситуации с учётом специфики JDG/Spółka',
        'Разработка бизнес-плана',
        'Подготовка пакета документов, необходимых для подачи',
        'Сопровождение подачи в миграционный орган',
        'Ускорение процесса включено — без доплат',
        'Апелляция включена — без доплат',
      ],
      price: 2200,
    },
    family: {
      formTitle: 'Семейная подача',
      badge: 'Семейная подача',
      title: 'Легализация для всей семьи',
      sub: 'Сопровождаем всех членов семьи в одном процессе — параллельные дела, скоординированные сроки, фиксированная цена.',
      includes: [
        'Анализ ситуации каждого члена семьи',
        'Единый план подачи и координация сроков',
        'Пакет документов на каждого члена семьи',
        'Сопровождение подачи для всей семьи',
        'Ускорение процесса включено — без доплат',
        'Апелляция включена для всех — без доплат',
      ],
      price: null,
    },
  };

  function checkIcon() {
    return (
      '<svg viewBox="0 0 10 8" fill="none" width="9" height="9" aria-hidden="true">' +
      '<path d="M1 4l2.5 2.5L9 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</svg>'
    );
  }

  function buildModal(key) {
    var s = SERVICES[key];
    var isFamily = key === 'family';

    var incHTML = s.includes
      .map(function (item) {
        return (
          '<div class="svc-modal__inc-row">' +
          '<div class="svc-modal__inc-check">' +
          checkIcon() +
          '</div>' +
          '<div>' +
          item +
          '</div>' +
          '</div>'
        );
      })
      .join('');

    var compactPayAndGuarantee = key === 'appeal' || key === 'speed' || key === 'karta' || key === 'start';
    var hidePaySection = Boolean(s.noPay);

    var payHTML = hidePaySection
      ? ''
      : compactPayAndGuarantee
      ? '<div class="svc-modal__payment">' +
        '<div class="svc-modal__pay-row">' +
        '<span class="svc-modal__pay-badge">100%</span>' +
        '<span>Оплата при подписании договора — фиксируем условия и начинаем работу</span>' +
        '</div>' +
        '</div>'
      : '<div class="svc-modal__payment">' +
        '<div class="svc-modal__pay-row">' +
        '<span class="svc-modal__pay-badge">50%</span>' +
        '<span>При подписании договора — фиксируем условия и начинаем работу</span>' +
        '</div>' +
        '<div class="svc-modal__pay-row">' +
        '<span class="svc-modal__pay-badge">50%</span>' +
        '<span>При сдаче отпечатков — дело передано в миграционный орган</span>' +
        '</div>' +
        '</div>';

    var guarHTML = hidePaySection
      ? '<div class="svc-modal__guarantee">Цена фиксирована в договоре.</div>'
      : compactPayAndGuarantee
      ? '<div class="svc-modal__guarantee">' + 'Цена фиксирована в договоре.' + '</div>'
      : '<div class="svc-modal__guarantee">' +
        'Цена фиксирована в договоре.<br />Если придёт отказ или карта выдана на неполный срок — меньше, чем позволяет ваше основание — продолжаем работу без доплат.' +
        '</div>';

    var priceHTML = '';
    if (isFamily) {
      var optsHTML = Object.keys(FAMILY_PRICES)
        .map(function (k) {
          return (
            '<button type="button" class="svc-modal__family-opt' +
            (k === currentFamily ? ' active' : '') +
            '" data-family-key="' +
            k +
            '">' +
            k +
            '</button>'
          );
        })
        .join('');
      priceHTML =
        '<div class="svc-modal__family-label">Состав семьи</div>' +
        '<div class="svc-modal__family-opts">' +
        optsHTML +
        '</div>' +
        '<div class="svc-modal__family-note">2 взрослых + количество детей</div>' +
        '<div class="svc-modal__price-row">' +
        '<span class="svc-modal__price-label">Стоимость</span>' +
        '<span class="svc-modal__price-val" id="svc-family-price">' +
        FAMILY_PRICES[currentFamily].toLocaleString('ru') +
        ' <span>zł</span>' +
        '</span>' +
        '</div>';
    } else {
      priceHTML =
        '<div class="svc-modal__price-row">' +
        '<span class="svc-modal__price-label">Стоимость</span>' +
        '<span class="svc-modal__price-val">' +
        s.price.toLocaleString('ru') +
        ' <span>zł</span>' +
        '</span>' +
        '</div>';
    }

    return (
      '<div class="svc-modal__badge">' +
      s.badge +
      '</div>' +
      '<div class="svc-modal__title">' +
      s.title +
      '</div>' +
      '<div class="svc-modal__sub">' +
      s.sub +
      '</div>' +
      '<div class="svc-modal__section-label">Что входит в услугу</div>' +
      '<div class="svc-modal__inc-list">' +
      incHTML +
      '</div>' +
      '<div class="svc-modal__divider"></div>' +
      payHTML +
      guarHTML +
      priceHTML +
      '<button type="button" class="svc-modal__cta">Записаться на консультацию</button>'
    );
  }

  function wireFamilyButtons() {
    document.querySelectorAll('.svc-modal__family-opt[data-family-key]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var k = btn.getAttribute('data-family-key');
        if (!k) return;
        currentFamily = k;
        document.querySelectorAll('.svc-modal__family-opt').forEach(function (b) {
          b.classList.toggle('active', b.getAttribute('data-family-key') === k);
        });
        var el = document.getElementById('svc-family-price');
        if (el) el.innerHTML = FAMILY_PRICES[k].toLocaleString('ru') + ' <span>zł</span>';
      });
    });
  }

  function wireCta() {
    var cta = document.querySelector('#svc-modal-content .svc-modal__cta');
    if (cta) {
      cta.addEventListener('click', function () {
        svcBookConsult();
      });
    }
  }

  window.svcOpenModal = function (key) {
    window.__svcCurrentKey = key;
    var content = document.getElementById('svc-modal-content');
    if (content) content.innerHTML = buildModal(key);
    var overlay = document.getElementById('svc-overlay');
    if (overlay) overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    wireFamilyButtons();
    wireCta();
  };

  window.svcCloseModal = function () {
    var overlay = document.getElementById('svc-overlay');
    if (overlay) overlay.classList.remove('open');
    document.body.style.overflow = '';
  };

  window.svcHandleOverlay = function (e) {
    if (e.target === document.getElementById('svc-overlay')) svcCloseModal();
  };

  window.svcBookConsult = function () {
    var key = window.__svcCurrentKey;
    if (!key || !SERVICES[key]) return;
    var msg = SERVICES[key].formTitle;
    if (key === 'family') {
      msg = msg + ' · состав ' + currentFamily;
    }
    document.dispatchEvent(
      new CustomEvent('pobyt:open-lead', {
        detail: { source: 'services-modal', message: msg },
      }),
    );
  };

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      var ov = document.getElementById('svc-overlay');
      if (ov && ov.classList.contains('open')) svcCloseModal();
    }
  });
})();
