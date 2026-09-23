/* Состояние игрока + шина событий.
   Главный паттерн: load() = сохранённое поверх DEF(). Новые поля просто появляются в DEF —
   старые сейвы получают их значения по умолчанию, без версий и миграционных скриптов. */
(function (EC) {
  'use strict';
  const U = EC.util, C = EC.config;

  /* ---------- Шина событий ---------- */
  const handlers = {};
  EC.bus = {
    on(ev, fn) { (handlers[ev] = handlers[ev] || []).push(fn); return () => this.off(ev, fn); },
    off(ev, fn) { handlers[ev] = (handlers[ev] || []).filter((f) => f !== fn); },
    emit(ev, data) { (handlers[ev] || []).slice().forEach((f) => { try { f(data); } catch (e) { console.error(e); } }); },
  };

  const byId = (list, v) => Object.fromEntries(list.map((x) => [x.id, v]));

  function DEF() {
    return {
      // профиль
      name: '', avatar: 0, nameBonusGiven: false,
      title: '', titleManual: false, titlesSeen: [],
      // деньги и статистика казино
      balance: C.START_BALANCE,
      totalBet: 0, totalWon: 0, biggestWin: 0,
      games: 0, wins: 0, losses: 0, pushes: 0,
      gamesBy: byId(C.GAMES, 0),
      hist: [],
      // прогрессия
      xp: 0, level: 1, skillPoints: 0,
      skills: byId(C.SKILLS, 0),
      vip: 0,
      ach: byId(C.ACH, false),
      missions: byId(C.MISSIONS, 0),
      missionDone: byId(C.MISSIONS, false),
      questsDate: '', quests: [], questsProgress: {},
      weekEvent: { weekId: '', n: '', m: 1, d: '' },
      // магазин
      shopOwned: byId(C.SHOP, false),
      shopEquipped: byId(C.SHOP, false),
      // донат и пасхалки
      totalDonations: 0, totalDonated: 0, gorillaFound: false,
      // игры
      slotVariant: 'classic', megaStreak: 0, pendingBonus: false, bonusGames: 0,
      rouletteHistory: [], diceHistory: [], crashHistory: [], baccaratHistory: [],
      lastBets: {},
      crashAuto: 2,
      pendingRound: null,
      bankruptShown: false,
      // режим «Заработок»
      mode: 'casino',
      clickPower: C.EARN.baseClick, eps: 0,
      clickerLvl: byId(C.EARN.upgrades, 0),
      lastTick: 0, earnFrac: 0, earnTotal: 0, clicks: 0, upgradesBought: 0,
      tutorialShown: false,
      // настройки
      sound: true, volumeMaster: 0.7, volumeSfx: 1, volumeUi: 0.8,
      anim: true, turbo: 1,
      chatOpen: false,
    };
  }

  const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);

  // Рекурсивно: значения из src поверх def. Типы защищены: число не станет строкой и т. п.
  function mergeOver(def, src) {
    if (!isObj(src)) return def;
    const out = def;
    for (const k of Object.keys(src)) {
      const d = def[k], s = src[k];
      if (isObj(d)) out[k] = isObj(s) ? mergeOver(d, s) : d;
      else if (Array.isArray(d)) out[k] = Array.isArray(s) ? s : d;
      else if (typeof d === 'number') out[k] = typeof s === 'number' && Number.isFinite(s) ? s : d;
      else if (typeof d === 'boolean') out[k] = typeof s === 'boolean' ? s : d;
      else if (typeof d === 'string') out[k] = typeof s === 'string' ? s : d;
      else out[k] = s; // null по умолчанию (pendingRound) и новые неизвестные поля
    }
    return out;
  }

  // Старые сейвы хранили ach/shop массивами по индексу.
  function migrateLegacy(raw) {
    if (!isObj(raw)) return {};
    const r = Object.assign({}, raw);
    const arrToIds = (arr, list) => Object.fromEntries(list.map((x, i) => [x.id, !!arr[i]]));
    if (Array.isArray(r.ach)) r.ach = arrToIds(r.ach, C.ACH);
    if (Array.isArray(r.shopOwned)) {
      const shift = r.shopOwned.length === 7 ? 1 : 0; // самая старая версия: 7 предметов, нужные 1..5
      r.shopOwned = arrToIds(r.shopOwned.slice(shift), C.SHOP);
    }
    if (Array.isArray(r.shopEquipped)) {
      const shift = r.shopEquipped.length === 7 ? 1 : 0;
      r.shopEquipped = arrToIds(r.shopEquipped.slice(shift), C.SHOP);
    }
    if (typeof r.vip === 'boolean') r.vip = r.vip ? 1 : 0;
    // В старой версии титул выбирали руками — не перетираем его автоматически.
    if (r.title && r.titleManual === undefined) r.titleManual = true;
    // Старые квесты были объектами — просто перегенерируем на сегодня.
    if (Array.isArray(r.quests) && r.quests.some((q) => typeof q !== 'string')) {
      r.quests = []; r.questsDate = ''; r.questsProgress = {};
    }
    return r;
  }

  function normalize(s) {
    s.balance = Math.max(0, Math.floor(U.num(s.balance, C.START_BALANCE)));
    s.level = Math.max(1, Math.floor(s.level));
    if (s.avatar < 0 || s.avatar >= C.AVATARS.length) s.avatar = 0;
    if (!C.SLOTS[s.slotVariant]) s.slotVariant = 'classic';
    if (![1, 2, 4].includes(s.turbo)) s.turbo = 1;
    if (s.mode !== 'earn') s.mode = 'casino';
    s.name = String(s.name || '').slice(0, 20);
    for (const k of ['volumeMaster', 'volumeSfx', 'volumeUi']) s[k] = U.clamp(s[k], 0, 1);
    for (const sk of C.SKILLS) {
      s.skills[sk.id] = U.clamp(Math.floor(U.num(s.skills[sk.id])), 0, sk.max);
    }
    for (const up of C.EARN.upgrades) {
      s.clickerLvl[up.id] = Math.max(0, Math.floor(U.num(s.clickerLvl[up.id])));
    }
    s.hist = s.hist.slice(0, 20);
    return s;
  }

  function fromRaw(raw) {
    return normalize(mergeOver(DEF(), migrateLegacy(raw)));
  }

  function load() {
    try {
      const raw = JSON.parse(globalThis.localStorage.getItem(C.STORAGE_KEY) || '{}');
      return fromRaw(raw);
    } catch (e) {
      return DEF();
    }
  }

  EC.store = {
    DEF, fromRaw, mergeOver, migrateLegacy,
    state: null,
    load() { this.state = load(); return this.state; },
    save() {
      try { globalThis.localStorage.setItem(C.STORAGE_KEY, JSON.stringify(this.state)); } catch (e) { /* приватный режим */ }
    },
    // Изменил state → commit(): сохранить и оповестить подписчиков (шапка, текущий экран).
    commit(what = 'state') {
      clearTimeout(this._saveT);
      this.save();
      EC.bus.emit('change', what);
    },
    // Для частых изменений (клики, тики дохода): оповестить сразу, сохранить чуть позже.
    touch(what = 'balance') {
      clearTimeout(this._saveT);
      this._saveT = setTimeout(() => this.save(), 800);
      EC.bus.emit('change', what);
    },
    replace(raw) {
      this.state = fromRaw(raw);
      this.commit('all');
    },
  };
})(globalThis.EC = globalThis.EC || {});
