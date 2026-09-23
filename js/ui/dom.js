/* DOM-хелперы, скорость анимаций, рендер карт. */
(function (EC) {
  'use strict';
  const U = EC.util, C = EC.config;
  const html = U.html;

  const UI = {};
  UI.$ = (sel, root = document) => root.querySelector(sel);
  UI.$$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  UI.set = (el, h) => { if (el) el.innerHTML = Array.isArray(h) ? h.join('') : String(h); };
  UI.text = (el, t) => { if (el) el.textContent = t; };

  const reduced = () => globalThis.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  UI.animOn = () => EC.store.state.anim && !reduced();
  // Множитель скорости: турбо ×1/×2/×4, «анимации выкл» — почти мгновенно.
  UI.speed = () => (UI.animOn() ? EC.store.state.turbo : 12);
  UI.wait = (ms) => new Promise((r) => setTimeout(r, ms / UI.speed()));
  UI.reflow = (el) => void el.offsetWidth;

  /* ---------- Игральные карты ---------- */
  UI.card = (c, opts = {}) => {
    if (!c || opts.back) return html`<div class="pcard back ${opts.cls || ''}" aria-label="Закрытая карта"></div>`;
    const R = EC.cards.RANKS[c.r], S = EC.cards.SUITS[c.s];
    const red = EC.cards.isRed(c) ? 'red' : '';
    return html`<div class="pcard ${red} ${opts.cls || ''}" ${U.raw(opts.attrs || '')} aria-label="${R}${S}">
      <div class="cr"><span>${R}</span><small>${S}</small></div>
      <div class="cs">${S}</div>
      <div class="cr b"><span>${R}</span><small>${S}</small></div>
      ${opts.hold ? html`<span class="hold">ДЕРЖУ</span>` : ''}
    </div>`;
  };
  UI.cardSlot = () => html`<div class="pcard ph" aria-hidden="true"></div>`;
  UI.sameCard = (a, b) => a && b && a.r === b.r && a.s === b.s;

  /* ---------- Мелочи ---------- */
  UI.money = (n) => html`<span class="num">${U.fmt(n)}&nbsp;E</span>`;
  UI.titleBadge = (id) => {
    const t = EC.econ.titleOf(id);
    return t ? html`<span class="bdg bdg-${t.c}">${t.n}</span>` : '';
  };
  UI.avatar = () => C.AVATARS[EC.store.state.avatar] || C.AVATARS[0];

  EC.ui = UI;
})(globalThis.EC = globalThis.EC || {});
