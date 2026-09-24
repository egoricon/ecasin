/* Автоматы (4 новых слота): общие помощники логики без DOM и контроллер раунда.
   Каждый автомат — отдельный модуль в js/rules/m-*.js с функцией play(M, rnd) → исход раунда
   в единицах ставки (m = выплата / ставка). Отрисовка только читает исход. */
(function (EC) {
  'use strict';
  const U = EC.util, C = EC.config;

  const K = {};

  // 10 линий для сетки 5×3: номер ряда на каждом барабане.
  K.LINES_5x3 = [
    [1, 1, 1, 1, 1], [0, 0, 0, 0, 0], [2, 2, 2, 2, 2], [0, 1, 2, 1, 0], [2, 1, 0, 1, 2],
    [1, 0, 0, 0, 1], [1, 2, 2, 2, 1], [0, 0, 1, 2, 2], [2, 2, 1, 0, 0], [1, 2, 1, 0, 1],
  ];

  // Веса могут быть общими или своими для каждого барабана: [[...], [...], ...].
  K.weightsFor = (w, col) => (Array.isArray(w[0]) ? w[col] : w);

  // Сетка grid[col][row] из независимых взвешенных символов.
  K.spinGrid = (cols, rows, weights, rnd) => {
    const g = [];
    for (let c = 0; c < cols; c++) {
      const w = K.weightsFor(weights, c), col = [];
      for (let r = 0; r < rows; r++) col.push(U.weighted(w, rnd));
      g.push(col);
    }
    return g;
  };

  K.count = (grid, sym) => grid.reduce((t, col) => t + col.filter((x) => x === sym).length, 0);
  K.cellsOf = (grid, sym) => {
    const out = [];
    grid.forEach((col, c) => col.forEach((x, r) => { if (x === sym) out.push([c, r]); }));
    return out;
  };

  /* Линии слева направо. pays[sym][count - 2] — множитель ставки на линию; wild заменяет всё.
     Линия из одних wild не платит (wild в этих автоматах — ещё и скаттер, он платит отдельно).
     Возвращает выигрыши в единицах ОБЩЕЙ ставки: pay × (1 / число линий). */
  K.evalLines = (grid, lines, pays, wild) => {
    const wins = [];
    const perLine = 1 / lines.length;
    lines.forEach((L, li) => {
      const seq = L.map((row, col) => grid[col][row]);
      const base = seq.find((x) => x !== wild);
      if (base === undefined || !pays[base]) return;
      let n = 0;
      for (const x of seq) { if (x === base || x === wild) n++; else break; }
      const p = n >= 2 ? pays[base][n - 2] || 0 : 0;
      if (p > 0) wins.push({ line: li, sym: base, count: n, m: p * perLine, cells: L.slice(0, n).map((row, col) => [col, row]) });
    });
    return wins;
  };
  K.sum = (wins) => wins.reduce((t, w) => t + w.m, 0);

  // Ставка в Егориках → выплата в Егориках. Округление к ближайшему (в среднем без перекоса).
  K.payOf = (bet, m) => Math.max(0, Math.round(bet * m));

  /* ---------- Контроллер раунда: ставка списывается один раз, выплата — один раз ----------
     begin() — beginRound + весь исход раунда (с фриспинами/бонусами) сразу.
     finish() — единственный round.end(). Между ними экран только проигрывает анимацию. */
  K.logic = {};
  K.config = (id) => C.MACHINES[id];
  K.begin = (id, bet, rnd = U.rand) => {
    const M = K.config(id);
    const out = K.logic[id].play(M, rnd);
    const round = EC.econ.beginRound(id, bet);
    return { round, out, bet, M };
  };
  K.finish = (r, meta = {}) => r.round.end(K.payOf(r.bet, r.out.m), Object.assign({ label: r.M.n }, meta));

  EC.machines = K;
})(globalThis.EC = globalThis.EC || {});
