/* Блэкджек: 6 колод, дилер стоит на 17, BJ 3:2, дабл, сплит (один раз), пик дилера. */
(function (EC) {
  'use strict';
  const U = EC.util, UI = EC.ui, html = U.html, BJ = EC.rules.blackjack;
  const S = () => EC.store.state;

  const shoe = new EC.cards.Shoe(6, 0.25);

  function mount(root) {
    const ctx = EC.shell.mount(root, {
      id: 'blackjack',
      sub: '6 колод · дилер стоит на 17 · BJ платит 3:2',
      primary: 'Раздать',
      table: html`
        <div class="felt">
          <div class="hand">
            <div class="hand-top"><span class="label">Дилер</span><span class="val" id="bjDV">–</span></div>
            <div class="cards" id="bjDC">${UI.cardSlot()}${UI.cardSlot()}</div>
          </div>
          <div class="divider"></div>
          <div id="bjHands">
            <div class="hand"><div class="hand-top"><span class="label">Ты</span><span class="val">–</span></div><div class="cards">${UI.cardSlot()}${UI.cardSlot()}</div></div>
          </div>
          <div class="pk-actions" id="bjAct"></div>
          <div class="status" id="bjStatus">Сделай ставку и жми «Раздать» · клавиши 1–4: взять, стоп, дабл, сплит</div>
        </div>`,
    });

    let game = null; // { round, dealer, hands:[{cards, bet, done, fromSplit, res}], active, reveal }

    const render = () => {
      if (!game) return;
      const d = game.dealer;
      UI.set(ctx.$('#bjDC'), d.map((c, i) => UI.card(c, { back: i === 1 && !game.reveal })));
      UI.text(ctx.$('#bjDV'), !d.length ? '–' : game.reveal ? String(BJ.total(d)) : String(BJ.cardPoints(d[0])));
      const many = game.hands.length > 1;
      UI.set(ctx.$('#bjHands'), game.hands.map((h, i) => {
        const v = BJ.value(h.cards);
        const tag = h.res ? h.res : (many && i === game.active && !game.over ? 'ход' : '');
        const tagCls = h.res === 'win' || h.res === 'blackjack' ? 'bdg-gold' : h.res ? 'bdg-mute' : 'bdg-accent';
        const tagTxt = { win: 'победа', blackjack: 'blackjack', push: 'ничья', lose: 'проигрыш', bust: 'перебор', 'ход': 'ход' }[tag];
        return html`<div class="hand" style="${many && i !== game.active && !game.over ? 'opacity:.6' : ''}">
          <div class="hand-top">
            <span class="label">${many ? 'Рука ' + (i + 1) : 'Ты'}</span>
            <span class="val">${v.soft && v.total < 21 ? (v.total - 10) + '/' + v.total : v.total}</span>
            <span class="num faint">${U.fmt(h.bet)} E</span>
            ${tag ? html`<span class="bdg ${tagCls}">${tagTxt}</span>` : ''}
          </div>
          <div class="cards">${h.cards.map((c) => UI.card(c, { cls: h.res === 'win' || h.res === 'blackjack' ? 'win' : '' }))}</div>
        </div>`;
      }));
      renderActions();
    };

    const hand = () => game && game.hands[game.active];
    const can = {
      hit: () => game && !game.over && hand() && !hand().done,
      double: () => can.hit() && hand().cards.length === 2 && game.round.canAdd(hand().bet),
      split: () => can.hit() && game.hands.length === 1 && BJ.canSplit(hand().cards) && game.round.canAdd(hand().bet),
    };
    function renderActions() {
      const el = ctx.$('#bjAct');
      if (!game || game.over) { el.innerHTML = ''; return; }
      UI.set(el, html`
        <button class="btn b-pri" data-act="hit" ${can.hit() ? '' : 'disabled'}>Взять</button>
        <button class="btn b-sec" data-act="stand" ${can.hit() ? '' : 'disabled'}>Стоп</button>
        <button class="btn b-sec" data-act="double" ${can.double() ? '' : 'disabled'}>Удвоить</button>
        <button class="btn b-sec" data-act="split" ${can.split() ? '' : 'disabled'}>Сплит</button>`);
    }

    async function deal() {
      if (ctx.locked) return;
      const bet = ctx.readBet();
      if (!bet) return;
      shoe.prepare();
      const round = EC.econ.beginRound('blackjack', bet);
      ctx.lock(true);
      ctx.setPrimary(null, { disabled: true });
      ctx.result(null);
      game = { round, dealer: [], hands: [{ cards: [], bet, done: false, fromSplit: false }], active: 0, reveal: false, over: false };
      UI.text(ctx.$('#bjStatus'), '');
      // Раздача по одной: игрок, дилер, игрок, дилер (вторая закрыта)
      for (let i = 0; i < 4; i++) {
        (i % 2 === 0 ? game.hands[0].cards : game.dealer).push(shoe.draw());
        render();
        EC.sound.play('deal');
        await UI.wait(260);
      }
      const pBJ = BJ.isBlackjack(game.hands[0].cards);
      const dBJ = BJ.isBlackjack(game.dealer);
      if (pBJ || (BJ.dealerPeeks(game.dealer[0]) && dBJ)) {
        if (pBJ) { EC.sound.play('bj'); EC.econ.unlock('blackjack'); }
        return finish();
      }
      render();
    }

    async function nextHand() {
      const h = hand();
      h.done = true;
      if (game.active < game.hands.length - 1) {
        game.active++;
        const nh = hand();
        if (nh.cards.length < 2) { nh.cards.push(shoe.draw()); EC.sound.play('deal'); }
        if (nh.splitAces || BJ.total(nh.cards) === 21) return nextHand();
        render();
        return;
      }
      return finish();
    }

    async function finish() {
      game.over = true;
      game.reveal = true;
      render();
      const live = game.hands.some((h) => !BJ.isBust(h.cards));
      const natural = game.hands.length === 1 && BJ.isBlackjack(game.hands[0].cards);
      if (live && !natural) {
        while (BJ.dealerHits(game.dealer)) {
          await UI.wait(420);
          game.dealer.push(shoe.draw());
          EC.sound.play('deal');
          render();
        }
      }
      await UI.wait(250);
      let pay = 0;
      game.hands.forEach((h) => {
        const r = BJ.resolve(h.cards, game.dealer, h.bet, h.fromSplit);
        h.res = r.r;
        pay += r.pay;
      });
      render();
      const labels = game.hands.map((h) => ({ win: 'победа', blackjack: 'blackjack!', push: 'ничья', lose: 'проигрыш', bust: 'перебор' }[h.res]));
      const res = game.round.end(pay, { label: 'Блэкджек' });
      if (res.net > 0) EC.econ.tickMission('blackjack');
      ctx.result(res, 'Дилер ' + BJ.total(game.dealer) + ' · ' + labels.join(', '));
      UI.text(ctx.$('#bjStatus'), BJ.total(game.dealer) > 21 ? 'У дилера перебор' : 'У дилера ' + BJ.total(game.dealer));
      ctx.lock(false);
      ctx.setPrimary('Раздать');
      renderActions();
    }

    ctx.onAct = async (act) => {
      if (!game || game.over || game.busy) return;
      game.busy = true;
      try {
        const h = hand();
        if (act === 'hit' && can.hit()) {
          h.cards.push(shoe.draw());
          EC.sound.play('deal');
          render();
          if (BJ.total(h.cards) >= 21) { await UI.wait(300); await nextHand(); }
        } else if (act === 'stand' && can.hit()) {
          await nextHand();
        } else if (act === 'double' && can.double()) {
          game.round.add(h.bet);
          h.bet *= 2;
          h.cards.push(shoe.draw());
          EC.sound.play('deal');
          render();
          await UI.wait(350);
          await nextHand();
        } else if (act === 'split' && can.split()) {
          game.round.add(h.bet);
          const aces = h.cards[0].r === 1;
          const second = { cards: [h.cards.pop()], bet: h.bet, done: false, fromSplit: true, splitAces: aces };
          h.fromSplit = true;
          h.splitAces = aces;
          game.hands.push(second);
          h.cards.push(shoe.draw());
          EC.sound.play('deal');
          render();
          // Сплит тузов: по одной карте на руку, дальше не ходим.
          if (aces || BJ.total(h.cards) === 21) { await UI.wait(300); await nextHand(); }
        }
      } finally {
        if (game) game.busy = false;
      }
    };
    ctx.onKey = (e) => {
      const map = { 1: 'hit', 2: 'stand', 3: 'double', 4: 'split' };
      if (map[e.key] && game && !game.over) { ctx.onAct(map[e.key]); return true; }
      return false;
    };
    ctx.onPrimary = deal;
    return ctx;
  }

  EC.games = EC.games || {};
  EC.games.blackjack = { mount };
})(globalThis.EC = globalThis.EC || {});
