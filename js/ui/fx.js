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

  /* ---------- Салюты: разлёт из точки ---------- */
  // Фейерверк: искры разлетаются кругом из (x, y). colors — CSS-цвета (токены).
  FX.firework = (x, y, colors = ['var(--pink-500)', 'var(--cyan-500)', 'var(--lime-500)', 'var(--win)']) => {
    if (!UI.animOn()) return;
    const w = document.createElement('div');
    w.className = 'fw';
    w.style.left = x + 'px';
    w.style.top = y + 'px';
    const n = 22;
    for (let i = 0; i < n; i++) {
      const p = document.createElement('i'), a = (i / n) * Math.PI * 2, d = 80 + U.rand() * 70;
      p.style.setProperty('--tx', (Math.cos(a) * d).toFixed(0) + 'px');
      p.style.setProperty('--ty', (Math.sin(a) * d).toFixed(0) + 'px');
      p.style.color = colors[i % colors.length];
      w.appendChild(p);
    }
    document.body.appendChild(w);
    setTimeout(() => w.remove(), 1400);
  };
  // Взрыв монет из центра экрана.
  FX.burst = (count, glyphs = ['🪙', '💰', '◆']) => {
    if (!UI.animOn()) return;
    const w = document.createElement('div');
    w.className = 'burst';
    for (let i = 0; i < count; i++) {
      const p = document.createElement('i'), a = U.rand() * Math.PI * 2, d = 25 + U.rand() * 30;
      p.textContent = U.pick(glyphs);
      p.style.setProperty('--tx', (Math.cos(a) * d).toFixed(1) + 'vmax');
      p.style.setProperty('--ty', (Math.sin(a) * d).toFixed(1) + 'vmax');
      p.style.setProperty('--r', (U.rand() * 720 - 360).toFixed(0) + 'deg');
      p.style.fontSize = 18 + U.rand() * 22 + 'px';
      p.style.animationDelay = (U.rand() * 0.15).toFixed(2) + 's';
      w.appendChild(p);
    }
    document.body.appendChild(w);
    setTimeout(() => w.remove(), 1800);
  };

  /* ---------- Большой выигрыш: SUPER → MEGA → ULTRA ----------
     Каждый уровень включает всё, что было у предыдущего, добавляет новые эффекты и дольше держится:
     SUPER — карточка и конфетти; MEGA — + счётчик суммы, лучи, взрыв монет, тряска, вторая волна;
     ULTRA — + фейерверки, вспышка, неоновая надпись, третья волна с алмазами. */
  const TIERS = [
    { min: 200, lvl: 3, n: 'ULTRA WIN', parts: 110, dur: 8500, count: 3300 },
    { min: 50, lvl: 2, n: 'MEGA WIN', parts: 70, dur: 5500, count: 1800 },
    { min: 10, lvl: 1, n: 'SUPER WIN', parts: 40, dur: 3200, count: 0 },
  ];
  const UP = TIERS.slice().reverse(); // SUPER, MEGA, ULTRA
  // Повод поделиться: редкие события (или null).
  const shareReason = (res, ratio) => {
    const m = res.meta || {};
    if (res.cheat || res.kind !== 'win') return null;
    if (m.share) return m.share;
    if (m.allIn) return 'Ва-банк';
    if (ratio >= 50) return (ratio >= 200 ? 'ULTRA WIN' : 'MEGA WIN') + ' · ' + (m.label || EC.config.GAME_NAME[res.game] || '');
    return null;
  };
  let closeOverlay = null; // новый большой выигрыш закрывает предыдущий оверлей
  const shake = (strong) => {
    const m = UI.$('#main');
    if (!m || !UI.animOn()) return;
    m.classList.remove('shake', 'shake-hard');
    UI.reflow(m);
    m.classList.add(strong ? 'shake-hard' : 'shake');
    setTimeout(() => m.classList.remove('shake', 'shake-hard'), 700);
  };
  const flash = () => {
    if (!UI.animOn()) return;
    const f = document.createElement('div');
    f.className = 'win-flash';
    document.body.appendChild(f);
    setTimeout(() => f.remove(), 700);
  };

  FX.win = (res) => {
    FX.pulseBalance();
    FX.floatWin(res.net);
    const base = res.bet || (res.meta && res.meta.nominal) || 0;
    const ratio = base > 0 ? res.net / base : 0;
    const tier = TIERS.find((t) => ratio >= t.min);
    const reason = shareReason(res, ratio);
    const s = EC.store.state;
    // Конфетти-пушка из магазина: салют на выигрышах от ×5
    if (s.shopEquipped.confetti && (ratio + 1) >= 5) FX.particles(tier ? 30 : 60, ['🎉', '🎊', '✨', '◆']);
    if (!tier && !reason) { EC.sound.play('coin'); return; }
    if (closeOverlay) closeOverlay();
    const lvl = tier ? tier.lvl : 1;
    const anim = UI.animOn();
    const counting = tier && tier.count && anim; // счётчик: сумма растёт, надпись поднимается по уровням
    EC.sound.play(reason && !tier ? 'jackpot' : lvl >= 2 ? 'bonus' : 'win');
    const first = counting ? UP[0] : tier || TIERS[TIERS.length - 1];
    const o = document.createElement('div');
    o.className = 'win-ov lvl-' + lvl;
    o.innerHTML = String(html`${lvl >= 2 ? html`<div class="win-rays" aria-hidden="true"></div>` : ''}<div class="win-card" role="alert">
      <div class="win-tier" data-lvl="${first.lvl}">${reason && !tier ? reason.split(' · ')[0].toUpperCase() : first.n}</div>
      <div class="win-amt">+${U.fmt(counting ? 0 : res.net)} E</div>
      <div class="win-sub">${base ? html`<span class="num">${U.mult(ratio + 1)}</span> от ставки · ` : ''}${res.label || (res.meta && res.meta.label) || EC.config.GAME_NAME[res.game] || ''}</div>
      ${reason ? html`<div class="brow" style="justify-content:center;margin-top:16px"><button class="btn b-win" data-share>Поделиться</button><button class="btn b-gho" data-ok>Круто</button></div>` : ''}
    </div>`);
    document.body.appendChild(o);
    requestAnimationFrame(() => o.classList.add('show'));

    const timers = [];
    const later = (ms, f) => timers.push(setTimeout(f, ms));
    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      timers.forEach(clearTimeout);
      if (closeOverlay === close) closeOverlay = null;
      o.classList.remove('show');
      setTimeout(() => o.remove(), 250);
    };
    closeOverlay = close;
    o.addEventListener('click', (e) => {
      if (e.target.closest('[data-share]')) { close(); EC.share.open(res, reason); return; }
      close();
    });

    // Эффекты по нарастающей
    FX.particles(tier ? tier.parts : 40);
    if (lvl >= 2) {
      later(250, () => FX.burst(lvl >= 3 ? 40 : 26));
      later(1300, () => FX.particles(lvl >= 3 ? 80 : 50, ['◆', '✦', '🪙']));
    }
    if (lvl >= 3) {
      later(2600, () => FX.particles(90, ['💎', '✨', '◆', '🪙']));
      for (let i = 0; i < 9; i++) later(900 + i * 420, () => FX.firework(innerWidth * (0.15 + U.rand() * 0.7), innerHeight * (0.15 + U.rand() * 0.45)));
    }
    const tierEl = o.querySelector('.win-tier'), amtEl = o.querySelector('.win-amt');
    const reach = (t) => { // надпись поднялась на новый уровень
      tierEl.textContent = t.n;
      tierEl.dataset.lvl = t.lvl;
      tierEl.classList.remove('up');
      UI.reflow(tierEl);
      tierEl.classList.add('up');
      if (t.lvl === 2) { shake(false); EC.sound.play('win'); }
      if (t.lvl === 3) { shake(true); flash(); EC.sound.play('jackpot'); }
    };
    if (counting) {
      // Счётчик идёт ступенями равной длины: SUPER → MEGA → ULTRA. На каждой ступени сумма доходит
      // ровно до порога следующего уровня, последняя ступень замедляется к итоговой сумме.
      const pts = [0].concat(UP.filter((t) => t.lvl > 1 && t.lvl <= lvl).map((t) => t.min * base), res.net);
      const n = pts.length - 1, t0 = performance.now();
      let stage = 0;
      const frame = (now) => {
        if (closed) return;
        const k = Math.min(1, (now - t0) / tier.count), seg = Math.min(n - 1, Math.floor(k * n)), x = k * n - seg;
        const e = seg === n - 1 ? 1 - Math.pow(1 - Math.min(1, x), 3) : x;
        amtEl.textContent = '+' + U.fmt(Math.round(pts[seg] + (pts[seg + 1] - pts[seg]) * e)) + ' E';
        if (seg > stage) { stage = seg; reach(UP[seg]); }
        if (k < 1) requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    }
    later(Math.max(tier ? tier.dur : 0, reason ? 7000 : 0), close);
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
