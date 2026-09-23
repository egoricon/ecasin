/* Точка входа: роутер по hash, режимы «Ботать» (учёба, тема БГУИР) и «Депать» (казино, неон),
   клавиатура, тик пассивного дохода, обучение, сцена открытия казино, реферальная ссылка. */
(function (EC) {
  'use strict';
  const U = EC.util, UI = EC.ui, C = EC.config;
  const S = () => EC.store.state;
  const note = (title, text, icon = '!') => EC.fx.note({ title, text, icon });

  const VIEWS = ['homeView', 'gameView', 'donateView', 'studyView'];
  let route = null;        // { view, id }
  let ignoreHash = false;

  function parse(hash) {
    const h = String(hash || '').replace(/^#\/?/, '');
    const [a, b] = h.split('/');
    if (a === 'game' && EC.games[b]) return { view: 'game', id: b };
    if (a === 'donate') return { view: 'donate' };
    if (a === 'study' || a === 'earn') return { view: 'study' };
    return { view: 'home' };
  }
  const hashOf = (r) => (r.view === 'game' ? '#/game/' + r.id : r.view === 'home' ? '#/' : '#/' + r.view);
  const same = (a, b) => a && b && a.view === b.view && a.id === b.id;
  const modeOf = (r) => (r && r.view === 'study' ? 'study' : 'casino');

  // Куда реально можно попасть: закрытое казино, стол или донат ведут на доступный экран.
  function resolve(r, loud) {
    const E = EC.econ;
    if (r.view !== 'study' && !E.casinoOpen()) {
      if (loud) note('Казино пока закрыто', 'Слухи ведут в подвал общаги — копи Егорики на учёбе', '🚪');
      return { view: 'study' };
    }
    if (r.view === 'game' && !E.gameOpen(r.id)) {
      const g = C.GAMES.find((x) => x.id === r.id);
      if (loud && g) note('Стол закрыт', g.n + ' откроется на уровне ' + g.lvl, '🔒');
      return { view: 'home' };
    }
    if (r.view === 'donate' && !E.isOpen('donate')) return { view: 'home' };
    return r;
  }

  function setTheme(t) {
    document.documentElement.dataset.theme = t;
    const meta = UI.$('#themeColor');
    if (meta) meta.content = t === 'neon' ? '#07060D' : '#FFFFFF';
    EC.header.update();
  }

  function show(r) {
    EC.shell.unmount();
    EC.studyView.unmount();
    if (r.view !== 'study') EC.coach.stop();
    route = r;
    const mode = modeOf(r), p = S().progress;
    if (!EC.scene.running()) setTheme(mode === 'casino' ? 'neon' : 'bsuir');
    if (p.casinoUnlocked && p.mode !== mode) { p.mode = mode; EC.store.save(); }
    if (r.view === 'game' && !p.seenUnlocks[r.id]) { p.seenUnlocks[r.id] = true; EC.store.save(); }
    VIEWS.forEach((v) => UI.$('#' + v).classList.toggle('on', v === r.view + 'View'));
    if (r.view === 'home') EC.home.render(UI.$('#homeView'));
    else if (r.view === 'game') EC.games[r.id].mount(UI.$('#gameView'));
    else if (r.view === 'donate') EC.donate.render(UI.$('#donateView'));
    else if (r.view === 'study') EC.studyView.render(UI.$('#studyView'));
    EC.social.setVisible(mode === 'casino' && EC.econ.casinoOpen());
    EC.header.update();
    const titles = { home: 'Егор Казино', study: 'Сессия в БГУИР · Егор Казино', donate: 'Поддержи Егора · Егор Казино' };
    document.title = r.view === 'game' ? C.GAME_NAME[r.id] + ' · Егор Казино' : titles[r.view];
    window.scrollTo({ top: 0, behavior: 'auto' });
    track('view/' + (r.view === 'game' ? r.id : r.view));
    if (r.view === 'study') maybeCoach();
  }

  function go(target, force) {
    let r = typeof target === 'string' ? parse('#/' + target) : target;
    r = resolve(r, true);
    if (!force && same(r, route)) return;
    if (EC.econ.busy && !same(r, route)) { note('Сначала доиграй раунд', 'Ставка уже на столе'); return; }
    const h = hashOf(r);
    if (location.hash !== h) {
      ignoreHash = true;
      location.hash = h;
    }
    show(r);
  }

  window.addEventListener('hashchange', () => {
    if (ignoreHash) { ignoreHash = false; return; }
    const r = resolve(parse(location.hash), true);
    if (same(r, route)) { if (location.hash !== hashOf(r)) history.replaceState(null, '', hashOf(r)); return; }
    if (EC.econ.busy) { // «Назад» в браузере посреди раунда — возвращаем адрес
      ignoreHash = true;
      location.hash = hashOf(route);
      note('Сначала доиграй раунд', 'Ставка уже на столе');
      return;
    }
    if (location.hash !== hashOf(r)) history.replaceState(null, '', hashOf(r));
    show(r);
  });

  /* ---------- Глобальные кнопки data-go ---------- */
  const GATED = { shop: 'shop', skills: 'skills', donate: 'donate' };
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-go]');
    if (!b || b.disabled) return;
    const g = b.dataset.go;
    EC.sound.play('click');
    if (GATED[g] && !EC.econ.isOpen(GATED[g])) return;
    switch (g) {
      case 'home': return go(modeOf(route) === 'study' ? 'study' : '');
      case 'casino': return go('');
      case 'study': case 'earn': return go('study');
      case 'donate': return go('donate');
      case 'game': return go('game/' + b.dataset.id);
      case 'locked': {
        const gm = C.GAMES.find((x) => x.id === b.dataset.id);
        return note('Стол закрыт', gm.n + ' откроется на уровне ' + gm.lvl, '🔒');
      }
      case 'random': {
        const open = C.GAMES.filter((x) => EC.econ.gameOpen(x.id));
        const g2 = U.pick(open);
        note('Случайный стол', g2.n, '✦');
        return go('game/' + g2.id);
      }
      default:
        if (EC.modals[g]) EC.modals[g]();
    }
  });

  /* ---------- Клавиатура ---------- */
  document.addEventListener('keydown', (e) => {
    const t = e.target, typing = /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName);
    if (e.key === 'Escape') {
      if (EC.modal.isOpen() && !EC.modal.isLocked()) EC.modal.close();
      return;
    }
    if (typing || EC.modal.isOpen() || EC.scene.running() || e.ctrlKey || e.metaKey || e.altKey) return;
    const ctx = EC.shell.current();
    if (e.key === ' ' && !e.repeat && t.tagName !== 'BUTTON') {
      if (route && route.view === 'study') { e.preventDefault(); const z = UI.$('#clk'); if (z) z.click(); return; }
      if (ctx && ctx.onPrimary) { e.preventDefault(); ctx.onPrimary(); }
      return;
    }
    if ((e.key === 't' || e.key === 'T' || e.key === 'е' || e.key === 'Е') && ctx) {
      const s = S();
      s.turbo = s.turbo === 1 ? 2 : s.turbo === 2 ? 4 : 1;
      EC.store.commit('settings');
      const tb = ctx.$('[data-act="turbo"]');
      if (tb) tb.textContent = 'Турбо ×' + s.turbo;
      note('Турбо ×' + s.turbo, 'Скорость анимаций', '⚡');
      return;
    }
    if (ctx && ctx.onKey && ctx.onKey(e)) e.preventDefault();
  });

  /* ---------- Пассивный доход ---------- */
  let away = { gain: 0, sec: 0 };
  function showAway(gain, sec) {
    if (gain < 1 || sec < 60) return;
    if (!(route && route.view === 'study' && EC.studyView.showOffline(gain, sec))) {
      EC.fx.note({ title: 'Пока тебя не было', text: 'Сосед и кофе наботали +' + U.big(gain) + ' E', icon: '📚', kind: 'win' });
    }
  }
  function tick() {
    const visible = document.visibilityState === 'visible';
    const r = EC.earn.accrue(Date.now(), visible);
    if (!visible) { away.gain += r.gain; away.sec += r.offlineSec; }
    if (r.gain > 0) EC.store.touch('earn');
    else if (Date.now() - (tick.saved || 0) > 10000) { tick.saved = Date.now(); EC.store.save(); }
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      EC.earn.accrue(Date.now(), true);
      EC.store.save();
      away = { gain: 0, sec: 0 };
    } else {
      const r = EC.earn.accrue(Date.now(), false);
      away.gain += r.gain; away.sec += r.offlineSec;
      if (r.gain) EC.store.touch('earn');
      showAway(away.gain, away.sec);
      away = { gain: 0, sec: 0 };
    }
  });
  window.addEventListener('pagehide', () => { EC.earn.accrue(Date.now(), true); EC.store.save(); });
  window.addEventListener('beforeunload', (e) => {
    EC.store.save();
    if (EC.econ.busy) { e.preventDefault(); e.returnValue = ''; }
  });

  // Лобби перерисовывается при изменениях прогресса (не на каждый тик дохода).
  let homeRaf = 0;
  EC.bus.on('change', (what) => {
    if (!route || route.view !== 'home' || ['earn', 'balance', 'settings'].includes(what)) return;
    cancelAnimationFrame(homeRaf);
    homeRaf = requestAnimationFrame(() => { if (route.view === 'home') EC.home.render(UI.$('#homeView')); });
  });

  /* ---------- Обучение и открытие казино ---------- */
  function maybeCoach() {
    const s = S();
    if (!s.name || EC.modal.isOpen() || EC.scene.running() || s.progress.tutorialStep >= 4) return;
    if (route && route.view === 'study') setTimeout(() => { if (route.view === 'study' && !EC.modal.isOpen()) EC.coach.start(); }, 250);
  }
  EC.bus.on('profile-closed', maybeCoach);
  EC.bus.on('pass-bought', () => {
    EC.coach.stop();
    track('event/pass-bought');
    EC.scene.unlockCasino(() => {
      const p = S().progress;
      p.unlockSceneSeen = true;
      p.mode = 'casino';
      EC.store.commit('casino');
      go('', true);
      note('Подарок новичку', `${p.freeSpinsLeft} бесплатных спина на «Классике»`, '🎁');
    });
  });

  /* ---------- Прочие события ---------- */
  EC.bus.on('bankrupt', () => setTimeout(() => { if (!EC.modal.isOpen()) EC.modals.bankrupt(); }, 900));
  EC.bus.on('round', (on) => document.body.classList.toggle('in-round', on));

  /* ---------- Страховка: ошибка посреди раунда не должна запереть игрока ---------- */
  function rescue(err) {
    console.error(err);
    if (!EC.econ.busy) return;
    EC.econ.busy = false;
    EC.econ.recoverRound();
    EC.store.commit('balance');
    EC.bus.emit('round', false);
    if (EC.modal.isLocked()) EC.modal.close(true);
    if (route && route.view === 'game') show(route);
  }
  window.addEventListener('error', (e) => rescue(e.error || e.message));
  window.addEventListener('unhandledrejection', (e) => rescue(e.reason));

  /* ---------- Сброс прогресса (из настроек): как новый игрок ---------- */
  function reset() {
    if (EC.econ.busy) { note('Сначала доиграй раунд', 'Сброс — после расчёта ставки'); return; }
    EC.shell.unmount();
    EC.coach.stop();
    EC.econ.busy = false;
    EC.store.state = EC.store.DEF();
    EC.store.state.lastTick = Date.now();
    EC.store.commit('all');
    go('study', true);
    note('Всё с чистого листа', 'Снова первокурсник', '↺');
    setTimeout(() => EC.modals.profile(true), 300);
  }
  function restartTutorial() {
    EC.coach.restart();
    EC.modal.close(true);
    if (route && route.view === 'study') { EC.studyView.render(UI.$('#studyView')); maybeCoach(); } else go('study', true);
  }

  /* ---------- Реферальная ссылка ?ref=Имя: бонус только новому игроку ---------- */
  function handleRef(isNew) {
    const params = new URLSearchParams(location.search);
    const raw = params.get(C.REF.param);
    if (raw == null) return;
    params.delete(C.REF.param);
    const q = params.toString();
    history.replaceState(null, '', location.pathname + (q ? '?' + q : '') + location.hash); // чистая ссылка
    const ref = raw.replace(/[<>"'`]/g, '').trim().slice(0, 20);
    const s = S();
    if (!ref || !isNew || s.refBonusGiven) return;
    s.refBy = ref;
    s.refBonusGiven = true;
    EC.econ.addMoney(C.REF.bonus);
    setTimeout(() => note('Тебя позвал ' + ref, 'Держи ' + U.fmt(C.REF.bonus) + ' E на старт', '🤝', 'win'), 900);
    track('event/ref');
  }

  /* ---------- Приватная аналитика (включается в config.js) ---------- */
  function track(path) {
    const gc = globalThis.goatcounter;
    if (gc && gc.count) gc.count({ path, title: path, event: path.startsWith('event/') });
  }
  function initAnalytics() {
    const url = C.ANALYTICS.goatcounter;
    if (!url) return;
    const sc = document.createElement('script');
    sc.async = true;
    sc.src = 'https://gc.zgo.at/count.js';
    sc.dataset.goatcounter = url;
    sc.dataset.goatcounterSettings = '{"no_onload": true}';
    sc.onload = () => track('view/' + (route ? route.view : 'start'));
    document.head.appendChild(sc);
  }

  // Шрифты обеих тем (латиница + кириллица) грузим в фоне: сцена и переключатель режимов — без мигания.
  function preloadFonts() {
    if (!document.fonts || !document.fonts.load) return;
    const text = 'ЕГОР КАЗИНО Ботать Депать Egor 0123456789 E';
    ['16px "Russo One"', '16px Onest', '600 16px Onest', '500 16px "JetBrains Mono"',
      '16px "PT Serif"', '700 16px "PT Serif"', '16px "PT Sans"', '700 16px "PT Sans"', '16px "PT Mono"']
      .forEach((f) => document.fonts.load(f, text).catch(() => {}));
  }

  /* ---------- Старт ---------- */
  function init() {
    let isNew = true;
    try { isNew = localStorage.getItem(C.STORAGE_KEY) === null; } catch (e) { /* приватный режим */ }
    const s = EC.store.load();
    EC.econ.recoverRound();
    EC.econ.refreshQuests();
    EC.econ.week();
    const off = EC.earn.accrue(Date.now(), false);
    EC.econ.checkTitles(true);
    handleRef(isNew);
    EC.store.save();

    const start = location.hash ? parse(location.hash) : { view: s.progress.casinoUnlocked && s.progress.mode === 'casino' ? 'home' : 'study' };
    EC.social.start();
    go(start, true);
    EC.header.tickOnline();
    setInterval(tick, 1000);
    if (off.gain) showAway(off.offlineGain, off.offlineSec);
    if (!s.name) setTimeout(() => { if (!S().name) EC.modals.profile(true); }, 350);
    initAnalytics();
    requestAnimationFrame(() => { const b = UI.$('#boot'); if (b) b.classList.add('gone'); });
    setTimeout(preloadFonts, 1500);
  }

  EC.app = { go, reset, restartTutorial, setTheme, route: () => route, mode: () => modeOf(route), track };

  try {
    init();
  } catch (err) {
    console.error(err);
    const bt = UI.$('#boot');
    if (bt) bt.classList.add('gone');
    const box = document.createElement('div');
    box.style.cssText = 'position:fixed;left:16px;right:16px;bottom:56px;z-index:999;padding:12px 16px;border-radius:10px;background:var(--coral-950);color:var(--n-0);font:14px monospace';
    box.textContent = 'Ошибка запуска: ' + (err && err.message ? err.message : err);
    document.body.appendChild(box);
  }
})(globalThis.EC = globalThis.EC || {});
