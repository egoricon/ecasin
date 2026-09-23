/* Видеопокер Jacks or Better 9/6. Колода — настоящие 52 карты на каждую руку. */
(function (EC) {
  'use strict';
  const U = EC.util, UI = EC.ui, html = U.html, P = EC.rules.poker;

  function mount(root) {
    const ctx = EC.shell.mount(root, {
      id: 'video',
      sub: 'Раздай, отметь карты, которые держишь, и обменяй остальные',
      primary: 'Раздать',
      table: html`
        <div class="vp-pay" id="vpPay">${P.VP_TABLE.map((r) => html`<div class="vp-row" data-cat="${r.cat}"><span>${r.n}</span><span class="num">×${r.m}</span></div>`)}</div>
        <div class="vp-cards" id="vpCards">${[0, 1, 2, 3, 4].map(UI.cardSlot)}</div>
        <div class="status" id="vpStatus">Клик по карте или клавиши 1–5 — держать</div>`,
    });

    let h = null; // { round, deck, cards, held, stage: 'hold' }

    const render = (winCls) => {
      UI.set(ctx.$('#vpCards'), h.cards.map((c, i) => UI.card(c, {
        cls: (h.stage === 'hold' ? 'click ' : '') + (h.held[i] ? 'held ' : '') + (winCls ? winCls(c) : ''),
        hold: true,
        attrs: `data-i="${i}" role="button" aria-pressed="${h.held[i]}" tabindex="${h.stage === 'hold' ? 0 : -1}"`,
      })));
    };

    const toggle = (i) => {
      if (!h || h.stage !== 'hold') return;
      h.held[i] = !h.held[i];
      EC.sound.play('click');
      render();
    };
    ctx.table.addEventListener('click', (e) => {
      const c = e.target.closest('[data-i]');
      if (c) toggle(+c.dataset.i);
    });

    async function deal() {
      const bet = ctx.readBet();
      if (!bet) return;
      const deck = new EC.cards.Shoe(1);
      const round = EC.econ.beginRound('video', bet);
      ctx.lock(true);
      ctx.result(null);
      ctx.$$('.vp-row').forEach((r) => r.classList.remove('hit', 'push'));
      h = { round, deck, cards: [], held: [false, false, false, false, false], stage: 'deal' };
      ctx.setPrimary(null, { disabled: true });
      for (let i = 0; i < 5; i++) {
        h.cards.push(deck.draw());
        render();
        EC.sound.play('deal');
        await UI.wait(120);
      }
      h.stage = 'hold';
      render();
      const ev = P.vpEval(h.cards);
      UI.text(ctx.$('#vpStatus'), ev.m > 0 ? 'На руке уже: ' + ev.name + ' — держи нужные карты' : 'Отметь карты, которые оставляешь');
      ctx.setPrimary('Обменять');
    }

    async function drawCards() {
      h.stage = 'draw';
      ctx.setPrimary(null, { disabled: true });
      for (let i = 0; i < 5; i++) {
        if (h.held[i]) continue;
        h.cards[i] = h.deck.draw();
        render();
        EC.sound.play('deal');
        await UI.wait(110);
      }
      const ev = P.vpEval(h.cards);
      const pay = h.round.bet * ev.m;
      const best = ev.m > 0 ? P.eval5(h.cards) : null;
      // Подсветить карты, из которых собрана комбинация (для пар/троек — только совпадающие ранги).
      const key = (c) => (c.r === 1 ? 14 : c.r);
      const groupRanks = best && [P.CAT.PAIR, P.CAT.TWO_PAIR, P.CAT.TRIPS, P.CAT.QUADS].includes(best.cat)
        ? new Set(h.cards.map(key).filter((r, _, a) => a.filter((x) => x === r).length > 1)) : null;
      h.stage = 'done';
      h.held = [false, false, false, false, false];
      // Золото — только при реальном выигрыше; «пара вальтов» ×1 — это возврат ставки.
      const won = ev.m > 1;
      render(ev.m > 0 ? (c) => (!groupRanks || groupRanks.has(key(c)) ? (won ? 'win' : '') : 'dim') : null);
      if (ev.row) ctx.$(`.vp-row[data-cat="${ev.row.cat}"]`).classList.add(won ? 'hit' : 'push');
      UI.text(ctx.$('#vpStatus'), ev.m > 0 ? ev.name + ' · ×' + ev.m : ev.name + ' — без выплаты');
      const res = h.round.end(pay, { label: 'Видеопокер, ' + ev.name.toLowerCase() });
      ctx.result(res, ev.name);
      ctx.lock(false);
      ctx.setPrimary('Раздать');
    }

    ctx.onPrimary = () => {
      if (h && h.stage === 'hold') return drawCards();
      if (!ctx.locked) return deal();
    };
    ctx.onKey = (e) => {
      if (/^[1-5]$/.test(e.key) && h && h.stage === 'hold') { toggle(+e.key - 1); return true; }
      return false;
    };
    return ctx;
  }

  EC.games = EC.games || {};
  EC.games.video = { mount };
})(globalThis.EC = globalThis.EC || {});
