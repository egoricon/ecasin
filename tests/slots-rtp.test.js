const test = require('node:test');
const assert = require('node:assert/strict');
const EC = require('./load');
const S = EC.rules.slots;

const C = (n, k) => { let r = 1; for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1); return r; };

// Точный RTP линии и скаттеров + бонус методом Монте-Карло.
function rtp(V, sims = 60000) {
  const T = V.w.reduce((a, b) => a + b, 0), p = V.w.map((x) => x / T);
  let line = 0;
  for (let a = 0; a < 8; a++) for (let b = 0; b < 8; b++) for (let c = 0; c < 8; c++) {
    const e = S.evalLine([a, b, c], V);
    if (e) line += p[a] * p[b] * p[c] * e.m;
  }
  let sc = 0;
  for (let k = 0; k <= 9; k++) sc += C(9, k) * p[7] ** k * (1 - p[7]) ** (9 - k) * (V.sc[Math.min(k, V.sc.length - 1)] || 0);
  const pBonus = (1 - (1 - p[6]) ** 3) ** 3;
  let tot = 0;
  for (let i = 0; i < sims; i++) tot += S.evalBonusGrid(S.spinBonusGrid(V), V).m;
  return { total: line + sc + pBonus * V.bonusSpins * (tot / sims), pBonus };
}

test('slots: RTP каждого стола в разумных пределах (90–99%)', () => {
  for (const [id, V] of Object.entries(EC.config.SLOTS)) {
    const r = rtp(V);
    assert.ok(r.total > 0.9 && r.total < 0.99, `${id}: RTP ${r.total.toFixed(3)}`);
    assert.ok(r.pBonus > 1 / 800 && r.pBonus < 1 / 100, `${id}: бонус раз в ${(1 / r.pBonus).toFixed(0)}`);
  }
});

test('slots: линия — wild заменяет всё, кроме SCATTER', () => {
  const V = EC.config.SLOTS.classic;
  assert.equal(S.evalLine([5, 6, 5], V).m, V.p3[5]);
  assert.equal(S.evalLine([6, 6, 6], V).sym, 6);
  assert.equal(S.evalLine([7, 6, 7], V), null);
  assert.equal(S.evalLine([3, 3, 1], V).m, V.p2[3]);
  assert.equal(S.evalLine([1, 3, 3], V), null); // только слева направо
});

test('slots: бонус — ЕГОРИК на каждом барабане', () => {
  const V = EC.config.SLOTS.classic;
  const w = [[0, 6, 1], [6, 2, 3], [4, 4, 6]];
  assert.equal(S.evaluate(w, V).bonus, true);
  const w2 = [[0, 6, 1], [1, 2, 3], [4, 4, 6]];
  assert.equal(S.evaluate(w2, V).bonus, false);
});
