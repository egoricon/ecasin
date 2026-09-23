/* Шапка: баланс, режим, профиль. Разметка — в index.html, здесь только синхронизация с state. */
(function (EC) {
  'use strict';
  const U = EC.util, UI = EC.ui, html = U.html;
  const S = () => EC.store.state;

  const H = {};

  H.update = () => {
    const s = S();
    UI.text(UI.$('#balNum'), U.fmt(s.balance));
    UI.text(UI.$('#balClover'), s.shopEquipped.clover ? '♣' : '');
    UI.text(UI.$('#whoAv'), UI.avatar());
    UI.set(UI.$('#whoName'), html`${s.name || 'Игрок'}${s.shopEquipped.crown ? html`<span class="crown" aria-label="корона">♛</span>` : ''}`);
    UI.set(UI.$('#whoTitle'), UI.titleBadge(s.title));
    const mode = document.body.dataset.mode;
    UI.$$('[data-mode-btn]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.modeBtn === mode)));
    document.body.dataset.neon = s.shopEquipped.neon ? '1' : '0';
    document.body.dataset.fire = s.shopEquipped.fire ? '1' : '0';
    document.body.dataset.anim = UI.animOn() ? 'on' : 'off';
    EC.fx.setTrail(!!s.shopEquipped.trail);
  };

  // Фейковый онлайн
  H.tickOnline = () => UI.text(UI.$('#onlineNum'), String(340 + Math.floor(U.rand() * 130)));

  EC.header = H;
  EC.bus.on('change', H.update);
})(globalThis.EC = globalThis.EC || {});
