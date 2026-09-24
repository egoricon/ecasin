/* «Книга Знаний» — 5×3, 10 линий. Книга 📖 — wild и скаттер одновременно.
   3+ книги в любом месте → 10 фриспинов. Перед фриспинами выбирается особый символ:
   во фриспинах он раскрывается на весь барабан и платит по всем 10 линиям,
   если лежит хотя бы на стольких барабанах, сколько нужно для его выплаты (барабаны не обязаны идти подряд). */
(function (EC) {
  'use strict';
  const U = EC.util, K = EC.machines;
  const LINES = K.LINES_5x3;

  // Расчёт одного спина по готовой сетке. special — особый символ фриспинов (или null в основной игре).
  function evalSpin(M, grid, special) {
    const lines = K.evalLines(grid, LINES, M.pays, M.wild);
    const scatters = K.count(grid, M.scatter);
    const scatterM = M.scatterPays[Math.min(scatters, 5)] || 0;
    let expand = null;
    if (special != null) {
      const reels = [];
      grid.forEach((col, c) => { if (col.includes(special)) reels.push(c); });
      const p = reels.length >= 2 ? M.pays[special][reels.length - 2] || 0 : 0;
      // Раскрытый символ платит на каждой из 10 линий: p × (ставка / 10) × 10 = p ставок.
      if (p > 0) expand = { sym: special, reels, count: reels.length, perLine: p / LINES.length, m: p };
    }
    const m = K.sum(lines) + scatterM + (expand ? expand.m : 0);
    return { grid, lines, scatters, scatterM, expand, m };
  }

  function play(M, rnd = U.rand) {
    const base = evalSpin(M, K.spinGrid(M.cols, M.rows, M.weights, rnd), null);
    const out = { base, bonus: null, m: base.m };
    if (base.scatters >= 3) {
      const special = U.weighted(M.specialWeights, rnd);
      const spins = [];
      let left = M.freeSpins, total = 0;
      while (left > 0 && spins.length < M.maxFreeSpins) {
        left--;
        const s = evalSpin(M, K.spinGrid(M.cols, M.rows, M.fsWeights, rnd), special);
        if (s.scatters >= 3 && spins.length + 1 + left < M.maxFreeSpins) { left += M.retrigger; s.retrigger = true; }
        spins.push(s);
        total += s.m;
      }
      out.bonus = { special, spins, m: total };
      out.m += total;
    }
    return out;
  }

  // Для симуляции: вклад фриспинов отдельно.
  const features = (o) => (o.bonus ? { 'фриспины': o.bonus.m } : null);

  K.logic.knowledge = { play, evalSpin, features, LINES };
})(globalThis.EC = globalThis.EC || {});
