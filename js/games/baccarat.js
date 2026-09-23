/* Баккара (Punto Banco) — 8 колод, настоящая таблица добора (rules/baccarat.js). */
(function (EC) {
  'use strict';
  const U = EC.util, UI = EC.ui, html = U.html, B = EC.rules.baccarat;
  const S = () => EC.store.state;

  const shoe = new EC.cards.Shoe(8, 0.2);
  let betOn = 'player';
  const OPTS = [
    { id: 'player', n: 'Игрок', p: '1:1' },
    { id: 'tie', n: 'Ничья', p: '8:1' },
    { id: 'banker', n: 'Банкир', p: '0.95:1' },
  ];
  const NAME = { player: 'Игрок', banker: 'Банкир', tie: 'Ничья' };

  const roadHTML = () => {
    const h = S().baccaratHistory.slice(0, 24);
    return h.length ? h.map((x) => html`<i class="${x === 'B' ? 'b' : x === 'T' ? 't' : ''}">${x === 'P' ? 'И' : x === 'B' ? 'Б' : 'Н'}</i>`) : html`<span class="faint">пока пусто</span>`;
  };

  function mount(root) {
    const ctx = EC.shell.mount(root, {
      id: 'baccarat',
      sub: '8 колод · натурал 8/9 · комиссия 5% на Банкира',
      primary: 'Раздать',
      table: html`
        <div class="bac-hands">
          <div class="bac-hand" id="bacP"><div class="hand-top"><span class="label">Игрок</span><span class="val" id="bacPV">–</span></div><div class="cards" id="bacPC">${UI.cardSlot()}${UI.cardSlot()}</div></div>
          <div class="bac-hand" id="bacB"><div class="hand-top"><span class="label">Банкир</span><span class="val" id="bacBV">–</span></div><div class="cards" id="bacBC">${UI.cardSlot()}${UI.cardSlot()}</div></div>
        </div>
        <div class="bac-opts" role="group" aria-label="На кого ставим">
          ${OPTS.map((o) => html`<button class="opt" data-act="bet-on" data-on="${o.id}" aria-pressed="${o.id === betOn}"><b>${o.n}</b><small>${o.p}</small></button>`)}
        </div>
        <div class="status" id="bacStatus" style="margin-top:16px">Выбери сторону и раздавай</div>
        <div><span class="label">Дорожка</span><div class="road" id="bacRoad">${roadHTML()}</div></div>`,
    });

    ctx.onAct = (act, b) => {
      if (act !== 'bet-on' || ctx.locked) return;
      betOn = b.dataset.on;
      ctx.$$('[data-on]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.on === betOn)));
      EC.sound.play('click');
    };

    ctx.onPrimary = async () => {
      if (ctx.locked) return;
      const bet = ctx.readBet();
      if (!bet) return;
      const side = betOn;
      shoe.prepare();
      const round = EC.econ.beginRound('baccarat', bet);
      ctx.lock(true);
      ctx.setPrimary(null, { disabled: true });
      ctx.$$('[data-on]').forEach((x) => { x.disabled = true; });
      ctx.result(null);
      ['#bacP', '#bacB'].forEach((id) => ctx.$(id).classList.remove('won', 'lead'));
      UI.text(ctx.$('#bacStatus'), 'Раздача…');

      const d = B.deal(() => shoe.draw());
      const shown = { player: [], banker: [] };
      const draw = () => {
        UI.set(ctx.$('#bacPC'), shown.player.map((c) => UI.card(c)));
        UI.set(ctx.$('#bacBC'), shown.banker.map((c) => UI.card(c)));
        UI.text(ctx.$('#bacPV'), shown.player.length ? String(B.total(shown.player)) : '–');
        UI.text(ctx.$('#bacBV'), shown.banker.length ? String(B.total(shown.banker)) : '–');
      };
      ctx.$('#bacPC').innerHTML = '';
      ctx.$('#bacBC').innerHTML = '';
      for (let i = 0; i < d.order.length; i++) {
        if (i === 4) await UI.wait(350); // пауза перед третьими картами
        shown[d.order[i].side].push(d.order[i].card);
        draw();
        EC.sound.play('deal');
        await UI.wait(380);
      }
      if (!ctx.root.isConnected) return;

      const pay = B.payout(side, bet, d.winner);
      const s = S();
      s.baccaratHistory.unshift(d.winner === 'player' ? 'P' : d.winner === 'banker' ? 'B' : 'T');
      s.baccaratHistory = s.baccaratHistory.slice(0, 40);
      if (d.winner !== 'tie') ctx.$(d.winner === 'player' ? '#bacP' : '#bacB').classList.add(side === d.winner ? 'won' : 'lead');
      const txt = d.winner === 'tie' ? `Ничья ${d.playerTotal}:${d.bankerTotal}` : `${NAME[d.winner]} побеждает ${Math.max(d.playerTotal, d.bankerTotal)}:${Math.min(d.playerTotal, d.bankerTotal)}`;
      UI.text(ctx.$('#bacStatus'), txt + (d.natural ? ' · натурал' : ''));
      UI.set(ctx.$('#bacRoad'), roadHTML());
      const res = round.end(pay, { label: 'Баккара, ' + NAME[side].toLowerCase() });
      ctx.result(res, 'Ставка: ' + NAME[side] + (d.winner === 'tie' && side !== 'tie' ? ' · ничья — возврат' : ''));
      ctx.lock(false);
      ctx.$$('[data-on]').forEach((x) => { x.disabled = false; });
      ctx.setPrimary('Раздать');
    };
    return ctx;
  }

  EC.games = EC.games || {};
  EC.games.baccarat = { mount };
})(globalThis.EC = globalThis.EC || {});
