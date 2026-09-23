/* Баккара (Punto Banco) по настоящей таблице добора третьей карты. */
(function (EC) {
  'use strict';

  const cardValue = (c) => (c.r >= 10 ? 0 : c.r); // туз = 1, 10/J/Q/K = 0
  const total = (hand) => hand.reduce((s, c) => s + cardValue(c), 0) % 10;

  // Игрок берёт третью карту при 0–5, стоит на 6–7.
  const playerDraws = (pTotal) => pTotal <= 5;

  // Банкир. playerThird — значение третьей карты игрока (0..9) или null, если игрок стоял.
  function bankerDraws(bTotal, playerThird) {
    if (playerThird == null) return bTotal <= 5; // игрок стоял — банкир как игрок
    switch (bTotal) {
      case 0: case 1: case 2: return true;
      case 3: return playerThird !== 8;
      case 4: return playerThird >= 2 && playerThird <= 7;
      case 5: return playerThird >= 4 && playerThird <= 7;
      case 6: return playerThird === 6 || playerThird === 7;
      default: return false; // 7 стоит
    }
  }

  // Полная раздача. draw() — функция, отдающая следующую карту из шуза.
  // order — порядок выкладки карт (для анимации).
  function deal(draw) {
    const player = [], banker = [], order = [];
    const give = (side) => {
      const c = draw();
      (side === 'player' ? player : banker).push(c);
      order.push({ side, card: c });
      return c;
    };
    give('player'); give('banker'); give('player'); give('banker');

    const natural = total(player) >= 8 || total(banker) >= 8;
    let playerThird = null;
    if (!natural) {
      if (playerDraws(total(player))) playerThird = cardValue(give('player'));
      if (bankerDraws(total(banker), playerThird)) give('banker');
    }
    const p = total(player), b = total(banker);
    return {
      player, banker, order, natural,
      playerTotal: p, bankerTotal: b,
      winner: p > b ? 'player' : b > p ? 'banker' : 'tie',
    };
  }

  // Возврат (ставка + выигрыш). Игрок 1:1, банкир 0.95:1 (комиссия 5%), ничья 8:1.
  // При ничьей ставки на игрока/банкира возвращаются.
  const PAYS = { player: 2, banker: 1.95, tie: 9 };
  function payout(betType, bet, winner) {
    if (winner === betType) return Math.floor(bet * PAYS[betType]);
    if (winner === 'tie') return bet;
    return 0;
  }

  EC.rules = EC.rules || {};
  EC.rules.baccarat = { cardValue, total, playerDraws, bankerDraws, deal, payout, PAYS };
})(globalThis.EC = globalThis.EC || {});
