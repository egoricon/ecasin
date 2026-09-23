/* Блэкджек: 6 колод, дилер стоит на всех 17, BJ 3:2, дабл, один сплит, пик дилера. */
(function (EC) {
  'use strict';

  const cardPoints = (c) => (c.r === 1 ? 11 : Math.min(c.r, 10));

  function value(hand) {
    let t = 0, aces = 0;
    for (const c of hand) {
      t += cardPoints(c);
      if (c.r === 1) aces++;
    }
    while (t > 21 && aces) { t -= 10; aces--; }
    return { total: t, soft: aces > 0 };
  }
  const total = (hand) => value(hand).total;

  // «Натуральный» BJ — только две первые карты и не после сплита.
  const isBlackjack = (hand, fromSplit = false) => !fromSplit && hand.length === 2 && total(hand) === 21;
  const isBust = (hand) => total(hand) > 21;
  const dealerHits = (hand) => total(hand) < 17;
  // Дилер проверяет BJ под картой, если открыт туз или десятка.
  const dealerPeeks = (up) => up.r === 1 || cardPoints(up) === 10;
  const canSplit = (hand) => hand.length === 2 && cardPoints(hand[0]) === cardPoints(hand[1]);

  // Итог одной руки игрока против дилера → возврат (ставка + выигрыш).
  function resolve(hand, dealer, bet, fromSplit = false) {
    const p = total(hand), d = total(dealer);
    const pBJ = isBlackjack(hand, fromSplit), dBJ = isBlackjack(dealer);
    if (p > 21) return { pay: 0, r: 'bust' };
    if (pBJ && dBJ) return { pay: bet, r: 'push' };
    if (pBJ) return { pay: bet + Math.floor(bet * 1.5), r: 'blackjack' };
    if (dBJ) return { pay: 0, r: 'lose' };
    if (d > 21 || p > d) return { pay: bet * 2, r: 'win' };
    if (p === d) return { pay: bet, r: 'push' };
    return { pay: 0, r: 'lose' };
  }

  EC.rules = EC.rules || {};
  EC.rules.blackjack = { cardPoints, value, total, isBlackjack, isBust, dealerHits, dealerPeeks, canSplit, resolve };
})(globalThis.EC = globalThis.EC || {});
