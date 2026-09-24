/* Симуляция RTP автоматов на НАСТОЯЩЕЙ логике (js/rules/m-*.js + C.MACHINES).
   Ставка 1, выплата считается в ставках (без округления до целых Егориков).
   Запуск:
     node tools/machines-sim.js                  — все автоматы, 1 000 000 спинов, крипто-генератор (как в игре)
     node tools/machines-sim.js knowledge 200000 — один автомат, своё число спинов
     node tools/machines-sim.js all 1000000 --seed 42 — воспроизводимый прогон на seed-генераторе */
const path = require('path');
require(path.join(__dirname, '..', 'tests', 'load.js'));
const EC = globalThis.EC, U = EC.util, C = EC.config;

const IDS = ['knowledge', 'clusters', 'fishing', 'mini777'];

function simulate(id, N, rnd) {
  const M = C.MACHINES[id], L = EC.machines.logic[id];
  let tot = 0, sq = 0, hits = 0, max = 0, feat = 0, featM = 0;
  const extra = {};
  for (let i = 0; i < N; i++) {
    const o = L.play(M, rnd);
    tot += o.m; sq += o.m * o.m;
    if (o.m > 0) hits++;
    if (o.m > max) max = o.m;
    const f = L.features ? L.features(o) : null; // { name: m } — вклад бонусных функций
    if (f) for (const [k, v] of Object.entries(f)) { extra[k] = extra[k] || { n: 0, m: 0 }; extra[k].n++; extra[k].m += v; }
  }
  const rtp = tot / N, sd = Math.sqrt(Math.max(0, sq / N - rtp * rtp));
  return { id, N, rtp, sd, ci: 1.96 * sd / Math.sqrt(N), hit: hits / N, max, extra };
}

function report(r) {
  const pct = (x) => (x * 100).toFixed(2) + '%';
  const lines = [`${C.MACHINES[r.id].n.padEnd(22)} RTP ${pct(r.rtp)} ± ${(r.ci * 100).toFixed(2)}%  (цель ${pct(C.MACHINES[r.id].rtp)})  выигрышных спинов ${pct(r.hit)}  sd ${r.sd.toFixed(2)}  max ×${r.max.toFixed(1)}`];
  for (const [k, v] of Object.entries(r.extra)) lines.push(`    ${k.padEnd(18)} раз в ${Math.round(r.N / v.n)} спинов, в среднем ×${(v.m / v.n).toFixed(1)}, вклад в RTP ${pct(v.m / r.N)}`);
  return lines.join('\n');
}

module.exports = { simulate, report, IDS };

if (require.main === module) {
  const args = process.argv.slice(2);
  const si = args.indexOf('--seed');
  const seed = si >= 0 ? args.splice(si, 2)[1] : null;
  const which = args[0] && args[0] !== 'all' ? [args[0]] : IDS.filter((id) => EC.machines.logic[id]);
  const N = +(args[1] || 1e6);
  console.log(`Симуляция: ${U.fmt(N)} спинов на автомат, ставка 1, генератор: ${seed ? 'seed «' + seed + '»' : 'crypto.getRandomValues'}\n`);
  let ok = true;
  for (const id of which) {
    const t = Date.now();
    const rnd = seed ? U.seeded(seed + ':' + id) : U.rand;
    const r = simulate(id, N, rnd);
    const inRange = r.rtp >= 0.93 && r.rtp <= 0.97;
    ok = ok && inRange;
    console.log(report(r) + `\n    ${inRange ? '✓ в диапазоне 93–97%' : '✗ ВНЕ диапазона 93–97%'} · ${((Date.now() - t) / 1000).toFixed(1)} c\n`);
  }
  process.exit(ok ? 0 : 1);
}
