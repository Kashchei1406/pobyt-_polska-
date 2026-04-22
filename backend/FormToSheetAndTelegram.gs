/**
 * Google Apps Script: приём заявок с сайта → Google Таблица + Telegram
 *
 * НАСТРОЙКА:
 * 1. Создайте Google Таблицу. В URL будет ID: docs.google.com/spreadsheets/d/ЭТОТ_ID/edit
 * 2. Создайте бота в Telegram: @BotFather → /newbot → получите токен (BOT_TOKEN)
 * 3. Узнайте chat_id: напишите боту любое сообщение, откройте в браузере:
 *    https://api.telegram.org/bot<BOT_TOKEN>/getUpdates — в ответе будет "chat":{"id":123456}
 * 4. Ниже замените BOT_TOKEN, CHAT_ID и SHEET_ID на свои значения.
 * 5. В таблице в первой строке задайте заголовки: Дата | Имя | Телефон | Город | Вопрос | Источник | Связь
 * 6. Разверните скрипт: Развернуть → Новое развертывание → Тип: Веб-приложение,
 *    Выполнять от имени: меня, У кого доступ: все. Скопируйте URL развертывания.
 * 7. На сайте в index.html задайте: window.FORM_SUBMIT_URL = 'URL_РАЗВЕРТЫВАНИЯ';
 *
 * Отзывы с Google Maps вынесены в отдельный скрипт backend/ReviewsFromGoogleMaps.gs
 * и разворачиваются отдельно (можно под другим аккаунтом). См. docs/ОТЗЫВЫ_GOOGLE_MAPS.md.
 */

const BOT_TOKEN = 'ВАШ_ТОКЕН_БОТА';
// ID чата: для группы — отрицательное число (например -1001234567890), для личного чата — положительное
const CHAT_ID = 'ВАШ_CHAT_ID';
// Таблица: https://docs.google.com/spreadsheets/d/1fvASj36TsBrUDXObZLxCtZw5EkGrzFDAEXxKK3ruvcM/edit
const SHEET_ID = '1fvASj36TsBrUDXObZLxCtZw5EkGrzFDAEXxKK3ruvcM';
const SHEET_NAME = 'Лиды';

function dayKey_(date) {
  var y = date.getFullYear();
  var m = ('0' + (date.getMonth() + 1)).slice(-2);
  var d = ('0' + date.getDate()).slice(-2);
  return y + m + d;
}

function quizCountPropKey_(date) {
  return 'quiz_count_' + dayKey_(date);
}

function doGet(e) {
  if (e && e.parameter && e.parameter.test === '1') {
    try {
      var spreadsheet = SpreadsheetApp.openById(SHEET_ID);
      var sheet = spreadsheet.getSheetByName(SHEET_NAME) || spreadsheet.getSheets()[0];
      sheet.appendRow([new Date(), 'Тест GET', '+48000000000', '—', 'Проверка по ссылке ?test=1', 'get-test']);
      return ContentService.createTextOutput(JSON.stringify({ ok: true, message: 'Тестовая строка добавлена в таблицу. Проверьте лист.' }))
        .setMimeType(ContentService.MimeType.JSON);
    } catch (err) {
      return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err.message) }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }
  return ContentService.createTextOutput(JSON.stringify({ ok: true, message: 'Приём заявок работает. Форма с сайта отправляет данные методом POST.' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function normalizeContactPref_(v) {
  var s = String(v || '').trim().toLowerCase();
  if (s === 'messenger') return 'messenger';
  return 'phone';
}

function contactPrefLabel_(pref) {
  return pref === 'messenger' ? 'Мессенджер' : 'Телефон';
}

function normalizeContactMethod_(v) {
  var s = String(v || '').trim().toLowerCase();
  if (s === 'telegram') return 'Telegram';
  if (s === 'whatsapp') return 'WhatsApp';
  if (s === 'viber') return 'Viber';
  if (s === 'мессенджер') return 'Мессенджер';
  if (s === 'телефон' || s === 'phone') return 'Телефон';
  return '';
}

function parseFormBody(contents) {
  var params = {};
  if (!contents || typeof contents !== 'string') return params;
  var pairs = contents.split('&');
  for (var i = 0; i < pairs.length; i++) {
    var kv = pairs[i].split('=');
    if (kv.length >= 2) {
      params[decodeURIComponent(kv[0].replace(/\+/g, ' '))] = decodeURIComponent((kv.slice(1).join('=')).replace(/\+/g, ' '));
    }
  }
  return params;
}

function doPost(e) {
  try {
    var name = '', phone = '', city = '', message = '', source = 'site';
    var contact_pref = 'phone';
    var contact_method = '';

    if (e.parameter && (e.parameter.name || e.parameter.phone)) {
      name = (e.parameter.name || '').trim();
      phone = (e.parameter.phone || '').trim();
      city = (e.parameter.city || '').trim();
      message = (e.parameter.message || '').trim();
      source = (e.parameter.source || 'site').trim();
      contact_pref = normalizeContactPref_(e.parameter.contact_pref);
      contact_method = normalizeContactMethod_(e.parameter.contact_method);
    } else if (e.postData && e.postData.contents) {
      var raw = e.postData.contents;
      if (raw.indexOf('=') !== -1 && raw.indexOf('{') !== 0) {
        var p = parseFormBody(raw);
        name = (p.name || '').trim();
        phone = (p.phone || '').trim();
        city = (p.city || '').trim();
        message = (p.message || '').trim();
        source = (p.source || 'site').trim();
        contact_pref = normalizeContactPref_(p.contact_pref);
        contact_method = normalizeContactMethod_(p.contact_method);
      } else {
        var data = JSON.parse(raw);
        name = (data.name || '').trim();
        phone = (data.phone || '').trim();
        city = (data.city || '').trim();
        message = (data.message || '').trim();
        source = (data.source || 'site').trim();
        contact_pref = normalizeContactPref_(data.contact_pref);
        contact_method = normalizeContactMethod_(data.contact_method);
      }
    }

    if (!contact_method) {
      contact_method = contactPrefLabel_(contact_pref);
    }

    if (!name || !phone) {
      return ContentService.createTextOutput(JSON.stringify({ ok: false, error: 'Неверные данные' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Инкремент счётчика квиза (без сохранения деталей).
    // Сайт отправляет: name=QuizCount, phone='-', message='inc', source='quiz_count'
    if (source === 'quiz_count' && message === 'inc') {
      var props = PropertiesService.getScriptProperties();
      var key = quizCountPropKey_(new Date());
      var current = Number(props.getProperty(key) || '0');
      props.setProperty(key, String(current + 1));
      return ContentService.createTextOutput(JSON.stringify({ ok: true, count: current + 1 }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var row = [new Date(), name, phone, city, message, source, contact_method];
    var spreadsheet = SpreadsheetApp.openById(SHEET_ID);
    var sheet = spreadsheet.getSheetByName(SHEET_NAME);
    if (!sheet) {
      sheet = spreadsheet.getSheets()[0];
    }
    if (sheet) {
      sheet.appendRow(row);
    }

    // Telegram — только если заданы токен и chat_id (иначе можно тестировать только таблицу)
    if (BOT_TOKEN && BOT_TOKEN !== 'ВАШ_ТОКЕН_БОТА' && CHAT_ID && CHAT_ID !== 'ВАШ_CHAT_ID') {
      const text = [
        '🆕 Новая заявка с сайта',
        '',
        '👤 Имя: ' + name,
        '📞 Телефон: ' + phone,
        '📱 Связь: ' + contact_method,
        '🏙 Город: ' + (city || '—'),
        '💬 Вопрос: ' + (message || '—'),
        '📍 Источник: ' + source,
      ].join('\n');
      sendTelegram(text);
    }

    return ContentService.createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err.message) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Отправляет в Telegram количество прохождений квиза за сегодня и обнуляет счётчик.
 * Поставьте на таймер (ежедневно, например 23:59).
 */
function sendDailyQuizCount() {
  var now = new Date();
  var props = PropertiesService.getScriptProperties();
  var key = quizCountPropKey_(now);
  var count = Number(props.getProperty(key) || '0');

  if (BOT_TOKEN && BOT_TOKEN !== 'ВАШ_ТОКЕН_БОТА' && CHAT_ID && CHAT_ID !== 'ВАШ_CHAT_ID') {
    var text = '📊 Квиз: прохождений за сегодня — ' + count;
    sendTelegram(text);
  }

  // Обнуляем на следующий день
  props.setProperty(key, '0');
}

function sendTelegram(text) {
  const url = 'https://api.telegram.org/bot' + BOT_TOKEN + '/sendMessage';
  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      chat_id: CHAT_ID,
      text: text,
      parse_mode: 'HTML',
    }),
    muteHttpExceptions: true,
  };
  UrlFetchApp.fetch(url, options);
}

