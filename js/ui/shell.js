/* Оболочка игрового экрана: шапка стола + панель ставки (общая для всех игр). */
(function (EC) {
  'use strict';
  const U = EC.util, UI = EC.ui, C = EC.config, html = U.html;
  const S = () => EC.store.state;

  let current = null;

  function defaultBet(id) {
    const s = S(), min = EC.econ.minBet();
    let v = U.num(s.lastBets && s.lastBets[id]);
    if (!v) v = Math.floor(s.balance * 0.05);
    v = Math.max(min, v);
    if (v > s.balance) v = s.balance;
    return Math.max(1, v);
  }

  function metaHTML(id) {
    const s = S(), ev = EC.econ.week(), vip = C.VIP[EC.econ.vipLevel()];
    return html`
      <div><span>Мин. ставка</span><span class="num">${U.fmt(EC.econ.minBet())} E</span></div>
      <div><span>VIP</span><span>${vip.n}</span></div>
      <div><span>${ev.n}</span><span class="num">${ev.m !== 1 ? '+' + Math.round((ev.m - 1) * 100) + '%' : '×1'}</span></div>
      <div><span>Сыграно здесь</span><span class="num">${U.fmt(s.gamesBy[id] || 0)}</span></div>`;
  }

  const SH = {};

  SH.mount = (root, cfg) => {
    SH.unmount();
    const g = C.GAMES.find((x) => x.id === cfg.id);
    root.innerHTML = String(html`
      <div class="game-head">
        <button class="btn b-gho" data-go="home">← Столы</button>
        <div class="ttl"><h1 class="h-screen">${g.n}</h1><p>${cfg.sub || g.d}</p></div>
        <div class="brow">
          <button class="btn b-gho sm" data-act="rules">Правила</button>
          <button class="btn b-sec sm" data-act="turbo" title="Скорость анимаций (клавиша T)">Турбо ×${S().turbo}</button>
        </div>
      </div>
      <div class="game-layout">
        <section class="table" aria-label="Стол">${cfg.table}</section>
        <aside class="bet-panel" aria-label="Ставка">
          <div class="field">
            <label class="label" for="betIn">${cfg.betLabel || 'Ставка'} <span class="num" id="betHint"></span></label>
            <input id="betIn" class="inp" type="number" inputmode="numeric" min="1" step="1" autocomplete="off">
          </div>
          <div class="chips" role="group" aria-label="Быстрая ставка">
            <button class="chip" data-bet="min">Мин</button>
            <button class="chip" data-bet="half">½</button>
            <button class="chip" data-bet="double">×2</button>
            <button class="chip" data-bet="q">25%</button>
            <button class="chip" data-bet="max">Всё</button>
          </div>
          <div class="bet-extra">${cfg.extra || ''}</div>
          <button class="btn b-pri lg block" data-act="primary" id="primaryBtn">${cfg.primary || 'Играть'}</button>
          <button class="btn b-pri lg dock" data-act="primary" id="dockBtn" aria-hidden="true" tabindex="-1">${cfg.primary || 'Играть'}</button>
          <div class="result" id="result" aria-live="polite"></div>
          ${cfg.auto ? html`<div class="auto-row">
            <span class="label" id="autoLbl">Автоигра</span>
            <button class="chip" data-auto="5">×5</button>
            <button class="chip" data-auto="10">×10</button>
            <button class="chip" data-auto="25">×25</button>
            <button class="chip" data-auto="0" hidden id="autoStop">Стоп</button>
          </div>` : ''}
          <div class="meta-list" id="betMeta">${metaHTML(cfg.id)}</div>
        </aside>
      </div>`);

    const input = UI.$('#betIn', root);
    input.value = defaultBet(cfg.id);
    const primaryBtn = UI.$('#primaryBtn', root);

    const ctx = {
      id: cfg.id, root,
      table: UI.$('.table', root),
      $: (sel) => root.querySelector(sel),
      $$: (sel) => UI.$$(sel, root),
      cleanup: [],
      onPrimary: null,
      onKey: null,
      locked: false,
      auto: { left: 0 },
    };

    ctx.setBet = (v) => { input.value = Math.max(1, Math.floor(v)); };
    // Проверка ставки. need — во сколько раз больше ставки должно быть на балансе (холдем: ×3).
    ctx.readBet = (need = 1) => {
      const s = S(), min = EC.econ.minBet();
      const v = Math.floor(Number(input.value));
      const fail = (t, x) => {
        EC.bus.emit('note', { title: t, text: x, kind: 'info', icon: '!' });
        input.focus();
        return 0;
      };
      if (s.balance < min * need) return fail('Не хватает Егориков', 'Загляни в «Заработок» — там можно наботать');
      if (!Number.isFinite(v) || v < 1) return fail('Введи ставку', 'Целое число от ' + U.fmt(min) + ' E');
      if (v < min) return fail('Слишком мало', 'Минимальная ставка для твоего VIP — ' + U.fmt(min) + ' E');
      if (v * need > s.balance) {
        return fail('Слишком много', need > 1 ? `Нужно ${need}× ставки на балансе: ${U.fmt(v * need)} E` : 'На балансе ' + U.fmt(s.balance) + ' E');
      }
      s.lastBets[cfg.id] = v;
      return v;
    };
    const dockBtn = UI.$('#dockBtn', root);
    ctx.setPrimary = (text, { disabled = false } = {}) => {
      if (text != null) { primaryBtn.textContent = text; dockBtn.textContent = text; }
      primaryBtn.disabled = disabled;
      dockBtn.disabled = disabled;
    };
    // На телефоне: если главная кнопка ушла за экран, показываем её копию внизу.
    if (globalThis.IntersectionObserver) {
      const io = new IntersectionObserver(([en]) => {
        const show = !en.isIntersecting;
        dockBtn.classList.toggle('show', show);
        document.body.classList.toggle('dock-on', show && matchMedia('(max-width: 860px)').matches);
      });
      io.observe(primaryBtn);
      ctx.cleanup.push(() => { io.disconnect(); document.body.classList.remove('dock-on'); });
    }
    ctx.lock = (on) => {
      ctx.locked = on;
      input.disabled = on;
      UI.$$('[data-bet]', root).forEach((b) => { b.disabled = on; });
    };
    ctx.result = (res, label) => {
      const el = UI.$('#result', root);
      if (!res) { el.innerHTML = ''; return; }
      const cls = res.kind === 'win' ? 't-win' : res.kind === 'loss' ? 't-los' : 't-push';
      const amt = res.kind === 'win' ? '+' + U.fmt(res.net) + ' E' : res.kind === 'loss' ? '−' + U.fmt(-res.net) + ' E' : '±0 E';
      const extra = res.boost ? ` · ивент +${U.fmt(res.boost)}` : '';
      el.innerHTML = String(html`<div class="toast ${cls}"><b>${amt}</b><span>${label || ''}${extra}</span></div>`);
    };

    /* ---------- Автоигра ---------- */
    const autoUI = () => {
      const lbl = UI.$('#autoLbl', root), stop = UI.$('#autoStop', root);
      if (!lbl) return;
      lbl.textContent = ctx.auto.left > 0 ? 'Осталось: ' + ctx.auto.left : 'Автоигра';
      stop.hidden = ctx.auto.left <= 0;
      UI.$$('[data-auto]:not([data-auto="0"])', root).forEach((b) => { b.hidden = ctx.auto.left > 0; });
    };
    ctx.auto.stop = () => { ctx.auto.left = 0; clearTimeout(ctx.auto.t); autoUI(); };
    // Игра вызывает ctx.done() в конце каждого раунда — автоигра запускает следующий.
    ctx.done = () => {
      if (ctx.auto.left <= 0) return;
      ctx.auto.left--;
      autoUI();
      if (ctx.auto.left <= 0) return;
      const bet = Math.floor(Number(input.value));
      if (S().balance < bet) { ctx.auto.stop(); return; }
      ctx.auto.t = setTimeout(() => { if (current === ctx && !ctx.locked && ctx.onPrimary) ctx.onPrimary(); }, 500 / UI.speed());
    };

    const updHint = () => UI.text(UI.$('#betHint', root), 'мин ' + U.fmt(EC.econ.minBet()));
    updHint();

    root.onclick = (e) => {
      const b = e.target.closest('[data-bet],[data-act],[data-auto]');
      if (!b || b.disabled) return;
      const s = S(), min = EC.econ.minBet(), cur = Math.floor(Number(input.value)) || min;
      if (b.dataset.bet) {
        const k = b.dataset.bet;
        const v = k === 'min' ? min : k === 'half' ? cur / 2 : k === 'double' ? cur * 2 : k === 'q' ? s.balance * 0.25 : s.balance;
        ctx.setBet(U.clamp(Math.floor(v), Math.min(min, s.balance), Math.max(1, s.balance)));
        EC.sound.play('click');
      } else if (b.dataset.auto != null) {
        const n = +b.dataset.auto;
        if (!n) { ctx.auto.stop(); return; }
        ctx.auto.left = n;
        autoUI();
        if (!ctx.locked && ctx.onPrimary) ctx.onPrimary();
      } else if (b.dataset.act === 'primary') {
        if (ctx.onPrimary) ctx.onPrimary();
      } else if (b.dataset.act === 'turbo') {
        s.turbo = s.turbo === 1 ? 2 : s.turbo === 2 ? 4 : 1;
        EC.store.commit('settings');
        b.textContent = 'Турбо ×' + s.turbo;
      } else if (b.dataset.act === 'rules') {
        EC.modals.rules(cfg.id);
      }
      // Остальные data-act обрабатывает сама игра через ctx.onAct
      if (ctx.onAct && b.dataset.act && !['primary', 'turbo', 'rules'].includes(b.dataset.act)) ctx.onAct(b.dataset.act, b, e);
    };
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && ctx.onPrimary && !primaryBtn.disabled) ctx.onPrimary(); });

    const offChange = EC.bus.on('change', () => {
      const m = UI.$('#betMeta', root);
      if (m) UI.set(m, metaHTML(cfg.id));
      updHint();
    });
    ctx.cleanup.push(offChange);

    current = ctx;
    return ctx;
  };

  SH.unmount = () => {
    if (!current) return;
    const c = current;
    current = null;
    clearTimeout(c.auto.t);
    c.cleanup.forEach((f) => { try { f(); } catch (e) { console.error(e); } });
    c.root.onclick = null;
  };
  SH.current = () => current;

  EC.shell = SH;
})(globalThis.EC = globalThis.EC || {});
