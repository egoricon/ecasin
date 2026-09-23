/* Уведомления, оверлей выигрыша, частицы, пасхалки, алмазный след. */
(function (EC) {
  'use strict';
  const U = EC.util, UI = EC.ui, html = U.html;
  const FX = {};

  /* ---------- Уведомления справа сверху ---------- */
  FX.note = ({ title, text = '', kind = 'info', icon = '•' }) => {
    const box = UI.$('#notes');
    if (!box) return;
    const el = document.createElement('div');
    el.className = 'note ' + (kind === 'win' || kind === 'ach' ? 'win' : '');
    el.setAttribute('role', 'status');
    el.innerHTML = String(html`<span class="ni">${icon}</span><div><b>${title}</b>${text ? html`<small>${text}</small>` : ''}</div>`);
    box.appendChild(el);
    while (box.children.length > 4) box.firstChild.remove();
    setTimeout(() => {
      el.classList.add('out');
      setTimeout(() => el.remove(), 260);
    }, 3400);
  };

  /* ---------- Пульс баланса и «+N E» ---------- */
  FX.pulseBalance = () => {
    const b = UI.$('#balPill');
    if (!b) return;
    b.classList.remove('pulse');
    UI.reflow(b);
    b.classList.add('pulse');
    clearTimeout(FX._pulseT);
    FX._pulseT = setTimeout(() => b.classList.remove('pulse'), 1400);
  };
  FX.floatWin = (n) => {
    const b = UI.$('#balPill');
    if (!b) return;
    const r = b.getBoundingClientRect();
    const el = document.createElement('div');
    el.className = 'float-win';
    el.textContent = '+' + U.fmt(n) + ' E';
    el.style.left = Math.max(8, r.left + r.width / 2 - 40) + 'px';
    el.style.top = r.bottom + 6 + 'px';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1600);
  };

  /* ---------- Частицы ---------- */
  FX.particles = (count, glyphs = ['◆', '✦', '•']) => {
    if (!UI.animOn()) return;
    const w = document.createElement('div');
    w.className = 'particles';
    for (let i = 0; i < count; i++) {
      const p = document.createElement('i');
      p.textContent = U.pick(glyphs);
      p.style.left = U.rand() * 100 + 'vw';
      p.style.fontSize = 12 + U.rand() * 22 + 'px';
      p.style.animationDuration = 1.8 + U.rand() * 1.8 + 's';
      p.style.animationDelay = U.rand() * 0.4 + 's';
      w.appendChild(p);
    }
    document.body.appendChild(w);
    setTimeout(() => w.remove(), 4200);
  };

  /* ---------- Большой выигрыш ---------- */
  const TIERS = [
    { min: 200, n: 'ULTRA WIN', sub: 'Джекпот', parts: 110 },
    { min: 50, n: 'MEGA WIN', sub: 'Крупная победа', parts: 70 },
    { min: 10, n: 'SUPER WIN', sub: 'Отличный результат', parts: 40 },
  ];
  FX.win = (res) => {
    FX.pulseBalance();
    FX.floatWin(res.net);
    const ratio = res.bet > 0 ? res.net / res.bet : 0;
    const tier = TIERS.find((t) => ratio >= t.min);
    if (!tier) { EC.sound.play('coin'); return; }
    EC.sound.play(tier.min >= 50 ? 'bonus' : 'win');
    FX.particles(tier.parts);
    const o = document.createElement('div');
    o.className = 'win-ov';
    o.innerHTML = String(html`<div class="win-card" role="alert">
      <div class="win-tier">${tier.n}</div>
      <div class="win-amt">+${U.fmt(res.net)} E</div>
      <div class="win-sub"><span class="num">${U.mult(ratio + 1)}</span> от ставки · ${res.label || (res.meta && res.meta.label) || EC.config.GAME_NAME[res.game] || ''} · ${tier.sub}</div>
    </div>`);
    document.body.appendChild(o);
    requestAnimationFrame(() => o.classList.add('show'));
    const close = () => { o.classList.remove('show'); setTimeout(() => o.remove(), 250); };
    o.addEventListener('click', close);
    setTimeout(close, 2600);
  };

  /* ---------- Пасхалки ---------- */
  FX.gorilla = () => {
    const s = EC.store.state;
    if (!s.gorillaFound) {
      s.gorillaFound = true;
      EC.econ.unlock('polina');
      EC.econ.checkTitles();
      EC.store.commit('profile');
    }
    UI.$$('.egg').forEach((e) => e.remove());
    const o = document.createElement('div');
    o.className = 'egg';
    o.innerHTML = '<div class="big">🦍</div>';
    document.body.appendChild(o);
    EC.sound.play('bonus');
    setTimeout(() => o.remove(), 3000);
  };
  FX.boss = () => {
    UI.$$('.egg').forEach((e) => e.remove());
    const o = document.createElement('div');
    o.className = 'egg';
    o.innerHTML = '<div class="boss"><div>👑</div><h3 class="h-block">ЕГОР ЗАШЁЛ</h3><p class="muted">+1 000 E всем в зале</p></div>';
    document.body.appendChild(o);
    EC.sound.play('bj');
    EC.econ.addMoney(1000);
    EC.store.commit('balance');
    FX.win({ net: 1000, bet: 100, label: 'Визит босса' });
    setTimeout(() => o.remove(), 3200);
  };

  /* ---------- Эмодзи-салют для доната ---------- */
  FX.donateBurst = () => {
    if (!UI.animOn()) return;
    const layer = document.createElement('div');
    layer.className = 'fx-layer';
    document.body.appendChild(layer);
    const em = ['💰', '💎', '🪙', '💵', '✨', '⭐'];
    ['l', 'r'].forEach((side) => {
      for (let i = 0; i < 18; i++) {
        setTimeout(() => {
          const el = document.createElement('div');
          el.className = 'fx-emoji';
          el.textContent = U.pick(em);
          el.style[side === 'l' ? 'left' : 'right'] = '-30px';
          el.style.fontSize = 20 + U.rand() * 22 + 'px';
          layer.appendChild(el);
          const dir = side === 'l' ? 1 : -1;
          requestAnimationFrame(() => {
            el.style.transform = `translate(${dir * (12 + U.rand() * 34)}vw, ${-10 - U.rand() * 34}vh) rotate(${U.rand() * 720 - 360}deg)`;
            el.style.opacity = '0';
          });
        }, i * 40);
      }
    });
    setTimeout(() => layer.remove(), 2800);
  };

  /* ---------- Алмазный след (предмет магазина) ---------- */
  let trailOn = false, lastTrail = 0;
  function onMove(e) {
    const now = performance.now();
    if (now - lastTrail < 24) return;
    lastTrail = now;
    const el = document.createElement('div');
    el.className = 'trail';
    el.textContent = U.rand() > 0.5 ? '◆' : '✦';
    el.style.left = e.clientX + 'px';
    el.style.top = e.clientY + 'px';
    el.style.fontSize = 10 + U.rand() * 10 + 'px';
    document.body.appendChild(el);
    requestAnimationFrame(() => {
      el.style.opacity = '0';
      el.style.transform = 'translate(-50%, -50%) scale(.3) translateY(18px)';
    });
    setTimeout(() => el.remove(), 1000);
  }
  FX.setTrail = (on) => {
    on = on && UI.animOn();
    if (on && !trailOn) document.addEventListener('pointermove', onMove);
    if (!on && trailOn) document.removeEventListener('pointermove', onMove);
    trailOn = on;
  };

  EC.fx = FX;
  EC.bus.on('note', FX.note);
  EC.bus.on('win', FX.win);
  EC.bus.on('loss', () => EC.sound.play('lose'));
})(globalThis.EC = globalThis.EC || {});
