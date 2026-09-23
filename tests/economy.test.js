const test = require('node:test');
const assert = require('node:assert/strict');
const EC = require('./load');
const C = EC.config;

// Игрок с открытым казино на нужном уровне.
function casinoState(level = 1) {
  const s = freshState();
  s.progress.casinoUnlocked = true;
  s.progress.mode = 'casino';
  s.level = level;
  s.xp = C.xpForLevel(level);
  s.weekEvent = { weekId: EC.util.weekKey(), n: 'Тест', m: 1.2, d: '' };
  return s;
}

test('store: сейв самой старой версии (массивы, 7 предметов магазина) — ветеран, казино открыто', () => {
  const s = EC.store.fromRaw({
    balance: 5000, name: 'Егор', games: 150, level: 4, xp: 340, skillPoints: 1,
    ach: [true, false, false, true],
    shopOwned: [false, false, true, false, false, false, false], shopEquipped: [false, false, true, false, false, false, false],
    skills: { slotBonus: 2 }, vip: true, quests: [{ t: 'dice', n: 'x', need: 5, r: 150 }], title: 'gambler',
  });
  assert.equal(s.balance, 5000);
  assert.equal(s.ach.first_win, true);
  assert.equal(s.ach.high_roller, true);
  assert.equal(s.ach.pass, false);
  assert.equal(s.shopOwned.clover, true); // индекс 2 в 7-элементном = клевер
  assert.equal(s.skills.slotBonus, 2);
  assert.equal(s.skills.studyBoost, 0);
  assert.equal(s.vip, 1);
  assert.deepEqual(s.quests, []);
  assert.equal(s.progress.casinoUnlocked, true);
  assert.equal(s.progress.tutorialStep, 4);
  assert.equal(s.progress.mode, 'casino');
  assert.equal(s.titleManual, true);
  // Уровень по новой кривой не ниже прежнего, за разницу — очки навыков
  assert.equal(s.level, C.levelForXp(340));
  assert.equal(s.skillPoints, 1 + (C.levelForXp(340) - 4));
  assert.equal(s.version, 2);
  assert.equal(s.mode, undefined);
});

test('store: новичок прошлой версии (0 игр, 100 E) начинает с учёбы', () => {
  const s = EC.store.fromRaw({ balance: 100, name: 'Аня', games: 0 });
  assert.equal(s.progress.casinoUnlocked, false);
  assert.equal(s.progress.mode, 'study');
  assert.equal(s.name, 'Аня');
});

test('store: апгрейды прошлой версии кликера переезжают на новые id', () => {
  const s = EC.store.fromRaw({ games: 5, clickerLvl: { notes: 4, calc: 2, asu: 1, roommate: 3, diploma: 9 }, clickPower: 99, eps: 5 });
  assert.equal(s.clickerLvl.konspekt, 4);
  assert.equal(s.clickerLvl.calc, 2);
  assert.equal(s.clickerLvl.metodichka, 1);
  assert.equal(s.clickerLvl.sosed, 3);
  assert.equal(s.clickPower, undefined);
});

test('store: мусорные типы не ломают состояние', () => {
  const s = EC.store.fromRaw({ balance: 'abc', level: -5, skills: 'x', turbo: 3, avatar: 99, progress: { tutorialStep: 99, mode: 'casino' } });
  assert.equal(s.balance, 0);
  assert.equal(s.level, 1);
  assert.equal(typeof s.skills, 'object');
  assert.equal(s.turbo, 1);
  assert.equal(s.avatar, 0);
  assert.equal(s.progress.tutorialStep, 4);
  assert.equal(s.progress.mode, 'study'); // казино не открыто — режим учёбы
});

test('кривая XP: пороги из роадмапа', () => {
  assert.equal(C.xpForLevel(2), 30);
  assert.equal(C.xpForLevel(7), 500);
  assert.equal(C.xpForLevel(20), 4400);
  assert.equal(C.levelForXp(29), 1);
  assert.equal(C.levelForXp(30), 2);
  assert.equal(C.levelForXp(4400), 20);
  const E = EC.econ;
  assert.equal(E.xpForRound(5, false), 1);
  assert.equal(E.xpForRound(50, false), 2);
  assert.equal(E.xpForRound(5000, false), 4);
  assert.equal(E.xpForRound(50, true), 4);
});

test('столы и системы открываются уровнем', () => {
  const E = EC.econ;
  const s = freshState();
  assert.equal(E.gameOpen('slots'), false); // казино закрыто
  s.progress.casinoUnlocked = true;
  assert.equal(E.gameOpen('slots'), true);
  assert.equal(E.gameOpen('dice'), true);
  assert.equal(E.gameOpen('roulette'), false);
  assert.equal(E.variantOpen('book'), false);
  assert.equal(E.isOpen('quests'), false);
  s.level = 7;
  assert.equal(E.gameOpen('crash'), true);
  assert.equal(E.gameOpen('baccarat'), false);
  assert.equal(E.isOpen('shop'), true);
  assert.equal(E.isOpen('event'), false);
  s.level = 20;
  assert.equal(E.gameOpen('poker'), true);
  assert.equal(E.variantOpen('mega'), true);
  assert.equal(E.isOpen('vip'), false);
  s.totalWon = 1000;
  assert.equal(E.isOpen('vip'), true);
  assert.deepEqual(E.unlocksAt(7).map((u) => u.id), ['crash']);
});

test('settle: ставка списана до, выплата после; ивент множит только прибыль и только с 8-го уровня', () => {
  const s = casinoState(8);
  s.balance = 1000;
  s.ach.first_win = true;
  const r = EC.econ.beginRound('roulette', 100);
  assert.equal(s.balance, 900);
  const res = r.end(200);
  assert.equal(res.net, 120); // прибыль 100 × 1.2
  // Пуш остаётся пушем
  const r2 = EC.econ.beginRound('dice', 100);
  assert.equal(r2.end(100).net, 0);
  assert.equal(s.gamesBy.roulette, 1);
  assert.equal(s.pendingRound, null);
  // До 8-го уровня ивент не действует
  const s2 = casinoState(3);
  s2.balance = 1000;
  s2.ach.first_win = true;
  assert.equal(EC.econ.beginRound('dice', 100).end(200).net, 100);
});

test('settle: ва-банк, достижения, VIP, опыт по ставке', () => {
  const s = casinoState(1);
  s.balance = 1000;
  const r = EC.econ.beginRound('crash', 1000);
  assert.equal(r.allIn, true);
  r.end(3000);
  assert.equal(s.ach.all_in, true);
  assert.equal(s.ach.first_win, true);
  assert.equal(s.ach.big_win, true);
  assert.equal(s.vip, 1);
  assert.equal(EC.econ.minBet(), 100);
  assert.equal(Math.round(s.xp), EC.econ.xpForRound(1000, true)); // 8 XP
});

test('бесплатный спин: ставка 0, опыт как за номинал, без ва-банка', () => {
  const s = casinoState(1);
  s.balance = 0;
  s.ach.first_win = true; // награда за достижение не мешает считать
  const r = EC.econ.beginRound('slots', 0);
  assert.equal(r.allIn, false);
  const res = r.end(50, { nominal: 10 });
  assert.equal(res.kind, 'win');
  assert.equal(s.balance, 50);
  assert.equal(Math.round(s.xp), EC.econ.xpForRound(10, true));
  assert.equal(s.ach.all_in, false);
});

test('незавершённый раунд возвращает ставку после перезагрузки', () => {
  const s = casinoState(1);
  s.balance = 500;
  EC.econ.beginRound('dice', 200);
  const raw = JSON.parse(localStorage.getItem(C.STORAGE_KEY));
  EC.store.state = EC.store.fromRaw(raw);
  assert.equal(EC.store.state.balance, 300);
  EC.econ.recoverRound();
  assert.equal(EC.store.state.balance, 500);
  EC.econ.busy = false;
});

test('квесты: одинаковые у всех в один день и тикают только после открытия', () => {
  const a = freshState();
  EC.econ.refreshQuests();
  const q1 = a.quests.slice();
  freshState();
  EC.econ.refreshQuests();
  assert.deepEqual(EC.store.state.quests, q1);
  assert.equal(q1.length, 3);
  const s = freshState();
  EC.econ.refreshQuests();
  EC.econ.tickQuest(s.quests.map((id) => C.QUESTS.find((q) => q.id === id).t)[0], 999);
  assert.deepEqual(s.questsProgress, {}); // уровень 1 — квесты закрыты
});

test('уровни: очко навыка и 50 × уровень E за каждый', () => {
  const s = casinoState(1);
  s.xp = 0;
  const b = s.balance;
  EC.econ.addXp(80); // → уровень 3
  assert.equal(s.level, 3);
  assert.equal(s.skillPoints, 2);
  assert.equal(s.balance, b + 50 * 2 + 50 * 3);
});
