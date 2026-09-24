/* «Книга Знаний» — экран. Логика: js/rules/m-knowledge.js. */
(function (EC) {
  'use strict';
  const U = EC.util, UI = EC.ui, C = EC.config, html = U.html, KIT = EC.machinesKit;
  const ID = 'knowledge';
  const L = () => EC.machines.logic[ID];

  let last = null; // последняя сетка — чтобы экран не пустел между заходами

  function info() {
    const M = C.MACHINES[ID], n = L().LINES.length;
    const order = [7, 6, 5, 4, 3, 2, 1, 0];
    return html`
      <h3>Как играть</h3>
      <p>5 барабанов, 3 ряда, ${n} линий. Ставка делится на линии поровну. Линия платит за одинаковые символы подряд с левого барабана.</p>
      <ul>
        <li><b>${KIT.sym(M, M.wild)} Книга</b> — заменяет любой символ на линии и одновременно скаттер: платит в любом месте окна.</li>
        <li><b>3+ книги</b> — ${M.freeSpins} фриспинов. Ещё 3 книги во фриспинах — +${M.retrigger}.</li>
        <li><b>Раскрывающийся символ.</b> Перед фриспинами случайно выбирается особый символ. Если во фриспине он лежит на достаточном числе барабанов (любых, не обязательно подряд), он заполняет эти барабаны целиком и платит по всем ${n} линиям — в дополнение к обычным выигрышам.</li>
      </ul>
      <h3>Выплаты (в ставках)</h3>
      ${KIT.payTable(M, order, ['2', '3', '4', '5'], (i) => M.pays[i].map((x) => KIT.perLine(x, n)))}
      <p>Книги в любом месте: 3 — ×${M.scatterPays[3]}, 4 — ×${M.scatterPays[4]}, 5 — ×${M.scatterPays[5]}.</p>
      <p>Раскрытый символ во фриспине платит выплату за «столько же подряд» × ${n} линий: например, сова на 3 барабанах — ×${M.pays[7][1]} ставки.</p>
      <h3>Линии</h3>
      <div class="m-lines-map">${L().LINES.map((ln, i) => html`<div class="m-lmap" title="Линия ${i + 1}">${[0, 1, 2].map((r) => ln.map((row) => html`<i class="${row === r ? 'on' : ''}"></i>`))}</div>`)}</div>`;
  }

  // Короткая «рулетка» выбора особого символа.
  async function chooseSpecial(ctx, M, special) {
    const frames = 16;
    for (let i = 0; i < frames; i++) {
      const sym = i === frames - 1 ? special : U.randInt(8);
      ctx.bar(html`Особый символ: <span class="m-pick">${KIT.sym(M, sym)}</span>`);
      EC.sound.play('tick');
      await UI.wait(60 + i * 12);
    }
    ctx.bar(html`Особый символ: <span class="m-pick on">${KIT.sym(M, special)}</span> <b>${M.symbols[special].n}</b>`);
    EC.sound.play('bonus');
    await UI.wait(900);
  }

  async function show(ctx, M, s, special) {
    const grid = ctx.$('#mGrid');
    await KIT.spin(grid, M, s.grid, special == null ? M.weights : M.fsWeights);
    if (!grid.isConnected) return;
    KIT.mark(grid, s.lines.flatMap((w) => w.cells));
    if (s.scatterM || s.scatters >= 3) KIT.mark(grid, EC.machines.cellsOf(s.grid, M.scatter));
    KIT.lines(grid, s.lines);
    if (s.lines.length || s.scatterM) { EC.sound.play('coin'); await UI.wait(700); }
    if (s.expand) {
      // Особый символ раскрывается на все свои барабаны и платит по всем линиям
      KIT.clear(grid);
      s.expand.reels.forEach((c) => [0, 1, 2].forEach((r) => {
        const el = KIT.cell(grid, c, r);
        el.innerHTML = String(KIT.sym(M, special));
        el.classList.add('exp');
      }));
      EC.sound.play('win');
      await UI.wait(350);
      KIT.lines(grid, L().LINES.map((ln) => ({ cells: ln.map((row, c) => [c, row]).filter(([c]) => s.expand.reels.includes(c)) })));
      await UI.wait(1000);
    }
  }

  function mount(root) {
    const M = C.MACHINES[ID];
    if (!last) last = EC.machines.spinGrid(M.cols, M.rows, M.weights, U.rand);
    KIT.mount(root, ID, {
      table: html`${KIT.gridHTML(M, last)}`,
      idle: html`3 книги 📖 — ${M.freeSpins} фриспинов с раскрывающимся символом`,
      info,
      label: (r) => M.n + (r.out.bonus ? ` · фриспины ×${U.fmt(Math.round(r.out.bonus.m * 10) / 10)}` : ''),
      animate: async (r, ctx) => {
        const grid = ctx.$('#mGrid');
        KIT.clear(grid);
        ctx.bar('Крутится…');
        const b = r.out.base;
        await show(ctx, M, b, null);
        last = b.grid;
        const bx = U.fmt(Math.round(b.m * r.bet));
        ctx.bar(b.m > 0 ? html`Выигрыш <span class="num">${bx} E</span>` : 'Мимо');
        if (!r.out.bonus) return;
        const bo = r.out.bonus;
        await UI.wait(400);
        ctx.bar(html`<b>${b.scatters} книги!</b> ${M.freeSpins} фриспинов`);
        EC.sound.play('bonus');
        await UI.wait(900);
        await chooseSpecial(ctx, M, bo.special);
        let sum = 0, total = M.freeSpins;
        for (let i = 0; i < bo.spins.length; i++) {
          const s = bo.spins[i];
          ctx.bar(html`Фриспин <span class="num">${i + 1} / ${total}</span> · ${KIT.sym(M, bo.special)} · бонус <span class="num">${U.fmt(Math.round(sum * r.bet))} E</span>`);
          KIT.clear(grid);
          await show(ctx, M, s, bo.special);
          if (!grid.isConnected) return;
          sum += s.m;
          if (s.retrigger) {
            total += M.retrigger;
            ctx.bar(html`<b>Ещё +${M.retrigger} фриспинов!</b>`);
            EC.sound.play('bonus');
            await UI.wait(900);
          }
          last = s.grid;
        }
        ctx.bar(html`Фриспины окончены · бонус <span class="num">${U.fmt(Math.round(bo.m * r.bet))} E</span>`);
      },
    });
  }

  EC.games[ID] = { mount };
})(globalThis.EC = globalThis.EC || {});
