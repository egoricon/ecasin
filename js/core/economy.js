/* Экономика и прогрессия. Единственная валюта — state.balance (общая для казино и «Заработка»).
   UI сюда не лезет: всё, что надо показать, уходит событиями в EC.bus ('note', 'win', 'loss', ...). */
(function (EC) {
  'use strict';
  const U = EC.util, C = EC.config;
  const S = () => EC.store.state;
  const note = (title, text, kind, icon) => EC.bus.emit('note', { title, text, kind, icon });

  const E = {};

  /* ---------- Что уже открыто (постепенное раскрытие) ---------- */
  E.casinoOpen = (s = S()) => !!s.progress.casinoUnlocked;
  // feature: quests | skills | shop | event | donate | vip | social | missions
  E.isOpen = (feature, s = S()) => {
    if (!E.casinoOpen(s)) return false;
    if (feature === 'vip') return U.num(s.totalWon) >= C.VIP_OPEN_AT;
    if (feature === 'social' || feature === 'missions') return true;
    const f = C.FEATURES.find((x) => x.id === feature);
    return !f || s.level >= f.lvl;
  };
  E.gameOpen = (id, s = S()) => {
    const g = C.GAMES.find((x) => x.id === id);
    return !!g && E.casinoOpen(s) && s.level >= g.lvl;
  };
  E.variantOpen = (v, s = S()) => !!C.SLOTS[v] && E.casinoOpen(s) && s.level >= C.SLOTS[v].lvl;

  /* ---------- Недельный ивент ---------- */
  E.week = () => {
    const s = S(), key = U.weekKey();
    if (s.weekEvent.weekId !== key) {
      const e = C.WEEK_EVENTS[Math.floor(U.seeded(key)() * C.WEEK_EVENTS.length)];
      s.weekEvent = { weekId: key, n: e.n, m: e.m, d: e.d };
    }
    return s.weekEvent;
  };
  // Множитель ивента действует, только когда ивент открыт (уровень 8).
  E.weekMult = () => (E.isOpen('event') ? E.week().m : 1);

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

  /* ---------- Уровни казино ---------- */
  // XP за раунд: 1 + floor(log10(ставки)), победа — вдвое больше.
  E.xpForRound = (bet, won) => (1 + Math.floor(Math.log10(Math.max(1, bet)))) * (won ? 2 : 1);
  E.xpMult = (s = S()) => (1 + 0.1 * (s.skills.xpBoost || 0)) * (s.shopEquipped.mascot ? 1.1 : 1);
  E.levelInfo = (s = S()) => {
    const from = C.xpForLevel(s.level), to = C.xpForLevel(s.level + 1);
    const into = Math.max(0, s.xp - from), need = to - from;
    return { level: s.level, into: Math.floor(into), need, pct: U.clamp((into / need) * 100, 0, 100), left: Math.ceil(to - s.xp) };
  };
  // Что открывается на уровне n — для тостов.
  E.unlocksAt = (n) => {
    const out = [];
    C.GAMES.filter((g) => g.lvl === n).forEach((g) => out.push({ kind: 'game', id: g.id, n: (g.kind === 'machine' ? 'Открыт автомат: ' : 'Открыт стол: ') + g.n, icon: g.glyph }));
    Object.entries(C.SLOTS).filter(([, v]) => v.lvl === n && n > 1).forEach(([id, v]) => out.push({ kind: 'variant', id, n: 'Открыт слот: ' + v.n, icon: '7' }));
    C.FEATURES.filter((f) => f.lvl === n).forEach((f) => out.push({ kind: 'feature', id: f.id, n: 'Открыто: ' + f.n, icon: f.i }));
    return out;
  };
  E.addXp = (n) => {
    const s = S();
    s.xp += U.num(n) * E.xpMult(s);
    const lvl = C.levelForXp(s.xp);
    while (s.level < lvl) {
      s.level++;
      s.skillPoints++;
      const bonus = C.LEVEL_REWARD * s.level;
      E.addMoney(bonus);
      note('Уровень ' + s.level, `+1 очко навыка · +${U.fmt(bonus)} E`, 'level', '⚡');
      if (E.casinoOpen(s)) E.unlocksAt(s.level).forEach((u) => note(u.n, u.kind === 'game' ? 'Загляни в лобби' : '', 'unlock', u.icon));
      EC.bus.emit('sound', 'level');
      EC.bus.emit('levelup', s.level);
    }
  };

  /* ---------- Достижения ---------- */
  // Казино-достижения дают +100 E. Учебные — без денег: иначе они ломают выверенный темп старта.
  E.achReward = (a) => (a.cat === 'study' ? 0 : C.ACH_REWARD);
  E.unlock = (id) => {
    const s = S();
    if (s.ach[id] !== false) return; // уже открыто или неизвестный id
    s.ach[id] = true;
    const a = C.ACH.find((x) => x.id === id);
    const r = E.achReward(a);
    E.addMoney(r);
    note('Достижение: ' + a.n, a.d + (r ? ` · +${r} E` : ''), 'ach', '★');
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
    if (!E.isOpen('quests')) return;
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
    const allIn = bet > 0 && bet >= s.balance;
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
    const m = E.weekMult();
    let boost = 0;
    // Целочисленно, чтобы 100 × 0.2 не превращалось в 19.999…
    if (pay > bet && m !== 1) boost = Math.floor(((pay - bet) * Math.round((m - 1) * 1000)) / 1000);
    pay += boost;
    const net = pay - bet;
    const game = meta.game;
    const xpBet = meta.nominal || bet; // бесплатный спин качает как обычная ставка

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
      E.addXp(E.xpForRound(xpBet, true));
      E.unlock('first_win');
      if (net >= 1000) E.unlock('big_win');
      if (meta.allIn) E.unlock('all_in');
      E.tickQuest('win');
      const nv = E.vipLevel();
      if (nv > s.vip) {
        s.vip = nv;
        note('VIP: ' + C.VIP[nv].n, `Открыты VIP-уровни · минимальная ставка теперь ${C.VIP[nv].minBet} E`, 'win', '👑');
      }
    } else if (net < 0) {
      kind = 'loss';
      s.losses++;
      E.addXp(E.xpForRound(xpBet, false));
    } else {
      kind = 'push';
      s.pushes++;
      E.addXp(E.xpForRound(xpBet, false));
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

  /* ---------- «Отчислен из казино»: не хватает даже на минимальную ставку ---------- */
  E.checkBankrupt = () => {
    const s = S();
    const broke = E.casinoOpen(s) && s.balance < E.minBet() && s.games > 0 && !s.progress.freeSpinsLeft;
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
    EC.store.commit('skills');
    return true;
  };

  /* ---------- Пропуск в подвал: открывает казино ---------- */
  E.canBuyPass = (s = S()) => !s.progress.passBought && s.earnTotal >= C.EARN.door.rumors;
  E.buyPass = () => {
    const s = S();
    if (!E.canBuyPass(s) || s.balance < C.EARN.door.pass) return false;
    s.balance -= C.EARN.door.pass;
    s.progress.passBought = true;
    s.progress.casinoUnlocked = true;
    s.progress.freeSpinsLeft = C.EARN.freeSpins.count;
    E.unlock('pass');
    EC.store.commit('casino');
    return true;
  };
  // Ставка бесплатного спина: 10% баланса, но не меньше 10 E.
  E.freeSpinBet = (s = S()) => Math.max(C.EARN.freeSpins.min, Math.floor(s.balance * C.EARN.freeSpins.share));

  EC.econ = E;
})(globalThis.EC = globalThis.EC || {});
