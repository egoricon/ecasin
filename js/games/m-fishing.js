/* «Рыбалка на Свислочи» — экран. Логика: js/rules/m-fishing.js. */
(function (EC) {
  'use strict';
  const U = EC.util, UI = EC.ui, C = EC.config, html = U.html, KIT = EC.machinesKit;
  const ID = 'fishing';
  const L = () => EC.machines.logic[ID];

  let last = null;

  function info() {
    const M = C.MACHINES[ID], n = L().LINES.length;
    return html`
      <h3>Как играть</h3>
      <p>5 барабанов, 3 ряда, ${n} линий. Линия платит за 3+ одинаковых символа подряд с левого барабана (удочка — уже за 2).</p>
      <ul>
        <li><b>${KIT.sym(M, M.fish)} Рыба</b> — символ-деньги с номиналом от ×${M.fishValues[0]} до ×${M.fishValues[M.fishValues.length - 1]} ставки. На линиях не платит.</li>
        <li><b>Hold &amp; Spin.</b> ${M.holdTrigger}+ рыб в окне — рыбы остаются на местах, даётся ${M.respins} респина. На пустых клетках может приплыть новая рыба — тогда счётчик снова ${M.respins}. Когда респины кончились, все номиналы складываются. Полный садок (все 15 клеток) — ещё +×${M.fullBonus}.</li>
        <li><b>${KIT.sym(M, M.scatter)} Лодка</b> — скаттер. ${M.fsTrigger}+ в любом месте — ${M.freeSpins} фриспинов (во фриспинах ещё 3 лодки — +${M.retrigger}). Платит: 3 — ×${M.scatterPays[3]}, 4 — ×${M.scatterPays[4]}, 5 — ×${M.scatterPays[5]}.</li>
        <li><b>${KIT.sym(M, M.collector)} Дед Михалыч</b> приходит только во фриспинах. Каждый дед на экране собирает номиналы всех рыб в окне.</li>
      </ul>
      <h3>Выплаты на линии (в ставках)</h3>
      ${KIT.payTable(M, [5, 4, 3, 2, 1, 0], ['2', '3', '4', '5'], (i) => M.pays[i].map((x) => KIT.perLine(x, n)))}
      <h3>Линии</h3>
      <div class="m-lines-map">${L().LINES.map((ln, i) => html`<div class="m-lmap" title="Линия ${i + 1}">${[0, 1, 2].map((r) => ln.map((row) => html`<i class="${row === r ? 'on' : ''}"></i>`))}</div>`)}</div>`;
  }

  function mount(root) {
    const M = C.MACHINES[ID];
    if (!last) {
      const g = EC.machines.spinGrid(M.cols, M.rows, M.weights, U.rand);
      last = { grid: g, vals: g.map((col) => col.map((x) => (x === M.fish ? M.fishValues[U.weighted(M.fishWeights)] : 0))) };
    }
    let bet = 0; // ставка текущего раунда — номиналы показываем в Егориках
    const valTag = (v) => `<span class="m-tag">${bet ? U.fmt(Math.round(v * bet)) : KIT.x(v)}</span>`;
    const tagsFor = (vals) => (c, r) => (vals[c][r] ? valTag(vals[c][r]) : '');

    async function showSpin(ctx, s, weights) {
      const grid = ctx.$('#mGrid');
      KIT.clear(grid);
      await KIT.spin(grid, M, s.grid, weights, { extraFor: tagsFor(s.vals) });
      if (!grid.isConnected) return;
      KIT.mark(grid, s.lines.flatMap((w) => w.cells));
      KIT.lines(grid, s.lines);
      if (s.scatterM) KIT.mark(grid, EC.machines.cellsOf(s.grid, M.scatter));
      if (s.lines.length || s.scatterM) { EC.sound.play('coin'); await UI.wait(650); }
      if (s.collect) {
        KIT.clear(grid);
        KIT.mark(grid, s.collect.cells);
        ctx.bar(html`${KIT.sym(M, M.collector)} ×${s.collect.deds} собрал рыбу: <span class="num">${U.fmt(Math.round(s.collect.m * bet))} E</span>`);
        EC.sound.play('cash');
        await UI.wait(1100);
      }
    }

    async function holdSpin(ctx, s, hold) {
      const grid = ctx.$('#mGrid');
      const held = s.vals.map((col) => col.slice());
      KIT.clear(grid);
      held.forEach((col, c) => col.forEach((v, r) => {
        const el = KIT.cell(grid, c, r);
        if (v) { el.classList.add('hold'); el.innerHTML = String(KIT.sym(M, M.fish, valTag(v))); } else el.innerHTML = '';
      }));
      KIT.bonus(ctx, 'hold', 'Hold & Spin');
      ctx.bar(html`<b>Hold &amp; Spin!</b> Респины: <span class="num">${M.respins}</span>`);
      EC.sound.play('bonus');
      await UI.wait(1100);
      for (const round of hold.rounds) {
        const empty = [];
        held.forEach((col, c) => col.forEach((v, r) => { if (!v) empty.push([c, r]); }));
        for (let f = 0; f < 11; f++) { // мелькание пустых клеток
          empty.forEach(([c, r]) => { KIT.cell(grid, c, r).innerHTML = U.rand() < 0.3 ? String(KIT.sym(M, M.fish)) : ''; KIT.cell(grid, c, r).classList.add('spin'); });
          if (f % 2 === 0) EC.sound.play('tick');
          await UI.wait(75);
          if (!grid.isConnected) return;
        }
        empty.forEach(([c, r]) => { const el = KIT.cell(grid, c, r); el.classList.remove('spin'); el.innerHTML = ''; });
        round.landed.forEach(([c, r, v]) => {
          held[c][r] = v;
          const el = KIT.cell(grid, c, r);
          el.classList.add('hold', 'drop');
          el.innerHTML = String(KIT.sym(M, M.fish, valTag(v)));
        });
        const sum = held.reduce((t, col) => t + col.reduce((a, b) => a + b, 0), 0);
        ctx.bar(html`${round.landed.length ? html`<b>+${round.landed.length} 🐟</b> респины снова ${M.respins}` : 'Пусто'} · осталось <span class="num">${round.respins}</span> · улов <span class="num">${U.fmt(Math.round(sum * bet))} E</span>`);
        EC.sound.play(round.landed.length ? 'coin' : 'reel');
        await UI.wait(round.landed.length ? 950 : 700);
      }
      ctx.bar(html`${hold.full ? html`<b>Полный садок! +×${M.fullBonus}</b> · ` : ''}Hold &amp; Spin: <span class="num">${U.fmt(Math.round(hold.m * bet))} E</span>`);
      EC.sound.play('win');
      await UI.wait(1600);
      KIT.bonus(ctx, null);
    }

    const ctx = KIT.mount(root, ID, {
      table: html`${KIT.gridHTML(M, last.grid)}`,
      idle: html`${M.holdTrigger}+ ${KIT.sym(M, M.fish)} — Hold &amp; Spin · ${M.fsTrigger}+ ${KIT.sym(M, M.scatter)} — фриспины с дедом`,
      info,
      label: (r) => M.n + (r.out.hold ? ' · Hold & Spin' : '') + (r.out.bonus ? ' · фриспины' : ''),
      animate: async (r, ctx) => {
        bet = r.bet;
        ctx.bar('Закидываем…');
        const b = r.out.base;
        await showSpin(ctx, b, M.weights);
        last = b;
        if (!ctx.$('#mGrid')) return;
        ctx.bar(b.m > 0 ? html`Выигрыш <span class="num">${U.fmt(Math.round(b.m * r.bet))} E</span>` : b.fishCount >= M.holdTrigger ? '' : 'Не клюёт');
        if (r.out.hold) { await UI.wait(400); await holdSpin(ctx, b, r.out.hold); }
        if (r.out.bonus) {
          const bo = r.out.bonus;
          await UI.wait(600);
          KIT.bonus(ctx, 'fishing', 'Фриспины');
          ctx.bar(html`<b>${b.scatters} × ${KIT.sym(M, M.scatter)}</b> — ${M.freeSpins} фриспинов, приходит дед!`);
          EC.sound.play('bonus');
          await UI.wait(1100);
          let total = M.freeSpins, sum = 0;
          for (let i = 0; i < bo.spins.length; i++) {
            const s = bo.spins[i];
            ctx.bar(html`Фриспин <span class="num">${i + 1}/${total}</span> · бонус <span class="num">${U.fmt(Math.round(sum * r.bet))} E</span>`);
            await showSpin(ctx, s, M.fsWeights);
            if (!ctx.$('#mGrid')) return;
            sum += s.m;
            if (s.retrigger) { total += M.retrigger; ctx.bar(html`<b>Ещё +${M.retrigger} фриспинов!</b>`); EC.sound.play('bonus'); await UI.wait(900); }
            last = s;
            await UI.wait(650); // барабаны постоят, прежде чем крутить следующий фриспин
          }
          ctx.bar(html`Фриспины окончены · бонус <span class="num">${U.fmt(Math.round(bo.m * r.bet))} E</span>`);
          EC.sound.play('win');
          await UI.wait(1500);
          KIT.bonus(ctx, null);
        }
      },
    });
    KIT.draw(ctx.$('#mGrid'), M, last.grid, tagsFor(last.vals)); // номиналы рыб видны и до спина
  }

  EC.games[ID] = { mount };
})(globalThis.EC = globalThis.EC || {});
