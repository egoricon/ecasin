/* Главная казино: вывеска, профиль, столы, квесты, миссии, достижения. */
(function (EC) {
  'use strict';
  const U = EC.util, UI = EC.ui, C = EC.config, html = U.html;
  const S = () => EC.store.state;
  let flickered = false;

  function profileCard() {
    const s = S(), E = EC.econ;
    const vip = C.VIP[E.vipLevel()], vp = E.vipProgress();
    const recent = s.hist.slice(0, 12);
    return html`<aside class="profile-card">
      <div class="who-row">
        <div class="av">${UI.avatar()}</div>
        <div style="flex:1;min-width:0">
          <b>${s.name || 'Игрок'}</b>${s.shopEquipped.crown ? html` <span style="color:var(--gold-500)">♛</span>` : ''}
          <div>${UI.titleBadge(s.title) || html`<span class="faint" style="font-size:var(--fs-12)">без титула</span>`}</div>
        </div>
        <button class="btn b-gho sm" data-go="profile">Профиль</button>
      </div>
      <div>
        <div class="lvl-row"><span>Уровень <span class="num">${s.level}</span></span><span class="num">${E.xpInLevel()} / 100 XP</span></div>
        <div class="bar"><i style="width:${E.xpInLevel()}%"></i></div>
      </div>
      <div>
        <div class="lvl-row"><span>VIP: ${vip.n}</span><span class="num">${vp.next ? 'ещё ' + U.fmt(vp.left) + ' E' : 'максимум'}</span></div>
        <div class="bar info"><i style="width:${vp.pct}%"></i></div>
      </div>
      <div class="stat-grid">
        <div class="stat"><span class="label">Раунды</span><b>${U.fmt(s.games)}</b></div>
        <div class="stat"><span class="label">Победы</span><b>${U.fmt(s.wins)}</b></div>
        <div class="stat"><span class="label">Выиграно</span><b>${U.compact(s.totalWon)} E</b></div>
        <div class="stat"><span class="label">Лучший куш</span><b>${U.compact(s.biggestWin)} E</b></div>
      </div>
      <div class="hist" aria-label="Последние раунды">${recent.length ? recent.map((h) => html`<i class="${h === 'W' ? 'w' : h === 'L' ? 'l' : ''}">${h === 'W' ? 'В' : h === 'L' ? 'П' : '='}</i>`) : html`<span class="faint" style="font-size:var(--fs-12)">Сыграй первый раунд</span>`}</div>
    </aside>`;
  }

  function gamesHTML() {
    const s = S();
    return C.GAMES.map((g) => html`<button class="gcard" data-go="game" data-id="${g.id}">
      <span class="glyph" aria-hidden="true">${g.glyph}</span>
      <span class="gname">${g.n}</span>
      <p>${g.d}</p>
      <span class="gfoot"><span class="bdg bdg-mute">${g.tag}</span><span class="num">${s.gamesBy[g.id] ? U.fmt(s.gamesBy[g.id]) + ' ' + U.plural(s.gamesBy[g.id], 'раунд', 'раунда', 'раундов') : ''}</span></span>
    </button>`);
  }

  function questsHTML() {
    return EC.econ.questList().map((q) => html`<div class="item ${q.done ? 'done' : ''}">
      <div class="item-top"><b>${q.n}</b><span class="num">+${q.r} E</span></div>
      <div class="bar"><i style="width:${(q.value / q.need) * 100}%"></i></div>
      <small>${q.done ? 'Готово' : q.value + ' / ' + q.need}</small>
    </div>`);
  }

  function missionsHTML() {
    const s = S();
    return C.MISSIONS.map((m) => {
      const v = Math.min(s.missions[m.id] || 0, m.need), done = s.missionDone[m.id];
      return html`<div class="item ${done ? 'done' : ''}">
        <div class="item-top"><b>${m.n}</b><span class="num">+${m.r} E</span></div>
        <div class="bar"><i style="width:${(v / m.need) * 100}%"></i></div>
        <small>${m.d} · ${done ? 'готово' : v + ' / ' + m.need}</small>
      </div>`;
    });
  }

  function achHTML() {
    const s = S();
    // Сначала открытые последние, потом ближайшие закрытые
    const list = C.ACH.filter((a) => s.ach[a.id]).slice(-2).concat(C.ACH.filter((a) => !s.ach[a.id])).slice(0, 4);
    return list.map((a) => html`<div class="ach ${s.ach[a.id] ? 'on' : ''}"><span class="ai">${s.ach[a.id] ? '★' : '☆'}</span><div><b>${a.n}</b><small>${a.d}</small></div></div>`);
  }

  function render(root) {
    const s = S(), ev = EC.econ.week();
    const opened = C.ACH.filter((a) => s.ach[a.id]).length;
    root.innerHTML = String(html`
      <section class="hero">
        <div class="hero-copy">
          <h1 class="sign ${flickered ? '' : 'flick'}">ЕГОР КАЗИНО</h1>
          <p>Восемь столов на вымышленные Егорики. Денег нет, есть азарт, достижения, титулы и Калядка в чате. Кончились Егорики — иди ботать.</p>
          <div class="brow">
            <button class="btn b-pri lg" data-go="random">✦ Случайный стол</button>
            <button class="btn b-sec lg" data-go="shop">Магазин</button>
            <button class="btn b-sec lg" data-go="skills">Навыки${s.skillPoints ? html` <span class="bdg bdg-accent">${s.skillPoints}</span>` : ''}</button>
          </div>
          <div class="event">🎉 <b>${ev.n}</b> · ${ev.d}</div>
        </div>
        ${profileCard()}
      </section>

      <div class="section-head"><h2 class="h-block">Столы</h2><p>Минимальная ставка сейчас — <span class="num">${U.fmt(EC.econ.minBet())} E</span></p></div>
      <div class="games">${gamesHTML()}</div>

      <div class="section-head"><h2 class="h-block">Прогресс</h2><p>Квесты обновляются в полночь</p></div>
      <div class="home-grid">
        <section class="panel"><div class="panel-head"><h3 class="h-sub">Квесты дня</h3></div><div class="list">${questsHTML()}</div></section>
        <section class="panel"><div class="panel-head"><h3 class="h-sub">Миссии</h3></div><div class="list">${missionsHTML()}</div></section>
        <section class="panel">
          <div class="panel-head"><h3 class="h-sub">Достижения</h3><span class="num muted">${opened} / ${C.ACH.length}</span></div>
          <div class="ach-grid">${achHTML()}</div>
          <div class="brow" style="margin-top:12px"><button class="btn b-sec block" data-go="achievements">Все достижения</button></div>
        </section>
      </div>

      <div class="section-head"><h2 class="h-block">Авторы</h2></div>
      <div class="credits">
        <div class="stat"><span class="label">Главный разработчик</span><b>Егор</b></div>
        <div class="stat"><span class="label">Спонсор</span><b>Калядка</b></div>
        <div class="stat"><span class="label">Отдельное спасибо</span><b>Полине за гориллу</b></div>
        <div class="stat"><span class="label">Спасибо</span><b>ChatGPT · DeepSeek · Claude</b></div>
      </div>
      <div class="footer-links">
        <button class="btn b-gho" data-go="stats">Статистика</button>
        <button class="btn b-gho" data-go="rules">Правила</button>
        <button class="btn b-gho" data-go="titles">Титулы</button>
        <button class="btn b-gho" data-go="settings">Настройки</button>
        <button class="btn b-gho" data-go="donate">💝 Поддержать Егора</button>
      </div>`);
    flickered = true;
  }

  EC.home = { render };
})(globalThis.EC = globalThis.EC || {});
