/* Донат Егору: тратит баланс, даёт салют, опыт и две ачивки. */
(function (EC) {
  'use strict';
  const U = EC.util, UI = EC.ui, C = EC.config, html = U.html;
  const S = () => EC.store.state;

  function render(root) {
    const s = S();
    const presets = C.DONATE_PRESETS.filter((v) => v <= s.balance);
    root.innerHTML = String(html`
      <button class="btn b-gho" data-go="home" style="margin-bottom:16px">← Столы</button>
      <section class="panel donate">
        <h1 class="sign">ПОДДЕРЖИ ЕГОРА</h1>
        <p>Пожертвуй Егорики на Кока-Колу. Взамен — ничего, кроме салюта, уважения и пары достижений.</p>
        <div class="chips">${presets.length ? presets.map((v) => html`<button class="chip" data-dp="${v}">${U.fmt(v)} E</button>`) : html`<span class="faint">Пока не на что — загляни в «Заработок»</span>`}</div>
        <div class="donate-row">
          <label class="sr" for="donIn">Сумма доната</label>
          <input id="donIn" class="inp" type="number" inputmode="numeric" min="1" step="1" value="${Math.max(1, Math.min(100, s.balance))}">
          <button class="btn b-pri lg" id="donBtn">Пожертвовать 💝</button>
        </div>
        <div class="donate-stats">
          <div class="stat"><span class="label">Всего задоначено</span><b id="donTot">${U.fmt(s.totalDonated)} E</b></div>
          <div class="stat"><span class="label">Донатов до «Спасибо Калядке»</span><b id="donCnt">${Math.min(s.totalDonations, 10)} / 10</b></div>
        </div>
      </section>`);
    const input = UI.$('#donIn', root);
    root.onclick = (e) => {
      const p = e.target.closest('[data-dp]');
      if (p) { input.value = p.dataset.dp; EC.sound.play('click'); return; }
      if (e.target.closest('#donBtn')) donate();
    };
    input.onkeydown = (e) => { if (e.key === 'Enter') donate(); };
    function donate() {
      const v = Math.floor(Number(input.value));
      if (!v || v < 1) return EC.fx.note({ title: 'Введи сумму', icon: '!' });
      if (v > S().balance) return EC.fx.note({ title: 'Не хватает Егориков', text: 'На балансе ' + U.fmt(S().balance) + ' E', icon: '!' });
      EC.econ.donate(v);
      EC.fx.donateBurst();
      EC.sound.play('coin');
      EC.fx.note({ title: 'Спасибо!', text: 'Егор получил ' + U.fmt(v) + ' E', icon: '💝' });
      UI.text(UI.$('#donTot', root), U.fmt(S().totalDonated) + ' E');
      UI.text(UI.$('#donCnt', root), Math.min(S().totalDonations, 10) + ' / 10');
    }
  }

  EC.donate = { render };
})(globalThis.EC = globalThis.EC || {});
