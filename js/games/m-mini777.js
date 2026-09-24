/* «Мини-777» — экран. Логика: js/rules/m-mini777.js. */
(function (EC) {
  'use strict';
  const U = EC.util, UI = EC.ui, C = EC.config, html = U.html, KIT = EC.machinesKit;
  const ID = 'mini777';
  const L = () => EC.machines.logic[ID];

  let last = null;

  function info() {
    const M = C.MACHINES[ID], n = L().LINES.length;
    const wsum = M.multWeights.reduce((a, b) => a + b, 0);
    const pct = (w) => (Math.round((w / wsum) * 1000) / 10).toLocaleString('ru-RU') + '%';
    const three = (i) => html`${KIT.sym(M, i)}${KIT.sym(M, i)}${KIT.sym(M, i)}`;
    return html`
      <h3>Как играть</h3>
      <p>3 барабана, 3 ряда, ${n} линий: три ряда и две диагонали. Линия платит за три одинаковых символа; три семёрки разных цветов — тоже выигрыш.</p>
      <ul>
        <li><b>Нюдж.</b> Не хватило одной позиции до выигрыша — барабан может сдвинуться на символ вверх или вниз и собрать линию.</li>
        <li><b>Респин.</b> На линии совпали два барабана, а нюдж не случился — иногда третий барабан перекручивается ещё раз бесплатно, два совпавших стоят на месте.</li>
        <li><b>Множитель.</b> Выигрыш спина умножается на случайный множитель: ${M.multValues.map((v, i) => html`×${v} — ${pct(M.multWeights[i])}`).reduce((a, b) => html`${a}, ${b}`)}.</li>
      </ul>
      <h3>Выплаты за линию (в ставках)</h3>
      <table class="m-pay">
        <thead><tr><th>Три в ряд</th><th>Выплата</th></tr></thead>
        <tbody>
          ${[5, 4, 3, 2, 1, 0].map((i) => html`<tr><td>${three(i)} <span class="faint">${M.symbols[i].n}</span></td><td class="num">${KIT.x(KIT.perLine(M.pays[i], n))}</td></tr>`)}
          <tr><td>${M.sevens.map((i) => KIT.sym(M, i))} <span class="faint">Любые три семёрки</span></td><td class="num">${KIT.x(KIT.perLine(M.anySeven, n))}</td></tr>
        </tbody>
      </table>
      <h3>Линии</h3>
      <div class="m-lines-map">${L().LINES.map((ln, i) => html`<div class="m-lmap" style="--lc:3" title="Линия ${i + 1}">${[0, 1, 2].map((r) => ln.map((row) => html`<i class="${row === r ? 'on' : ''}"></i>`))}</div>`)}</div>`;
  }

  function mount(root) {
    const M = C.MACHINES[ID];
    if (!last) last = L().windowOf(M, M.strips.map((s) => Math.floor(U.rand() * s.length)));
    // Для мелькания при вращении: частоты символов на ленте каждого барабана.
    const flick = M.strips.map((s) => M.symbols.map((_, i) => s.filter((x) => x === i).length));

    // Нюдж: лента сдвигается на одну позицию, новый символ въезжает сверху или снизу.
    async function nudge(ctx, grid, nd) {
      ctx.bar(html`<b>Нюдж!</b> ${nd.reel + 1}-й барабан ${nd.dir > 0 ? 'вверх' : 'вниз'}`);
      EC.sound.play('tick');
      await UI.wait(450);
      if (!grid.isConnected) return;
      nd.grid[nd.reel].forEach((x, r) => {
        const el = KIT.cell(grid, nd.reel, r);
        el.className = 'm-cell ' + (nd.dir > 0 ? 'nudge-up' : 'nudge-down');
        el.innerHTML = String(KIT.sym(M, x));
      });
      EC.sound.play('reel');
      await UI.wait(420);
    }

    // Респин: два совпавших барабана держим, третий крутим ещё раз.
    async function respin(ctx, grid, rs) {
      const line = L().LINES[rs.line];
      KIT.mark(grid, rs.held.map((c) => [c, line[c]]), 'hold');
      ctx.bar(html`<b>Почти!</b> Респин ${rs.reel + 1}-го барабана`);
      EC.sound.play('bonus');
      await UI.wait(700);
      if (!grid.isConnected) return;
      await KIT.spin(grid, M, rs.grid, flick, { cols: [rs.reel], base: 700 });
      if (grid.isConnected) KIT.clear(grid);
    }

    // Рулетка множителя в строке статуса: крутится ~2 с и замедляется перед остановкой.
    async function multRoll(ctx, mult) {
      const vals = M.multValues;
      const delays = [50, 50, 55, 55, 60, 65, 70, 80, 90, 100, 115, 130, 150, 175, 205, 240, 280];
      let k = U.randInt(vals.length);
      for (let i = 0; i < delays.length; i++) {
        k = (k + 1 + U.randInt(vals.length - 1)) % vals.length; // каждый раз другое значение
        ctx.bar(html`Множитель <span class="m-mult">×${vals[k]}</span>`);
        EC.sound.play('tick');
        await UI.wait(delays[i]);
      }
      ctx.bar(html`Множитель <span class="m-mult on">×${mult}</span>`);
      EC.sound.play(mult > 1 ? 'bonus' : 'reel');
      await UI.wait(mult > 1 ? 1000 : 600);
    }

    const ctx = KIT.mount(root, ID, {
      table: html`${KIT.gridHTML(M, last)}`,
      idle: 'Нюдж и респин при почти-выигрыше · множитель до ×10',
      info,
      label: (r) => M.n + (r.out.nudge ? ' · нюдж' : '') + (r.out.respin ? ' · респин' : '') + (r.out.mult > 1 ? ' · ×' + r.out.mult : ''),
      animate: async (r, ctx) => {
        const grid = ctx.$('#mGrid'), o = r.out;
        KIT.clear(grid);
        ctx.bar('Крутится…');
        await KIT.spin(grid, M, o.base.grid, flick, { base: 480, step: 220 });
        if (!grid.isConnected) return;
        last = o.base.grid;
        if (o.nudge) await nudge(ctx, grid, o.nudge);
        else if (o.respin) await respin(ctx, grid, o.respin);
        if (!grid.isConnected) return;
        last = o.final.grid;
        if (o.win > 0) {
          KIT.mark(grid, o.final.wins.flatMap((w) => w.cells));
          KIT.lines(grid, o.final.wins);
          EC.sound.play('coin');
          await multRoll(ctx, o.mult);
          ctx.bar(html`${o.mult > 1 ? html`<span class="m-mult">×${o.mult}</span>` : ''} Выигрыш <span class="num">${U.fmt(Math.round(o.m * r.bet))} E</span>`);
        } else ctx.bar(o.respin ? 'Респин мимо' : 'Мимо');
      },
    });
    ctx.$('#mGrid').classList.add('mini');
  }

  EC.games[ID] = { mount };
})(globalThis.EC = globalThis.EC || {});
