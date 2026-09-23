const test = require('node:test');
const assert = require('node:assert/strict');
const EC = require('./load');
const L = EC.earn;

test('earn: клик пишет в общий баланс', () => {
  const s = freshState();
  const b = s.balance;
  L.click(() => 0.99); // без крита
  assert.equal(s.balance, b + 1);
  assert.equal(s.earnTotal, 1);
  assert.equal(s.clicks, 1);
  L.click(() => 0); // крит
  assert.equal(s.balance, b + 1 + EC.config.EARN.crit.mult);
});

test('earn: цены растут экспоненциально, покупка меняет силу клика и доход', () => {
  const s = freshState();
  const notes = L.upgrade('notes');
  const G = EC.config.EARN.growth;
  assert.equal(L.cost(notes, 0), notes.base);
  assert.equal(L.cost(notes, 1), Math.ceil(notes.base * G));
  s.balance = 5000;
  assert.ok(L.buy('notes', 3));
  assert.equal(s.clickPower, 4);
  assert.ok(L.buy('coffee', 2));
  assert.equal(s.eps, 2 * L.upgrade('coffee').eps);
  assert.equal(L.buy('dean', 1), false); // не хватает
  assert.equal(L.maxAffordable(notes, 0, L.cost(notes, 0) + L.cost(notes, 1)), 2);
});

test('earn: пассивный доход — онлайн полный, оффлайн вполсилы и с капом 8 ч', () => {
  const s = freshState();
  s.clickerLvl.coffee = 10 / L.upgrade('coffee').eps;
  L.recompute(s); // 10 E/с
  const t0 = 1_000_000_000_000;
  s.lastTick = t0;
  s.balance = 0;
  let r = L.accrue(t0 + 1000, true);
  assert.equal(r.gain, 10);
  // Сутки закрытой вкладки → максимум 8 часов по 50%
  r = L.accrue(t0 + 1000 + 24 * 3600 * 1000, false);
  assert.equal(r.gain, 10 * 0.5 * 8 * 3600);
  assert.equal(r.offlineSec, 8 * 3600);
  // Часы ушли назад — ничего не начисляем
  r = L.accrue(t0, true);
  assert.equal(r.gain, 0);
});

test('earn: дробный доход не теряется', () => {
  const s = freshState();
  s.clickerLvl.coffee = 1;
  L.recompute(s);
  assert.equal(s.eps, 0.5);
  s.lastTick = 1000;
  s.balance = 0;
  L.accrue(2000, true);
  L.accrue(3000, true);
  assert.equal(s.balance, 1);
});
