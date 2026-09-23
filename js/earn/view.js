/* Экран учёбы: зачётка «Ботать», ведомость покупок, дверь «Подвал общаги». Тема БГУИР. */
(function (EC) {
  'use strict';
  const U = EC.util, UI = EC.ui, C = EC.config, html = U.html, L = EC.earn;
  const S = () => EC.store.state;
  const CFG = C.EARN;

  let amount = 1, root = null, off = null, lastSnd = 0, rowsSig = '';

  const RUMORS = [
    [0, 'Из подвала общаги по ночам слышна музыка'],
    [0.25, 'Сосед клянётся, что там крутят что-то круглое'],
    [0.5, 'Кто-то вышел оттуда с пачкой Егориков'],
    [0.75, 'Охранник уже кивает тебе при встрече'],
    [1, 'Дверь приоткрыта. Говорят, нужен пропуск'],
  ];
  const rumor = (p) => RUMORS.filter(([t]) => p >= t).pop()[1];

  const effect = (up) => (up.click ? `+${U.rate(up.click * L.multiplier())} E за клик` : `+${U.rate(up.eps * L.multiplier())} E/с`);

  // Сколько уровней купит кнопка и за сколько.
  function offer(up) {
    const s = S(), lvl = s.clickerLvl[up.id] || 0;
    let n = amount;
    if (amount === 'max') n = Math.max(1, L.maxAffordable(up, lvl, s.balance));
    const price = L.costN(up, lvl, n);
    return { n, price, ok: price <= s.balance };
  }

  function rowHTML(up) {
    const s = S(), lvl = s.clickerLvl[up.id] || 0, o = offer(up);
    return html`<tr data-up-row="${up.id}" class="${o.ok ? '' : 'dim'}">
      <td><div class="it"><span aria-hidden="true">${up.i}</span><div><b>${up.n}</b><small class="desc">${up.d}</small><small class="eff-m">${effect(up)}</small></div></div></td>
      <td class="lv">${lvl}</td>
      <td class="eff">${effect(up)}</td>
      <td class="buy"><button class="btn b-sec" data-buy="${up.id}" ${o.ok ? '' : 'disabled'} aria-label="Купить: ${up.n}">${o.n > 1 ? '×' + o.n + ' · ' : ''}${U.big(o.price)} E</button></td>
    </tr>`;
  }
  function sectionHTML(cat, title, sub) {
    const list = CFG.upgrades.filter((u) => u.cat === cat && L.visible(u));
    const next = L.nextHidden(cat);
    return html`<tbody id="${cat === 'study' ? 'vedStudy' : 'vedLife'}">
      <tr class="sec"><td colspan="4">${title}<small>${sub}</small></td></tr>
      ${list.map(rowHTML)}
      ${next ? html`<tr class="teaser"><td colspan="4">Следующая позиция появится, когда наботаешь <span class="num">${U.big(Math.ceil(next.base * CFG.revealAt))} E</span></td></tr>` : ''}
    </tbody>`;
  }
  const signature = () => CFG.upgrades.filter((u) => L.visible(u)).map((u) => u.id).join(',');

  function tableHTML() {
    rowsSig = signature();
    return html`<table class="ved">
      <thead><tr><th>Предмет</th><th>Ур.</th><th class="eff">Эффект</th><th></th></tr></thead>
      ${sectionHTML('study', 'Учёба', 'сила клика')}
      ${sectionHTML('life', 'Быт', 'доход, даже когда тебя нет')}
    </table>`;
  }

  function doorHTML() {
    const s = S(), E = EC.econ, p = L.doorProgress();
    const pass = CFG.door.pass;
    let action = '';
    if (s.progress.passBought) {
      action = html`<button class="btn door-btn" data-go="casino">Спуститься в подвал →</button>`;
    } else if (E.canBuyPass()) {
      action = html`<button class="btn door-btn" data-act="pass" ${s.balance >= pass ? '' : 'disabled'}>Купить пропуск · ${U.fmt(pass)} E</button>`;
    }
    return html`<div class="door-top"><span class="door-ic" aria-hidden="true">🚪</span>
        <div><b>Подвал общаги</b><small id="doorRumor">${s.progress.passBought ? 'Пропуск у тебя. Внизу горит неон' : rumor(p)}</small></div></div>
      <div class="door-bar" role="progressbar" aria-label="Слухи о подвале" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(p * 100)}"><i style="width:${p * 100}%"></i></div>
      <div class="door-foot"><span>Слухи ${Math.floor(p * 100)}%</span><span class="num">${U.big(Math.min(s.earnTotal, CFG.door.rumors))} / ${U.big(CFG.door.rumors)}</span></div>
      ${action}`;
  }

  // Быстрое обновление: цифры, кнопки, дверь. Таблица перерисовывается, только если появился новый апгрейд.
  function refresh() {
    if (!root || !root.isConnected) return;
    const s = S();
    UI.text(UI.$('#stClick', root), U.rate(L.getClickPower()) + ' E');
    UI.text(UI.$('#stEps', root), U.rate(L.getEps()) + ' E/с');
    UI.text(UI.$('#stTotal', root), U.big(s.earnTotal) + ' E');
    UI.text(UI.$('#stClicks', root), U.big(s.clicks));
    UI.text(UI.$('#zVal', root), '+' + U.rate(L.getClickPower()) + ' E за клик');
    if (signature() !== rowsSig) UI.set(UI.$('#vedTable', root), tableHTML());
    else {
      UI.$$('[data-up-row]', root).forEach((tr) => {
        const up = L.upgrade(tr.dataset.upRow), o = offer(up), btn = tr.querySelector('[data-buy]');
        btn.disabled = !o.ok;
        btn.textContent = (o.n > 1 ? '×' + o.n + ' · ' : '') + U.big(o.price) + ' E';
        tr.classList.toggle('dim', !o.ok);
        tr.querySelector('.lv').textContent = s.clickerLvl[up.id] || 0;
      });
    }
    UI.set(UI.$('#door', root), doorHTML());
  }

  function render(el) {
    root = el;
    root.innerHTML = String(html`
      <header class="study-head">
        <div>
          <p class="label">Белорусский государственный университет информатики и радиоэлектроники</p>
          <h1>Сессия в БГУИР</h1>
          <p>Зачётная неделя никогда не кончается. Жми зачётку, покупай конспекты — и прислушивайся к слухам про подвал.</p>
        </div>
        <button class="btn b-gho" data-go="achievements">🏅 Достижения</button>
      </header>
      <div id="studyOffline"></div>
      <div class="study-stats">
        <div class="stat"><span class="label">Сила клика</span><b id="stClick"></b></div>
        <div class="stat"><span class="label">В секунду</span><b id="stEps"></b></div>
        <div class="stat"><span class="label">Наботано всего</span><b id="stTotal"></b></div>
        <div class="stat"><span class="label">Кликов</span><b id="stClicks"></b></div>
      </div>
      <div class="study-grid">
        <div class="study-left">
          <section class="zone" id="clickZone" aria-label="Ботать">
            <button class="zachetka" id="clk"><span class="z-top">ЗАЧЁТНАЯ КНИЖКА</span><span class="z-main">Ботать</span><span class="z-val" id="zVal"></span></button>
            <div class="zone-note">Пробел или клик — ботать</div>
          </section>
          <section class="door" id="door" aria-label="Подвал общаги">${doorHTML()}</section>
        </div>
        <section class="vedomost" aria-label="Ведомость покупок">
          <div class="ved-head">
            <h2>Ведомость</h2>
            <div class="seg quiet" role="group" aria-label="Сколько покупать">
              ${[1, 10, 'max'].map((a) => html`<button data-amt="${a}" aria-pressed="${amount === a}">${a === 'max' ? 'Макс' : '×' + a}</button>`)}
            </div>
          </div>
          <div id="vedTable">${tableHTML()}</div>
        </section>
      </div>`);
    refresh();

    const zone = UI.$('#clickZone', root), clk = UI.$('#clk', root);
    clk.addEventListener('click', (e) => {
      const r = L.click();
      const z = zone.getBoundingClientRect();
      const kb = e.detail === 0; // клавиатура
      const x = (kb ? z.left + z.width / 2 : e.clientX) - z.left + (U.rand() * 30 - 15);
      const y = (kb ? z.top + z.height / 2 : e.clientY) - z.top - 24;
      if (zone.querySelectorAll('.fl').length < 20) {
        const f = document.createElement('span');
        f.className = 'fl';
        f.textContent = '+' + U.rate(r.value);
        f.style.left = x - 16 + 'px';
        f.style.top = y + 'px';
        zone.appendChild(f);
        setTimeout(() => f.remove(), 820);
      }
      const now = performance.now();
      if (now - lastSnd > 60) { lastSnd = now; EC.sound.play('paper'); }
      EC.store.touch('earn');
      EC.bus.emit('study-click', S().clicks);
    });

    root.onclick = (e) => {
      const b = e.target.closest('[data-buy],[data-amt],[data-act]');
      if (!b || b.disabled) return;
      if (b.dataset.buy) {
        const o = offer(L.upgrade(b.dataset.buy));
        if (L.buy(b.dataset.buy, o.n)) {
          EC.sound.play('buy');
          EC.store.commit('earn');
        }
      } else if (b.dataset.amt) {
        amount = b.dataset.amt === 'max' ? 'max' : +b.dataset.amt;
        UI.$$('[data-amt]', root).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        refresh();
      } else if (b.dataset.act === 'pass') {
        if (EC.econ.buyPass()) {
          EC.sound.play('bonus');
          EC.bus.emit('pass-bought');
        }
      }
    };

    if (off) off();
    off = EC.bus.on('change', refresh);
  }

  function showOffline(gain, sec) {
    const box = root && UI.$('#studyOffline', root);
    if (!box || !root.isConnected) return false;
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
    const t = h ? h + ' ч ' + m + ' мин' : m + ' мин';
    UI.set(box, html`<div class="study-offline" role="status"><div><span>Пока тебя не было (${t}), сосед и кофе наботали</span><b>+${U.big(gain)} E</b></div><button class="btn b-gho" data-close-off>Ок</button></div>`);
    box.querySelector('[data-close-off]').onclick = () => { box.innerHTML = ''; };
    return true;
  }

  EC.studyView = {
    render, refresh, showOffline,
    unmount() { if (off) { off(); off = null; } },
  };
})(globalThis.EC = globalThis.EC || {});
