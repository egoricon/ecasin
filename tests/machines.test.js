const test = require('node:test');
const assert = require('node:assert/strict');
const EC = require('./load');
const U = EC.util, C = EC.config, K = EC.machines;
const M = C.MACHINES;

// Сценарий генератора: отдаёт заранее заданные числа и падает, если логика попросила лишнее.
const seq = (...xs) => { let i = 0; return () => { assert.ok(i < xs.length, 'лишний вызов генератора'); return xs[i++]; }; };
const sumGrid = (g) => g.reduce((t, col) => t + col.reduce((a, b) => a + b, 0), 0);

/* ---------- Книга Знаний ---------- */

test('Книга: раскрытый символ платит по всем 10 линиям', () => {
  const B = M.knowledge, L = K.logic.knowledge, owl = 7;
  // Каждый барабан — свой простой символ, линий нет. Сова на барабанах 1, 2 и 3 в разных рядах.
  const grid = [0, 1, 2, 3, 4].map((c) => [c, c, c]);
  grid[0][1] = owl; grid[1][0] = owl; grid[2][2] = owl;
  const s = L.evalSpin(B, grid, owl);
  assert.equal(s.expand.count, 3);
  assert.deepEqual(s.expand.reels, [0, 1, 2]);
  // Раскрываем барабаны и считаем обычные линии: выигрывают все 10, каждая по 3 совы.
  const open = grid.map((col, c) => (s.expand.reels.includes(c) ? [owl, owl, owl] : col));
  const wins = K.evalLines(open, L.LINES, B.pays, B.wild).filter((w) => w.sym === owl);
  assert.equal(wins.length, 10);
  wins.forEach((w) => assert.equal(w.count, 3));
  assert.equal(+K.sum(wins).toFixed(9), s.expand.m);
  assert.equal(s.expand.m, B.pays[owl][1]); // 3 совы × ставка на линию × 10 линий
  assert.equal(s.expand.perLine * 10, s.expand.m);
});

test('Книга: раскрытие работает и на барабанах не подряд, в основной игре его нет', () => {
  const B = M.knowledge, L = K.logic.knowledge, owl = 7;
  const grid = [0, 1, 2, 3, 4].map((c) => [c, c, c]);
  grid[0][1] = owl; grid[2][0] = owl; grid[4][2] = owl;
  const s = L.evalSpin(B, grid, owl);
  assert.equal(s.lines.length, 0); // на обычных линиях совы не стоят подряд
  assert.deepEqual(s.expand.reels, [0, 2, 4]);
  assert.equal(s.m, B.pays[owl][1]);
  assert.equal(L.evalSpin(B, grid, null).expand, null);
  // Одной совы мало: выплата сов начинается с 2 барабанов
  const one = [0, 1, 2, 3, 4].map((c) => [c, c, c]);
  one[3][1] = owl;
  assert.equal(L.evalSpin(B, one, owl).expand, null);
});

test('Книга: 3+ книги дают 10 фриспинов с особым символом, итог = основа + фриспины', () => {
  const B = M.knowledge, L = K.logic.knowledge, rnd = U.seeded('book');
  let seen = 0;
  for (let i = 0; i < 20000 && seen < 20; i++) {
    const o = L.play(B, rnd);
    assert.equal(!!o.bonus, o.base.scatters >= 3);
    if (!o.bonus) { assert.equal(o.m, o.base.m); continue; }
    seen++;
    assert.ok(o.bonus.spins.length >= B.freeSpins && o.bonus.spins.length <= B.maxFreeSpins);
    assert.ok(o.bonus.special >= 0 && o.bonus.special < B.wild);
    const fs = o.bonus.spins.reduce((t, s) => t + s.m, 0);
    assert.ok(Math.abs(o.m - (o.base.m + fs)) < 1e-9);
  }
  assert.ok(seen >= 20);
});

/* ---------- Кибер-Кластеры ---------- */

test('Кластеры: кластер от 8 соединённых, по диагонали не считается', () => {
  const Q = M.clusters, L = K.logic.clusters;
  // Шахматка из 1 и 2 — кластеров нет; затем 8 нулей змейкой.
  const grid = Array.from({ length: 6 }, (_, c) => Array.from({ length: 5 }, (_, r) => 1 + ((c + r) % 2)));
  assert.equal(L.findClusters(Q, grid).length, 0);
  [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2], [2, 3], [2, 4], [3, 4]].forEach(([c, r]) => { grid[c][r] = 0; });
  const cl = L.findClusters(Q, grid);
  assert.equal(cl.length, 1);
  assert.equal(cl[0].size, 8);
  assert.equal(cl[0].m, Q.pays[0][0]);
  grid[3][4] = 1; grid[4][3] = 0; // 8-й только по диагонали — кластера нет
  assert.equal(L.findClusters(Q, grid).length, 0);
});

test('Кластеры: каскад продолжается, пока на поле есть кластеры', () => {
  const Q = M.clusters, L = K.logic.clusters, rnd = U.seeded('cascade');
  let longest = 0;
  for (let i = 0; i < 5000; i++) {
    const o = L.play(Q, rnd);
    for (const s of [o.base].concat(o.bonus ? o.bonus.spins : [])) {
      s.steps.forEach((st, k) => {
        assert.ok(L.findClusters(Q, st.grid).length > 0); // каждый шаг — это взрыв кластеров
        assert.deepEqual(st.clusters, L.findClusters(Q, st.grid));
        if (k + 1 < s.steps.length) assert.deepEqual(s.steps[k + 1].grid, st.next); // следующий шаг — с досыпанной сетки
      });
      assert.equal(L.findClusters(Q, s.final).length, 0); // остановились, только когда кластеров не осталось
      assert.ok(Math.abs(s.win - s.steps.reduce((t, st) => t + st.win, 0)) < 1e-9);
      longest = Math.max(longest, s.steps.length);
    }
  }
  assert.ok(longest >= 3, 'в выборке есть каскады из 3+ шагов');
});

test('Кластеры: множители только во фриспинах, складываются и умножают выигрыш серии', () => {
  const Q = M.clusters, L = K.logic.clusters, rnd = U.seeded('mults');
  let multiplied = 0;
  for (let i = 0; i < 20000; i++) {
    const o = L.play(Q, rnd);
    // Основная игра: никаких множителей
    assert.equal(o.base.mult, null);
    assert.equal(o.base.multiplier, 1);
    assert.equal(o.base.startMults.length, 0);
    o.base.steps.forEach((st) => assert.equal(st.newMults.length, 0));
    assert.equal(o.base.m, o.base.win + o.base.scatterM);
    if (!o.bonus) continue;
    for (const s of o.bonus.spins) {
      const total = sumGrid(s.mult);
      s.mult.flat().forEach((v) => assert.ok(v === 0 || Q.multValues.includes(v)));
      assert.equal(s.multiplier, s.win > 0 && total > 0 ? total : 1);
      assert.ok(Math.abs(s.m - (s.win * s.multiplier + s.scatterM)) < 1e-9);
      if (s.multiplier > 1) multiplied++;
    }
  }
  assert.ok(multiplied > 0, 'множители во фриспинах срабатывали');
});

/* ---------- Рыбалка на Свислочи ---------- */

test('Рыбалка: Hold & Spin запускается ровно от 6 рыб', () => {
  const F = M.fishing, L = K.logic.fishing, rnd = U.seeded('hold');
  let holds = 0;
  for (let i = 0; i < 20000; i++) {
    const o = L.play(F, rnd);
    assert.equal(!!o.hold, o.base.fishCount >= 6);
    if (o.hold) holds++;
  }
  assert.ok(holds > 50);
});

test('Рыбалка: новая рыба сбрасывает респины на 3, итог — сумма номиналов', () => {
  const F = M.fishing, L = K.logic.fishing;
  const vals = [[1, 0, 0], [2, 0, 0], [0, 5, 0], [0, 0, 3], [10, 0, 0.5]]; // 6 рыб, сумма 21,5
  // Ни одной новой рыбы: 3 → 2 → 1 → 0
  let h = L.holdAndSpin(F, vals, () => 0.99);
  assert.deepEqual(h.rounds.map((x) => x.respins), [2, 1, 0]);
  assert.equal(h.m, 21.5);
  assert.equal(h.full, false);
  // Второй респин: рыба на первой пустой клетке [0][1] (номинал ×1), потом снова 3 пустых
  const empty = 15 - 6;
  const r = [];
  for (let i = 0; i < empty; i++) r.push(0.99);           // респин 1: пусто
  r.push(0, 0.5);                                         // респин 2: клетка [0][1] — рыба (шанс, номинал)
  for (let i = 1; i < empty; i++) r.push(0.99);
  for (let k = 0; k < 3; k++) for (let i = 0; i < empty - 1; i++) r.push(0.99); // ещё 3 пустых
  h = L.holdAndSpin(F, vals, seq(...r));
  assert.deepEqual(h.rounds.map((x) => x.respins), [2, 3, 2, 1, 0]);
  const v = F.fishValues[U.weighted(F.holdWeights, () => 0.5)];
  assert.deepEqual(h.rounds[1].landed, [[0, 1, v]]);
  assert.equal(h.m, 21.5 + v);
  assert.equal(h.held[0][1], v);
  // Полный садок: +бонус
  h = L.holdAndSpin(F, vals, () => 0);
  assert.equal(h.full, true);
  assert.equal(h.rounds.length, 1);
  assert.equal(h.m, sumGrid(h.held) + F.fullBonus);
});

test('Рыбалка: выигрыш Hold & Spin и фриспинов зачисляется в итог спина', () => {
  const F = M.fishing, L = K.logic.fishing, rnd = U.seeded('fish-total');
  for (let i = 0; i < 20000; i++) {
    const o = L.play(F, rnd);
    const want = o.base.m + (o.hold ? o.hold.m : 0) + (o.bonus ? o.bonus.m : 0);
    assert.ok(Math.abs(o.m - want) < 1e-9);
    if (o.hold) o.hold.rounds.reduce((prev, x) => {
      assert.equal(x.respins, x.landed.length ? F.respins : prev - 1);
      return x.respins;
    }, F.respins);
    if (o.bonus) o.bonus.spins.forEach((s) => { if (s.collect) assert.equal(s.collect.m, s.collect.deds * sumGrid(s.vals)); });
  }
});

/* ---------- Мини-777 ---------- */

// Все позиции лент, удовлетворяющие условию (перебор 24³).
function findPos(Mi, L, ok) {
  const [a, b, c] = Mi.strips.map((s) => s.length);
  for (let i = 0; i < a; i++) for (let j = 0; j < b; j++) for (let k = 0; k < c; k++) {
    const pos = [i, j, k];
    if (ok(pos, L.evalGrid(Mi, L.windowOf(Mi, pos)))) return pos;
  }
  return null;
}
const at = (Mi, c, p) => (p + 0.5) / Mi.strips[c].length; // число генератора, которое даёт позицию p

test('Мини-777: нюдж — сдвиг одного барабана на 1 позицию собирает линию', () => {
  const Mi = M.mini777, L = K.logic.mini777;
  const pos = findPos(Mi, L, (p, e) => e.m === 0 && L.bestNudge(Mi, p));
  assert.ok(pos);
  // позиции, «нюдж случился», множитель ×1
  const o = L.play(Mi, seq(at(Mi, 0, pos[0]), at(Mi, 1, pos[1]), at(Mi, 2, pos[2]), 0, 0));
  assert.equal(o.base.m, 0);
  assert.ok(o.nudge);
  assert.equal(o.respin, null);
  const moved = o.nudge.pos.map((p, c) => p !== pos[c]);
  assert.equal(moved.filter(Boolean).length, 1); // сдвинулся ровно один барабан
  const c = moved.indexOf(true), len = Mi.strips[c].length;
  assert.ok([1, len - 1].includes((o.nudge.pos[c] - pos[c] + len) % len)); // ровно на 1 позицию
  assert.ok(o.win > 0);
  assert.equal(o.mult, 1);
  assert.equal(o.m, o.win);
  // Нюдж не выпал по шансу — выигрыша нет, респина по шансу тоже нет
  const miss = L.play(Mi, seq(at(Mi, 0, pos[0]), at(Mi, 1, pos[1]), at(Mi, 2, pos[2]), 0.999, 0.999));
  assert.equal(miss.nudge, null);
  assert.equal(miss.m, 0);
});

test('Мини-777: респин при почти-выигрыше перекручивает только третий барабан', () => {
  const Mi = M.mini777, L = K.logic.mini777;
  const pos = findPos(Mi, L, (p, e) => e.m === 0 && !L.bestNudge(Mi, p) && L.nearMiss(Mi, e.grid));
  assert.ok(pos);
  const nm = L.nearMiss(Mi, L.windowOf(Mi, pos));
  // Найти остановку свободного барабана, которая собирает линию
  let stop = -1;
  for (let p = 0; p < Mi.strips[nm.reel].length && stop < 0; p++) {
    const q = pos.slice(); q[nm.reel] = p;
    if (L.evalGrid(Mi, L.windowOf(Mi, q)).m > 0) stop = p;
  }
  assert.ok(stop >= 0);
  const o = L.play(Mi, seq(at(Mi, 0, pos[0]), at(Mi, 1, pos[1]), at(Mi, 2, pos[2]), 0, at(Mi, nm.reel, stop), 0.999));
  assert.ok(o.respin);
  assert.equal(o.respin.reel, nm.reel);
  nm.held.forEach((c) => assert.equal(o.respin.pos[c], pos[c])); // совпавшие барабаны стоят
  assert.ok(o.win > 0);
  assert.equal(o.mult, 10); // последнее число генератора → самый редкий множитель
  assert.equal(o.m, o.win * 10);
});

test('Мини-777: множитель только на выигрыше и не больше ×10', () => {
  const Mi = M.mini777, L = K.logic.mini777, rnd = U.seeded('mini');
  let nudges = 0, respins = 0, max = 0;
  for (let i = 0; i < 100000; i++) {
    const o = L.play(Mi, rnd);
    assert.ok(Mi.multValues.includes(o.mult));
    assert.ok(o.mult <= 10);
    if (o.win === 0) assert.equal(o.mult, 1);
    assert.equal(o.m, o.win * o.mult);
    if (o.nudge || o.respin) assert.equal(o.base.m, 0); // только при почти-выигрыше
    if (o.nudge) nudges++;
    if (o.respin) respins++;
    max = Math.max(max, o.mult);
  }
  assert.equal(max, 10);
  assert.ok(nudges > 1000 && respins > 1000);
});

/* ---------- Баланс: ставка списывается один раз, выигрыш зачисляется один раз ---------- */

test('автоматы: баланс −ставка и +выигрыш ровно один раз за спин', () => {
  for (const id of ['knowledge', 'clusters', 'fishing', 'mini777']) {
    const rnd = U.seeded('balance:' + id);
    let wins = 0;
    for (let i = 0; i < 300; i++) {
      // Свежий игрок 1-го уровня: ивент и квесты закрыты, достижения уже получены — побочных выплат нет.
      const s = freshState();
      s.progress.casinoUnlocked = true;
      s.progress.mode = 'casino';
      Object.keys(s.ach).forEach((k) => { s.ach[k] = true; });
      s.balance = 5000;
      const bet = 10 + (i % 7) * 15;
      const r = K.begin(id, bet, rnd);
      assert.equal(s.balance, 5000 - bet);                // ставка списана сразу
      assert.deepEqual(s.pendingRound && s.pendingRound.bet, bet);
      const pay = K.payOf(bet, r.out.m);
      assert.equal(pay, Math.round(bet * r.out.m));
      const res = K.finish(r);
      assert.equal(res.pay, pay);
      assert.equal(s.balance, 5000 - bet + pay);          // выигрыш зачислен один раз
      assert.equal(s.games, 1);
      assert.equal(s.gamesBy[id], 1);
      assert.equal(s.pendingRound, null);
      assert.equal(K.finish(r), null);                    // повторное закрытие ничего не платит
      assert.equal(s.balance, 5000 - bet + pay);
      assert.equal(s.games, 1);
      if (pay > bet) wins++;
    }
    assert.ok(wins > 0, id + ': были выигрыши');
  }
});

test('автоматы: в конфиге RTP 94–96%, минимальная ставка и открытие по уровню', () => {
  for (const id of ['knowledge', 'clusters', 'fishing', 'mini777']) {
    assert.ok(M[id].rtp >= 0.94 && M[id].rtp <= 0.96, id);
    assert.ok(M[id].minBet >= 1, id);
    const g = C.GAMES.find((x) => x.id === id);
    assert.equal(g.kind, 'machine');
    assert.ok(g.lvl >= 1);
    assert.equal(typeof K.logic[id].play, 'function');
  }
});

test('автоматы: RTP на 300 000 спинов (seed) — в пределах 90–100%', () => {
  const { simulate } = require('../tools/machines-sim.js');
  for (const id of ['knowledge', 'clusters', 'fishing', 'mini777']) {
    const r = simulate(id, 300000, U.seeded('test:' + id));
    assert.ok(r.rtp > 0.9 && r.rtp < 1.0, `${id}: RTP ${(r.rtp * 100).toFixed(2)}%`);
  }
});
