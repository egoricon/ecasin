/* Точка входа: роутер по hash, режимы Казино/Заработок, клавиатура, тик пассивного дохода. */
(function (EC) {
  'use strict';
  const U = EC.util, UI = EC.ui, C = EC.config;
  const S = () => EC.store.state;
  const note = (title, text, icon = '!') => EC.fx.note({ title, text, icon });

  const VIEWS = ['homeView', 'gameView', 'donateView', 'earnView'];
  let route = null;        // { view, id }
  let ignoreHash = false;

  function parse(hash) {
    const h = String(hash || '').replace(/^#\/?/, '');
    const [a, b] = h.split('/');
    if (a === 'game' && EC.games[b]) return { view: 'game', id: b };
    if (a === 'donate') return { view: 'donate' };
    if (a === 'earn') return { view: 'earn' };
    return { view: 'home' };
  }
  const hashOf = (r) => (r.view === 'game' ? '#/game/' + r.id : r.view === 'home' ? '#/' : '#/' + r.view);
  const same = (a, b) => a && b && a.view === b.view && a.id === b.id;

  function show(r) {
    EC.shell.unmount();
    EC.earnView.unmount();
    route = r;
    const mode = r.view === 'earn' ? 'earn' : 'casino';
    document.body.dataset.mode = mode;
    if (S().mode !== mode) { S().mode = mode; EC.store.save(); }
    VIEWS.forEach((v) => UI.$('#' + v).classList.toggle('on', v === r.view + 'View'));
    if (r.view === 'home') EC.home.render(UI.$('#homeView'));
    else if (r.view === 'game') EC.games[r.id].mount(UI.$('#gameView'));
    else if (r.view === 'donate') EC.donate.render(UI.$('#donateView'));
    else if (r.view === 'earn') EC.earnView.render(UI.$('#earnView'));
    EC.header.update();
    const titles = { home: 'EGOR CASINO', earn: 'Ботать в БГУИР · EGOR CASINO', donate: 'Поддержи Егора · EGOR CASINO' };
    document.title = r.view === 'game' ? C.GAME_NAME[r.id] + ' · EGOR CASINO' : titles[r.view];
    window.scrollTo({ top: 0, behavior: UI.animOn() ? 'smooth' : 'auto' });
  }

  function go(target, force) {
    const r = typeof target === 'string' ? parse('#/' + target) : target;
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
    const r = parse(location.hash);
    if (same(r, route)) return;
    if (EC.econ.busy) { // «Назад» в браузере посреди раунда — возвращаем адрес
      ignoreHash = true;
      location.hash = hashOf(route);
      note('Сначала доиграй раунд', 'Ставка уже на столе');
      return;
    }
    show(r);
  });

  /* ---------- Глобальные кнопки data-go ---------- */
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-go]');
    if (!b || b.disabled) return;
    const g = b.dataset.go;
    EC.sound.play('click');
    switch (g) {
      case 'home': case 'casino': return go('');
      case 'earn': return go('earn');
      case 'donate': return go('donate');
      case 'game': return go('game/' + b.dataset.id);
      case 'random': {
        const g2 = U.pick(C.GAMES);
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
    if (typing || EC.modal.isOpen() || e.ctrlKey || e.metaKey || e.altKey) return;
    const ctx = EC.shell.current();
    if (e.key === ' ' && !e.repeat && t.tagName !== 'BUTTON') {
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

  /* ---------- Пассивный доход «Заработка» ---------- */
  let away = { gain: 0, sec: 0 };
  function showAway(gain, sec) {
    if (gain < 1 || sec < 60) return;
    if (!(route && route.view === 'earn' && EC.earnView.showOffline(gain, sec))) {
      EC.fx.note({ title: 'Пока тебя не было', text: 'Наботано +' + U.fmt(gain) + ' E', icon: '📚', kind: 'win' });
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

  // Главная перерисовывается при изменениях профиля/прогресса (не на каждый тик дохода).
  let homeRaf = 0;
  EC.bus.on('change', (what) => {
    if (!route || route.view !== 'home' || ['earn', 'balance', 'settings'].includes(what)) return;
    cancelAnimationFrame(homeRaf);
    homeRaf = requestAnimationFrame(() => { if (route.view === 'home') EC.home.render(UI.$('#homeView')); });
  });

  /* ---------- Прочие события ---------- */
  EC.bus.on('bankrupt', () => setTimeout(() => { if (!EC.modal.isOpen()) EC.modals.bankrupt(); }, 900));
  EC.bus.on('round', (on) => document.body.classList.toggle('in-round', on));
  EC.bus.on('profile-closed', () => {
    if (route && route.view === 'earn' && !S().tutorialShown) setTimeout(EC.modals.tutorial, 250);
  });

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

  /* ---------- Сброс прогресса ---------- */
  function reset() {
    if (EC.econ.busy) { note('Сначала доиграй раунд', 'Сброс — после расчёта ставки'); return; }
    EC.shell.unmount();
    EC.econ.busy = false;
    EC.store.state = EC.store.DEF();
    EC.store.state.lastTick = Date.now();
    EC.store.commit('all');
    go('', true);
    note('Всё с чистого листа', 'Баланс ' + U.fmt(C.START_BALANCE) + ' E', '↺');
    setTimeout(() => EC.modals.profile(true), 300);
  }

  /* ---------- Старт ---------- */
  function init() {
    const s = EC.store.load();
    EC.earn.recompute(s);
    EC.econ.recoverRound();
    EC.econ.refreshQuests();
    EC.econ.week();
    const off = EC.earn.accrue(Date.now(), false);
    EC.econ.checkTitles(true);
    EC.store.save();

    const start = location.hash ? parse(location.hash) : { view: s.mode === 'earn' ? 'earn' : 'home' };
    go(start, true);
    EC.header.tickOnline();
    EC.social.start();
    setInterval(tick, 1000);
    if (off.gain) showAway(off.offlineGain, off.offlineSec);
    if (!s.name) setTimeout(() => { if (!S().name) EC.modals.profile(true); }, 350);
  }

  EC.app = { go, reset, route: () => route };

  try {
    init();
  } catch (err) {
    console.error(err);
    const box = document.createElement('div');
    box.style.cssText = 'position:fixed;left:16px;right:16px;bottom:56px;z-index:999;padding:12px 16px;border-radius:10px;background:var(--coral-950);color:var(--tx);font:14px monospace';
    box.textContent = 'Ошибка запуска: ' + (err && err.message ? err.message : err);
    document.body.appendChild(box);
  }
})(globalThis.EC = globalThis.EC || {});
