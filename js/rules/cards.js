/* Карты и колоды. Настоящая колода вместо «бесконечной»: вышедшие карты не повторяются. */
(function (EC) {
  'use strict';
  const U = EC.util;

  const SUITS = ['♠', '♥', '♦', '♣'];
  const RANKS = [null, 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

  // Карта: { r: 1..13 (1 = туз), s: 0..3 }
  const isRed = (c) => c.s === 1 || c.s === 2;
  const label = (c) => RANKS[c.r] + SUITS[c.s];

  function freshCards(decks) {
    const out = [];
    for (let d = 0; d < decks; d++) {
      for (let s = 0; s < 4; s++) for (let r = 1; r <= 13; r++) out.push({ r, s });
    }
    return out;
  }

  // Шуз из N колод. cut — доля шуза, после которой он перемешивается заново.
  class Shoe {
    constructor(decks = 1, cut = 0.25, rnd = U.rand) {
      this.decks = decks;
      this.cut = cut;
      this.rnd = rnd;
      this.shuffle();
    }
    shuffle() {
      this.cards = U.shuffle(freshCards(this.decks), this.rnd);
      this.total = this.cards.length;
    }
    // Вызывается ПЕРЕД раундом: если осталось мало карт — перемешать.
    prepare() {
      if (this.cards.length < this.total * this.cut) this.shuffle();
    }
    draw() {
      if (!this.cards.length) this.shuffle();
      return this.cards.pop();
    }
  }

  EC.cards = { SUITS, RANKS, Shoe, isRed, label, freshCards };
})(globalThis.EC = globalThis.EC || {});
