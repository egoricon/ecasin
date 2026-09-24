// Грузит браузерные скрипты (без DOM) в глобальный контекст node.
const path = require('path');

const mem = {};
globalThis.localStorage = {
  getItem: (k) => (k in mem ? mem[k] : null),
  setItem: (k, v) => { mem[k] = String(v); },
  removeItem: (k) => { delete mem[k]; },
  clear: () => { for (const k of Object.keys(mem)) delete mem[k]; },
};

const FILES = [
  'js/core/util.js',
  'js/config.js',
  'js/rules/cards.js',
  'js/rules/baccarat.js',
  'js/rules/poker.js',
  'js/rules/blackjack.js',
  'js/rules/roulette.js',
  'js/rules/slots.js',
  'js/rules/crash.js',
  'js/core/store.js',
  'js/core/economy.js',
  'js/earn/logic.js',
  'js/rules/machines.js',
  'js/rules/m-knowledge.js',
  'js/rules/m-clusters.js',
  'js/rules/m-fishing.js',
  'js/rules/m-mini777.js',
];
for (const f of FILES) require(path.join(__dirname, '..', f));

// Карта из строки: 'As', 'Td', '9h', 'Kc'
const RANK = { A: 1, T: 10, J: 11, Q: 12, K: 13 };
const SUIT = { s: 0, h: 1, d: 2, c: 3 };
globalThis.cardOf = (str) => ({ r: RANK[str[0]] || +str[0], s: SUIT[str[1]] });
globalThis.hand = (str) => str.split(' ').map(cardOf);
// Детерминированная «колода» для раздач.
globalThis.drawFrom = (str) => { const cs = hand(str); let i = 0; return () => cs[i++]; };
globalThis.freshState = () => { localStorage.clear(); EC.store.load(); return EC.store.state; };

module.exports = globalThis.EC;
