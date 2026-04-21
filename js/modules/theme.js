import { $$ } from '../shared/dom.js';
import { MSG } from '../config/messages.js';
import { storage } from '../shared/storage.js';

const THEME_KEY = 'pobyt_theme';

export function initThemeToggle() {
  const buttons = $$('[data-theme-toggle]');
  if (!buttons.length) return;

  const setButtonState = (theme) => {
    const isDark = theme === 'dark';
    buttons.forEach((btn) => {
      btn.textContent = isDark ? '☀️' : '🌙';
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

