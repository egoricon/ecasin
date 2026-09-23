/* Рулетка. Поворот колеса считается от текущего угла (см. rules/roulette.js → nextRotation). */
(function (EC) {
  'use strict';
  const U = EC.util, UI = EC.ui, html = U.html, R = EC.rules.roulette;
  const S = () => EC.store.state;

  let wheelRot = 0, ballRot = 0;
  let pick = { type: 'red' };

  function wheelHTML() {
    const deg = 360 / R.WHEEL.length;
    const col = (n) => (n === 0 ? 'var(--wheel-zero)' : R.REDS.has(n) ? 'var(--wheel-red)' : 'var(--wheel-black)');
    const stops = R.WHEEL.map((n, i) => `${col(n)} ${i * deg}deg ${(i + 1) * deg}deg`).join(',');
    const nums = R.WHEEL.map((n, i) => {
      const a = (i + 0.5) * deg, rad = (a * Math.PI) / 180;
      return html`<span class="wnum" style="left:${(50 + 43.5 * Math.sin(rad)).toFixed(2)}%;top:${(50 - 43.5 * Math.cos(rad)).toFixed(2)}%;--a:${a}deg">${n}</span>`;
    });
    return html`<div class="wheel" id="rlWheel" style="background:conic-gradient(${U.raw(stops)});transform:rotate(${wheelRot}deg)">${nums}</div>`;
  }

  function boardHTML() {
    const cells = [];
    const pos = (dc, dr, mc, mr) => `--dc:${dc};--dr:${dr};--mc:${mc};--mr:${mr}`;
    cells.push(html`<button class="cell zero" data-pick="straight:0" style="${pos('1', '1 / span 3', '1 / span 3', '1')}" aria-label="Зеро">0</button>`);
    for (let n = 1; n <= 36; n++) {
      const dc = Math.ceil(n / 3) + 1, dr = 3 - ((n - 1) % 3);
      const mc = ((n - 1) % 3) + 1, mr = Math.ceil(n / 3) + 1;
      cells.push(html`<button class="cell ${R.color(n)}" data-pick="straight:${n}" data-n="${n}" style="${pos(dc, dr, mc, mr)}">${n}</button>`);
    }
    [['col3', 1, 3], ['col2', 2, 2], ['col1', 3, 1]].forEach(([id, dr, mc]) => {
      cells.push(html`<button class="cell out" data-pick="${id}" style="${pos(14, dr, mc, 14)}" title="${R.BETS[id].n}">2:1</button>`);
    });
    const out = [
      ['dozen1', '1–12', 'dz'], ['dozen2', '13–24', 'dz'], ['dozen3', '25–36', 'dz'],
      ['low', '1–18'], ['even', 'Чёт'], ['red', 'Красное', 'red-b'], ['black', 'Чёрное'], ['odd', 'Нечет'], ['high', '19–36'],
    ].map(([id, n, cls]) => html`<button class="cell out ${cls || ''}" data-pick="${id}">${n}</button>`);
    return html`<div class="board" role="group" aria-label="Поле ставок">${cells}</div><div class="outside">${out}</div>`;
  }

  function histHTML() {
    const h = S().rouletteHistory.slice(0, 16);
    return h.length ? h.map((n) => html`<i class="${R.color(n)}">${n}</i>`) : html`<span class="faint">пока пусто</span>`;
  }

  function mount(root) {
    const ctx = EC.shell.mount(root, {
      id: 'roulette',
      sub: 'Европейское колесо · один ноль · выбери ставку на поле',
      auto: true,
      table: html`
        <div class="rl-top">
          <div class="wheel-wrap">
            <div class="pointer"></div>
            ${wheelHTML()}
            <div class="orbit" id="rlOrbit" style="transform:rotate(${ballRot}deg)"><div class="ball"></div></div>
            <div class="hub">E</div>
          </div>
          <div class="rl-info">
            <div class="rl-result"><div class="rl-num" id="rlNum">?</div><div class="status" id="rlStatus">Выбери ставку на поле и крути</div></div>
            <div class="rl-pick" id="rlPick"></div>
            <div><span class="label">Последние</span><div class="rhist" id="rlHist">${histHTML()}</div></div>
          </div>
        </div>
        ${boardHTML()}`,
      primary: 'Крутить',
    });

    const showPick = () => {
      const d = R.describe(pick);
      UI.set(ctx.$('#rlPick'), html`Ставка: <b>${d.n}</b> · выплата <span class="num">×${d.m}</span>`);
      ctx.$$('[data-pick]').forEach((b) => {
        const [t, n] = b.dataset.pick.split(':');
        b.setAttribute('aria-pressed', String(t === pick.type && (t !== 'straight' || +n === pick.n)));
      });
    };
    showPick();

    ctx.table.addEventListener('click', (e) => {
      const b = e.target.closest('[data-pick]');
      if (!b || ctx.locked) return;
      const [t, n] = b.dataset.pick.split(':');
      pick = t === 'straight' ? { type: t, n: +n } : { type: t };
      EC.sound.play('click');
      showPick();
    });

    ctx.onPrimary = async () => {
      if (ctx.locked) return;
      const bet = ctx.readBet();
      if (!bet) return ctx.auto.stop();
      const myPick = Object.assign({}, pick);
      const round = EC.econ.beginRound('roulette', bet);
      ctx.lock(true);
      ctx.setPrimary('Крутится…', { disabled: true });
      ctx.result(null);
      ctx.$$('.cell.hit').forEach((c) => c.classList.remove('hit', 'won'));
      const num = ctx.$('#rlNum');
      num.className = 'rl-num';
      num.textContent = '…';
      UI.text(ctx.$('#rlStatus'), 'Ставки сделаны, ставок больше нет');
      EC.sound.play('wheel');

      const result = U.pick(R.WHEEL);
      const ms = 3200 / UI.speed();
      wheelRot = R.nextRotation(wheelRot, result, 5);
      // Шарик крутится навстречу и останавливается под указателем.
      ballRot = ballRot - 360 * 3 - (((ballRot % 360) + 360) % 360);
      const wheel = ctx.$('#rlWheel'), orbit = ctx.$('#rlOrbit');
      [wheel, orbit].forEach((el) => { el.style.setProperty('--spin-ms', ms + 'ms'); el.classList.add('spin'); });
      wheel.style.transform = `rotate(${wheelRot}deg)`;
      orbit.style.transform = `rotate(${ballRot}deg)`;
      await new Promise((r) => setTimeout(r, ms + 60));
      if (!ctx.root.isConnected) return;

      const pay = R.payout(myPick, bet, result);
      const s = S();
      s.rouletteHistory.unshift(result);
      s.rouletteHistory = s.rouletteHistory.slice(0, 30);
      num.textContent = result;
      num.classList.add(R.color(result));
      if (pay > 0) { num.classList.add('won'); EC.econ.tickMission('roulette'); }
      const cell = ctx.$(`[data-n="${result}"]`) || ctx.$('[data-pick="straight:0"]');
      cell.classList.add('hit');
      if (pay > 0) cell.classList.add('won');
      const colorName = { red: 'красное', black: 'чёрное', green: 'зеро' }[R.color(result)];
      UI.set(ctx.$('#rlStatus'), html`Выпало <b>${result}</b> · ${colorName}`);
      UI.set(ctx.$('#rlHist'), histHTML());
      const d = R.describe(myPick);
      const res = round.end(pay, { label: 'Рулетка, ' + d.n.toLowerCase() });
      ctx.result(res, d.n + ' · выпало ' + result);
      ctx.lock(false);
      ctx.setPrimary('Крутить');
      ctx.done();
    };
    return ctx;
  }

  EC.games = EC.games || {};
  EC.games.roulette = { mount };
})(globalThis.EC = globalThis.EC || {});
