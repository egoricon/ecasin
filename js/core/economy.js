/* Экономика и прогрессия. Единственная валюта — state.balance (общая для казино и «Заработка»).
   UI сюда не лезет: всё, что надо показать, уходит событиями в EC.bus ('note', 'win', 'loss', ...). */
(function (EC) {
  'use strict';
  const U = EC.util, C = EC.config;
  const S = () => EC.store.state;
  const note = (title, text, kind, icon) => EC.bus.emit('note', { title, text, kind, icon });

  const E = {};

  /* ---------- Недельный ивент ---------- */
  E.week = () => {
    const s = S(), key = U.weekKey();
    if (s.weekEvent.weekId !== key) {
      const e = C.WEEK_EVENTS[Math.floor(U.seeded(key)() * C.WEEK_EVENTS.length)];
      s.weekEvent = { weekId: key, n: e.n, m: e.m, d: e.d };
    }
    return s.weekEvent;
  };

  /* ---------- VIP ---------- */
  E.vipLevel = (s = S()) => {
    let lvl = 0;
    C.VIP.forEach((v, i) => { if (U.num(s.totalWon) >= v.min) lvl = i; });
    return lvl;
  };
  E.minBet = () => C.VIP[E.vipLevel()].minBet;
  E.vipProgress = (s = S()) => {
    const l = E.vipLevel(s);
    if (l >= C.VIP.length - 1) return { pct: 100, next: null, left: 0 };
    const cur = C.VIP[l], next = C.VIP[l + 1];
    return {
      pct: U.clamp(((s.totalWon - cur.min) / (next.min - cur.min)) * 100, 0, 100),
      next, left: Math.max(0, next.min - s.totalWon),
    };
  };

  /* ---------- Деньги и опыт ---------- */
  E.addMoney = (n) => {
    const s = S();
    if (!Number.isFinite(n)) return;
    s.balance = Math.max(0, Math.floor(s.balance + n));
  };

  E.xpInLevel = (s = S()) => Math.floor(s.xp % 100);
  E.addXp = (n) => {
    const s = S();
    s.xp += U.num(n) * (1 + 0.1 * (s.skills.xpBoost || 0));
    const lvl = Math.floor(s.xp / 100) + 1;
    while (s.level < lvl) {
      s.level++;
      s.skillPoints++;
      const bonus = 50 * s.level;
      E.addMoney(bonus);
      note('Уровень ' + s.level, `+1 очко навыка · +${U.fmt(bonus)} E`, 'level', '⚡');
      EC.bus.emit('sound', 'level');
    }
  };

  /* ---------- Достижения ---------- */
  E.unlock = (id) => {
    const s = S();
    if (s.ach[id] !== false) return; // уже открыто или неизвестный id
    s.ach[id] = true;
    E.addMoney(C.ACH_REWARD);
    const a = C.ACH.find((x) => x.id === id);
    note('Достижение: ' + a.n, `${a.d} · +${C.ACH_REWARD} E`, 'ach', '★');
    EC.bus.emit('sound', 'win');
  };

  /* ---------- Титулы: открываются сами, первый открытый надевается сам ---------- */
  // silent — при загрузке сейва: отметить открытые титулы без лавины уведомлений.
  E.checkTitles = (silent = false) => {
    const s = S();
    for (const t of C.TITLES) {
      if (!s.titlesSeen.includes(t.id) && t.r(s)) {
        s.titlesSeen.push(t.id);
        if (silent) continue;
        if (!s.titleManual) s.title = t.id;
        note('Новый титул', t.n + (s.titleManual ? ' — надень в профиле' : ''), 'title', '🏅');
      }
    }
  };
  E.titleOf = (id) => C.TITLES.find((t) => t.id === id) || null;

  /* ---------- Ежедневные квесты ---------- */
  E.refreshQuests = () => {
    const s = S(), today = U.dayKey();
    if (s.questsDate === today && s.quests.length === 3) return false;
    const pool = U.shuffle(C.QUESTS.map((q) => q.id), U.seeded('q-' + today));
    s.quests = pool.slice(0, 3);
    s.questsProgress = {};
    s.questsDate = today;
    return true;
  };
  E.questList = () => {
    E.refreshQuests();
    const s = S();
    return s.quests.map((id) => {
      const q = C.QUESTS.find((x) => x.id === id);
      const p = s.questsProgress[id] || { value: 0, done: false };
      return q && Object.assign({}, q, { value: Math.min(p.value, q.need), done: p.done });
    }).filter(Boolean);
  };
  E.tickQuest = (t, amount = 1) => {
    E.refreshQuests();
    const s = S();
    for (const id of s.quests) {
      const q = C.QUESTS.find((x) => x.id === id);
      if (!q || q.t !== t) continue;
      const p = s.questsProgress[id] || (s.questsProgress[id] = { value: 0, done: false });
      if (p.done) continue;
      p.value += amount;
      if (p.value >= q.need) {
        p.done = true;
        E.addMoney(q.r);
        note('Квест выполнен', `${q.n} · +${q.r} E`, 'quest', '✓');
        EC.bus.emit('sound', 'bonus');
      }
    }
  };

  /* ---------- Долгие миссии ---------- */
  E.tickMission = (id, amount = 1) => {
    const s = S();
    const m = C.MISSIONS.find((x) => x.id === id);
    if (!m || s.missionDone[id]) return;
    s.missions[id] = (s.missions[id] || 0) + amount;
    if (s.missions[id] >= m.need) {
      s.missionDone[id] = true;
      E.addMoney(m.r);
      note('Миссия: ' + m.n, `+${m.r} E`, 'quest', '🏆');
      EC.bus.emit('sound', 'bonus');
    }
  };

  /* ---------- Раунд: ставка списывается ДО анимации, settle() — ПОСЛЕ ----------
     beginRound() списывает ставку и помечает незавершённый раунд (перезагрузка вернёт ставку).
     round.add(n) — доставка (дабл, сплит, рейз). round.end(pay, meta) → settle(). */
  E.busy = false;
  E.beginRound = (game, bet) => {
    const s = S();
    const allIn = bet >= s.balance;
    s.balance -= bet;
    s.pendingRound = { game, bet, t: Date.now() };
    E.busy = true;
    EC.store.commit('balance');
    EC.bus.emit('round', true);
    const round = {
      game, bet, allIn, closed: false,
      canAdd: (n) => S().balance >= n,
      add(n) {
        S().balance -= n;
        this.bet += n;
        S().pendingRound.bet = this.bet;
        EC.store.commit('balance');
      },
      end(pay, meta = {}) {
        if (this.closed) return null;
        this.closed = true;
        S().pendingRound = null;
        E.busy = false;
        const r = E.settle(this.bet, pay, Object.assign({ game: this.game, allIn: this.allIn }, meta));
        EC.bus.emit('round', false);
        return r;
      },
    };
    return round;
  };
  // Раунд, прерванный перезагрузкой страницы: ставку возвращаем.
  E.recoverRound = () => {
    const s = S(), p = s.pendingRound;
    if (!p) return;
    s.pendingRound = null;
    E.addMoney(U.num(p.bet));
    note('Раунд прерван', `${C.GAME_NAME[p.game] || 'Игра'}: ставка ${U.fmt(p.bet)} E возвращена`, 'info', '↩');
  };

  /* ---------- settle(bet, pay, meta) — центральный расчёт раунда ----------
     bet уже списана. pay — сколько вернуть игроку (ставка + выигрыш), 0 — проигрыш.
     Недельный ивент умножает только ЧИСТЫЙ выигрыш (pay − bet), пуши не трогает. */
  E.settle = (bet, pay, meta = {}) => {
    const s = S();
    bet = Math.max(0, U.int(bet));
    pay = Math.max(0, U.int(pay));
    const ev = E.week();
    let boost = 0;
    // Целочисленно, чтобы 100 × 0.2 не превращалось в 19.999…
    if (pay > bet && ev.m !== 1) boost = Math.floor(((pay - bet) * Math.round((ev.m - 1) * 1000)) / 1000);
    pay += boost;
    const net = pay - bet;
    const game = meta.game;

    s.totalBet += bet;
    s.games++;
    if (game && s.gamesBy[game] != null) s.gamesBy[game]++;
    E.addMoney(pay);

    let kind;
    if (net > 0) {
      kind = 'win';
      s.wins++;
      s.totalWon += net;
      s.biggestWin = Math.max(s.biggestWin, net);
      E.addXp(2);
      E.unlock('first_win');
      if (net >= 1000) E.unlock('big_win');
      if (meta.allIn) E.unlock('all_in');
      E.tickQuest('win');
      const nv = E.vipLevel();
      if (nv > s.vip) {
        s.vip = nv;
        note('VIP: ' + C.VIP[nv].n, `Минимальная ставка теперь ${C.VIP[nv].minBet} E`, 'win', '👑');
      }
    } else if (net < 0) {
      kind = 'loss';
      s.losses++;
      E.addXp(1);
    } else {
      kind = 'push';
      s.pushes++;
      E.addXp(1);
    }
    s.hist.unshift(kind === 'win' ? 'W' : kind === 'loss' ? 'L' : 'P');
    s.hist = s.hist.slice(0, 20);
    if (game) E.tickQuest(game);
    if (s.balance >= 10000) E.unlock('high_roller');
    E.checkTitles();
    EC.store.commit('settle');

    const result = { bet, pay, net, boost, kind, game, meta };
    EC.bus.emit(kind, result);
    E.checkBankrupt();
    return result;
  };

  /* ---------- Банкрот: не хватает даже на минимальную ставку ---------- */
  E.checkBankrupt = () => {
    const s = S();
    const broke = s.balance < E.minBet() && s.games > 0;
    if (broke && !s.bankruptShown && !E.busy) {
      s.bankruptShown = true;
      EC.store.save();
      EC.bus.emit('bankrupt');
    } else if (!broke && s.bankruptShown) {
      s.bankruptShown = false;
      EC.store.save();
    }
  };

  /* ---------- Донат Егору ---------- */
  E.donate = (v) => {
    const s = S();
    v = U.int(v);
    if (v < 1 || v > s.balance) return false;
    s.balance -= v;
    s.totalDonated += v;
    s.totalDonations++;
    E.addXp(1);
    if (s.totalDonated >= 500) E.unlock('philanthropist');
    if (s.totalDonations >= 10) E.unlock('kalyadka');
    E.checkTitles();
    EC.store.commit('balance');
    return true;
  };

  /* ---------- Магазин косметики ---------- */
  E.buyShop = (id) => {
    const s = S(), it = C.SHOP.find((x) => x.id === id);
    if (!it || s.shopOwned[id]) return false;
    if (s.balance < it.p) return false;
    s.balance -= it.p;
    s.shopOwned[id] = true;
    s.shopEquipped[id] = true;
    EC.store.commit('shop');
    return true;
  };
  E.toggleShop = (id) => {
    const s = S();
    if (!s.shopOwned[id]) return;
    s.shopEquipped[id] = !s.shopEquipped[id];
    EC.store.commit('shop');
  };

  /* ---------- Навыки ---------- */
  E.upgradeSkill = (id) => {
    const s = S(), sk = C.SKILLS.find((x) => x.id === id);
    if (!sk || s.skillPoints < 1 || s.skills[id] >= sk.max) return false;
    s.skills[id]++;
    s.skillPoints--;
    if (EC.earn) EC.earn.recompute(s);
    EC.store.commit('skills');
    return true;
  };

  EC.econ = E;
})(globalThis.EC = globalThis.EC || {});
