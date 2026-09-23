/* Оценка покерных рук + выплаты Ultimate Texas Hold'em и Jacks or Better. */
(function (EC) {
  'use strict';

  const CAT = {
    HIGH: 0, PAIR: 1, TWO_PAIR: 2, TRIPS: 3, STRAIGHT: 4,
    FLUSH: 5, FULL_HOUSE: 6, QUADS: 7, STRAIGHT_FLUSH: 8, ROYAL: 9,
  };
  const NAMES = [
    'Старшая карта', 'Пара', 'Две пары', 'Тройка', 'Стрит',
    'Флеш', 'Фулл-хаус', 'Каре', 'Стрит-флеш', 'Роял-флеш',
  ];

  const hi = (c) => (c.r === 1 ? 14 : c.r);

  // Ровно 5 карт → { cat, tb: [тай-брейкеры по убыванию значимости] }
  function eval5(cards) {
    const ranks = cards.map(hi).sort((a, b) => b - a);
    const flush = cards.every((c) => c.s === cards[0].s);

    const counts = {};
    for (const r of ranks) counts[r] = (counts[r] || 0) + 1;
    // Группы: сначала по количеству, потом по рангу.
    const groups = Object.keys(counts)
      .map((r) => [+r, counts[r]])
      .sort((a, b) => b[1] - a[1] || b[0] - a[0]);

    let straightHigh = 0;
    if (groups.length === 5) {
      if (ranks[0] - ranks[4] === 4) straightHigh = ranks[0];
      else if (ranks[0] === 14 && ranks[1] === 5) straightHigh = 5; // A-2-3-4-5
    }

    if (straightHigh && flush) {
      return { cat: straightHigh === 14 ? CAT.ROYAL : CAT.STRAIGHT_FLUSH, tb: [straightHigh] };
    }
    const g = groups.map((x) => x[0]);
    if (groups[0][1] === 4) return { cat: CAT.QUADS, tb: g };
    if (groups[0][1] === 3 && groups[1][1] === 2) return { cat: CAT.FULL_HOUSE, tb: g };
    if (flush) return { cat: CAT.FLUSH, tb: ranks };
    if (straightHigh) return { cat: CAT.STRAIGHT, tb: [straightHigh] };
    if (groups[0][1] === 3) return { cat: CAT.TRIPS, tb: g };
    if (groups[0][1] === 2 && groups[1][1] === 2) return { cat: CAT.TWO_PAIR, tb: g };
    if (groups[0][1] === 2) return { cat: CAT.PAIR, tb: g };
    return { cat: CAT.HIGH, tb: ranks };
  }

  function cmp(a, b) {
    if (a.cat !== b.cat) return a.cat - b.cat;
    const n = Math.max(a.tb.length, b.tb.length);
    for (let i = 0; i < n; i++) {
      const d = (a.tb[i] || 0) - (b.tb[i] || 0);
      if (d) return d;
    }
    return 0;
  }

  // Лучшая пятёрка из 5–7 карт перебором (21 комбинация для 7 карт).
  function best(cards) {
    if (cards.length < 5) throw new Error('need 5+ cards');
    let top = null;
    const n = cards.length;
    for (let a = 0; a < n; a++)
      for (let b = a + 1; b < n; b++)
        for (let c = b + 1; c < n; c++)
          for (let d = c + 1; d < n; d++)
            for (let e = d + 1; e < n; e++) {
              const five = [cards[a], cards[b], cards[c], cards[d], cards[e]];
              const ev = eval5(five);
              if (!top || cmp(ev, top) > 0) {
                ev.cards = five;
                top = ev;
              }
            }
    top.name = NAMES[top.cat];
    return top;
  }

  /* ---------- Ultimate Texas Hold'em ---------- */
  // Блайнд платит только при победе игрока и только со стрита и выше; иначе — пуш.
  const BLIND_PAYS = { 4: 1, 5: 1.5, 6: 3, 7: 10, 8: 50, 9: 500 };
  const dealerQualifies = (dealerBest) => dealerBest.cat >= CAT.PAIR;

  // Возвращает { pay, cmp, qualifies, parts } — pay = сколько вернуть игроку (ставки + выигрыш).
  function uthSettle({ ante, blind, play, folded, player, dealer }) {
    const parts = {};
    if (folded) {
      parts.ante = { r: 'lose', pay: 0 };
      parts.blind = { r: 'lose', pay: 0 };
      parts.play = { r: 'none', pay: 0 };
      return { pay: 0, cmp: -1, qualifies: null, parts };
    }
    const c = cmp(player, dealer);
    const q = dealerQualifies(dealer);
    if (c > 0) {
      parts.play = { r: 'win', pay: play * 2 };
      parts.ante = q ? { r: 'win', pay: ante * 2 } : { r: 'push', pay: ante };
      const m = BLIND_PAYS[player.cat];
      parts.blind = m ? { r: 'win', pay: blind + Math.floor(blind * m) } : { r: 'push', pay: blind };
    } else if (c < 0) {
      parts.play = { r: 'lose', pay: 0 };
      parts.ante = q ? { r: 'lose', pay: 0 } : { r: 'push', pay: ante };
      parts.blind = { r: 'lose', pay: 0 };
    } else {
      parts.play = { r: 'push', pay: play };
      parts.ante = { r: 'push', pay: ante };
      parts.blind = { r: 'push', pay: blind };
    }
    const pay = parts.ante.pay + parts.blind.pay + parts.play.pay;
    return { pay, cmp: c, qualifies: q, parts };
  }

  /* ---------- Видеопокер Jacks or Better 9/6 ---------- */
  // Множитель = сколько возвращается на 1 E ставки (1 = возврат ставки).
  const VP_TABLE = [
    { cat: CAT.ROYAL, n: 'Роял-флеш', m: 250 },
    { cat: CAT.STRAIGHT_FLUSH, n: 'Стрит-флеш', m: 50 },
    { cat: CAT.QUADS, n: 'Каре', m: 25 },
    { cat: CAT.FULL_HOUSE, n: 'Фулл-хаус', m: 9 },
    { cat: CAT.FLUSH, n: 'Флеш', m: 6 },
    { cat: CAT.STRAIGHT, n: 'Стрит', m: 4 },
    { cat: CAT.TRIPS, n: 'Тройка', m: 3 },
    { cat: CAT.TWO_PAIR, n: 'Две пары', m: 2 },
    { cat: CAT.PAIR, n: 'Пара вальтов+', m: 1 },
  ];
  function vpEval(hand5) {
    const ev = eval5(hand5);
    if (ev.cat === CAT.PAIR && ev.tb[0] < 11) {
      return { cat: CAT.HIGH, row: null, m: 0, name: 'Пара ниже вальтов' };
    }
    const row = VP_TABLE.find((x) => x.cat === ev.cat) || null;
    return { cat: ev.cat, row, m: row ? row.m : 0, name: row ? row.n : NAMES[ev.cat] };
  }

  EC.rules = EC.rules || {};
  EC.rules.poker = { CAT, NAMES, eval5, cmp, best, BLIND_PAYS, dealerQualifies, uthSettle, VP_TABLE, vpEval };
})(globalThis.EC = globalThis.EC || {});
