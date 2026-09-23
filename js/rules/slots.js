/* Слоты: 3 барабана, окно 3×3, линия выплат — средний ряд.
   ЕГОРИК — wild (заменяет всё, кроме SCATTER). ЕГОРИК на каждом барабане (в любом ряду) = бонус-игра.
   SCATTER платит за количество в любом месте окна. Таблицы — в config.js (EC.config.SLOTS). */
(function (EC) {
  'use strict';
  const U = EC.util;

  const WILD = 6, SCATTER = 7;

  // Окно: window[reel][row], row 0..2, линия — row 1.
  function spinWindow(weights, rnd = U.rand, rows = 3, reels = 3) {
    const w = [];
    for (let r = 0; r < reels; r++) {
      const col = [];
      for (let i = 0; i < rows; i++) col.push(U.weighted(weights, rnd));
      w.push(col);
    }
    return w;
  }

  // Линия слева направо. Возвращает лучшую выплату по линии.
  function evalLine(cells, V) {
    const n = cells.length;
    if (cells.every((x) => x === WILD)) return { sym: WILD, count: n, m: V.p3[WILD] };
    let best = null;
    const consider = (sym, count, m) => {
      if (m > 0 && (!best || m > best.m)) best = { sym, count, m };
    };
    // Пара ЕГОРИКОВ слева
    let wilds = 0;
    while (wilds < n && cells[wilds] === WILD) wilds++;
    if (wilds >= 2) consider(WILD, wilds, V.p2[WILD]);

    const base = cells.find((x) => x !== WILD);
    if (base !== SCATTER) {
      let count = 0;
      for (const x of cells) {
        if (x === base || x === WILD) count++;
        else break;
      }
      if (count === 3) consider(base, 3, V.p3[base]);
      else if (count === 2) consider(base, 2, V.p2[base]);
    }
    return best;
  }

  function evaluate(win, V) {
    const line = evalLine(win.map((col) => col[1]), V);
    const scCells = [], wildReels = [];
    win.forEach((col, r) => {
      let hasWild = false;
      col.forEach((x, row) => {
        if (x === SCATTER) scCells.push([r, row]);
        if (x === WILD) hasWild = true;
      });
      wildReels.push(hasWild);
    });
    const scCount = scCells.length;
    const scM = V.sc[Math.min(scCount, V.sc.length - 1)] || 0;
    const bonus = wildReels.every(Boolean);
    return {
      line,
      scatter: { count: scCount, m: scM, cells: scM > 0 ? scCells : [] },
      bonus,
      m: (line ? line.m : 0) + scM,
    };
  }

  /* ---------- Бонус-игра: сетка 5×3, 5 линий ---------- */
  const BONUS_LINES = [
    [1, 1, 1, 1, 1],
    [0, 0, 0, 0, 0],
    [2, 2, 2, 2, 2],
    [0, 1, 2, 1, 0],
    [2, 1, 0, 1, 2],
  ];
  // grid[row][col]. Возвращает { m, wins:[{line, sym, count, m, cells}] } — m на 1 E ставки.
  function evalBonusGrid(grid, V) {
    const wins = [];
    let m = 0;
    BONUS_LINES.forEach((L, li) => {
      const seq = L.map((row, col) => grid[row][col]);
      let base = seq.find((x) => x !== WILD);
      if (base === undefined) base = WILD;
      let count = 0;
      for (const x of seq) {
        if (x === base || (x === WILD && base !== SCATTER)) count++;
        else break;
      }
      if (count >= 3) {
        const lm = V.bonusPays[base][count - 3];
        if (lm > 0) {
          m += lm;
          wins.push({ line: li, sym: base, count, m: lm, cells: L.slice(0, count).map((row, col) => [row, col]) });
        }
      }
    });
    return { m, wins };
  }
  function spinBonusGrid(V, rnd = U.rand) {
    const g = [];
    for (let r = 0; r < 3; r++) {
      const row = [];
      for (let c = 0; c < 5; c++) row.push(U.weighted(V.bonusWeights, rnd));
      g.push(row);
    }
    return g;
  }

  const megaMult = (streak) => Math.min(5, 1 + 0.25 * streak);

  EC.rules = EC.rules || {};
  EC.rules.slots = { WILD, SCATTER, spinWindow, evalLine, evaluate, BONUS_LINES, evalBonusGrid, spinBonusGrid, megaMult };
})(globalThis.EC = globalThis.EC || {});
