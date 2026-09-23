/* Учёба в БГУИР — логика кликера без DOM. Валюта общая: пишем прямо в state.balance.
   Храним только уровни апгрейдов; сила клика и доход в секунду считаются на лету. */
(function (EC) {
  'use strict';
  const U = EC.util, C = EC.config, CFG = C.EARN;
  const S = () => EC.store.state;

  const L = {};

  L.upgrade = (id) => CFG.upgrades.find((u) => u.id === id);
  L.growth = (up) => CFG.growth[up.cat];
  L.cost = (up, lvl) => Math.floor(up.base * Math.pow(L.growth(up), lvl));
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
  // Апгрейд появляется в ведомости, когда наботано 50% его базовой цены (или он уже куплен).
  L.visible = (up, s = S()) => (s.clickerLvl[up.id] || 0) > 0 || s.earnTotal >= up.base * CFG.revealAt;
  // Ближайший ещё скрытый апгрейд ветки — цель «что дальше».
  L.nextHidden = (cat, s = S()) => CFG.upgrades.find((u) => u.cat === cat && !L.visible(u, s)) || null;

  /* ---------- Формулы ---------- */
  L.rawClick = (s = S()) => CFG.upgrades.reduce((t, u) => t + (u.click || 0) * (s.clickerLvl[u.id] || 0), CFG.baseClick);
  L.rawEps = (s = S()) => CFG.upgrades.reduce((t, u) => t + (u.eps || 0) * (s.clickerLvl[u.id] || 0), 0);
  // Все множители — в одном месте: навык «Зубрила», кружка из магазина, недельный ивент.
  L.multiplier = (s = S()) => (1 + 0.1 * (s.skills.studyBoost || 0)) * (s.shopEquipped.mug ? 1.1 : 1) * EC.econ.weekMult();
  L.getClickPower = (s = S()) => L.rawClick(s) * L.multiplier(s);
  L.getEps = (s = S()) => L.rawEps(s) * L.multiplier(s);

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

  L.click = () => {
    const s = S();
    const value = L.getClickPower(s);
    gain(s, value);
    s.clicks++;
    EC.econ.tickQuest('clicks');
    L.checkAch();
    return { value };
  };

  L.buy = (id, n = 1) => {
    const s = S(), up = L.upgrade(id);
    if (!up || n < 1 || !L.visible(up, s)) return false;
    const lvl = s.clickerLvl[id] || 0;
    const price = L.costN(up, lvl, n);
    if (price > s.balance) return false;
    s.balance -= price;
    s.clickerLvl[id] = lvl + n;
    s.upgradesBought += n;
    EC.econ.tickMission('earn', n);
    EC.econ.unlock(up.cat === 'study' ? 'first_study' : 'first_life');
    L.checkAch();
    EC.bus.emit('upgrade', id);
    return price;
  };

  /* Пассивный доход по времени, а не по тикам: фоновые вкладки троттлятся, поэтому dt = now − lastTick.
     visible = вкладка на экране. Первые 5 секунд dt — «онлайн» (полная ставка), всё сверху
     и всё время скрытой/закрытой вкладки — «оффлайн»: × offlineRate, не больше offlineCapHours. */
  L.accrue = (now = Date.now(), visible = true) => {
    const s = S();
    const out = { gain: 0, offlineGain: 0, offlineSec: 0 };
    if (!s.lastTick || now < s.lastTick) { s.lastTick = now; return out; } // первый запуск или часы ушли назад
    const dt = (now - s.lastTick) / 1000;
    s.lastTick = now;
    const rate = L.getEps(s);
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

  /* ---------- Дверь «Подвал общаги» ---------- */
  L.doorProgress = (s = S()) => U.clamp(s.earnTotal / CFG.door.rumors, 0, 1);

  L.checkAch = () => {
    const s = S(), E = EC.econ;
    if (s.clicks >= 1) E.unlock('first_click');
    if (s.clicks >= 100) E.unlock('first_pair');
    if (s.clicks >= 1000) E.unlock('clicks_1000');
    if (s.earnTotal >= 10000) E.unlock('nerd');
    if (s.earnTotal >= 100000) E.unlock('session');
    if (L.getEps(s) >= 100) E.unlock('automat');
    E.checkTitles();
  };

  EC.earn = L;
})(globalThis.EC = globalThis.EC || {});
