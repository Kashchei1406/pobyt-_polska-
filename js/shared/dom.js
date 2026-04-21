export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export function on(target, eventName, handler, options) {
  if (!target) return () => {};
  target.addEventListener(eventName, handler, options);
  return () => target.removeEventListener(eventName, handler, options);
}

export function delegate(root, selector, eventName, handler, options) {
  return on(
    root,
    eventName,
    (event) => {
      const target = event.target instanceof Element ? event.target.closest(selector) : null;
      if (!target) return;
      handler(event, target);
    },
    options,
  );
}

