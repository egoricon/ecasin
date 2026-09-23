/* «Заработок» — экран кликера (лаймовый режим). */
(function (EC) {
  'use strict';
  const U = EC.util, UI = EC.ui, C = EC.config, html = U.html, L = EC.earn;
  const S = () => EC.store.state;

  let tab = 'study', amount = 1, root = null, off = null, lastTickSnd = 0;

  function effectText(up) {
    const b = L.boost();
    return up.click ? html`<span class="num">+${U.rate(up.click * b)} E</span> за клик` : html`<span class="num">+${U.rate(up.eps * b)} E/с</span>`;
  }
  // Сколько уровней купит кнопка и за сколько.
  function offer(up) {
    const s = S(), lvl = s.clickerLvl[up.id] || 0;
    let n = amount;
    if (amount === 'max') n = Math.max(1, L.maxAffordable(up, lvl, s.balance));
    const price = L.costN(up, lvl, n);
    return { n, price, ok: price <= s.balance };
  }

  function itemHTML(up) {
    const s = S(), lvl = s.clickerLvl[up.id] || 0, o = offer(up);
    return html`<div class="upg ${o.ok ? '' : 'locked'}" data-up="${up.id}">
      <div class="ui" aria-hidden="true">${up.i}</div>
      <b>${up.n}<span class="num">ур. ${lvl}</span></b>
      <small>${up.d} · ${effectText(up)}</small>
      <button class="btn b-sec" data-buy="${up.id}" ${o.ok ? '' : 'disabled'} aria-label="Купить ${up.n}">${o.n > 1 ? '×' + o.n + ' · ' : ''}${U.compact(o.price)} E</button>
      <div class="lvl" aria-hidden="true"><i style="width:${U.clamp((s.balance / o.price) * 100, 0, 100)}%"></i></div>
    </div>`;
  }

  function listHTML() {
    return C.EARN.upgrades.filter((u) => u.cat === tab).map(itemHTML);
  }

  // Быстрое обновление без перерисовки: цифры и доступность кнопок.
  function refresh() {
    if (!root || !root.isConnected) return;
    const s = S();
    UI.text(UI.$('#esClick', root), U.compact(L.clickValue()) + ' E');
    UI.text(UI.$('#esEps', root), U.rate(L.epsValue()) + ' E/с');
    UI.text(UI.$('#esTotal', root), U.compact(s.earnTotal) + ' E');
    UI.text(UI.$('#esClicks', root), U.fmt(s.clicks));
    UI.text(UI.$('#clkVal', root), '+' + U.compact(L.clickValue()) + ' E');
    UI.$$('.upg', root).forEach((el) => {
      const up = L.upgrade(el.dataset.up), o = offer(up);
      const btn = el.querySelector('[data-buy]');
      btn.disabled = !o.ok;
      btn.textContent = (o.n > 1 ? '×' + o.n + ' · ' : '') + U.compact(o.price) + ' E';
      el.classList.toggle('locked', !o.ok);
      el.querySelector('.lvl i').style.width = U.clamp((s.balance / o.price) * 100, 0, 100) + '%';
    });
  }

  function render(el) {
    root = el;
    const s = S();
    root.innerHTML = String(html`
      <section class="earn-hero">
        <div>
          <h1 class="sign flick">БОТАТЬ В БГУИР</h1>
          <p>Сессия никогда не кончается. Жми, копи Егорики и возвращайся к столу, когда будешь готов поставить всё на красное.</p>
        </div>
        <div class="brow">
          <button class="btn b-gho" data-go="tutorial">Как это работает</button>
          <button class="btn b-sec" data-go="casino">К столам →</button>
        </div>
      </section>
      <div id="earnOffline"></div>
      <div class="earn-stats">
        <div class="stat"><span class="label">За клик</span><b id="esClick"></b></div>
        <div class="stat"><span class="label">Пассивно</span><b id="esEps"></b></div>
        <div class="stat"><span class="label">Наботано всего</span><b id="esTotal"></b></div>
        <div class="stat"><span class="label">Кликов</span><b id="esClicks"></b></div>
      </div>
      <div class="earn-layout">
        <section class="clickzone" id="clickZone" aria-label="Клик-зона">
          <button class="clk" id="clk" aria-label="Ботать"><span class="ic" aria-hidden="true">📚</span>БОТАТЬ</button>
          <div class="clk-note">Клик — <span class="num" id="clkVal"></span> · шанс ${Math.round(C.EARN.crit.chance * 100)}% на «автомат» ×${C.EARN.crit.mult}</div>
        </section>
        <section class="panel">
          <div class="shop-head">
            <h2 class="h-block">Апгрейды</h2>
            <div class="seg quiet" role="group" aria-label="Сколько покупать">
              ${[1, 10, 'max'].map((a) => html`<button data-amt="${a}" aria-pressed="${amount === a}">${a === 'max' ? 'Макс' : '×' + a}</button>`)}
            </div>
          </div>
          <div class="seg quiet" role="group" aria-label="Категория" style="margin-bottom:12px">
            <button data-tab="study" aria-pressed="${tab === 'study'}">📚 Учёба · клик</button>
            <button data-tab="life" aria-pressed="${tab === 'life'}">🏠 Быт · пассивно</button>
          </div>
          <div class="upg-list" id="upgList">${listHTML()}</div>
        </section>
      </div>`);
    refresh();

    const zone = UI.$('#clickZone', root), clk = UI.$('#clk', root);
    clk.addEventListener('click', (e) => {
      const r = L.click();
      const z = zone.getBoundingClientRect();
      const kb = e.detail === 0; // клавиатура
      const x = (kb ? z.left + z.width / 2 : e.clientX) - z.left + (U.rand() * 40 - 20);
      const y = (kb ? z.top + z.height / 2 : e.clientY) - z.top - 24;
      if (zone.querySelectorAll('.fl').length < 24) {
        const f = document.createElement('span');
        f.className = 'fl' + (r.crit ? ' crit' : '');
        f.textContent = (r.crit ? 'АВТОМАТ! +' : '+') + U.compact(r.value);
        f.style.left = x - 20 + 'px';
        f.style.top = y + 'px';
        zone.appendChild(f);
        setTimeout(() => f.remove(), 950);
      }
      if (UI.animOn()) {
        clk.classList.remove('hit');
        UI.reflow(clk);
        clk.classList.add('hit');
        setTimeout(() => clk.classList.remove('hit'), 110);
        if (zone.querySelectorAll('.ring').length < 3) {
          const ring = document.createElement('span');
          ring.className = 'ring';
          zone.appendChild(ring);
          setTimeout(() => ring.remove(), 620);
        }
      }
      const now = performance.now();
      if (r.crit) EC.sound.play('crit');
      else if (now - lastTickSnd > 70) { lastTickSnd = now; EC.sound.play('tick'); }
      EC.store.touch('earn');
    });

    root.onclick = (e) => {
      const b = e.target.closest('[data-buy],[data-tab],[data-amt]');
      if (!b || b.disabled) return;
      if (b.dataset.buy) {
        const o = offer(L.upgrade(b.dataset.buy));
        if (L.buy(b.dataset.buy, o.n)) {
          EC.sound.play('buy');
          EC.store.commit('earn');
          UI.set(UI.$('#upgList', root), listHTML());
          refresh();
        }
      } else if (b.dataset.tab) {
        tab = b.dataset.tab;
        UI.$$('[data-tab]', root).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        UI.set(UI.$('#upgList', root), listHTML());
      } else if (b.dataset.amt) {
        amount = b.dataset.amt === 'max' ? 'max' : +b.dataset.amt;
        UI.$$('[data-amt]', root).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        refresh();
      }
    };

    if (off) off();
    off = EC.bus.on('change', refresh);
    if (!s.tutorialShown && !EC.modal.isOpen()) setTimeout(() => { if (!EC.modal.isOpen()) EC.modals.tutorial(); }, 350);
  }

  function showOffline(gain, sec) {
    const box = root && UI.$('#earnOffline', root);
    if (!box || !root.isConnected) return false;
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
    const t = h ? h + ' ч ' + m + ' мин' : m + ' мин';
    UI.set(box, html`<div class="offline" role="status"><div><span>Пока тебя не было (${t}), сосед по общаге ботал за тебя</span><br><b>+${U.fmt(gain)} E</b></div><button class="btn b-gho" data-close-off>Ок</button></div>`);
    box.querySelector('[data-close-off]').onclick = () => { box.innerHTML = ''; };
    return true;
  }

  EC.earnView = { render, refresh, showOffline, unmount() { if (off) { off(); off = null; } } };
})(globalThis.EC = globalThis.EC || {});
