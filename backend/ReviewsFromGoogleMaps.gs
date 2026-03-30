/**
 * Отдельный Google Apps Script только для отзывов с Google Maps.
 * Не использует таблицы и Telegram — можно развернуть под другим аккаунтом (например, рабочим).
 *
 * Google отдаёт максимум 5 отзывов за запрос. Скрипт кэширует их в Script Properties
 * и при каждом запросе подмешивает свежие 5 из API к кэшу (дедуп по автору+время+текст),
 * хранит до 20 отзывов и отдаёт их. Со временем кэш заполняется новыми отзывами с карточки.
 *
 * НАСТРОЙКА:
 * 1. Создайте новый проект на script.google.com (или откройте под нужным аккаунтом).
 * 2. Вставьте этот файл целиком. Сохраните.
 * 3. Настройки проекта (шестерёнка) → Script Properties → добавьте:
 *    - PLACES_API_KEY — API-ключ из Google Cloud (включён Places API)
 *    - PLACE_ID — идентификатор карточки компании в Google Maps
 * 4. Развернуть → Новое развертывание → Веб-приложение:
 *    Выполнять от имени: я, У кого доступ: все.
 * 5. Скопируйте URL развёртывания и в index.html задайте:
 *    window.REVIEWS_API_URL = 'https://script.google.com/macros/s/.../exec';
 *
 * Подробно: docs/ОТЗЫВЫ_GOOGLE_MAPS.md
 */

var REVIEWS_CACHE_KEY = 'REVIEWS_CACHE';
var REVIEWS_CACHE_MAX = 20;

function doGet(e) {
  e = e || {};
  e.parameter = e.parameter || {};
  var data = getReviewsData_();
  var json = JSON.stringify(data);
  var callback = e.parameter.callback;
  if (callback && /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(callback)) {
    return ContentService.createTextOutput(callback + '(' + json + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

function reviewKey_(r) {
  var t = (r && r.text) ? String(r.text).substring(0, 80) : '';
  var a = (r && r.author_name) ? String(r.author_name) : '';
  var d = (r && r.relative_time_description) ? String(r.relative_time_description) : '';
  return a + '|' + d + '|' + t;
}

function getReviewsData_() {
  var props = PropertiesService.getScriptProperties();
  var apiKey = props.getProperty('PLACES_API_KEY');
  var placeId = props.getProperty('PLACE_ID');
  if (!apiKey || !placeId) {
    return {
      ok: false,
      error: 'Not configured',
      reviews: [],
      message: 'Задайте в настройках проекта Script Properties: PLACES_API_KEY и PLACE_ID.'
    };
  }
  var url = 'https://maps.googleapis.com/maps/api/place/details/json?place_id=' +
    encodeURIComponent(placeId) + '&fields=reviews&language=ru&reviews_sort=newest&key=' + encodeURIComponent(apiKey);
  try {
    var res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    var data = JSON.parse(res.getContentText());
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      return { ok: false, error: data.status || 'Unknown', reviews: [] };
    }
    var fromApi = (data.result && data.result.reviews) || [];
    var cacheJson = props.getProperty(REVIEWS_CACHE_KEY);
    var cache = [];
    try {
      if (cacheJson) cache = JSON.parse(cacheJson);
    } catch (e2) { cache = []; }
    var seen = {};
    cache.forEach(function (r) {
      seen[reviewKey_(r)] = true;
    });
    fromApi.forEach(function (r) {
      var k = reviewKey_(r);
      if (!seen[k]) {
        seen[k] = true;
        cache.push(r);
      }
    });
    cache = cache.slice(-REVIEWS_CACHE_MAX);
    try {
      props.setProperty(REVIEWS_CACHE_KEY, JSON.stringify(cache));
    } catch (e3) {
      if (cache.length > 15) cache = cache.slice(-15);
      try { props.setProperty(REVIEWS_CACHE_KEY, JSON.stringify(cache)); } catch (e4) {}
    }
    return { ok: true, reviews: cache };
  } catch (err) {
    return { ok: false, error: String(err.message), reviews: [] };
  }
}
