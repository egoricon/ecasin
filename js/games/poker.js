/* Ultimate Texas Hold'em против дилера.
   Анте = блайнд. Префлоп: ставка ×3/×4 или чек. Флоп: ×2 или чек. Тёрн+ривер: ×1 или фолд.
   Дилер квалифицируется с пары. Блайнд платит со стрита (таблица в rules/poker.js). */
(function (EC) {
  'use strict';
  const U = EC.util, UI = EC.ui, html = U.html, P = EC.rules.poker;

  const BLIND_ROWS = [[9, 'Роял-флеш', '500:1'], [8, 'Стрит-флеш', '50:1'], [7, 'Каре', '10:1'], [6, 'Фулл-хаус', '3:1'], [5, 'Флеш', '3:2'], [4, 'Стрит', '1:1'], [-1, 'Ниже стрита', 'пуш']];

  function mount(root) {
    const ctx = EC.shell.mount(root, {
      id: 'poker',
      sub: 'Ultimate Texas Hold\'em · одна ставка «Плей» за раздачу',
      betLabel: 'Анте (блайнд = анте)',
      primary: 'Раздать',
      extra: html`<div><span class="label">Выплаты блайнда</span>
        <div class="mini-table" id="pkBlind" style="margin-top:6px">${BLIND_ROWS.map(([c, n, p]) => html`<span data-c="${c}">${n}</span><span class="num" data-c="${c}">${p}</span>`)}</div></div>`,
      table: html`
        <div class="felt">
          <div class="hand"><div class="hand-top"><span class="label">Дилер</span><span class="val" id="pkDV">–</span><span class="bdg bdg-mute" id="pkQ" hidden></span></div><div class="cards" id="pkDC">${UI.cardSlot()}${UI.cardSlot()}</div></div>
          <div class="hand"><div class="hand-top"><span class="label">Стол</span></div><div class="cards" id="pkBoard">${[0, 1, 2, 3, 4].map(UI.cardSlot)}</div></div>
          <div class="hand"><div class="hand-top"><span class="label">Ты</span><span class="val" id="pkPV">–</span></div><div class="cards" id="pkPC">${UI.cardSlot()}${UI.cardSlot()}</div></div>
          <div class="pk-bets" id="pkBets"></div>
          <div class="pk-actions" id="pkAct"></div>
          <div class="status" id="pkStatus">На балансе нужно минимум 3 анте: анте + блайнд + ставка «Плей»</div>
        </div>`,
    });

    let h = null; // { round, ante, play, deck, you, dealer, board, stage: 'pre'|'flop'|'river'|'done', shownBoard }

    const betsHTML = (parts) => {
      const row = (key, n, amt) => {
        const p = parts && parts[key];
        const cls = p ? (p.r === 'win' ? 'win' : p.r === 'lose' ? 'lose' : '') : '';
        const val = p ? (p.r === 'win' ? '+' + U.fmt(p.pay - amt) : p.r === 'push' ? 'возврат' : p.r === 'lose' ? '−' + U.fmt(amt) : '—') : U.fmt(amt) + ' E';
        return html`<div class="pk-bet ${cls}">${n} <span class="num">${val}</span></div>`;
      };
      return html`${row('ante', 'Анте', h.ante)}${row('blind', 'Блайнд', h.ante)}${row('play', 'Плей', h.play)}`;
    };

    const render = (opts = {}) => {
      const revealDealer = h.stage === 'done';
      const winCards = opts.highlight || [];
      const cls = (c) => (opts.highlight ? (winCards.some((w) => UI.sameCard(w, c)) ? 'win' : 'dim') : '');
      UI.set(ctx.$('#pkDC'), h.dealer.map((c) => UI.card(c, { back: !revealDealer, cls: opts.dealerCls ? opts.dealerCls(c) : '' })));
      const board = h.board.slice(0, h.shownBoard);
      UI.set(ctx.$('#pkBoard'), html`${board.map((c) => UI.card(c, { cls: cls(c) }))}${Array.from({ length: 5 - board.length }, UI.cardSlot)}`);
      UI.set(ctx.$('#pkPC'), h.you.map((c) => UI.card(c, { cls: cls(c) })));
      if (board.length >= 3) UI.text(ctx.$('#pkPV'), P.best(h.you.concat(board)).name);
      else UI.text(ctx.$('#pkPV'), h.you[0].r === h.you[1].r ? 'Пара' : '–');
      UI.set(ctx.$('#pkBets'), betsHTML(opts.parts));
      renderActions();
    };

    function renderActions() {
      const el = ctx.$('#pkAct');
      if (!h || !['pre', 'flop', 'river'].includes(h.stage)) { el.innerHTML = ''; return; }
      const afford = (x) => h.round.canAdd(h.ante * x);
      const B = (x, cls) => html`<button class="btn ${cls}" data-act="raise" data-x="${x}" ${afford(x) ? '' : 'disabled'}>Ставка ×${x} · ${U.fmt(h.ante * x)} E</button>`;
      if (h.stage === 'pre') UI.set(el, html`${B(4, 'b-pri')}${B(3, 'b-sec')}<button class="btn b-gho" data-act="check">Чек</button>`);
      else if (h.stage === 'flop') UI.set(el, html`${B(2, 'b-pri')}<button class="btn b-gho" data-act="check">Чек</button>`);
      else UI.set(el, html`${B(1, 'b-pri')}<button class="btn b-los" data-act="fold">Фолд</button>`);
    }

    const status = (t) => UI.text(ctx.$('#pkStatus'), t);

    async function deal() {
      if (ctx.locked) return;
      const ante = ctx.readBet(3);
      if (!ante) return;
      const deck = new EC.cards.Shoe(1);
      const round = EC.econ.beginRound('poker', ante * 2);
      ctx.lock(true);
      ctx.setPrimary(null, { disabled: true });
      ctx.result(null);
      ctx.$$('#pkBlind [data-c]').forEach((x) => x.classList.remove('hit'));
      UI.set(ctx.$('#pkQ'), '');
      ctx.$('#pkQ').hidden = true;
      UI.text(ctx.$('#pkDV'), '–');
      h = { round, ante, play: 0, you: [deck.draw(), deck.draw()], dealer: [deck.draw(), deck.draw()], board: [0, 1, 2, 3, 4].map(() => deck.draw()), stage: 'pre', shownBoard: 0 };
      EC.sound.play('deal');
      render();
      status('Префлоп: поставь ×4 или ×3 — или посмотри флоп');
    }

    async function showBoard(n) {
      while (h.shownBoard < n) {
        h.shownBoard++;
        EC.sound.play('deal');
        render();
        await UI.wait(300);
      }
    }

    async function showdown(folded) {
      await showBoard(5);
      h.stage = 'done';
      const you = P.best(h.you.concat(h.board));
      const dealer = P.best(h.dealer.concat(h.board));
      const r = P.uthSettle({ ante: h.ante, blind: h.ante, play: h.play, folded, player: you, dealer });
      const winner = r.cmp > 0 ? you : r.cmp < 0 ? dealer : null;
      render({ parts: r.parts, highlight: winner ? winner.cards : null, dealerCls: (c) => (winner === dealer && winner.cards.some((w) => UI.sameCard(w, c)) ? 'win' : '') });
      UI.text(ctx.$('#pkDV'), dealer.name);
      UI.text(ctx.$('#pkPV'), you.name);
      const q = ctx.$('#pkQ');
      q.hidden = false;
      q.textContent = r.qualifies ? 'квалифицирован' : 'не квалифицирован';
      // Золотом — только если блайнд реально выиграл
      if (!folded && r.cmp > 0 && P.BLIND_PAYS[you.cat]) ctx.$$(`#pkBlind [data-c="${you.cat}"]`).forEach((x) => x.classList.add('hit'));
      const res = h.round.end(r.pay, { label: 'Холдем' + (winner ? ', ' + winner.name.toLowerCase() : '') });
      if (res.net > 0) { EC.econ.unlock('poker'); EC.econ.tickMission('poker'); }
      const verdict = folded ? 'Фолд' : r.cmp > 0 ? 'Твоя рука сильнее' : r.cmp < 0 ? 'Дилер сильнее' : 'Ничья';
      status(`${verdict}: ${you.name} против ${dealer.name}`);
      ctx.result(res, folded ? 'Фолд — анте и блайнд проиграны' : you.name + ' vs ' + dealer.name);
      ctx.lock(false);
      ctx.setPrimary('Раздать');
      h.busy = false;
    }

    ctx.onAct = async (act, b) => {
      if (!h || h.stage === 'done' || h.busy) return;
      h.busy = true;
      if (act === 'raise') {
        const x = +b.dataset.x;
        if (!h.round.canAdd(h.ante * x)) { h.busy = false; return; }
        h.round.add(h.ante * x);
        h.play = h.ante * x;
        h.stage = 'show';
        renderActions();
        status('Ставка сделана — открываем всё');
        return showdown(false);
      }
      if (act === 'check') {
        if (h.stage === 'pre') { h.stage = 'flop'; await showBoard(3); status('Флоп: ставка ×2 или чек'); }
        else if (h.stage === 'flop') { h.stage = 'river'; await showBoard(5); status('Ривер: ставка ×1 или фолд'); }
        render();
        h.busy = false;
        return;
      }
      if (act === 'fold') { h.stage = 'show'; renderActions(); return showdown(true); }
      h.busy = false;
    };
    ctx.onPrimary = deal;
    return ctx;
  }

  EC.games = EC.games || {};
  EC.games.poker = { mount };
})(globalThis.EC = globalThis.EC || {});
