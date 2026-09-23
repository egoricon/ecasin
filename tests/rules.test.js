const test = require('node:test');
const assert = require('node:assert/strict');
const EC = require('./load');
const { baccarat: B, poker: P, blackjack: BJ, roulette: R, crash: CR } = EC.rules;

/* ---------- Баккара: таблица добора ---------- */
test('baccarat: натурал 8/9 — карты больше не берутся', () => {
  // P: 9+K = 9, B: 3+2 = 5 → никто не берёт
  const d = B.deal(drawFrom('9s 3h Kd 2c 5s 5h'));
  assert.equal(d.player.length, 2);
  assert.equal(d.banker.length, 2);
  assert.equal(d.natural, true);
  assert.equal(d.winner, 'player');
});

test('baccarat: игрок стоит на 6–7, банкир тогда берёт на 0–5', () => {
  // P: 4+3 = 7 стоит, B: 2+3 = 5 → берёт (игрок стоял)
  const d = B.deal(drawFrom('4s 2h 3d 3c 9s'));
  assert.equal(d.player.length, 2);
  assert.equal(d.banker.length, 3);
});

test('baccarat: банкир решает по третьей карте игрока', () => {
  // B=3: не берёт, если третья игрока = 8
  assert.equal(B.bankerDraws(3, 8), false);
  assert.equal(B.bankerDraws(3, 7), true);
  // B=4: берёт при 2..7
  assert.equal(B.bankerDraws(4, 1), false);
  assert.equal(B.bankerDraws(4, 2), true);
  assert.equal(B.bankerDraws(4, 8), false);
  // B=5: 4..7
  assert.equal(B.bankerDraws(5, 3), false);
  assert.equal(B.bankerDraws(5, 4), true);
  // B=6: только 6..7
  assert.equal(B.bankerDraws(6, 5), false);
  assert.equal(B.bankerDraws(6, 6), true);
  assert.equal(B.bankerDraws(6, 7), true);
  // B=7 стоит всегда, B=0..2 берёт всегда
  for (let p = 0; p <= 9; p++) {
    assert.equal(B.bankerDraws(7, p), false);
    assert.equal(B.bankerDraws(2, p), true);
  }
});

test('baccarat: полная раздача с третьей картой игрока', () => {
  // P: 2+3 = 5 → берёт 8 → 13 % 10 = 3. B: 4+K = 4, третья игрока 8 → банкир НЕ берёт.
  const d = B.deal(drawFrom('2s 4h 3d Kc 8s 9h'));
  assert.equal(d.player.length, 3);
  assert.equal(d.banker.length, 2);
  assert.equal(d.playerTotal, 3);
  assert.equal(d.bankerTotal, 4);
  assert.equal(d.winner, 'banker');
});

test('baccarat: выплаты', () => {
  assert.equal(B.payout('player', 100, 'player'), 200);
  assert.equal(B.payout('banker', 100, 'banker'), 195);
  assert.equal(B.payout('tie', 100, 'tie'), 900);
  assert.equal(B.payout('player', 100, 'tie'), 100); // пуш
  assert.equal(B.payout('tie', 100, 'player'), 0);
});

test('baccarat: преимущество казино близко к реальному (≈1.2% игрок, ≈1.06% банкир)', () => {
  const shoe = new EC.cards.Shoe(8);
  let p = 0, b = 0;
  const N = 200000;
  for (let i = 0; i < N; i++) {
    shoe.prepare();
    const d = B.deal(() => shoe.draw());
    p += B.payout('player', 100, d.winner);
    b += B.payout('banker', 100, d.winner);
  }
  const rp = p / (N * 100), rb = b / (N * 100);
  assert.ok(rp > 0.975 && rp < 0.998, 'player RTP ' + rp);
  assert.ok(rb > 0.978 && rb < 1.0, 'banker RTP ' + rb);
});

/* ---------- Покер ---------- */
test('poker: категории рук', () => {
  const cat = (s) => P.best(hand(s)).cat;
  assert.equal(cat('As Ks Qs Js Ts 2d 3c'), P.CAT.ROYAL);
  assert.equal(cat('9s 8s 7s 6s 5s Ad Ac'), P.CAT.STRAIGHT_FLUSH);
  assert.equal(cat('As 2s 3s 4s 5s Kd Qc'), P.CAT.STRAIGHT_FLUSH); // стальное колесо
  assert.equal(cat('7s 7d 7h 7c 2s 3d 4c'), P.CAT.QUADS);
  assert.equal(cat('7s 7d 7h 2c 2s 3d 4c'), P.CAT.FULL_HOUSE);
  assert.equal(cat('As 9s 7s 4s 2s Kd Qc'), P.CAT.FLUSH);
  assert.equal(cat('As 2d 3h 4c 5s Kd 9c'), P.CAT.STRAIGHT);
  assert.equal(cat('9s 9d 9h Kc 2s 3d 4c'), P.CAT.TRIPS);
  assert.equal(cat('9s 9d Kh Kc 2s 3d 5c'), P.CAT.TWO_PAIR);
  assert.equal(cat('9s 9d Kh Qc 2s 3d 5c'), P.CAT.PAIR);
  assert.equal(cat('As Jd 9h 7c 5s 3d 2h'), P.CAT.HIGH);
});

test('poker: кикеры считаются правильно (баг старой версии)', () => {
  // Каре пятёрок + пара королей + туз: кикер — туз, а не король
  const a = P.best(hand('5s 5d 5h 5c Kd Kh As'));
  const b = P.best(hand('5s 5d 5h 5c Kd Kh Qs'));
  assert.ok(P.cmp(a, b) > 0);
  // Три пары: кикер — старшая из оставшихся
  const c = P.best(hand('9s 9d 7h 7c 5s 5d 2c'));
  assert.deepEqual(c.tb, [9, 7, 5]);
});

test('UTH: блайнд — пуш до стрита, 1:1 стрит, 3:2 флеш … 500:1 роял', () => {
  const dealer = P.best(hand('2c 3d 8h 9s Jd 4c 6h')); // старшая карта — дилер не квалифицирован
  const run = (cards) => P.uthSettle({ ante: 10, blind: 10, play: 40, folded: false, player: P.best(hand(cards)), dealer });
  // Пара тузов: выигрыш, анте пуш (дилер не квалиф.), блайнд пуш, плей 1:1
  let r = run('As Ad 8h 9s Jd 4c 6h');
  assert.equal(r.parts.blind.r, 'push');
  assert.equal(r.parts.ante.r, 'push');
  assert.equal(r.pay, 10 + 10 + 80);
  // Стрит — блайнд 1:1
  r = run('7s 5c 8h 9s Jd 4c 6h');
  assert.equal(r.parts.blind.pay, 20);
  // Флеш 3:2
  r = run('Kh 2h 8h 9s Jd 4h 6h');
  assert.equal(r.parts.blind.pay, 25);
  // Роял 500:1
  const r2 = P.uthSettle({ ante: 10, blind: 10, play: 10, folded: false, player: P.best(hand('As Ks Qs Js Ts 2d 3c')), dealer: P.best(hand('2c 3d 8h 9s Jd 4c 6h')) });
  assert.equal(r2.parts.blind.pay, 10 + 5000);
});

test('UTH: квалификация дилера и проигрыш', () => {
  const player = P.best(hand('Kc Qd 2h 5s 9d 3c 7h'));
  const dealer = P.best(hand('Ac Ad 2h 5s 9d 3c 7h'));
  const r = P.uthSettle({ ante: 10, blind: 10, play: 30, folded: false, player, dealer });
  assert.equal(r.pay, 0);
  // Дилер не квалифицирован и выиграл по старшей карте: анте возвращается
  const d2 = P.best(hand('Ac Jd 2h 5s 9d 3c 7h'));
  const p2 = P.best(hand('Kc Qd 2h 5s 9d 3c 7h'));
  const r2 = P.uthSettle({ ante: 10, blind: 10, play: 10, folded: false, player: p2, dealer: d2 });
  assert.equal(r2.parts.ante.r, 'push');
  assert.equal(r2.pay, 10);
  // Фолд
  assert.equal(P.uthSettle({ ante: 10, blind: 10, play: 0, folded: true }).pay, 0);
});

test('video poker: Jacks or Better', () => {
  assert.equal(P.vpEval(hand('Js Jd 4h 7c 9s')).m, 1);
  assert.equal(P.vpEval(hand('Ts Td 4h 7c 9s')).m, 0);
  assert.equal(P.vpEval(hand('As Ks Qs Js Ts')).m, 250);
  assert.equal(P.vpEval(hand('2s 2d 2h 7c 7s')).m, 9);
});

/* ---------- Блэкджек ---------- */
test('blackjack: значения рук и выплаты', () => {
  assert.deepEqual(BJ.value(hand('As 6d')), { total: 17, soft: true });
  assert.equal(BJ.total(hand('As Ad 9c')), 21);
  assert.equal(BJ.total(hand('Ks Qd 5c')), 25);
  assert.equal(BJ.isBlackjack(hand('As Kd')), true);
  assert.equal(BJ.isBlackjack(hand('As Kd'), true), false);
  assert.equal(BJ.resolve(hand('As Kd'), hand('9s 8d'), 100).pay, 250);
  assert.equal(BJ.resolve(hand('As Kd'), hand('Ad Qs'), 100).pay, 100);
  assert.equal(BJ.resolve(hand('Ts 9d'), hand('Ad Qs'), 100).pay, 0);
  assert.equal(BJ.resolve(hand('Ts 9d'), hand('Td 7s'), 100).pay, 200);
  assert.equal(BJ.resolve(hand('Ts 7d'), hand('Td 7s'), 100).pay, 100);
  assert.equal(BJ.resolve(hand('Ts 7d 8c'), hand('Td 6s 9h'), 100).pay, 0); // перебор игрока важнее
  assert.equal(BJ.dealerHits(hand('As 6d')), false); // S17
  assert.equal(BJ.canSplit(hand('Ks Qd')), true);
});

/* ---------- Рулетка ---------- */
test('roulette: поворот колеса всегда приводит к выпавшему числу', () => {
  let rot = 0;
  for (let i = 0; i < 500; i++) {
    const n = R.WHEEL[Math.floor(Math.random() * 37)];
    rot = R.nextRotation(rot, n);
    assert.equal(R.numberAt(rot), n);
  }
});

test('roulette: выплаты и ставки на 0', () => {
  assert.equal(R.payout({ type: 'red' }, 10, 1), 20);
  assert.equal(R.payout({ type: 'red' }, 10, 0), 0);
  assert.equal(R.payout({ type: 'odd' }, 10, 0), 0);
  assert.equal(R.payout({ type: 'even' }, 10, 0), 0);
  assert.equal(R.payout({ type: 'dozen3' }, 10, 36), 30);
  assert.equal(R.payout({ type: 'col1' }, 10, 34), 30);
  assert.equal(R.payout({ type: 'straight', n: 0 }, 10, 0), 360);
  // RTP всех ставок = 36/37
  for (const t of Object.keys(R.BETS)) {
    let s = 0;
    for (let n = 0; n <= 36; n++) s += R.payout({ type: t }, 1, n);
    assert.equal(s, 36, t);
  }
});

/* ---------- Crash ---------- */
test('crash: P(дожить до ×2) ≈ 0.485', () => {
  let ok = 0;
  const N = 200000;
  for (let i = 0; i < N; i++) if (CR.crashPoint(Math.random, 500) >= 2) ok++;
  assert.ok(Math.abs(ok / N - 0.485) < 0.01);
});
