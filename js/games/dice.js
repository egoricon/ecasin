/* Кости: два кубика у тебя, два у казино. Больше сумма — ×2, ничья — возврат ставки. */
(function (EC) {
  'use strict';
  const U = EC.util, UI = EC.ui, html = U.html;
  const S = () => EC.store.state;

  const die = (n) => html`<div class="die p${n}" aria-label="${n}">${U.raw('<i></i>'.repeat(9))}</div>`;
  const roll = () => 1 + U.randInt(6);
  const histHTML = () => {
    const h = S().diceHistory.slice(0, 18);
    return h.length ? h.map((x) => html`<i class="${x >= 9 ? 'hi' : ''}">${x}</i>`) : html`<span class="faint">пока пусто</span>`;
  };

  function mount(root) {
    const ctx = EC.shell.mount(root, {
      id: 'dice',
      sub: 'Больше сумма — ×2 · ничья — ставка возвращается',
      primary: 'Бросить',
      auto: true,
      table: html`
        <div class="duel">
          <div class="duel-side" id="dcP"><span class="label">Ты</span><div class="dice" id="dcPD">${die(5)}${die(3)}</div><div class="dsum" id="dcPS">–</div></div>
          <div class="duel-vs">VS</div>
          <div class="duel-side" id="dcH"><span class="label">Казино</span><div class="dice" id="dcHD">${die(2)}${die(6)}</div><div class="dsum" id="dcHS">–</div></div>
        </div>
        <div class="status" id="dcStatus">Жми «Бросить» или пробел</div>
        <div style="margin-top:16px"><span class="label">Твои суммы</span><div class="chist" id="dcHist">${histHTML()}</div></div>`,
    });

    ctx.onPrimary = async () => {
      if (ctx.locked) return;
      const bet = ctx.readBet();
      if (!bet) return ctx.auto.stop();
      const round = EC.econ.beginRound('dice', bet);
      ctx.lock(true);
      ctx.setPrimary('Бросаем…', { disabled: true });
      ctx.result(null);
      ['#dcP', '#dcH'].forEach((id) => ctx.$(id).classList.remove('won', 'lead'));
      UI.text(ctx.$('#dcPS'), '…');
      UI.text(ctx.$('#dcHS'), '…');
      EC.sound.play('dice');
      const p = [roll(), roll()], d = [roll(), roll()];
      for (let i = 0; i < 9; i++) {
        UI.set(ctx.$('#dcPD'), html`${die(roll())}${die(roll())}`);
        UI.set(ctx.$('#dcHD'), html`${die(roll())}${die(roll())}`);
        ctx.$$('.die').forEach((x) => x.classList.add('rolling'));
        await UI.wait(70);
      }
      if (!ctx.root.isConnected) return;
      UI.set(ctx.$('#dcPD'), html`${die(p[0])}${die(p[1])}`);
      UI.set(ctx.$('#dcHD'), html`${die(d[0])}${die(d[1])}`);
      const ps = p[0] + p[1], ds = d[0] + d[1];
      UI.text(ctx.$('#dcPS'), String(ps));
      UI.text(ctx.$('#dcHS'), String(ds));
      const pay = ps > ds ? bet * 2 : ps === ds ? bet : 0;
      if (ps > ds) ctx.$('#dcP').classList.add('won');
      else if (ds > ps) ctx.$('#dcH').classList.add('lead');
      const s = S();
      s.diceHistory.unshift(ps);
      s.diceHistory = s.diceHistory.slice(0, 30);
      UI.set(ctx.$('#dcHist'), histHTML());
      UI.text(ctx.$('#dcStatus'), ps > ds ? 'Твоя сумма больше' : ps === ds ? 'Ничья — ставка возвращается' : 'Казино бросило больше');
      const res = round.end(pay, { label: 'Кости ' + ps + ':' + ds });
      ctx.result(res, ps + ' против ' + ds);
      ctx.lock(false);
      ctx.setPrimary('Бросить');
      ctx.done();
    };
    return ctx;
  }

  EC.games = EC.games || {};
  EC.games.dice = { mount };
})(globalThis.EC = globalThis.EC || {});
