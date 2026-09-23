const test = require('node:test');
const assert = require('node:assert/strict');
const EC = require('./load');

test('store: старый сейв (массивы по индексам) мигрирует поверх DEF()', () => {
  const s = EC.store.fromRaw({
    balance: 5000, name: 'Егор', ach: [true, false, false, true],
    shopOwned: [false, true, false, false, false], shopEquipped: [false, true, false, false, false],
    skills: { slotBonus: 2 }, vip: true, quests: [{ t: 'dice', n: 'x', need: 5, r: 150 }],
  });
  assert.equal(s.balance, 5000);
  assert.equal(s.ach.first_win, true);
  assert.equal(s.ach.high_roller, true);
  assert.equal(s.ach.nerd, false);
  assert.equal(s.shopOwned.clover, true);
  assert.equal(s.skills.slotBonus, 2);
  assert.equal(s.skills.studyBoost, 0); // новое поле появилось само
  assert.equal(s.vip, 1);
  assert.deepEqual(s.quests, []);
  assert.equal(s.clickPower, 1);
  assert.equal(s.tutorialShown, false);
});

test('store: мусорные типы не ломают состояние', () => {
  const s = EC.store.fromRaw({ balance: 'abc', level: -5, skills: 'x', turbo: 3, avatar: 99 });
  assert.equal(s.balance, 100);
  assert.equal(s.level, 1);
  assert.equal(typeof s.skills, 'object');
  assert.equal(s.turbo, 1);
  assert.equal(s.avatar, 0);
});

test('settle: ставка списана до, выплата после; ивент множит только прибыль', () => {
  const s = freshState();
  s.balance = 1000;
  s.weekEvent = { weekId: EC.util.weekKey(), n: 'Тест', m: 1.2, d: '' };
  s.ach.first_win = true; // чтобы награда за достижение не мешала считать баланс
  const r = EC.econ.beginRound('roulette', 100);
  assert.equal(s.balance, 900);
  const res = r.end(200);
  assert.equal(res.net, 120); // прибыль 100 × 1.2
  assert.equal(s.balance, 1120);
  // Пуш остаётся пушем
  const r2 = EC.econ.beginRound('dice', 100);
  const res2 = r2.end(100);
  assert.equal(res2.net, 0);
  assert.equal(s.balance, 1120);
  assert.equal(s.games, 2);
  assert.equal(s.gamesBy.roulette, 1);
  assert.equal(s.pendingRound, null);
});

test('settle: ва-банк, достижения и VIP', () => {
  const s = freshState();
  s.balance = 1000;
  s.weekEvent = { weekId: EC.util.weekKey(), n: 'Тест', m: 1, d: '' };
  const r = EC.econ.beginRound('crash', 1000);
  assert.equal(r.allIn, true);
  r.end(3000);
  assert.equal(s.ach.all_in, true);
  assert.equal(s.ach.first_win, true);
  assert.equal(s.ach.big_win, true);
  assert.equal(s.vip, 1);
  assert.equal(EC.econ.minBet(), 100);
});

test('незавершённый раунд возвращает ставку после перезагрузки', () => {
  const s = freshState();
  s.balance = 500;
  EC.econ.beginRound('blackjack', 200);
  const raw = JSON.parse(localStorage.getItem(EC.config.STORAGE_KEY));
  EC.store.state = EC.store.fromRaw(raw);
  assert.equal(EC.store.state.balance, 300);
  EC.econ.recoverRound();
  assert.equal(EC.store.state.balance, 500);
  EC.econ.busy = false;
});

test('квесты: одинаковые у всех в один день', () => {
  const a = freshState();
  EC.econ.refreshQuests();
  const q1 = a.quests.slice();
  freshState();
  EC.econ.refreshQuests();
  assert.deepEqual(EC.store.state.quests, q1);
  assert.equal(q1.length, 3);
});

test('xp: уровень каждые 100 опыта, очко навыка и деньги', () => {
  const s = freshState();
  const b = s.balance;
  EC.econ.addXp(250);
  assert.equal(s.level, 3);
  assert.equal(s.skillPoints, 2);
  assert.equal(s.balance, b + 50 * 2 + 50 * 3);
});
