/* «Кибер-Кластеры» — экран. Логика: js/rules/m-clusters.js. */
(function (EC) {
  'use strict';
  const U = EC.util, UI = EC.ui, C = EC.config, html = U.html, KIT = EC.machinesKit;
  const ID = 'clusters';

  let last = null;

  function info() {
    const M = C.MACHINES[ID];
    const bands = M.sizes.map((s, i) => (i === M.sizes.length - 1 ? s + '+' : s + '–' + (M.sizes[i + 1] - 1)));
    const order = [6, 5, 4, 3, 2, 1, 0];
    return html`
      <h3>Как играть</h3>
      <p>Сетка 6×5. Выигрыш — <b>кластер</b>: ${M.minCluster} и больше одинаковых символов, соединённых по горизонтали или вертикали (по диагонали не считается).</p>
      <ul>
        <li><b>Каскад.</b> Выигравшие символы исчезают, оставшиеся падают вниз, сверху досыпаются новые. Пока появляются новые кластеры, каскад продолжается — всё в рамках одного спина.</li>
        <li><b>${KIT.sym(M, M.scatter)} Глитч</b> — скаттер. ${M.fsTrigger}+ в конце серии — ${M.freeSpins} фриспинов; ${M.fsRetrigger}+ во фриспинах — ещё +${M.retrigger}. Платит в любом месте: 4 — ×${M.scatterPays[4]}, 5 — ×${M.scatterPays[5]}, 6+ — ×${M.scatterPays[6]}.</li>
        <li><b>Множители (только во фриспинах).</b> На клетках появляются множители ${M.multValues.map((v) => '×' + v).join(', ')} — при спине и при каждой досыпке. Множитель стоит на клетке, а не на символе. Если серия каскадов что-то выиграла, <b>все множители на поле складываются</b> и умножают выигрыш серии.</li>
      </ul>
      <h3>Выплаты за кластер (в ставках)</h3>
      ${KIT.payTable(M, order, bands, (i) => M.pays[i])}`;
  }

  function mount(root) {
    const M = C.MACHINES[ID];
    if (!last) last = EC.machines.spinGrid(M.cols, M.rows, M.weights, U.rand);
    let badges = null; // множители на клетках во время фриспина

    const tag = (c, r) => (badges && badges[c][r] ? `<span class="m-x">×${badges[c][r]}</span>` : '');
    const redrawBadges = (grid) => {
      UI.$$('.m-cell', grid).forEach((el) => {
        const c = +el.dataset.c, r = +el.dataset.r;
        el.querySelectorAll('.m-x').forEach((x) => x.remove());
        el.classList.toggle('xcell', !!(badges && badges[c][r]));
        if (badges && badges[c][r]) el.insertAdjacentHTML('beforeend', tag(c, r));
      });
    };

    // Проиграть серию: спин → каскады. prefix — строка статуса (номер фриспина и т. п.).
    async function play(ctx, s, weights, prefix, bet) {
      const grid = ctx.$('#mGrid');
      KIT.clear(grid);
      await KIT.spin(grid, M, s.start, weights, { base: 380, step: 90, extraFor: tag });
      if (!grid.isConnected) return;
      if (badges) {
        s.startMults.forEach(([c, r, v]) => { badges[c][r] = v; });
        redrawBadges(grid);
        if (s.startMults.length) { EC.sound.play('tick'); await UI.wait(300); }
      }
      let sum = 0;
      for (const st of s.steps) {
        KIT.mark(grid, st.clusters.flatMap((cl) => cl.cells));
        sum += st.win;
        const best = st.clusters.reduce((a, b) => (b.m > a.m ? b : a));
        ctx.bar(html`${prefix}Кластер ${best.size} × ${KIT.sym(M, best.sym)} · серия <span class="num">${U.fmt(Math.round(sum * bet))} E</span>`);
        EC.sound.play('coin');
        await UI.wait(650);
        st.clusters.forEach((cl) => cl.cells.forEach(([c, r]) => KIT.cell(grid, c, r).classList.add('pop')));
        await UI.wait(300);
        if (!grid.isConnected) return;
        if (badges) st.newMults.forEach(([c, r, v]) => { badges[c][r] = v; });
        KIT.draw(grid, M, st.next, tag);
        UI.$$('.m-cell', grid).forEach((el) => el.classList.toggle('xcell', !!(badges && badges[+el.dataset.c][+el.dataset.r])));
        st.fresh.forEach(([c, r]) => KIT.cell(grid, c, r).classList.add('drop'));
        EC.sound.play('reel');
        await UI.wait(380);
      }
      // Глитчи подсвечиваем, только когда они что-то дают: в основной игре от 4, во фриспинах от 3
      if (s.scatterM || s.scatters >= (badges ? M.fsRetrigger : M.fsTrigger)) KIT.mark(grid, EC.machines.cellsOf(s.final, M.scatter));
      if (badges && s.win > 0 && s.multiplier > 1) {
        ctx.bar(html`${prefix}Множители: ${s.multiplier} × ${U.fmt(Math.round(s.win * bet))} E = <span class="num">${U.fmt(Math.round(s.win * s.multiplier * bet))} E</span>`);
        EC.sound.play('win');
        await UI.wait(1000);
      }
    }

    KIT.mount(root, ID, {
      table: html`${KIT.gridHTML(M, last)}`,
      idle: html`Кластеры от ${M.minCluster} · ${M.fsTrigger}+ ${KIT.sym(M, M.scatter)} — фриспины с множителями`,
      info,
      label: (r) => M.n + (r.out.bonus ? ` · фриспины ×${U.fmt(Math.round(r.out.bonus.m))}` : ''),
      animate: async (r, ctx) => {
        ctx.bar('Крутится…');
        badges = null;
        const b = r.out.base;
        await play(ctx, b, M.weights, '', r.bet);
        last = b.final;
        const grid = ctx.$('#mGrid');
        if (!grid) return;
        const near = !r.out.bonus && b.scatters === M.fsTrigger - 1 ? html` · ${b.scatters} из ${M.fsTrigger} ${KIT.sym(M, M.scatter)} — почти фриспины` : '';
        ctx.bar(html`${b.m > 0 ? html`Выигрыш <span class="num">${U.fmt(Math.round(b.m * r.bet))} E</span>${b.steps.length > 1 ? html` · каскадов: ${b.steps.length}` : ''}` : 'Мимо'}${near}`);
        if (!r.out.bonus) return;
        const bo = r.out.bonus;
        await UI.wait(600);
        KIT.bonus(ctx, 'clusters', 'Фриспины');
        ctx.bar(html`<b>${b.scatters} × ${KIT.sym(M, M.scatter)}</b> — ${M.freeSpins} фриспинов с множителями!`);
        EC.sound.play('bonus');
        await UI.wait(1100);
        let total = M.freeSpins, sum = 0;
        for (let i = 0; i < bo.spins.length; i++) {
          const s = bo.spins[i];
          badges = Array.from({ length: M.cols }, () => Array(M.rows).fill(0));
          await play(ctx, s, M.fsWeights, html`Фриспин <span class="num">${i + 1}/${total}</span> · `, r.bet);
          if (!ctx.$('#mGrid')) return;
          sum += s.m;
          ctx.bar(html`Фриспин <span class="num">${i + 1}/${total}</span> · бонус <span class="num">${U.fmt(Math.round(sum * r.bet))} E</span>`);
          if (s.retrigger) {
            total += M.retrigger;
            ctx.bar(html`<b>Ещё +${M.retrigger} фриспинов!</b>`);
            EC.sound.play('bonus');
            await UI.wait(900);
          } else await UI.wait(750); // поле постоит, прежде чем крутить следующий фриспин
          last = s.final;
        }
        badges = null;
        redrawBadges(ctx.$('#mGrid'));
        ctx.bar(html`Фриспины окончены · бонус <span class="num">${U.fmt(Math.round(bo.m * r.bet))} E</span>`);
        EC.sound.play('win');
        await UI.wait(1500);
        KIT.bonus(ctx, null);
      },
    });
  }

  EC.games[ID] = { mount };
})(globalThis.EC = globalThis.EC || {});
