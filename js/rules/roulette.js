/* Европейская рулетка: 37 ячеек, реальный порядок секторов на колесе. */
(function (EC) {
  'use strict';

  const WHEEL = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
  const REDS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
  const color = (n) => (n === 0 ? 'green' : REDS.has(n) ? 'red' : 'black');

  // m — сколько возвращается на 1 E ставки (ставка + выигрыш).
  const BETS = {
    red:    { n: 'Красное', m: 2, win: (x) => REDS.has(x) },
    black:  { n: 'Чёрное', m: 2, win: (x) => x !== 0 && !REDS.has(x) },
    even:   { n: 'Чётное', m: 2, win: (x) => x !== 0 && x % 2 === 0 },
    odd:    { n: 'Нечётное', m: 2, win: (x) => x % 2 === 1 },
    low:    { n: '1–18', m: 2, win: (x) => x >= 1 && x <= 18 },
    high:   { n: '19–36', m: 2, win: (x) => x >= 19 },
    dozen1: { n: '1-я дюжина', m: 3, win: (x) => x >= 1 && x <= 12 },
    dozen2: { n: '2-я дюжина', m: 3, win: (x) => x >= 13 && x <= 24 },
    dozen3: { n: '3-я дюжина', m: 3, win: (x) => x >= 25 },
    col1:   { n: '1-я колонка', m: 3, win: (x) => x !== 0 && x % 3 === 1 },
    col2:   { n: '2-я колонка', m: 3, win: (x) => x !== 0 && x % 3 === 2 },
    col3:   { n: '3-я колонка', m: 3, win: (x) => x !== 0 && x % 3 === 0 },
  };
  const STRAIGHT_M = 36;

  // pick: { type: 'red' | ... | 'straight', n?: число }
  function describe(pick) {
    if (pick.type === 'straight') return { n: 'Число ' + pick.n, m: STRAIGHT_M };
    return BETS[pick.type];
  }
  function payout(pick, bet, result) {
    if (pick.type === 'straight') return result === pick.n ? bet * STRAIGHT_M : 0;
    const b = BETS[pick.type];
    return b && b.win(result) ? bet * b.m : 0;
  }

  // Поворот колеса, чтобы центр сектора result оказался под указателем (сверху).
  // Считаем от ТЕКУЩЕГО угла колеса — иначе визуал расходится с результатом после первого спина.
  function nextRotation(currentRot, result, fullTurns = 5) {
    const deg = 360 / WHEEL.length;
    const idx = WHEEL.indexOf(result);
    const centerDeg = idx * deg + deg / 2;
    const curMod = ((currentRot % 360) + 360) % 360;
    const wantMod = ((360 - centerDeg) % 360 + 360) % 360;
    let delta = wantMod - curMod;
    if (delta < 0) delta += 360;
    return currentRot + 360 * fullTurns + delta;
  }
  // Какое число сейчас под указателем при повороте rot (для проверки и тестов).
  function numberAt(rot) {
    const deg = 360 / WHEEL.length;
    const a = ((360 - (((rot % 360) + 360) % 360)) % 360);
    return WHEEL[Math.floor(a / deg) % WHEEL.length];
  }

  EC.rules = EC.rules || {};
  EC.rules.roulette = { WHEEL, REDS, color, BETS, STRAIGHT_M, describe, payout, nextRotation, numberAt };
})(globalThis.EC = globalThis.EC || {});
