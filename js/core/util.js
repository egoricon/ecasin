/* Общие хелперы. Без зависимостей от DOM — файл грузится и в браузере, и в тестах (node). */
(function (EC) {
  'use strict';

  const U = {};

  U.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  U.num = (n, def = 0) => (typeof n === 'number' && Number.isFinite(n) ? n : def);
  U.int = (n, def = 0) => Math.floor(U.num(n, def));

  /* ---------- Случайность ---------- */
  // Криптостойкий float [0,1), с фолбэком на Math.random.
  const buf = new Uint32Array(1);
  U.rand = () => {
    try {
      globalThis.crypto.getRandomValues(buf);
      return buf[0] / 4294967296;
    } catch (e) {
      return Math.random();
    }
  };
  U.randInt = (n, rnd = U.rand) => Math.floor(rnd() * n);
  U.pick = (arr, rnd = U.rand) => arr[Math.floor(rnd() * arr.length)];
  U.shuffle = (arr, rnd = U.rand) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };
  // Взвешенный выбор индекса.
  U.weighted = (weights, rnd = U.rand) => {
    let total = 0;
    for (const w of weights) total += w;
    let r = rnd() * total;
    for (let i = 0; i < weights.length; i++) {
      r -= weights[i];
      if (r < 0) return i;
    }
    return weights.length - 1;
  };
  // Детерминированный генератор от строки (FNV-1a + mulberry32).
  // Одинаковый seed → одинаковые квесты/ивент у «всех игроков» без сервера.
  U.seeded = (str) => {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return () => {
      h += 0x6d2b79f5;
      let t = h;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  /* ---------- Даты ---------- */
  U.dayKey = (d = new Date()) => d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  // ISO-неделя: одна и та же у всех в одну календарную неделю.
  U.weekKey = (d = new Date()) => {
    const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const day = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - day);
    const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    const w = Math.ceil(((t - y0) / 864e5 + 1) / 7);
    return t.getUTCFullYear() + '-W' + w;
  };

  /* ---------- Форматирование ---------- */
  U.fmt = (n) => U.int(n).toLocaleString('ru-RU');
  U.signed = (n) => (n > 0 ? '+' : n < 0 ? '−' : '') + U.fmt(Math.abs(n));
  // Компактно для больших чисел кликера: 12 450 · 1,2 млн · 3,4 млрд.
  U.compact = (n) => {
    n = U.num(n);
    const a = Math.abs(n);
    const f = (v, s) => (Math.floor(v * 10) / 10).toLocaleString('ru-RU') + ' ' + s;
    if (a >= 1e12) return f(n / 1e12, 'трлн');
    if (a >= 1e9) return f(n / 1e9, 'млрд');
    if (a >= 1e6) return f(n / 1e6, 'млн');
    return U.fmt(n);
  };
  U.rate = (n) => {
    n = U.num(n);
    if (n === 0) return '0';
    if (n < 10) return (Math.round(n * 10) / 10).toLocaleString('ru-RU');
    return U.compact(n);
  };
  U.mult = (m) => '×' + U.num(m).toFixed(2);
  // «1 Егорик / 2 Егорика / 5 Егориков»
  U.plural = (n, one, few, many) => {
    n = Math.abs(U.int(n)) % 100;
    const n1 = n % 10;
    if (n > 10 && n < 20) return many;
    if (n1 > 1 && n1 < 5) return few;
    if (n1 === 1) return one;
    return many;
  };

  /* ---------- Безопасный HTML ---------- */
  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  U.esc = (s) => String(s).replace(/[&<>"']/g, (c) => ESC[c]);

  class Safe {
    constructor(s) { this.s = s; }
    toString() { return this.s; }
  }
  U.raw = (s) => new Safe(String(s));
  const val = (v) => {
    if (v == null || v === false) return '';
    if (v instanceof Safe) return v.s;
    if (Array.isArray(v)) return v.map(val).join('');
    return U.esc(v);
  };
  // html`<b>${name}</b>` — всё, что подставлено, экранируется, кроме вложенных html`` и raw().
  U.html = (strings, ...vals) => {
    let out = strings[0];
    for (let i = 0; i < vals.length; i++) out += val(vals[i]) + strings[i + 1];
    return new Safe(out);
  };

  EC.util = U;
})(globalThis.EC = globalThis.EC || {});
