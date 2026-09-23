/* Crash: точка взрыва выбирается ДО старта раунда. P(дожить до ×x) = (1 − edge) / x. */
(function (EC) {
  'use strict';
  const U = EC.util;

  function crashPoint(rnd = U.rand, cap = 500, edge = 0.03) {
    const u = rnd();
    const raw = (1 - edge) / (1 - u);
    return U.clamp(Math.floor(raw * 100) / 100, 1, cap);
  }
  // Множитель через t секунд полёта.
  const multAt = (t, k) => Math.exp(k * t);
  // Сколько секунд лететь до множителя m.
  const timeTo = (m, k) => Math.log(m) / k;

  EC.rules = EC.rules || {};
  EC.rules.crash = { crashPoint, multAt, timeTo };
})(globalThis.EC = globalThis.EC || {});
