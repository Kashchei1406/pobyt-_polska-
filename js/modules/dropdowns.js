import { delegate, on } from '../shared/dom.js';

function getControlFromTarget(target) {
  if (!(target instanceof Element)) return null;
  return target.closest('[data-dropdown-toggle]');
}

function getMenuByControl(control) {
  if (!control) return null;
  const id = control.getAttribute('aria-controls');
  if (!id) return null;
  return document.getElementById(id);
}

function getDropdownRoot(node) {
  if (!(node instanceof Element)) return null;
  return node.closest('[data-dropdown]');
}

export function setDropdownOpen(control, open) {
  const menu = getMenuByControl(control);
  if (!menu) return;
  menu.hidden = !open;
  control.setAttribute('aria-expanded', open ? 'true' : 'false');
}

export function closeAllDropdowns() {
  document.querySelectorAll('[data-dropdown-toggle]').forEach((control) => {
    setDropdownOpen(control, false);
  });
}

export function initDropdowns(root = document) {
  delegate(root, '[data-dropdown-toggle]', 'click', (event, control) => {
    event.preventDefault();
    const wasOpen = control.getAttribute('aria-expanded') === 'true';
    closeAllDropdowns();
    if (!wasOpen) setDropdownOpen(control, true);
  });

  on(root, 'click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (getControlFromTarget(target)) return;
    if (getDropdownRoot(target)) return;
    closeAllDropdowns();
  });

  on(root, 'keydown', (event) => {
    if (event.key === 'Escape') closeAllDropdowns();
  });
}

