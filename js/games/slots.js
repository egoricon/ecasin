/* Слоты: 3 стола (Классика / Книга Егорика / Мегавейс), окно 3×3, бонус-игра на сетке 5×3. */
(function (EC) {
  'use strict';
  const U = EC.util, UI = EC.ui, C = EC.config, html = U.html, SL = EC.rules.slots;
  const S = () => EC.store.state;

  const symHTML = (i) => {
    if (i === 5) return html`<span class="s7">7</span>`;
    if (i === 6) return html`<span class="coin">E</span>`;
    if (i === 7) return html`<span class="sc">$</span>`;
    return C.SLOT_SYMBOLS[i].i;
  };
  const cell = (i) => html`<div class="sym" aria-label="${C.SLOT_SYMBOLS[i].n}">${symHTML(i)}</div>`;

  let lastWindow = null;
  const randWindow = (V) => SL.spinWindow(V.w);

  function multipliers(s) {
    const skill = 1 + 0.05 * (s.skills.slotBonus || 0);
    const clover = s.shopEquipped.clover ? 1.03 : 1;
    const mega = s.slotVariant === 'mega' ? SL.megaMult(s.megaStreak) : 1;
    return { skill, clover, mega, total: skill * clover * mega };
  }

  function paytableHTML(V) {
    const rows = C.SLOT_SYMBOLS.slice(0, 7).map((sym, i) => html`
      <div class="pt">${cell(i)}<div>3× <span class="num">×${V.p3[i]}</span>${V.p2[i] ? html`<br>2× <span class="num">×${V.p2[i]}</span>` : ''}</div></div>`);
    rows.push(html`<div class="pt">${cell(7)}<div>3/4/5 в окне <span class="num">×${V.sc[3]}/${V.sc[4]}/${V.sc[5]}</span></div></div>`);
    return html`<details class="paytable"><summary>Таблица выплат — «${V.n}»</summary>
      <div class="pt-grid">${rows}</div>
      <p class="pt-note">Линия — средний ряд, слева направо. ЕГОРИК заменяет любой символ, кроме $. ЕГОРИК на каждом барабане (в любом ряду) — бонус-игра: ${V.bonusSpins} бесплатных спинов на 5 линиях.</p>
    </details>`;
  }

  function metaHTML(s) {
    const m = multipliers(s);
    const parts = [];
    if (s.slotVariant === 'mega') parts.push(html`Серия <span class="num">${s.megaStreak}</span> · множитель <span class="num">${U.mult(m.mega)}</span>`);
    if (s.shopEquipped.clover) parts.push(html`♣ клевер <span class="num">+3%</span>`);
    if (s.skills.slotBonus) parts.push(html`навык <span class="num">+${s.skills.slotBonus * 5}%</span>`);
    return parts.length ? parts.reduce((a, b) => html`${a} · ${b}`) : html`<span class="faint">${C.SLOTS[s.slotVariant].vol}</span>`;
  }

  function mount(root) {
    const s = S();
    const V = C.SLOTS[s.slotVariant];
    if (!lastWindow) lastWindow = randWindow(V);
    const reels = lastWindow.map((col, r) => html`<div class="reel"><div class="strip" id="strip${r}">${col.map(cell)}</div></div>`);
    const tabs = Object.entries(C.SLOTS).map(([id, v]) => html`<button data-act="variant" data-v="${id}" aria-pressed="${id === s.slotVariant}">${v.n}</button>`);

    const ctx = EC.shell.mount(root, {
      id: 'slots',
      sub: V.n + ' · ' + V.vol,
      auto: true,
      primary: 'Крутить',
      table: html`
        <div class="seg quiet" role="group" aria-label="Стол" style="margin-bottom:16px">${tabs}</div>
        <div class="slot-machine" data-v="${s.slotVariant}">
          <div class="slot-sign">${V.sign}</div>
          <div class="reels">${reels}<div class="payline"></div></div>
          <div class="slot-meta"><span id="slStatus">Удачи!</span><span id="slMeta">${metaHTML(s)}</span></div>
        </div>
        ${paytableHTML(V)}`,
    });

    ctx.onAct = (act, b) => {
      if (act !== 'variant' || ctx.locked) return;
      S().slotVariant = b.dataset.v;
      EC.store.commit('slots');
      EC.sound.play('click');
      mount(root);
    };

    ctx.onPrimary = async () => {
      if (ctx.locked) return;
      const bet = ctx.readBet();
      if (!bet) return ctx.auto.stop();
      const st = S(), Vc = C.SLOTS[st.slotVariant];
      const round = EC.econ.beginRound('slots', bet);
      ctx.lock(true);
      ctx.setPrimary('Крутится…', { disabled: true });
      ctx.result(null);
      ctx.$$('.seg button').forEach((x) => { x.disabled = true; });

      let win = randWindow(Vc);
      if (st.pendingBonus) { // чит-код «bonus»: ЕГОРИК на каждом барабане
        st.pendingBonus = false;
        win = win.map((col) => { col[U.randInt(3)] = SL.WILD; return col; });
      }

      // Анимация: лента = [итог] + [случайные] + [текущие], едет сверху вниз.
      const durs = [];
      win.forEach((col, r) => {
        const strip = ctx.$('#strip' + r);
        const N = 16 + r * 6;
        const filler = Array.from({ length: N }, () => U.weighted(Vc.w));
        strip.innerHTML = String(html`${col.map(cell)}${filler.map(cell)}${lastWindow[r].map(cell)}`);
        strip.style.transition = 'none';
        strip.style.transform = `translateY(-${((N + 3) / (N + 6)) * 100}%)`;
        UI.reflow(strip);
        const d = (900 + r * 380) / UI.speed();
        durs.push(d);
        strip.style.transition = `transform ${d}ms cubic-bezier(.18,.72,.22,1.02)`;
        strip.style.transform = 'translateY(0)';
        setTimeout(() => EC.sound.play('reel'), d);
      });
      await new Promise((r) => setTimeout(r, Math.max(...durs) + 80));
      if (!ctx.root.isConnected) return;
      win.forEach((col, r) => {
        const strip = ctx.$('#strip' + r);
        strip.style.transition = 'none';
        strip.style.transform = 'none';
        strip.innerHTML = String(html`${col.map(cell)}`);
      });
      lastWindow = win;

      const ev = SL.evaluate(win, Vc);
      const mul = multipliers(st);
      // Подсветка выигрыша
      if (ev.line) for (let r = 0; r < ev.line.count; r++) ctx.$('#strip' + r).children[1].classList.add('win');
      ev.scatter.cells.forEach(([r, row]) => ctx.$('#strip' + r).children[row].classList.add('win'));
      if (ev.line && ev.line.sym === 5 && ev.line.count === 3) EC.econ.unlock('triple_777');

      let pay = Math.floor(bet * ev.m * mul.total);
      let label = Vc.n;
      if (ev.line) label += ` · ${ev.line.count}× ${C.SLOT_SYMBOLS[ev.line.sym].n}`;
      if (ev.scatter.m) label += ` · ${ev.scatter.count}× $`;

      if (ev.bonus) {
        win.forEach((col, r) => col.forEach((x, row) => { if (x === SL.WILD) ctx.$('#strip' + r).children[row].classList.add('win'); }));
        UI.text(ctx.$('#slStatus'), 'БОНУС-ИГРА!');
        EC.sound.play('bonus');
        await UI.wait(700);
        const bm = await bonusGame(bet, Vc);
        const bonusPay = Math.floor(bet * bm * mul.total);
        pay += bonusPay;
        label += ' · бонус +' + U.fmt(bonusPay) + ' E';
        st.bonusGames++;
        EC.econ.tickMission('slots');
        if (st.bonusGames >= 5) EC.econ.unlock('bonus_hunter');
      }

      if (st.slotVariant === 'mega') st.megaStreak = pay > bet ? Math.min(16, st.megaStreak + 1) : 0;
      const res = round.end(pay, { label });
      UI.text(ctx.$('#slStatus'), res.kind === 'win' ? 'Есть!' : res.kind === 'push' ? 'Возврат ставки' : 'Мимо');
      UI.set(ctx.$('#slMeta'), metaHTML(st));
      ctx.result(res, label);
      ctx.lock(false);
      ctx.$$('.seg button').forEach((x) => { x.disabled = false; });
      ctx.setPrimary('Крутить');
      ctx.done();
    };
    return ctx;
  }

  /* ---------- Бонус-игра (модалка, закрыть нельзя, можно ускорить) ---------- */
  function bonusGame(bet, V) {
    return new Promise((resolve) => {
      const N = V.bonusSpins;
      let spin = 0, total = 0, fast = false;
      const body = EC.modal.open({
        title: 'Бонус-игра',
        locked: true,
        wide: true,
        body: html`
          <div class="bonus-stats">
            <div class="stat"><span class="label">Спин</span><b id="bnSpin">0 / ${N}</b></div>
            <div class="stat"><span class="label">Последний</span><b id="bnLast">0 E</b></div>
            <div class="stat"><span class="label">Всего</span><b id="bnTotal">0 E</b></div>
          </div>
          <div class="bonus-grid" id="bnGrid"></div>
          <div class="brow" style="margin-top:16px;justify-content:center"><button class="btn b-sec" id="bnFast">Ускорить</button></div>`,
      });
      const grid = UI.$('#bnGrid', body);
      const draw = (g, wins = []) => {
        const hit = new Set();
        wins.forEach((w) => w.cells.forEach(([row, col]) => hit.add(row + ':' + col)));
        grid.innerHTML = '';
        for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) {
          const d = document.createElement('div');
          d.className = 'bcell' + (hit.has(r + ':' + c) ? ' win' : '');
          d.innerHTML = String(cell(g[r][c]));
          grid.appendChild(d);
        }
      };
      UI.$('#bnFast', body).onclick = (e) => { fast = true; e.target.disabled = true; };
      const w = (ms) => new Promise((r) => setTimeout(r, fast ? ms / 8 : ms / UI.speed()));
      draw(SL.spinBonusGrid(V));

      (async () => {
        const respin = 0.15 * (S().skills.bonusRespin || 0);
        while (spin < N) {
          spin++;
          UI.text(UI.$('#bnSpin', body), spin + ' / ' + N);
          for (let a = 0; a < 7; a++) { draw(SL.spinBonusGrid(V)); if (a % 2 === 0) EC.sound.play('reel'); await w(70); }
          let g = SL.spinBonusGrid(V), r = SL.evalBonusGrid(g, V);
          if (r.m === 0 && respin > 0 && U.rand() < respin) {
            EC.bus.emit('note', { title: 'Ре-спин', text: 'Навык сработал', icon: '🔄' });
            g = SL.spinBonusGrid(V); r = SL.evalBonusGrid(g, V);
          }
          draw(g, r.wins);
          const won = Math.floor(bet * r.m);
          total += won;
          UI.text(UI.$('#bnLast', body), '+' + U.fmt(won) + ' E');
          UI.text(UI.$('#bnTotal', body), U.fmt(total) + ' E');
          if (won > 0) EC.sound.play('coin');
          await w(won > 0 ? 1000 : 520);
        }
        await w(400);
        EC.modal.close();
        resolve(total / bet);
      })();
    });
  }

  EC.games = EC.games || {};
  EC.games.slots = { mount };
})(globalThis.EC = globalThis.EC || {});
