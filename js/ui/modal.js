/* Модалки. locked = нельзя закрыть крестиком, кликом мимо и Escape
   (обязательный ввод имени, бонус-игра). */
(function (EC) {
  'use strict';
  const UI = EC.ui, html = EC.util.html;

  let current = null; // { root, locked, onClose }

  const M = {};
  M.isOpen = () => !!current;
  M.isLocked = () => !!(current && current.locked);

  M.open = ({ title, body, locked = false, wide = false, onMount, onClose }) => {
    M.close(true);
    const root = UI.$('#modalRoot');
    root.innerHTML = String(html`<div class="modal-bg" data-bg>
      <div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-labelledby="mTitle">
        <div class="modal-head">
          <h2 class="h-block" id="mTitle">${title}</h2>
          ${locked ? '' : html`<button class="btn b-gho icon" data-close aria-label="Закрыть">✕</button>`}
        </div>
        <div class="modal-body">${body}</div>
      </div>
    </div>`);
    const bg = root.firstElementChild;
    current = { root: bg, locked, onClose, prevFocus: document.activeElement };
    bg.addEventListener('click', (e) => {
      if (current && current.locked) return;
      if (e.target === bg || e.target.closest('[data-close]')) M.close();
    });
    if (onMount) onMount(bg.querySelector('.modal-body'), bg);
    const focusable = bg.querySelector('input, [autofocus], .modal-body button');
    if (focusable) focusable.focus({ preventScroll: true });
    return bg.querySelector('.modal-body');
  };

  // silent = закрытие ради открытия следующей модалки
  M.close = (silent) => {
    if (!current) return;
    const c = current;
    current = null;
    UI.$('#modalRoot').innerHTML = '';
    if (c.onClose && !silent) c.onClose();
    if (!silent && c.prevFocus && c.prevFocus.focus) c.prevFocus.focus({ preventScroll: true });
  };
  // Перерисовать тело текущей модалки (после покупки и т. п.)
  M.body = () => (current ? current.root.querySelector('.modal-body') : null);

  EC.modal = M;
})(globalThis.EC = globalThis.EC || {});
