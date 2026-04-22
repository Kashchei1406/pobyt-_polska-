import { $$ } from '../shared/dom.js';
import { MSG } from '../config/messages.js';
import { storage } from '../shared/storage.js';

const THEME_KEY = 'pobyt_theme';

export function initThemeToggle() {
  const buttons = $$('[data-theme-toggle]');
  if (!buttons.length) return;

  const ensureThemeToggleMarkup = (btn) => {
    if (btn.querySelector('.theme-toggle-btn__icon')) return;
    const sun = document.createElement('span');
    sun.className = 'theme-toggle-btn__icon theme-toggle-btn__icon--sun';
    sun.setAttribute('aria-hidden', 'true');
    sun.innerHTML =
      '<svg viewBox="0 0 24 24" focusable="false"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>';

    const moon = document.createElement('span');
    moon.className = 'theme-toggle-btn__icon theme-toggle-btn__icon--moon';
    moon.setAttribute('aria-hidden', 'true');
    moon.innerHTML =
      '<svg viewBox="0 0 24 24" focusable="false"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>';

    btn.replaceChildren(sun, moon);
  };

  buttons.forEach((btn) => ensureThemeToggleMarkup(btn));

  const setButtonState = (theme) => {
    const isDark = theme === 'dark';
    buttons.forEach((btn) => {
      btn.setAttribute('data-theme-icon', isDark ? 'sun' : 'moon');
      btn.classList.toggle('theme-toggle-btn--dark-mode', isDark);
      btn.setAttribute('aria-label', isDark ? MSG.themeDark : MSG.themeLight);
      btn.setAttribute('title', isDark ? MSG.themeDark : MSG.themeLight);
    });
  };

  const applyTheme = (theme) => {
    if (theme === 'dark' || theme === 'light') {
      document.documentElement.setAttribute('data-theme', theme);
      setButtonState(theme);
      return;
    }
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const systemTheme = prefersDark ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', systemTheme);
    setButtonState(systemTheme);
  };

  const saved = storage.get(THEME_KEY);
  applyTheme(saved);

  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      storage.set(THEME_KEY, next);
    });
  });
}

