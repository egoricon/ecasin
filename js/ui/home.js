/* Лобби казино: вывеска, профиль и следующая цель, столы (запертые — с прогрессом), квесты, миссии, достижения.
   Системы, которые ещё не открыты, не показываются вовсе; столы — показываются с замком (это главный контент). */
(function (EC) {
  'use strict';
  const U = EC.util, UI = EC.ui, C = EC.config, html = U.html;
  const S = () => EC.store.state;
  let flickered = false;

  // Ближайшее, что откроется с уровнем: стол, вариант слотов или система.
  function nextUnlock() {
    const s = S(), all = [];
    C.GAMES.forEach((g) => all.push({ lvl: g.lvl, n: 'стол ' + g.n }));
    Object.values(C.SLOTS).forEach((v) => all.push({ lvl: v.lvl, n: 'слот «' + v.n + '»' }));
    C.FEATURES.forEach((f) => all.push({ lvl: f.lvl, n: f.n.toLowerCase() }));
    return all.filter((x) => x.lvl > s.level).sort((a, b) => a.lvl - b.lvl)[0] || null;
  }
  // Прогресс XP до уровня lvl (0–100).
  function pctTo(lvl) {
    const s = S(), from = C.xpForLevel(1), to = C.xpForLevel(lvl);
    return U.clamp(((s.xp - from) / (to - from)) * 100, 0, 100);
  }

  function profileCard() {
    const s = S(), E = EC.econ, li = E.levelInfo(), nx = nextUnlock();
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
        <div class="lvl-row"><span>Уровень <span class="num">${s.level}</span></span><span class="num">${U.fmt(li.into)} / ${U.fmt(li.need)} XP</span></div>
        <div class="bar"><i style="width:${li.pct}%"></i></div>
      </div>
      ${nx ? html`<div class="next-goal"><span>Дальше: <b>${nx.n}</b></span><span class="num">ур. ${nx.lvl}</span></div>` : ''}
      ${E.isOpen('vip') ? html`<div>
        <div class="lvl-row"><span>VIP: ${vip.n}</span><span class="num">${vp.next ? 'ещё ' + U.fmt(vp.left) + ' E' : 'максимум'}</span></div>
        <div class="bar info"><i style="width:${vp.pct}%"></i></div>
      </div>` : ''}
      <div class="stat-grid">
        <div class="stat"><span class="label">Раунды</span><b>${U.fmt(s.games)}</b></div>
        <div class="stat"><span class="label">Победы</span><b>${U.fmt(s.wins)}</b></div>
        <div class="stat"><span class="label">Выиграно</span><b>${U.big(s.totalWon)} E</b></div>
        <div class="stat"><span class="label">Лучший куш</span><b>${U.big(s.biggestWin)} E</b></div>
      </div>
      <div class="hist" aria-label="Последние раунды">${recent.length ? recent.map((h) => html`<i class="${h === 'W' ? 'w' : h === 'L' ? 'l' : ''}">${h === 'W' ? 'В' : h === 'L' ? 'П' : '='}</i>`) : html`<span class="faint" style="font-size:var(--fs-12)">Сыграй первый раунд</span>`}</div>
    </aside>`;
  }

  function gamesHTML() {
    const s = S(), E = EC.econ;
    return C.GAMES.map((g) => {
      if (!E.gameOpen(g.id)) {
        return html`<button class="gcard locked" data-go="locked" data-id="${g.id}" aria-label="${g.n}: откроется на уровне ${g.lvl}">
          <span class="glyph" aria-hidden="true">🔒</span>
          <span class="gname">${g.n}</span>
          <p>Откроется на уровне ${g.lvl}</p>
          <span class="bar lock-bar"><i style="width:${pctTo(g.lvl)}%"></i></span>
        </button>`;
      }
      const fresh = !s.progress.seenUnlocks[g.id];
      return html`<button class="gcard ${fresh ? 'fresh' : ''}" data-go="game" data-id="${g.id}">
        <span class="glyph" aria-hidden="true">${g.glyph}</span>
        <span class="gname">${g.n}</span>
        <p>${g.d}</p>
        <span class="gfoot"><span class="bdg ${fresh ? 'bdg-accent' : 'bdg-mute'}">${fresh ? 'новое' : g.tag}</span><span class="num">${s.gamesBy[g.id] ? U.fmt(s.gamesBy[g.id]) + ' ' + U.plural(s.gamesBy[g.id], 'раунд', 'раунда', 'раундов') : ''}</span></span>
      </button>`;
    });
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
    const s = S(), E = EC.econ, ev = E.week();
    const opened = C.ACH.filter((a) => s.ach[a.id]).length;
    const free = s.progress.freeSpinsLeft;
    const panels = [];
    if (E.isOpen('quests')) panels.push(html`<section class="panel"><div class="panel-head"><h3 class="h-sub">Квесты дня</h3><span class="muted" style="font-size:var(--fs-12)">обновятся в полночь</span></div><div class="list">${questsHTML()}</div></section>`);
    panels.push(html`<section class="panel"><div class="panel-head"><h3 class="h-sub">Миссии</h3></div><div class="list">${missionsHTML()}</div></section>`);
    panels.push(html`<section class="panel">
      <div class="panel-head"><h3 class="h-sub">Достижения</h3><span class="num muted">${opened} / ${C.ACH.length}</span></div>
      <div class="ach-grid">${achHTML()}</div>
      <div class="brow" style="margin-top:12px"><button class="btn b-sec block" data-go="achievements">Все достижения</button></div>
    </section>`);
    root.innerHTML = String(html`
      <section class="hero">
        <div class="hero-copy">
          <h1 class="sign ${flickered ? '' : 'flick'}">ЕГОР КАЗИНО</h1>
          <p>Подвал общаги, неон и вымышленные Егорики. Столы открываются с уровнем — каждый раунд даёт опыт. Кончились Егорики — иди ботать.</p>
          <div class="brow">
            ${free > 0
              ? html`<button class="btn b-pri lg" data-go="game" data-id="slots">🎁 Бесплатные спины · ${free}</button>`
              : html`<button class="btn b-pri lg" data-go="random">✦ Случайный стол</button>`}
            ${E.isOpen('shop') ? html`<button class="btn b-sec lg" data-go="shop">Магазин</button>` : ''}
            ${E.isOpen('skills') ? html`<button class="btn b-sec lg" data-go="skills">Навыки${s.skillPoints ? html` <span class="bdg bdg-accent">${s.skillPoints}</span>` : ''}</button>` : ''}
          </div>
          ${E.isOpen('event') ? html`<div class="event">🎉 <b>${ev.n}</b> · ${ev.d}</div>` : ''}
        </div>
        ${profileCard()}
      </section>

      <div class="section-head"><h2 class="h-block">Столы</h2><p>Минимальная ставка сейчас — <span class="num">${U.fmt(E.minBet())} E</span></p></div>
      <div class="games">${gamesHTML()}</div>

      <div class="section-head"><h2 class="h-block">Прогресс</h2></div>
      <div class="home-grid" data-n="${panels.length}">${panels}</div>

      <div class="section-head"><h2 class="h-block">Авторы</h2></div>
      <div class="credits">
        <div class="stat"><span class="label">Главный разработчик</span><b>Егор</b></div>
        <div class="stat"><span class="label">Спонсор</span><b>Калядка</b></div>
        <div class="stat"><span class="label">Отдельное спасибо</span><b>Полине за гориллу</b></div>
        <div class="stat"><span class="label">Спасибо</span><b>ChatGPT · DeepSeek · Claude</b></div>
      </div>
      <div class="footer-links">
        <button class="btn b-gho" data-go="fair">⚖ Честные шансы</button>
        <button class="btn b-gho" data-go="stats">Статистика</button>
        <button class="btn b-gho" data-go="rules">Правила</button>
        <button class="btn b-gho" data-go="titles">Титулы</button>
        <button class="btn b-gho" data-go="settings">Настройки</button>
        ${E.isOpen('donate') ? html`<button class="btn b-gho" data-go="donate">💝 Поддержать Егора</button>` : ''}
      </div>`);
    flickered = true;
  }

  EC.home = { render };
})(globalThis.EC = globalThis.EC || {});
