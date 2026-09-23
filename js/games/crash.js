/* Crash: множитель растёт экспоненциально, точка взрыва известна заранее. */
(function (EC) {
  'use strict';
  const U = EC.util, UI = EC.ui, C = EC.config, html = U.html, CR = EC.rules.crash;
  const S = () => EC.store.state;

  const cap = () => C.CRASH.cap + C.CRASH.capPerSkill * (S().skills.crashLucky || 0);

  function histHTML() {
    const h = S().crashHistory.slice(0, 18);
    return h.length ? h.map((m) => html`<i class="${m >= 2 ? 'hi' : ''}">${U.mult(m)}</i>`) : html`<span class="faint">пока пусто</span>`;
  }

  function mount(root) {
    const ctx = EC.shell.mount(root, {
      id: 'crash',
      sub: 'Ракета летит — множитель растёт. Забери до взрыва.',
      table: html`
        <div class="crash-stage">
          <canvas id="crCanvas" aria-hidden="true"></canvas>
          <div class="crash-mult" id="crMult">×1.00</div>
          <div class="crash-cap" id="crCap">Потолок <span class="num">${U.mult(cap())}</span> · ставь и жми «Играть»</div>
        </div>
        <div class="chist" id="crHist">${histHTML()}</div>`,
      extra: html`<div class="field">
        <label class="label" for="crAuto">Авто-вывод <span class="num">0 = выкл</span></label>
        <input id="crAuto" class="inp" type="number" inputmode="decimal" min="0" step="0.01" value="${S().crashAuto ? S().crashAuto.toFixed(2) : '0'}">
      </div>`,
    });

    const canvas = ctx.$('#crCanvas');
    const g = canvas.getContext('2d');
    const css = (v) => getComputedStyle(document.body).getPropertyValue(v).trim();
    let flight = null, raf = 0;

    function resize() {
      const dpr = Math.min(2, globalThis.devicePixelRatio || 1);
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      paint(flight ? flight.t : 0, flight ? flight.m : 1, flight ? flight.state : 'idle');
    }

    // Кривая множителя. t — секунды полёта.
    function paint(t, m, state) {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      g.clearRect(0, 0, w, h);
      const pad = 28, k = C.CRASH.growth;
      const tMax = Math.max(8, t * 1.15), mMax = Math.max(2, m * 1.12);
      const X = (tt) => pad + (tt / tMax) * (w - pad * 2);
      const Y = (mm) => h - pad - ((mm - 1) / (mMax - 1)) * (h - pad * 2 - 70);
      // сетка
      g.strokeStyle = css('--line');
      g.lineWidth = 1;
      g.fillStyle = css('--tx-3');
      g.font = '500 11px ' + css('--font-num');
      const step = mMax > 20 ? 10 : mMax > 6 ? 2 : mMax > 3 ? 1 : 0.5;
      for (let v = 1; v <= mMax; v += step) {
        const y = Y(v);
        g.beginPath(); g.moveTo(pad, y); g.lineTo(w - pad, y); g.stroke();
        g.fillText('×' + (Math.round(v * 10) / 10), 4, y - 4);
      }
      if (t <= 0) return;
      const color = state === 'boom' ? css('--loss') : state === 'cashed' ? css('--win') : css('--accent');
      g.beginPath();
      g.moveTo(X(0), Y(1));
      const n = 60;
      for (let i = 1; i <= n; i++) { const tt = (t * i) / n; g.lineTo(X(tt), Y(CR.multAt(tt, k))); }
      g.lineWidth = 3;
      g.strokeStyle = color;
      g.stroke();
      g.lineTo(X(t), h - pad);
      g.lineTo(X(0), h - pad);
      g.closePath();
      g.globalAlpha = 0.12;
      g.fillStyle = color;
      g.fill();
      g.globalAlpha = 1;
      g.font = '26px sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(state === 'boom' ? '💥' : '🚀', X(t), Y(m) - 4);
      g.textAlign = 'start';
      g.textBaseline = 'alphabetic';
    }

    const multEl = ctx.$('#crMult'), capEl = ctx.$('#crCap');
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    ctx.cleanup.push(() => { ro.disconnect(); cancelAnimationFrame(raf); });

    function finish(state, m) {
      const f = flight;
      f.state = state;
      cancelAnimationFrame(raf);
      const s = S();
      s.crashHistory.unshift(f.cp);
      s.crashHistory = s.crashHistory.slice(0, 30);
      paint(f.t, state === 'boom' ? f.cp : m, state);
      let res;
      if (state === 'cashed') {
        const pay = Math.floor(f.bet * m);
        multEl.className = 'crash-mult cashed';
        multEl.textContent = U.mult(m);
        UI.set(capEl, html`Забрано на <span class="num">${U.mult(m)}</span> · взрыв был на <b>${U.mult(f.cp)}</b>`);
        if (m >= 10) EC.econ.unlock('crash_master');
        EC.sound.play('cash');
        res = f.round.end(pay, { label: 'Crash на ' + U.mult(m) });
        ctx.result(res, 'Забрал на ' + U.mult(m));
      } else {
        multEl.className = 'crash-mult boom';
        multEl.textContent = U.mult(f.cp);
        UI.set(capEl, html`<b>Взрыв на ${U.mult(f.cp)}</b>`);
        EC.sound.play('crash');
        res = f.round.end(0, { label: 'Crash' });
        ctx.result(res, 'Взрыв на ' + U.mult(f.cp));
      }
      UI.set(ctx.$('#crHist'), histHTML());
      flight = null;
      ctx.lock(false);
      ctx.$('#crAuto').disabled = false;
      ctx.setPrimary('Играть');
    }

    function frame() {
      const f = flight;
      if (!f) return;
      f.t = ((performance.now() - f.start) / 1000) * UI.speed();
      f.m = CR.multAt(f.t, C.CRASH.growth);
      // Авто-вывод срабатывает раньше взрыва, даже если кадр «перепрыгнул» (фоновая вкладка).
      if (f.auto && f.m >= f.auto && f.auto <= f.cp) return finish('cashed', f.auto);
      if (f.m >= f.cp) return finish('boom', f.cp);
      multEl.textContent = U.mult(f.m);
      ctx.setPrimary('Забрать ' + U.fmt(Math.floor(f.bet * f.m)) + ' E');
      paint(f.t, f.m, 'fly');
      raf = requestAnimationFrame(frame);
    }

    ctx.onPrimary = () => {
      if (flight) { // в полёте кнопка = «Забрать»
        if (flight.state === 'fly') finish('cashed', Math.floor(flight.m * 100) / 100);
        return;
      }
      const bet = ctx.readBet();
      if (!bet) return;
      let auto = Number(ctx.$('#crAuto').value);
      auto = Number.isFinite(auto) && auto >= 1.01 ? Math.floor(auto * 100) / 100 : 0;
      S().crashAuto = auto;
      const round = EC.econ.beginRound('crash', bet);
      ctx.lock(true);
      ctx.$('#crAuto').disabled = true;
      ctx.result(null);
      multEl.className = 'crash-mult';
      UI.set(capEl, auto ? html`Авто-вывод на <span class="num">${U.mult(auto)}</span>` : html`Жми «Забрать» или пробел`);
      flight = { bet, round, auto, cp: CR.crashPoint(U.rand, cap(), C.CRASH.edge), start: performance.now(), t: 0, m: 1, state: 'fly' };
      EC.sound.play('click');
      raf = requestAnimationFrame(frame);
    };
    requestAnimationFrame(resize);
    return ctx;
  }

  EC.games = EC.games || {};
  EC.games.crash = { mount };
})(globalThis.EC = globalThis.EC || {});
