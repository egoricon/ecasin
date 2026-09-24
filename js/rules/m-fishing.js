/* «Рыбалка на Свислочи» — 5×3, 10 линий.
   🐟 — рыба-деньги с номиналом (× ставку). На линиях не платит.
   6+ рыб в окне → Hold & Spin: рыбы остаются на месте, 3 респина; каждая новая рыба сбрасывает счётчик на 3.
   Итог — сумма номиналов (+ бонус за полный садок из 15 рыб).
   3+ 🛶 лодки → фриспины: появляется 🧔 дед-сборщик — каждый дед на экране собирает номиналы всех рыб. */
(function (EC) {
  'use strict';
  const U = EC.util, K = EC.machines;
  const LINES = K.LINES_5x3;

  // Сетка + номиналы рыб: vals[c][r] = номинал или 0.
  function spinWithValues(M, weights, rnd) {
    const grid = K.spinGrid(M.cols, M.rows, weights, rnd);
    const vals = grid.map((col) => col.map((x) => (x === M.fish ? M.fishValues[U.weighted(M.fishWeights, rnd)] : 0)));
    return { grid, vals };
  }
  const sumVals = (vals) => vals.reduce((t, col) => t + col.reduce((a, b) => a + b, 0), 0);

  function evalSpin(M, grid, vals, fs) {
    const lines = K.evalLines(grid, LINES, M.pays, -1);
    const scatters = K.count(grid, M.scatter);
    const scatterM = M.scatterPays[Math.min(scatters, 5)] || 0;
    const fishCount = K.count(grid, M.fish);
    let collect = null;
    if (fs) {
      const deds = K.count(grid, M.collector), fishSum = sumVals(vals);
      if (deds > 0 && fishSum > 0) collect = { deds, fishSum, m: deds * fishSum, cells: K.cellsOf(grid, M.collector).concat(K.cellsOf(grid, M.fish)) };
    }
    const m = K.sum(lines) + scatterM + (collect ? collect.m : 0);
    return { grid, vals, lines, scatters, scatterM, fishCount, collect, m };
  }

  /* Hold & Spin. start — номиналы рыб, запустивших бонус (vals). Возвращает кадры респинов и итог. */
  function holdAndSpin(M, vals, rnd) {
    const held = vals.map((col) => col.slice());
    const total = M.cols * M.rows;
    const filled = () => held.reduce((t, col) => t + col.filter((v) => v > 0).length, 0);
    let respins = M.respins;
    const rounds = [];
    while (respins > 0 && filled() < total) {
      const landed = [];
      held.forEach((col, c) => col.forEach((v, r) => {
        if (v || rnd() >= M.holdChance) return;
        const nv = M.fishValues[U.weighted(M.holdWeights, rnd)];
        held[c][r] = nv;
        landed.push([c, r, nv]);
      }));
      respins = landed.length ? M.respins : respins - 1; // новая рыба — счётчик снова 3
      rounds.push({ landed, respins });
    }
    const full = filled() === total;
    const sum = sumVals(held);
    return { rounds, held, full, sum, m: sum + (full ? M.fullBonus : 0) };
  }

  function play(M, rnd = U.rand) {
    const first = spinWithValues(M, M.weights, rnd);
    const base = evalSpin(M, first.grid, first.vals, false);
    const out = { base, hold: null, bonus: null, m: base.m };
    if (base.fishCount >= M.holdTrigger) {
      out.hold = holdAndSpin(M, first.vals, rnd);
      out.m += out.hold.m;
    }
    if (base.scatters >= M.fsTrigger) {
      const spins = [];
      let left = M.freeSpins, total = 0;
      while (left > 0 && spins.length < M.maxFreeSpins) {
        left--;
        const sp = spinWithValues(M, M.fsWeights, rnd);
        const s = evalSpin(M, sp.grid, sp.vals, true);
        if (s.scatters >= M.fsTrigger && spins.length + 1 + left < M.maxFreeSpins) { left += M.retrigger; s.retrigger = true; }
        spins.push(s);
        total += s.m;
      }
      out.bonus = { spins, m: total };
      out.m += total;
    }
    return out;
  }

  const features = (o) => {
    const f = {};
    if (o.hold) f['Hold & Spin'] = o.hold.m;
    if (o.bonus) f['фриспины'] = o.bonus.m;
    return o.hold || o.bonus ? f : null;
  };

  K.logic.fishing = { play, evalSpin, holdAndSpin, features, LINES };
})(globalThis.EC = globalThis.EC || {});
