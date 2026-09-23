const test = require('node:test');
const assert = require('node:assert/strict');
const EC = require('./load');
const L = EC.earn, C = EC.config;

test('учёба: клик пишет в общий баланс, сила клика считается из уровней', () => {
  const s = freshState();
  assert.equal(s.balance, 0); // старт с нуля
  L.click();
  assert.equal(s.balance, 1);
  assert.equal(s.earnTotal, 1);
  assert.equal(s.clicks, 1);
  s.clickerLvl.konspekt = 3;
  s.clickerLvl.calc = 1;
  assert.equal(L.getClickPower(), 1 + 3 * 1 + 1 * 2);
  assert.equal(s.clickPower, undefined); // производные значения не хранятся
});

test('учёба: цены floor(base · growth^ур.), свой рост у каждой ветки', () => {
  const k = L.upgrade('konspekt'), c = L.upgrade('coffee');
  assert.equal(L.cost(k, 0), 15);
  assert.equal(L.cost(k, 1), Math.floor(15 * 1.3));
  assert.equal(L.cost(c, 2), Math.floor(40 * 1.15 * 1.15));
  assert.equal(L.maxAffordable(k, 0, 15 + 19), 2);
});

test('учёба: апгрейд появляется, когда наботано 50% его базы', () => {
  const s = freshState();
  const k = L.upgrade('konspekt');
  assert.equal(L.visible(k), false);
  s.earnTotal = 7;
  assert.equal(L.visible(k), false);
  s.earnTotal = 8;
  assert.equal(L.visible(k), true);
  assert.equal(L.nextHidden('study').id, 'calc');
  s.balance = 100;
  s.earnTotal = 0;
  assert.equal(L.buy('konspekt'), false); // скрытый купить нельзя
});

test('учёба: покупка списывает деньги и открывает достижения веток', () => {
  const s = freshState();
  s.earnTotal = 1000;
  s.balance = 1000;
  assert.ok(L.buy('konspekt', 3));
  assert.equal(s.clickerLvl.konspekt, 3);
  assert.equal(s.balance, 1000 - (15 + 19 + 25));
  assert.ok(L.buy('coffee', 2));
  assert.equal(L.getEps(), 0.8);
  assert.equal(s.ach.first_study, true);
  assert.equal(s.ach.first_life, true);
  assert.equal(L.buy('dekanat', 1), false);
});

test('учёба: оффлайн — 50% и не больше 8 часов, часы назад ничего не дают', () => {
  const s = freshState();
  s.clickerLvl.coffee = 25; // 10 E/с
  const t0 = 1_000_000_000_000;
  s.lastTick = t0;
  let r = L.accrue(t0 + 1000, true);
  assert.equal(r.gain, 10);
  r = L.accrue(t0 + 1000 + 24 * 3600 * 1000, false);
  assert.equal(r.gain, 10 * 0.5 * 8 * 3600);
  assert.equal(r.offlineSec, 8 * 3600);
  r = L.accrue(t0, true);
  assert.equal(r.gain, 0);
});

test('учёба: дробный доход не теряется', () => {
  const s = freshState();
  s.clickerLvl.coffee = 1; // 0.4 E/с
  s.lastTick = 1000;
  L.accrue(2000, true);
  L.accrue(3000, true);
  assert.equal(s.balance, 0);
  L.accrue(4000, true);
  assert.equal(s.balance, 1);
});

test('учебные достижения не дают денег (иначе ломается темп старта)', () => {
  const s = freshState();
  L.click();
  assert.equal(s.ach.first_click, true);
  assert.equal(s.balance, 1);
});

test('дверь в подвал: пропуск после 40 000 наботанного, стоит 10 000', () => {
  const s = freshState();
  const E = EC.econ;
  s.earnTotal = 39999;
  s.balance = 50000;
  assert.equal(E.canBuyPass(), false);
  s.earnTotal = C.EARN.door.rumors;
  assert.equal(E.canBuyPass(), true);
  assert.ok(E.buyPass());
  assert.equal(s.balance, 40000);
  assert.equal(s.progress.casinoUnlocked, true);
  assert.equal(s.progress.freeSpinsLeft, 3);
  assert.equal(s.ach.pass, true);
  assert.equal(E.buyPass(), false); // второй раз нельзя
});

test('баланс-симуляция укладывается в цели роадмапа', () => {
  const sim = require('../tools/balance-sim.js');
  const res = sim.check();
  for (const [who, r] of Object.entries(res)) {
    for (const [k, ok] of Object.entries(r.ok)) assert.ok(ok, `${who}.${k} = ${sim.fmt(r.ev[k])}`);
  }
});
