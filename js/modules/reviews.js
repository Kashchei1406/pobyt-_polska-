import { $ } from '../shared/dom.js';
import { MSG } from '../config/messages.js';

function escapeHtml(s) {
  if (s == null || s === '') return '';
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function starsFromRating(rating) {
  const n = Math.min(5, Math.max(0, Math.round(Number(rating) || 0)));
  return '★'.repeat(n) + '☆'.repeat(5 - n);
}

export function initReviews() {
  const container = $('[data-reviews-container]');
  const track = $('[data-reviews-track]', container);
  const loading = $('[data-reviews-loading]', container);
  if (!track) return;

  function setFallback(message) {
    track.setAttribute('data-reviews-loaded', '0');
    track.innerHTML =
      '<div class="reviews-carousel__loading">' +
      escapeHtml(message) +
      ' <a href="https://www.google.com/maps/place/Pobyt+Polska" target="_blank" rel="noreferrer">' +
      MSG.openInGoogleMaps +
      '</a></div>';
  }

  function render(data) {
    if (loading) loading.remove();
    if (!data || !data.ok || !Array.isArray(data.reviews) || data.reviews.length === 0) {
      let msg = MSG.reviewsFallback;
      if (data && data.error) msg += ` (${MSG.reviewsErrorPrefix}: ${String(data.error)})`;
      setFallback(msg);
      return;
    }
    const list = data.reviews;
    const cardSize = (100 / (list.length * 2)).toFixed(4);
    track.style.setProperty('--review-card-size', `${cardSize}%`);
    track.setAttribute('data-reviews-loaded', '1');
    const cards = list.map((r) => {
      const text = (r.text || '').trim() || '—';
      const author = escapeHtml((r.author_name || '').trim() || MSG.reviewsGuest);
      const stars = starsFromRating(r.rating);
      const time = (r.relative_time_description || '').trim();
      return (
        '<article class="review-card">' +
        `<div class="review-card__stars" aria-hidden="true">${escapeHtml(stars)}</div>` +
        '<div class="review-card__text-wrap">' +
        `<p class="review-card__text" data-review-text>${escapeHtml(text)}</p>` +
        '<button type="button" class="review-card__expand" data-review-expand aria-expanded="false" hidden>Развернуть</button>' +
        '</div>' +
        `<p class="review-card__author">${author}${time ? ' · ' + escapeHtml(time) : ''}</p>` +
        '<p class="review-card__source">Google Maps</p>' +
        '</article>'
      );
    });
    track.innerHTML = cards.concat(cards).join('');

    function showExpandIfOverflow() {
      track.querySelectorAll('.review-card').forEach((card) => {
        const textEl = card.querySelector('[data-review-text]');
        const btn = card.querySelector('[data-review-expand]');
        if (textEl && btn && textEl.scrollHeight > textEl.clientHeight) btn.hidden = false;
      });
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(showExpandIfOverflow);
    });

    track.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-review-expand]');
      if (!btn) return;
      const card = btn.closest('.review-card');
      if (!card) return;
      const expanded = card.classList.toggle('review-card--expanded');
      btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      btn.textContent = expanded ? 'Свернуть' : 'Развернуть';
    });
  }

  const reviewsApiUrl =
    typeof window.REVIEWS_API_URL === 'string' && window.REVIEWS_API_URL.trim()
      ? window.REVIEWS_API_URL.trim()
      : '';

  if (!reviewsApiUrl) {
    setFallback('Отзывы загружаются с Google Maps. Укажите REVIEWS_API_URL в index.html (отдельный скрипт отзывов).');
    return;
  }

  const scriptUrl = reviewsApiUrl + (reviewsApiUrl.indexOf('?') === -1 ? '?' : '&') + 'callback=';
  const callbackName = '__reviewsCb' + Date.now();
  window[callbackName] = (data) => {
    try {
      render(data);
    } finally {
      delete window[callbackName];
      if (script.parentNode) script.remove();
    }
  };
  const script = document.createElement('script');
  script.src = scriptUrl + callbackName;
  script.async = true;
  script.onerror = () => {
    setFallback('Не удалось загрузить отзывы.');
    delete window[callbackName];
  };
  document.body.appendChild(script);
}

