import { $, $$ } from '../shared/dom.js';

export function initMobileMenu() {
  const burger = $('[data-burger]');
  const mobile = $('#mobileMenu');
  if (!burger || !mobile) return;

  const setOpen = (open) => {
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    mobile.hidden = !open;
  };

  burger.addEventListener('click', () => {
    const open = burger.getAttribute('aria-expanded') !== 'true';
    setOpen(open);
  });

  $$('[data-mobile-link]', mobile).forEach((a) => {
    a.addEventListener('click', () => setOpen(false));
  });
}

