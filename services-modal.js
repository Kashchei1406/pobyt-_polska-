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
      badge: 'ВНЖ — первая карта',
      title: 'Карта побыту — первая или смена статуса',
      sub: 'Подбираем основание, собираем полный пакет документов и сопровождаем весь процесс до получения карты.',
      includes: [
        'Анализ ситуации и подбор основания для легализации',
        'Подготовка анкет и сопроводительных писем',
        'Координация присяжных переводов',
        'Сопровождение подачи в воеводство',
        'Контроль статуса дела и ответы на запросы',
        'Апелляция включена — без доплат',
        'Ускорение включено — без доплат',
      ],
      price: 2000,
    },
    pmj: {
      formTitle: 'ПМЖ / резидент ЕС',
      badge: 'ПМЖ / резидент ЕС',
      title: 'Постоянный вид на жительство',
      sub: 'Проверяем стаж, доходы и перерывы в пребывании. Готовим полный пакет и сопровождаем до решения.',
      includes: [
        'Проверка стажа и непрерывности пребывания',
        'Анализ доходов и подтверждающих документов',
        'Подготовка полного пакета для воеводства',
        'Сопровождение подачи и контроль статуса',
        'Апелляция включена — без доплат',
      ],
      price: 2000,
    },
    appeal: {
      formTitle: 'Апелляции и отказы',
      badge: 'Апелляция / отказ',
      title: 'Обжалование отказа воеводства',
      sub: 'Разбираем причину отказа, готовим аргументированную жалобу и сопровождаем до итогового решения.',
      includes: [
        'Анализ текста решения об отказе',
        'Определение оснований для обжалования',
        'Подготовка аргументированной жалобы',
        'Подача в вышестоящий орган',
        'Сопровождение до итогового решения',
        'Повторная подача с исправленным пакетом при необходимости',
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
        'Запросы в воеводство с обоснованием срочности',
        'Письма и жалобы на нарушение сроков',
        'Контроль до получения ответа',
      ],
      price: 500,
    },
    jdg: {
      formTitle: 'JDG и компании',
      badge: 'JDG / бизнес',
      title: 'Легализация для JDG и IT-специалистов',
      sub: 'Учитываем специфику самозанятых: подтверждение дохода, бизнес-план, история JDG, документы для воеводства.',
      includes: [
        'Анализ ситуации с учётом специфики JDG',
        'Разработка бизнес-плана для воеводства',
        'Подготовка документов, подтверждающих доход',
        'Подготовка анкет и сопроводительных писем',
        'Сопровождение подачи в воеводство',
        'Апелляция включена — без доплат',
        'Ускорение включено — без доплат',
      ],
      price: 2000,
    },
    family: {
      formTitle: 'Семейная подача',
      badge: 'Семейная подача',
      title: 'Легализация для всей семьи',
      sub: 'Сопровождаем всех членов семьи в одном процессе — один контакт, скоординированные сроки, фиксированная цена.',
      includes: [
        'Анализ ситуации каждого члена семьи',
        'Единый план подачи и координация сроков',
        'Пакет документов на каждого члена семьи',
        'Сопровождение подачи для всей семьи',
        'Апелляция включена для всех — без доплат',
        'Ускорение включено — без доплат',
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

    var payHTML =
      '<div class="svc-modal__payment">' +
      '<div class="svc-modal__pay-row">' +
      '<span class="svc-modal__pay-badge">50%</span>' +
      '<span>При подписании договора — фиксируем условия и начинаем работу</span>' +
      '</div>' +
      '<div class="svc-modal__pay-row">' +
      '<span class="svc-modal__pay-badge">50%</span>' +
      '<span>При сдаче отпечатков — дело передано в воеводство</span>' +
      '</div>' +
      '</div>';

    var guarHTML =
      '<div class="svc-modal__guarantee">' +
      'Цена фиксирована в договоре. Если придёт отказ или wezwanie — продолжаем работу без доплат.' +
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
