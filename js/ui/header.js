/* Шапка: баланс, режим, профиль. Разметка — в index.html, здесь только синхронизация с state.
   До открытия казино в шапке нет ни переключателя режимов, ни доната, ни онлайна. */
(function (EC) {
  'use strict';
  const U = EC.util, UI = EC.ui, html = U.html;
  const S = () => EC.store.state;

  const H = {};

  H.update = () => {
    const s = S(), E = EC.econ;
    const mode = document.documentElement.dataset.theme === 'neon' ? 'casino' : 'study';
    const casinoOpen = E.casinoOpen(s);
    UI.text(UI.$('#brandB'), mode === 'casino' ? 'КАЗИНО' : 'БОТАЕТ');
    // На учёбе большие числа сокращаются, в казино баланс всегда полностью.
    UI.text(UI.$('#balNum'), mode === 'casino' ? U.fmt(s.balance) : U.big(s.balance));
    UI.text(UI.$('#balClover'), mode === 'casino' && s.shopEquipped.clover ? '♣' : '');
    UI.text(UI.$('#whoAv'), UI.avatar());
    UI.set(UI.$('#whoName'), html`${s.name || 'Игрок'}${s.shopEquipped.crown ? html`<span class="crown" aria-label="корона">♛</span>` : ''}`);
    UI.set(UI.$('#whoTitle'), UI.titleBadge(s.title));
    UI.$('#modeSeg').hidden = !casinoOpen;
    document.body.classList.toggle('no-modes', !casinoOpen);
    UI.$$('[data-mode-btn]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.modeBtn === mode)));
    UI.$('#online').hidden = !(casinoOpen && mode === 'casino');
    UI.$('#donateBtn').hidden = !E.isOpen('donate');
    // Оформление из магазина работает только в казино: тема БГУИР — строгая, без свечения.
    const b = document.body, on = (id) => (mode === 'casino' && s.shopEquipped[id] ? '1' : '0');
    for (const id of ['neon', 'fire', 'cardback', 'dice', 'wheel', 'frame']) b.dataset[id] = on(id);
    b.dataset.anim = UI.animOn() ? 'on' : 'off';
    EC.fx.setTrail(mode === 'casino' && !!s.shopEquipped.trail);
  };

  // Фейковый онлайн
  H.tickOnline = () => UI.text(UI.$('#onlineNum'), String(340 + Math.floor(U.rand() * 130)));

  EC.header = H;
  EC.bus.on('change', H.update);
})(globalThis.EC = globalThis.EC || {});
