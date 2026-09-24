/* «Мини-777» — 3×3, 5 линий (3 ряда + 2 диагонали). Барабаны — ленты символов: в окне видно 3 соседние позиции.
   Почти-выигрыш — выигрыша нет, но на линии уже совпали два барабана:
   · нюдж — если сдвиг одного барабана на 1 позицию (вверх или вниз) даёт выигрыш, он случается с шансом nudgeChance;
   · иначе респин — два совпавших барабана стоят, третий перекручивается один раз (шанс respinChance).
   Выигрыш спина умножается на случайный множитель от ×1 до ×10. */
(function (EC) {
  'use strict';
  const U = EC.util, K = EC.machines;
  const LINES = [[1, 1, 1], [0, 0, 0], [2, 2, 2], [0, 1, 2], [2, 1, 0]]; // ряд на каждом барабане

  const mod = (a, n) => ((a % n) + n) % n;
  // Окно барабана c с позицией p: символы ленты p, p+1, p+2 (сверху вниз).
  const windowOf = (M, pos) => pos.map((p, c) => [0, 1, 2].map((r) => M.strips[c][mod(p + r, M.strips[c].length)]));

  // Выигрыши по линиям: три одинаковых — M.pays[sym], три любые семёрки — M.anySeven (× ставку на линию).
  function evalGrid(M, grid) {
    const wins = [];
    LINES.forEach((ln, i) => {
      const s = ln.map((row, c) => grid[c][row]);
      let pay = 0, sym = s[0];
      if (s[0] === s[1] && s[1] === s[2]) pay = M.pays[sym];
      else if (s.every((x) => M.sevens.includes(x))) { pay = M.anySeven; sym = -1; }
      if (pay) wins.push({ line: i, sym, m: pay / LINES.length, cells: ln.map((row, c) => [c, row]) });
    });
    return { grid, wins, m: K.sum(wins) };
  }

  // Лучший нюдж: сдвиг одного барабана на ±1, который даёт самый большой выигрыш (или null).
  function bestNudge(M, pos) {
    let best = null;
    for (let c = 0; c < pos.length; c++) {
      for (const dir of [1, -1]) {
        const p = pos.slice();
        p[c] = mod(p[c] + dir, M.strips[c].length);
        const e = evalGrid(M, windowOf(M, p));
        if (e.m > 0 && (!best || e.m > best.m)) best = Object.assign(e, { pos: p, reel: c, dir });
      }
    }
    return best;
  }

  // Почти-выигрыш: линия, где два барабана совпали, а третий — нет. Берём самый дорогой символ.
  function nearMiss(M, grid) {
    let best = null;
    LINES.forEach((ln, i) => {
      const s = ln.map((row, c) => grid[c][row]);
      for (const [a, b, free] of [[0, 1, 2], [0, 2, 1], [1, 2, 0]]) {
        if (s[a] !== s[b] || s[free] === s[a]) continue;
        if (!best || M.pays[s[a]] > M.pays[best.sym]) best = { line: i, sym: s[a], held: [a, b], reel: free };
      }
    });
    return best;
  }

  function play(M, rnd = U.rand) {
    const pos = M.strips.map((s) => Math.floor(rnd() * s.length));
    const base = Object.assign(evalGrid(M, windowOf(M, pos)), { pos });
    const out = { base, nudge: null, respin: null, win: base.m, mult: 1, m: 0 };
    if (base.m === 0) {
      const nd = bestNudge(M, pos);
      if (nd && rnd() < M.nudgeChance) {
        out.nudge = nd;
      } else {
        const nm = nearMiss(M, base.grid);
        if (nm && rnd() < M.respinChance) {
          const p = pos.slice();
          p[nm.reel] = Math.floor(rnd() * M.strips[nm.reel].length);
          out.respin = Object.assign(evalGrid(M, windowOf(M, p)), { pos: p, reel: nm.reel, held: nm.held, line: nm.line, sym: nm.sym });
        }
      }
    }
    out.final = out.respin || out.nudge || base;
    out.win = out.final.m;
    if (out.win > 0) out.mult = M.multValues[U.weighted(M.multWeights, rnd)];
    out.m = out.win * out.mult;
    return out;
  }

  const features = (o) => {
    const f = {};
    if (o.nudge) f['нюдж'] = o.m;
    if (o.respin) f['респин'] = o.m;
    if (o.mult > 1) f['множитель ×2+'] = o.m - o.win; // прибавка сверх выигрыша без множителя
    return Object.keys(f).length ? f : null;
  };

  K.logic.mini777 = { play, evalGrid, windowOf, bestNudge, nearMiss, features, LINES };
})(globalThis.EC = globalThis.EC || {});
