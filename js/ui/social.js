/* Фейковая социалка: лента выигрышей и лайв-чат. Всё генерируется на клиенте. */
(function (EC) {
  'use strict';
  const U = EC.util, UI = EC.ui, C = EC.config, html = U.html;
  const S = () => EC.store.state;

  const badge = (p) => html`<span class="bdg bdg-${p.c}">${p.t}</span>`;
  const GAMES_SHORT = ['Crash', 'Слоты', 'Рулетка', 'Блэкджек', 'Кости', 'Баккара', 'Холдем', 'Видеопокер'];

  function tickerItem() {
    const p = U.rand() < 0.5 ? U.pick(C.PLAYERS) : null;
    const name = p ? p.n : U.pick(C.EXTRA_NAMES);
    const w = Math.floor(50 + U.rand() * U.rand() * 25000);
    return html`<span>${p ? html`${badge(p)} ` : ''}<b>${name}</b> выиграл <span class="num">${U.fmt(w)} E</span> · ${U.pick(GAMES_SHORT)}</span>`;
  }
  function fillTicker() {
    const t = UI.$('#tickerTrack');
    if (!t) return;
    const items = Array.from({ length: 12 }, tickerItem);
    UI.set(t, html`<span class="tcopy">${items}</span><span class="tcopy">${items}</span>`); // дубль для бесшовной прокрутки
  }

  function chatLine() {
    const box = UI.$('#chatBody');
    if (!box) return;
    const d = document.createElement('div');
    d.className = 'cmsg';
    const r = U.rand();
    if (r < 0.05) {
      d.classList.add('gorilla');
      d.title = '?';
      d.innerHTML = String(html`🦍 <b>GORILLA</b> · ${U.pick(C.CHAT_GORILLA)}`);
    } else if (r < 0.1) {
      d.classList.add('boss');
      d.innerHTML = String(html`👑 <b>Зал</b> · ${U.pick(C.CHAT_BOSS)}`);
    } else if (r < 0.5) {
      const p = U.pick(C.PLAYERS);
      d.innerHTML = String(html`${badge(p)}<b>${p.n}:</b> ${U.pick(C.CHAT)}`);
    } else {
      d.innerHTML = String(html`<b>${U.pick(C.EXTRA_NAMES)}:</b> ${U.pick(C.CHAT)}`);
    }
    box.appendChild(d);
    while (box.children.length > 7) box.firstChild.remove();
    const chat = UI.$('#chat');
    if (chat.classList.contains('min')) chat.classList.add('unread');
  }

  function setChat(open) {
    const c = UI.$('#chat');
    c.classList.toggle('min', !open);
    if (open) c.classList.remove('unread');
    UI.$('#chatToggle').setAttribute('aria-expanded', String(open));
    UI.text(UI.$('#chatSign'), open ? '−' : '+');
  }

  EC.social = {
    start() {
      fillTicker();
      for (let i = 0; i < 4; i++) chatLine();
      // На телефоне чат по умолчанию свёрнут
      const narrow = globalThis.matchMedia && matchMedia('(max-width: 600px)').matches;
      setChat(S().chatOpen && !narrow);
      UI.$('#chatToggle').onclick = () => {
        const open = UI.$('#chat').classList.contains('min');
        S().chatOpen = open;
        EC.store.save();
        setChat(open);
      };
      // Клик по «горилле» в чате — пасхалка «Друг Полины»
      UI.$('#chatBody').onclick = (e) => { if (e.target.closest('.gorilla')) EC.fx.gorilla(); };
      setInterval(chatLine, 4500);
      setInterval(() => { if (U.rand() < 0.5) fillTicker(); }, 30000);
      setInterval(EC.header.tickOnline, 4000);
    },
  };
})(globalThis.EC = globalThis.EC || {});
