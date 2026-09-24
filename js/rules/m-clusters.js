/* «Кибер-Кластеры» — сетка 6×5. Кластер = 8+ одинаковых символов, соединённых по горизонтали/вертикали.
   Каскад: выигравшие символы исчезают, оставшиеся падают вниз, сверху досыпаются новые — пока есть кластеры.
   4+ «404» (скаттер) в конце серии → фриспины. Во фриспинах на клетках появляются множители ×2…×10
   (при спине и при каждой досыпке). Если серия что-то выиграла, все множители на поле складываются
   и умножают выигрыш серии. Множитель привязан к клетке, а не к символу. В основной игре множителей нет. */
(function (EC) {
  'use strict';
  const U = EC.util, K = EC.machines;

  // Все кластеры сетки размером ≥ minCluster (скаттер в кластеры не входит).
  function findClusters(M, grid) {
    const cols = grid.length, rows = grid[0].length;
    const seen = grid.map((col) => col.map(() => false));
    const out = [];
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        if (seen[c][r] || grid[c][r] === M.scatter) continue;
        const sym = grid[c][r], cells = [], stack = [[c, r]];
        seen[c][r] = true;
        while (stack.length) {
          const [x, y] = stack.pop();
          cells.push([x, y]);
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= cols || ny >= rows || seen[nx][ny] || grid[nx][ny] !== sym) continue;
            seen[nx][ny] = true;
            stack.push([nx, ny]);
          }
        }
        if (cells.length >= M.minCluster) out.push({ sym, size: cells.length, cells, m: payFor(M, sym, cells.length) });
      }
    }
    return out;
  }
  // Выплата по размеру: M.sizes — нижние границы полос, M.pays[sym][полоса] — × общую ставку.
  function payFor(M, sym, size) {
    let band = 0;
    M.sizes.forEach((s, i) => { if (size >= s) band = i; });
    return M.pays[sym][band];
  }

  // Убрать клетки и досыпать: символы падают вниз, новые приходят сверху. Возвращает новую сетку и список новых клеток.
  function collapse(M, grid, cells, weights, rnd) {
    const kill = new Set(cells.map(([c, r]) => c + ':' + r));
    const rows = grid[0].length;
    const next = [], fresh = [];
    grid.forEach((col, c) => {
      const keep = col.filter((_, r) => !kill.has(c + ':' + r));
      const add = rows - keep.length;
      const w = K.weightsFor(weights, c);
      const top = [];
      for (let i = 0; i < add; i++) { top.push(U.weighted(w, rnd)); fresh.push([c, i]); }
      next.push(top.concat(keep));
    });
    return { grid: next, fresh };
  }

  // Во фриспинах: на каждой указанной клетке с шансом M.multChance появляется множитель.
  function dropMults(M, mult, cells, rnd) {
    const added = [];
    for (const [c, r] of cells) {
      if (mult[c][r] || rnd() >= M.multChance) continue;
      mult[c][r] = M.multValues[U.weighted(M.multWeights, rnd)];
      added.push([c, r, mult[c][r]]);
    }
    return added;
  }
  const allCells = (M) => { const a = []; for (let c = 0; c < M.cols; c++) for (let r = 0; r < M.rows; r++) a.push([c, r]); return a; };

  /* Одна серия (спин + все каскады). fs = true — фриспин: на клетках появляются множители.
     steps — кадры для анимации: сетка до взрыва, кластеры, сетка после досыпки, множители. */
  function series(M, grid, weights, rnd, fs) {
    const steps = [];
    const mult = fs ? Array.from({ length: M.cols }, () => Array(M.rows).fill(0)) : null;
    const startMults = fs ? dropMults(M, mult, allCells(M), rnd) : [];
    let win = 0;
    for (let guard = 0; guard < 60; guard++) {
      const clusters = findClusters(M, grid);
      if (!clusters.length) break;
      const cells = clusters.flatMap((cl) => cl.cells);
      const stepWin = clusters.reduce((t, cl) => t + cl.m, 0);
      win += stepWin;
      const next = collapse(M, grid, cells, weights, rnd);
      const newMults = fs ? dropMults(M, mult, next.fresh, rnd) : [];
      steps.push({ grid, clusters, win: stepWin, next: next.grid, fresh: next.fresh, newMults });
      grid = next.grid;
    }
    const multSum = mult ? mult.reduce((t, col) => t + col.reduce((a, b) => a + b, 0), 0) : 0;
    const multiplier = win > 0 && multSum > 0 ? multSum : 1; // множители складываются
    const scatters = K.count(grid, M.scatter);
    const scatterM = M.scatterPays[Math.min(scatters, 6)] || 0;
    return { steps, final: grid, win, multiplier, mult, startMults, m: win * multiplier + scatterM, scatters, scatterM };
  }

  function play(M, rnd = U.rand) {
    const base = series(M, K.spinGrid(M.cols, M.rows, M.weights, rnd), M.weights, rnd, null);
    base.start = base.steps.length ? base.steps[0].grid : base.final;
    const out = { base, bonus: null, m: base.m };
    if (base.scatters >= M.fsTrigger) {
      const spins = [];
      let left = M.freeSpins, total = 0;
      while (left > 0 && spins.length < M.maxFreeSpins) {
        left--;
        const g = K.spinGrid(M.cols, M.rows, M.fsWeights, rnd);
        const s = series(M, g, M.fsWeights, rnd, true);
        s.start = g;
        if (s.scatters >= M.fsRetrigger && spins.length + 1 + left < M.maxFreeSpins) { left += M.retrigger; s.retrigger = true; }
        spins.push(s);
        total += s.m;
      }
      out.bonus = { spins, m: total };
      out.m += total;
    }
    return out;
  }

  const features = (o) => (o.bonus ? { 'фриспины': o.bonus.m } : null);

  K.logic.clusters = { play, findClusters, collapse, series, features };
})(globalThis.EC = globalThis.EC || {});
