/* «Заработок» — логика кликера без DOM. Валюта общая: пишем прямо в state.balance. */
(function (EC) {
  'use strict';
  const U = EC.util, C = EC.config, CFG = C.EARN;
  const S = () => EC.store.state;

  const L = {};

  L.upgrade = (id) => CFG.upgrades.find((u) => u.id === id);
  L.cost = (up, lvl) => Math.ceil(up.base * Math.pow(CFG.growth, lvl));
  // Цена n уровней подряд начиная с lvl.
  L.costN = (up, lvl, n) => {
    let t = 0;
    for (let i = 0; i < n; i++) t += L.cost(up, lvl + i);
    return t;
  };
  // Сколько уровней можно купить на balance (не больше cap).
  L.maxAffordable = (up, lvl, balance, cap = 1000) => {
    let n = 0, spent = 0;
    while (n < cap) {
      const c = L.cost(up, lvl + n);
      if (spent + c > balance) break;
      spent += c;
      n++;
    }
    return n;
  };

  L.boost = (s = S()) => 1 + 0.1 * (s.skills.studyBoost || 0);
  // Сила клика и пассивный доход «сырые» хранятся в state (clickPower, eps), буст навыка — сверху.
  L.recompute = (s = S()) => {
    let click = CFG.baseClick, eps = 0;
    for (const up of CFG.upgrades) {
      const lvl = s.clickerLvl[up.id] || 0;
      if (up.click) click += up.click * lvl;
      if (up.eps) eps += up.eps * lvl;
    }
    s.clickPower = click;
    s.eps = eps;
  };
  L.clickValue = (s = S()) => Math.max(1, Math.floor(s.clickPower * L.boost(s)));
  L.epsValue = (s = S()) => s.eps * L.boost(s);

  // Прибавить заработок. Дробная часть копится в earnFrac, баланс всегда целый.
  function gain(s, amount) {
    const total = amount + U.num(s.earnFrac);
    const whole = Math.floor(total);
    s.earnFrac = total - whole;
    if (whole > 0) {
      s.balance += whole;
      s.earnTotal += whole;
    }
    return whole;
  }

  L.click = (rnd = U.rand) => {
    const s = S();
    const crit = rnd() < CFG.crit.chance;
    const value = L.clickValue(s) * (crit ? CFG.crit.mult : 1);
    s.balance += value;
    s.earnTotal += value;
    s.clicks++;
    EC.econ.tickQuest('clicks');
    L.checkAch();
    return { value, crit };
  };

  L.buy = (id, n = 1) => {
    const s = S(), up = L.upgrade(id);
    if (!up || n < 1) return false;
    const lvl = s.clickerLvl[id] || 0;
    const price = L.costN(up, lvl, n);
    if (price > s.balance) return false;
    s.balance -= price;
    s.clickerLvl[id] = lvl + n;
    s.upgradesBought += n;
    L.recompute(s);
    EC.econ.tickMission('earn', n);
    L.checkAch();
    return price;
  };

  /* Начисление пассивного дохода по времени, а не по тикам:
     фоновые вкладки троттлятся, поэтому считаем dt = now − lastTick.
     visible = вкладка на экране. Первые 5 секунд dt — «онлайн» (полная ставка),
     всё, что сверху, и всё время скрытой/закрытой вкладки — «оффлайн»: offlineRate и кап offlineCapHours. */
  L.accrue = (now = Date.now(), visible = true) => {
    const s = S();
    const out = { gain: 0, offlineGain: 0, offlineSec: 0 };
    if (!s.lastTick || now < s.lastTick) { s.lastTick = now; return out; } // первый запуск или часы ушли назад
    const dt = (now - s.lastTick) / 1000;
    s.lastTick = now;
    const rate = L.epsValue(s);
    if (rate <= 0 || dt <= 0) return out;
    const cap = CFG.offlineCapHours * 3600;
    const online = visible ? Math.min(dt, 5) : 0;
    const offline = Math.min(dt - online, cap);
    const offAmount = rate * CFG.offlineRate * offline;
    out.gain = gain(s, rate * online + offAmount);
    out.offlineSec = offline;
    out.offlineGain = offline > 5 ? Math.floor(offAmount) : 0;
    if (out.gain) L.checkAch();
    return out;
  };

  L.checkAch = () => {
    const s = S(), E = EC.econ;
    if (s.clicks >= 100) E.unlock('first_pair');
    if (s.earnTotal >= 10000) E.unlock('nerd');
    if (s.earnTotal >= 100000) E.unlock('session');
    if (L.epsValue(s) >= 100) E.unlock('automat');
    if (s.balance >= 10000) E.unlock('high_roller');
    E.checkTitles();
  };

  EC.earn = L;
})(globalThis.EC = globalThis.EC || {});
