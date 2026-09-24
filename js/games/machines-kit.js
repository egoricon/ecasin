/* Общий UI для автоматов: панель ставки из shell, сетка символов, линии выигрыша, окно «Инфо»
   и спин-контроллер. Логика раунда — в js/rules/machines.js (begin → анимация → finish). */
(function (EC) {
  'use strict';
  const U = EC.util, UI = EC.ui, C = EC.config, html = U.html;
  const KIT = {};

  /* ---------- Символы и сетка ---------- */
  // tag — подпись на клетке («СКАТТЕР», «СБОРЩИК»): отдельный элемент, видна только на поле.
  KIT.sym = (M, sym, extra = '') => {
    const d = M.symbols[sym];
    return html`<span class="ms ${d.cls || ''}" aria-label="${d.n}">${d.i}</span>${d.tag ? html`<span class="m-stag" aria-hidden="true">${d.tag}</span>` : ''}${U.raw(extra)}`;
  };
  KIT.gridHTML = (M, grid, id = 'mGrid') => html`<div class="m-grid" id="${id}" style="--cols:${grid.length};--rows:${grid[0].length}">
    ${grid[0].map((_, r) => grid.map((col, c) => html`<div class="m-cell" data-c="${c}" data-r="${r}">${KIT.sym(M, col[r])}</div>`))}
    <svg class="m-lines" aria-hidden="true"></svg>
  </div>`;
  KIT.cell = (root, c, r) => root.querySelector(`.m-cell[data-c="${c}"][data-r="${r}"]`);
  KIT.draw = (root, M, grid, extraFor) => {
    grid.forEach((col, c) => col.forEach((x, r) => {
      const el = KIT.cell(root, c, r);
      el.className = 'm-cell';
      el.innerHTML = String(KIT.sym(M, x, extraFor ? extraFor(c, r, x) : ''));
    }));
  };
  KIT.clear = (root) => {
    UI.$$('.m-cell', root).forEach((el) => el.classList.remove('win', 'dim', 'exp', 'hold'));
    const svg = root.querySelector('.m-lines');
    if (svg) svg.innerHTML = '';
  };
  KIT.mark = (root, cells, cls = 'win') => cells.forEach(([c, r]) => { const el = KIT.cell(root, c, r); if (el) el.classList.add(cls); });

  // Линии выигрыша поверх сетки: ломаная через центры клеток.
  KIT.lines = (root, wins) => {
    const svg = root.querySelector('.m-lines');
    if (!svg) return;
    const box = root.getBoundingClientRect();
    svg.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
    svg.innerHTML = wins.map((w) => {
      const pts = w.cells.map(([c, r]) => {
        const b = KIT.cell(root, c, r).getBoundingClientRect();
        return `${(b.left - box.left + b.width / 2).toFixed(1)},${(b.top - box.top + b.height / 2).toFixed(1)}`;
      }).join(' ');
      return `<polyline points="${pts}" />`;
    }).join('');
  };

  /* Анимация вращения: барабаны мелькают случайными символами и останавливаются слева направо.
     cols — какие барабаны крутить (по умолчанию все), extraFor — подписи на клетках (номиналы и т. п.). */
  KIT.spin = async (root, M, grid, weights, { cols = null, extraFor = null, base = 520, step = 170 } = {}) => {
    const list = cols || grid.map((_, c) => c);
    const stopAt = list.map((c, i) => performance.now() + (base + i * step) / UI.speed());
    const stopped = new Set();
    list.forEach((c) => grid[c].forEach((_, r) => KIT.cell(root, c, r).classList.add('spin')));
    let tick = 0;
    while (stopped.size < list.length) {
      const now = performance.now();
      list.forEach((c, i) => {
        if (stopped.has(c)) return;
        if (now >= stopAt[i]) {
          stopped.add(c);
          grid[c].forEach((x, r) => {
            const el = KIT.cell(root, c, r);
            el.classList.remove('spin');
            el.innerHTML = String(KIT.sym(M, x, extraFor ? extraFor(c, r, x) : ''));
          });
          EC.sound.play('reel');
        } else {
          const w = EC.machines.weightsFor(weights, c);
          grid[c].forEach((_, r) => { KIT.cell(root, c, r).innerHTML = String(KIT.sym(M, U.weighted(w))); });
        }
      });
      if (tick++ % 3 === 0 && stopped.size < list.length) EC.sound.play('tick');
      await new Promise((res) => setTimeout(res, 55));
      if (!root.isConnected) return;
    }
  };

  /* ---------- Фон бонусной игры ----------
     kind — тема: knowledge | clusters | fishing | hold; null — выключить. В автомате за сеткой живой слой
     (сцена + частицы), на странице — подсветка под тему (body[data-mbonus]). label — плашка на вывеске. */
  const BONUS_BG = {
    knowledge: { n: 16, bits: ['∑', 'π', '∫', '√', '∞', 'λ', 'Δ', 'Ω', 'φ', '∂', '≈', '∇'] },
    clusters: { n: 14, bits: ['404', '0', '1', '0', '1', '▚', '▞'] },
    fishing: { n: 18, bits: [''] }, // пузыри рисует CSS
    hold: { n: 14, bits: [''] },
  };
  KIT.bonus = (ctx, kind, label) => {
    const mach = ctx.$('.mach');
    if (!mach) return;
    mach.querySelectorAll('.m-bg, .m-btag').forEach((x) => x.remove());
    mach.classList.toggle('bonus', !!kind);
    if (kind) { mach.dataset.bonus = kind; document.body.dataset.mbonus = kind; } else { delete mach.dataset.bonus; delete document.body.dataset.mbonus; }
    if (!kind) return;
    const cfg = BONUS_BG[kind];
    const bits = Array.from({ length: cfg.n }, () => {
      const st = `left:${(U.rand() * 96).toFixed(1)}%;--d:${(7 + U.rand() * 9).toFixed(1)}s;--dl:-${(U.rand() * 12).toFixed(1)}s;--s:${(0.55 + U.rand() * 0.9).toFixed(2)}`;
      return html`<i style="${st}">${U.pick(cfg.bits)}</i>`;
    });
    mach.insertAdjacentHTML('afterbegin', String(html`<div class="m-bg" aria-hidden="true"><div class="m-bg-scene"></div>${bits}</div>`));
    const sign = mach.querySelector('.m-sign');
    if (sign && label) sign.insertAdjacentHTML('beforeend', String(html` <span class="m-btag">${label}</span>`));
  };

  /* ---------- Окно «Инфо»: правила и таблица выплат ---------- */
  KIT.info = (id, body) => {
    const M = C.MACHINES[id];
    EC.modal.open({
      title: M.n, wide: true,
      body: html`<div class="rules m-info">${body}
        <p class="faint" style="margin-top:12px">Целевой RTP — ${(M.rtp * 100).toFixed(0)}%. Минимальная ставка — ${U.fmt(M.minBet)} E. Выплаты указаны в ставках (×1 = вернуть ставку). Егорики вымышленные.</p></div>`,
    });
  };
  // Таблица «символ → выплаты» для линейных автоматов.
  KIT.payTable = (M, symbols, heads, rowFor) => html`<table class="m-pay">
    <thead><tr><th>Символ</th>${heads.map((h) => html`<th>${h}</th>`)}</tr></thead>
    <tbody>${symbols.map((i) => html`<tr><td>${KIT.sym(M, i)} <span class="faint">${M.symbols[i].n}</span></td>${rowFor(i).map((v) => html`<td class="num">${v ? KIT.x(v) : '—'}</td>`)}</tr>`)}</tbody>
  </table>`;
  // Множитель на линию → множитель общей ставки (линии делят ставку поровну).
  KIT.perLine = (x, lines) => (x ? Math.round((x / lines) * 100) / 100 : 0);
  // Множитель с дробной частью: ×0,6 · ×2,5 · ×200
  KIT.x = (v) => '×' + (+v).toLocaleString('ru-RU', { maximumFractionDigits: 2 });

  /* ---------- Экран автомата ---------- */
  // opts: table, info(), animate(r, ctx) — проигрывает исход, label(r) — подпись результата.
  KIT.mount = (root, id, opts) => {
    const M = C.MACHINES[id];
    const ctx = EC.shell.mount(root, {
      id, auto: true, primary: 'Крутить', minBet: M.minBet,
      table: html`<div class="mach" data-m="${id}">
        <div class="m-sign">${M.n}</div>
        <div class="m-bar" id="mBar">${opts.idle || 'Удачи!'}</div>
        ${opts.table}
      </div>`,
    });
    ctx.root.querySelector('.game-layout').classList.add('machine-layout');
    // «Правила» стола → «Инфо» автомата
    const rb = ctx.$('[data-act="rules"]');
    rb.dataset.act = 'info';
    rb.textContent = 'Инфо';
    ctx.$('#betIn').min = M.minBet;
    ctx.bar = (h) => UI.set(ctx.$('#mBar'), h);
    ctx.cleanup.push(() => { delete document.body.dataset.mbonus; }); // ушли посреди бонуса — фон страницы гасим

    ctx.onAct = (act, b) => {
      if (act === 'info') KIT.info(id, opts.info());
      else if (opts.onAct) opts.onAct(act, b);
    };
    ctx.onPrimary = async () => {
      if (ctx.locked) return;
      const bet = ctx.readBet(); // учитывает минимум автомата (M.minBet)
      if (!bet) return ctx.auto.stop();
      ctx.lock(true);
      ctx.setPrimary('Крутится…', { disabled: true });
      ctx.result(null);
      const r = EC.machines.begin(id, bet);
      await opts.animate(r, ctx);
      if (r.round.closed) return; // раунд уже закрыт страховкой (ошибка/уход) — второй раз не платим
      const label = opts.label(r);
      const res = EC.machines.finish(r, { label, share: r.out.m >= 100 ? M.n + ' · ×' + U.fmt(Math.round(r.out.m)) : '' });
      if (ctx.root.isConnected) {
        ctx.result(res, label);
        ctx.lock(false);
        ctx.setPrimary('Крутить');
        ctx.done();
      }
    };
    return ctx;
  };

  EC.machinesKit = KIT;
  EC.games = EC.games || {};
})(globalThis.EC = globalThis.EC || {});
