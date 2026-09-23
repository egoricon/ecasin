/* Симуляция темпа учёбы на НАСТОЯЩЕМ коде (config.js + earn/logic.js).
   Два игрока: активный (3 клика/с) и ленивый (1,5 клика/с). Оба копят на апгрейд
   с лучшим «время накопить + окупаемость» и покупают его, как только хватает.
   Запуск: node tools/balance-sim.js — любое изменение цифр в C.EARN прогоняй через него. */
const path = require('path');
require(path.join(__dirname, '..', 'tests', 'load.js'));
const EC = globalThis.EC, L = EC.earn, C = EC.config;

// Цели из роадмапа прогрессии (§8, этап 6), в секундах.
const TARGETS = {
  active: { cps: 3, first: [0, 10], firstLife: [0, 150], door: [255, 360], k250: [510, 690] },
  lazy: { cps: 1.5, first: [0, 15], firstLife: [0, 180], door: [480, 660], k250: [870, 1170] },
};

function run(cps, limitSec = 3600) {
  freshState();
  const s = EC.store.state;
  const dt = 0.1;
  let t = 0, acc = 0;
  const ev = {};
  s.lastTick = 1;
  while (t < limitSec) {
    t += dt;
    acc += cps * dt;
    while (acc >= 1) { acc -= 1; L.click(); }
    L.accrue(1 + Math.round(t * 1000), true);
    for (;;) {
      const inc = L.getClickPower() * cps + L.getEps();
      let best = null;
      for (const up of C.EARN.upgrades) {
        if (!L.visible(up)) continue;
        const c = L.cost(up, s.clickerLvl[up.id] || 0);
        const gain = (up.click || 0) * cps + (up.eps || 0);
        const score = Math.max(0, (c - s.balance) / inc) + c / gain;
        if (!best || score < best.score) best = { up, score, c };
      }
      if (!best || best.c > s.balance) break;
      L.buy(best.up.id, 1);
      if (ev.first == null) ev.first = t;
      if (best.up.eps && ev.firstLife == null) ev.firstLife = t;
    }
    if (ev.door == null && s.earnTotal >= C.EARN.door.rumors) ev.door = t;
    if (ev.k250 == null && s.earnTotal >= 250000) { ev.k250 = t; break; }
  }
  return ev;
}

const fmt = (sec) => (sec == null ? '—' : sec < 60 ? sec.toFixed(0) + ' с' : Math.floor(sec / 60) + ':' + String(Math.round(sec % 60)).padStart(2, '0'));

function check() {
  const out = {};
  for (const [who, tg] of Object.entries(TARGETS)) {
    const ev = run(tg.cps);
    out[who] = { ev, ok: {} };
    for (const k of ['first', 'firstLife', 'door', 'k250']) {
      const [lo, hi] = tg[k];
      out[who].ok[k] = ev[k] != null && ev[k] >= lo && ev[k] <= hi;
    }
  }
  return out;
}

module.exports = { run, check, TARGETS, fmt };

if (require.main === module) {
  const res = check();
  const names = { first: 'первая покупка', firstLife: 'первый пассив', door: 'подвал (40 000)', k250: '250 000' };
  for (const [who, r] of Object.entries(res)) {
    console.log(`\n${who === 'active' ? 'Активный' : 'Ленивый'} (${TARGETS[who].cps} клика/с)`);
    for (const k of Object.keys(names)) {
      const [lo, hi] = TARGETS[who][k];
      console.log(`  ${r.ok[k] ? '✓' : '✗'} ${names[k].padEnd(16)} ${fmt(r.ev[k]).padStart(6)}   цель ${fmt(lo)}–${fmt(hi)}`);
    }
  }
}
