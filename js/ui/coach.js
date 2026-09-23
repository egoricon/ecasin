/* Обучение с подсветкой (coach marks). Шаг хранится в progress.tutorialStep (0–3, 4 = пройдено).
   Затемнение — SVG с вырезами: клики вне выреза блокируются, внутри — проходят к элементу.
   Каждый шаг ждёт действия игрока, а не нажатия «Далее». */
(function (EC) {
  'use strict';
  const U = EC.util, UI = EC.ui, html = U.html;
  const S = () => EC.store.state;
  const P = () => S().progress;
  const TOTAL = 4;

  const konspekt = () => EC.earn.upgrade('konspekt');
  const coffee = () => EC.earn.upgrade('coffee');

  // holes — что подсвечено и кликабельно; main — к чему привязана подсказка.
  const STEPS = [
    {
      holes: () => ['#clk'],
      main: '#clk',
      text: () => {
        const n = Math.min(10, S().clicks - base.clicks);
        return html`<b>Жми, чтобы ботать</b><p>Каждый клик — Егорик. Ботай <span class="num">${n} / 10</span></p>`;
      },
      done: () => S().clicks - base.clicks >= 10,
    },
    {
      holes: () => (S().balance >= EC.earn.cost(konspekt(), 0) ? ['[data-up-row="konspekt"]'] : ['#clk']),
      main: () => (S().balance >= EC.earn.cost(konspekt(), 0) ? '[data-up-row="konspekt"]' : '#clk'),
      text: () => (S().balance >= EC.earn.cost(konspekt(), 0)
        ? html`<b>Хватает на конспект</b><p>Купи — клик станет сильнее.</p>`
        : html`<b>Почти хватает на конспект</b><p>Он стоит <span class="num">${EC.earn.cost(konspekt(), 0)} E</span> — поботай ещё немного.</p>`),
      done: () => (S().clickerLvl.konspekt || 0) > 0,
    },
    {
      holes: () => ['#vedLife', '#clk'],
      main: '#vedLife',
      text: () => html`<b>Кофе ботает за тебя</b><p>Даже когда тебя нет. Кофе стоит <span class="num">${EC.earn.cost(coffee(), 0)} E</span> — копи зачёткой и покупай в «Быте».</p>`,
      done: () => (S().clickerLvl.coffee || 0) > 0 || Date.now() - base.t > 60000,
    },
    {
      holes: () => ['#door'],
      main: '#door',
      text: () => html`<b>Подвал общаги</b><p>Говорят, в подвале общаги что-то есть. Копи — узнаешь.</p>`,
      button: 'Понятно',
      done: () => false, // закрывается кнопкой
    },
  ];

  let el = null, raf = 0, timer = 0, base = { clicks: 0, t: 0 }, offs = [];

  const sel = (x) => (typeof x === 'function' ? x() : x);
  const step = () => STEPS[P().tutorialStep];

  function rrect(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    return `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
  }

  function layout() {
    if (!el) return;
    const st = step();
    if (!st) return;
    const W = innerWidth, H = innerHeight, pad = 8;
    const rects = sel(st.holes).map((q) => UI.$(q)).filter(Boolean).map((n) => n.getBoundingClientRect())
      .map((r) => ({ x: r.left - pad, y: r.top - pad, w: r.width + pad * 2, h: r.height + pad * 2 }));
    const d = `M0 0H${W}V${H}H0Z` + rects.map((r) => rrect(r.x, r.y, r.w, r.h, 12)).join('');
    el.querySelector('path').setAttribute('d', d);
    el.querySelector('svg').setAttribute('viewBox', `0 0 ${W} ${H}`);
    const rings = el.querySelector('.coach-rings');
    rings.innerHTML = rects.map((r, i) => `<div class="coach-hole" style="left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px;${i ? 'opacity:.5' : ''}"></div>`).join('');
    // Подсказка — под целью, если есть место, иначе над ней.
    const tip = el.querySelector('.coach-tip');
    const mainEl = UI.$(sel(st.main));
    const tw = tip.offsetWidth, th = tip.offsetHeight;
    if (!mainEl) { tip.style.left = (W - tw) / 2 + 'px'; tip.style.top = (H - th) / 2 + 'px'; return; }
    const r = mainEl.getBoundingClientRect();
    const below = r.bottom + pad + 16 + th < H - 8 || r.top - pad - 16 - th < 8;
    const top = below ? r.bottom + pad + 14 : r.top - pad - 14 - th;
    const left = U.clamp(r.left + r.width / 2 - tw / 2, 12, W - tw - 12);
    tip.className = 'coach-tip ' + (below ? 'below' : 'above');
    tip.style.top = U.clamp(top, 8, H - th - 8) + 'px';
    tip.style.left = left + 'px';
    tip.style.setProperty('--ax', U.clamp(r.left + r.width / 2 - left, 18, tw - 18) + 'px');
  }
  function loop() { layout(); raf = requestAnimationFrame(loop); }

  let lastTip = '';
  function renderTip() {
    const st = step();
    if (!el || !st) return;
    const i = P().tutorialStep;
    const h = String(html`${st.text()}
      <div class="brow"><span class="step">Шаг ${i + 1} из ${TOTAL}</span>${st.button ? html`<button class="btn b-pri sm" data-coach-ok>${st.button}</button>` : ''}</div>`);
    // Перерисовываем только при изменении текста: иначе тик дохода «съест» клик по кнопке.
    if (h !== lastTip) { lastTip = h; el.querySelector('.coach-tip').innerHTML = h; }
  }

  function enter() {
    base = { clicks: S().clicks, t: Date.now() };
    const st = step();
    const target = st && UI.$(sel(st.main));
    if (target) target.scrollIntoView({ block: 'center', behavior: UI.animOn() ? 'smooth' : 'auto' });
    renderTip();
  }

  function check() {
    if (!el) return;
    const st = step();
    if (!st) return finish();
    if (st.done()) advance();
    else renderTip();
  }

  function advance() {
    P().tutorialStep = Math.min(TOTAL, P().tutorialStep + 1);
    EC.store.save();
    EC.sound.play('click');
    if (P().tutorialStep >= TOTAL) return finish();
    enter();
  }

  function finish() {
    Coach.stop();
    EC.fx.note({ title: 'Обучение пройдено', text: 'Дальше — сам. Удачной сессии!', icon: '🎓' });
  }

  const Coach = {
    active: () => !!el,
    start() {
      if (el || P().tutorialStep >= TOTAL) return;
      el = document.createElement('div');
      el.className = 'coach';
      el.innerHTML = '<svg class="coach-svg" width="100%" height="100%" style="position:fixed;inset:0" aria-hidden="true"><path fill-rule="evenodd" style="fill:var(--scrim);pointer-events:visiblePainted"></path></svg><div class="coach-rings"></div><div class="coach-tip" role="dialog" aria-live="polite"></div>';
      document.body.appendChild(el);
      el.addEventListener('click', (e) => { if (e.target.closest('[data-coach-ok]')) advance(); });
      offs = [EC.bus.on('study-click', check), EC.bus.on('upgrade', check), EC.bus.on('change', check)];
      timer = setInterval(check, 1000);
      enter();
      loop();
    },
    stop() {
      cancelAnimationFrame(raf);
      clearInterval(timer);
      offs.forEach((f) => f());
      offs = [];
      if (el) el.remove();
      el = null;
      lastTip = '';
    },
    restart() {
      Coach.stop();
      P().tutorialStep = 0;
      EC.store.save();
    },
  };

  EC.coach = Coach;
})(globalThis.EC = globalThis.EC || {});
