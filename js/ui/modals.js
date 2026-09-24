/* Все модалки: магазин, навыки, титулы, достижения, статистика, правила, «Честные шансы», настройки, профиль, «Отчислен». */
(function (EC) {
  'use strict';
  const U = EC.util, UI = EC.ui, C = EC.config, html = U.html;
  const S = () => EC.store.state;
  const note = (title, text, icon = '•', kind) => EC.fx.note({ title, text, icon, kind });

  const M = {};

  /* ---------- Магазин казино (открывается на 6-м уровне) ---------- */
  let shopCat = 'look';
  M.shop = () => {
    const body = () => {
      const s = S();
      const items = C.SHOP.filter((it) => it.cat === shopCat);
      return html`
      <div class="shop-top">
        <div class="seg quiet" role="tablist" aria-label="Категории">${C.SHOP_CATS.map((c) => html`<button data-cat="${c.id}" aria-pressed="${c.id === shopCat}">${c.n}</button>`)}</div>
        <span class="muted" style="font-size:var(--fs-14)">Баланс: <span class="num">${U.fmt(s.balance)} E</span></span>
      </div>
      <p class="sub">Покупается один раз. Оформление работает в казино и включается/выключается кнопкой.</p>
      <div class="shop-grid">${items.map((it) => {
        const own = s.shopOwned[it.id], on = s.shopEquipped[it.id];
        const always = it.id === 'avatars'; // VIP-аватары просто появляются в профиле
        return html`<div class="shop-item ${own ? 'owned' : ''}" data-item="${it.id}">
          <div class="top"><span class="si">${it.i}</span><div><b>${it.n}</b><div class="num muted" style="font-size:var(--fs-12)">${own ? (always ? 'куплено' : on ? 'включено' : 'выключено') : U.fmt(it.p) + ' E'}</div></div></div>
          <p>${it.d}</p>
          ${own
            ? always
              ? html`<button class="btn b-sec block" data-go="profile">Выбрать в профиле</button>`
              : html`<button class="btn ${on ? 'b-gho' : 'b-sec'} block" data-shop="toggle" data-id="${it.id}" aria-pressed="${!!on}">${on ? 'Выключить' : 'Включить'}</button>`
            : html`<button class="btn b-sec block" data-shop="buy" data-id="${it.id}" ${s.balance >= it.p ? '' : 'disabled'}>Купить · ${U.fmt(it.p)} E</button>`}
        </div>`;
      })}</div>`;
    };
    EC.modal.open({
      title: 'Магазин казино', wide: true, body: body(),
      onMount: (el) => {
        el.onclick = (e) => {
          const c = e.target.closest('[data-cat]');
          if (c) { shopCat = c.dataset.cat; EC.sound.play('click'); UI.set(el, body()); return; }
          const b = e.target.closest('[data-shop]');
          if (!b || b.disabled) return;
          if (b.dataset.shop === 'buy') {
            if (EC.econ.buyShop(b.dataset.id)) {
              EC.sound.play('coin');
              note('Куплено', C.SHOP.find((x) => x.id === b.dataset.id).n, '🛍');
              EC.app.track('event/shop-' + b.dataset.id);
            }
          } else {
            EC.econ.toggleShop(b.dataset.id);
            EC.sound.play('click');
          }
          UI.set(el, body());
        };
      },
    });
  };

  /* ---------- Навыки ---------- */
  M.skills = () => {
    const body = () => html`
      <p class="sub">Очко навыка — за каждый новый уровень казино. Свободно: <span class="num">${S().skillPoints}</span></p>
      <div class="skill-grid">${C.SKILLS.map((sk) => {
        const lvl = S().skills[sk.id] || 0, max = lvl >= sk.max;
        return html`<div class="skill">
          <div class="top"><span aria-hidden="true">${sk.i}</span><div><b>${sk.n}</b><div class="num muted" style="font-size:var(--fs-12)">ур. ${lvl} / ${sk.max}</div></div></div>
          <p>${sk.d}</p>
          <div class="pips">${Array.from({ length: sk.max }, (_, i) => html`<i class="${i < lvl ? 'on' : ''}"></i>`)}</div>
          <button class="btn b-sec block" data-skill="${sk.id}" ${max || S().skillPoints < 1 ? 'disabled' : ''}>${max ? 'Максимум' : 'Улучшить'}</button>
        </div>`;
      })}</div>`;
    EC.modal.open({
      title: 'Навыки', wide: true, body: body(),
      onMount: (el) => {
        el.onclick = (e) => {
          const b = e.target.closest('[data-skill]');
          if (!b || b.disabled) return;
          if (EC.econ.upgradeSkill(b.dataset.skill)) EC.sound.play('level');
          UI.set(el, body());
        };
      },
    });
  };

  /* ---------- Титулы ---------- */
  const TITLE_HINT = {
    rookie: '10 раундов', gambler: '100 раундов', lucky: 'выигрыш 1 000+ за раунд', highroller: 'выигрыш 10 000+ за раунд',
    philanthropist: 'донаты на 500 E', bronze: 'бронзовый VIP', gold: 'золотой VIP', diamond: 'алмазный VIP',
    polina: 'найти гориллу', botan: 'наботать 10 000 E', excellent: 'наботать 100 000 E',
  };
  M.titles = () => {
    const body = () => {
      const s = S();
      return html`<p class="sub">Титул горит рядом с именем. Открываются сами — выбирай любой открытый.</p>
        <div class="title-grid">
          <button class="title-opt" data-title="" aria-pressed="${!s.title}">Без титула</button>
          ${C.TITLES.map((t) => {
            const ok = s.titlesSeen.includes(t.id) || t.r(s);
            return html`<button class="title-opt" data-title="${t.id}" aria-pressed="${s.title === t.id}" ${ok ? '' : 'disabled'}>
              <span class="bdg bdg-${t.c}">${t.n}</span>${ok ? '' : html`<small>🔒 ${TITLE_HINT[t.id] || ''}</small>`}
            </button>`;
          })}
        </div>`;
    };
    EC.modal.open({
      title: 'Титулы', body: body(),
      onMount: (el) => {
        el.onclick = (e) => {
          const b = e.target.closest('[data-title]');
          if (!b || b.disabled) return;
          S().title = b.dataset.title;
          S().titleManual = true;
          EC.store.commit('profile');
          EC.sound.play('click');
          UI.set(el, body());
        };
      },
    });
  };

  /* ---------- Достижения ---------- */
  M.achievements = () => {
    const s = S();
    const list = C.ACH.filter((a) => a.cat === 'study' || EC.econ.casinoOpen());
    const group = (cat, title, sub) => {
      const items = list.filter((a) => a.cat === cat);
      if (!items.length) return '';
      return html`<h3 class="h-sub" style="margin:8px 0">${title} <span class="muted" style="font-size:var(--fs-12)">${sub}</span></h3>
        <div class="ach-grid" style="margin-bottom:12px">${items.map((a) => html`<div class="ach ${s.ach[a.id] ? 'on' : ''}"><span class="ai">${s.ach[a.id] ? '★' : '☆'}</span><div><b>${a.n}</b><small>${a.d}</small></div></div>`)}</div>`;
    };
    EC.modal.open({
      title: 'Достижения', wide: true,
      body: html`<p class="sub">Открыто ${list.filter((a) => s.ach[a.id]).length} из ${list.length}.</p>
        ${group('study', 'Учёба', 'за отметку в зачётке')}
        ${group('casino', 'Казино', '+' + C.ACH_REWARD + ' E за каждое')}`,
    });
  };

  /* ---------- Статистика ---------- */
  M.stats = () => {
    const s = S(), L = EC.earn;
    const st = (k, v, tx) => html`<div class="stat"><span class="label">${k}</span><b class="${tx ? 'tx' : ''}">${v}</b></div>`;
    const winRate = s.games ? Math.round((s.wins / s.games) * 100) + '%' : '—';
    EC.modal.open({
      title: 'Статистика', wide: true,
      body: html`
        <h3 class="h-sub" style="margin-bottom:8px">Казино</h3>
        <div class="stat-grid four">
          ${st('Раунды', U.fmt(s.games))}${st('Победы', U.fmt(s.wins))}${st('Поражения', U.fmt(s.losses))}${st('Процент побед', winRate)}
          ${st('Поставлено', U.compact(s.totalBet) + ' E')}${st('Выиграно (чистыми)', U.compact(s.totalWon) + ' E')}${st('Лучший куш', U.compact(s.biggestWin) + ' E')}${st('Уровень', s.level)}
        </div>
        <h3 class="h-sub" style="margin:16px 0 8px">По играм</h3>
        <div class="stat-grid four">${C.GAMES.map((g) => st(g.n, U.fmt(s.gamesBy[g.id] || 0)))}</div>
        <h3 class="h-sub" style="margin:16px 0 8px">Учёба</h3>
        <div class="stat-grid four">
          ${st('Наботано', U.big(s.earnTotal) + ' E')}${st('Кликов', U.fmt(s.clicks))}${st('Сила клика', U.rate(L.getClickPower()) + ' E')}${st('В секунду', U.rate(L.getEps()) + ' E/с')}
        </div>
        <h3 class="h-sub" style="margin:16px 0 8px">Прочее</h3>
        <div class="stat-grid four">
          ${st('Задоначено', U.compact(s.totalDonated) + ' E')}${st('Бонус-игр', U.fmt(s.bonusGames))}${st('Апгрейдов', U.fmt(s.upgradesBought))}${st('VIP', C.VIP[EC.econ.vipLevel()].n, true)}
        </div>`,
    });
  };

  /* ---------- Правила ---------- */
  const RULES = {
    roulette: html`<h3>Рулетка</h3><p>Европейское колесо: 0 и числа 1–36. Выбери ставку на поле: число — 35:1 (×36), дюжина или колонка — 2:1 (×3), красное/чёрное, чёт/нечет, 1–18/19–36 — 1:1 (×2). На зеро проигрывают все ставки, кроме ставки на 0.</p>`,
    slots: html`<h3>Слоты</h3><p>Три барабана, видно три ряда, платит средний ряд слева направо. ЕГОРИК — дикий символ, заменяет всё, кроме $. Знаки $ платят в любом месте окна (3, 4, 5+). ЕГОРИК на каждом барабане в любом ряду запускает бонус-игру на сетке 5×3 с пятью линиями.</p><ul><li><b>Классика</b> — частые мелкие выигрыши.</li><li><b>Книга Егорика</b> — реже, но крупнее, бонус богаче.</li><li><b>Мегавейс</b> — каждая победа подряд добавляет +0.25 к множителю (до ×5), промах сбрасывает серию.</li></ul>`,
    crash: html`<h3>Crash</h3><p>Множитель растёт, пока ракета не взорвётся. Жми «Забрать» (или пробел) — получишь ставку × текущий множитель. Можно задать авто-вывод. Точка взрыва выбирается до старта: шанс дожить до ×2 — 48.5%, до ×10 — 9.7%. Потолок — ×500 (+50 за уровень навыка «Люкс Crash»).</p>`,
    blackjack: html`<h3>Блэкджек</h3><p>Набери больше дилера, но не больше 21. Туз — 1 или 11, картинки — 10. 6 колод, дилер добирает до 17 и стоит на любых 17. Блэкджек (туз + десятка с раздачи) платит 3:2. Если у дилера открыт туз или десятка, он сразу проверяет блэкджек.</p><ul><li><b>Удвоить</b> — удвоить ставку и получить ровно одну карту.</li><li><b>Сплит</b> — разделить пару на две руки (один раз). Разделённые тузы получают по одной карте.</li></ul>`,
    baccarat: html`<h3>Баккара</h3><p>Ставишь на Игрока, Банкира или Ничью. Считается последняя цифра суммы (туз = 1, картинки и 10 = 0). У кого 8 или 9 с раздачи — натурал, карт больше нет. Игрок добирает на 0–5. Банкир добирает по таблице — в зависимости от третьей карты игрока. Игрок платит 1:1, Банкир — 0.95:1 (комиссия 5%), Ничья — 8:1; при ничьей ставки на Игрока и Банкира возвращаются.</p>`,
    poker: html`<h3>Холдем (Ultimate Texas Hold'em)</h3><p>Ставишь анте и такой же блайнд. У тебя и у дилера по две карты, на столе будет пять общих.</p><ul><li>До флопа: ставка «Плей» ×4 или ×3 анте — или чек.</li><li>После флопа: ×2 или чек.</li><li>После тёрна и ривера: ×1 или фолд (теряешь анте и блайнд).</li></ul><p>Сравниваются лучшие пятёрки. Победа: «Плей» платит 1:1, анте 1:1 (если у дилера хотя бы пара, иначе возврат), блайнд — по таблице со стрита (стрит 1:1, флеш 3:2, фулл-хаус 3:1, каре 10:1, стрит-флеш 50:1, роял 500:1), ниже стрита — возврат. Ничья — все ставки возвращаются.</p>`,
    video: html`<h3>Видеопокер</h3><p>Jacks or Better. Получаешь 5 карт, отмечаешь те, что держишь, остальные меняются один раз. Платит пара вальтов и старше: пара J+ ×1 (возврат), две пары ×2, тройка ×3, стрит ×4, флеш ×6, фулл-хаус ×9, каре ×25, стрит-флеш ×50, роял ×250.</p>`,
    dice: html`<h3>Кости</h3><p>По два кубика тебе и казино. Больше сумма — ставка ×2, ничья — ставка возвращается.</p>`,
  };
  M.rules = (focus) => {
    const order = focus ? [focus].concat(C.GAMES.map((g) => g.id).filter((x) => x !== focus)) : C.GAMES.map((g) => g.id);
    EC.modal.open({
      title: 'Правила', wide: true,
      body: html`<div class="rules">
        ${order.map((id) => RULES[id])}
        <h3>Общее</h3>
        <p>Егорики вымышленные, всё хранится только в этом браузере. Столы открываются с уровнем казино: опыт за раунд — 1 + число разрядов ставки после первого, за победу вдвое. VIP считается от суммы чистых выигрышей и поднимает минимальную ставку. Недельный ивент увеличивает чистый выигрыш (не ставку). Если закрыть страницу посреди раунда, ставка вернётся при следующем входе.</p>
        <div class="brow" style="margin-top:16px"><button class="btn b-sec" data-go="fair">⚖ Как считаются шансы</button></div>
      </div>`,
    });
  };

  /* ---------- «Честные шансы»: RTP каждой игры и ссылка на открытый код ---------- */
  const FAIR = [
    ['Кости', '100%', 'Равные шансы: больше сумма — ×2, ничья — возврат. Преимущества у казино нет.'],
    ['Блэкджек', '≈ 99,5%', 'При базовой стратегии. 6 колод, дилер стоит на 17, BJ 3:2, дабл, сплит.'],
    ['Баккара', '98,9% / 98,8% / 85,6%', 'Банкир / Игрок / Ничья — по стандартной таблице добора третьей карты.'],
    ['Видеопокер', '≈ 98%', 'Jacks or Better 9/6 при оптимальной игре; роял платит ×250.'],
    ['Холдем', '≈ 97,8%', 'Ultimate Texas Hold\'em: преимущество дилера ≈ 2,2% от анте при хорошей игре.'],
    ['Рулетка', '97,3%', '36/37 для любой ставки: единственное преимущество казино — зеро.'],
    ['Crash', '97%', 'Точка взрыва выбирается до старта: шанс дожить до ×M = 0,97 / M.'],
    ['Слоты', '95,8% / 96,9% / 96,4%', 'Классика / Книга Егорика / Мегавейс. Посчитано скриптом по таблицам выплат (tests/slots-rtp.test.js).'],
  ];
  M.fair = () => {
    EC.modal.open({
      title: 'Честные шансы', wide: true,
      body: html`<p class="sub">RTP — сколько из каждых 100 E ставок в среднем возвращается игроку на длинной дистанции. Никаких подкруток: весь код открыт, случайность — криптографическая (crypto.getRandomValues), колоды настоящие.</p>
        <table class="fair-table">
          <thead><tr><th>Игра</th><th>RTP</th><th>Откуда цифра</th></tr></thead>
          <tbody>${FAIR.map(([g, r, d]) => html`<tr><td><b>${g}</b></td><td class="num">${r}</td><td>${d}</td></tr>`)}</tbody>
        </table>
        <p class="sub" style="margin-top:12px">Недельный ивент и бонусы (навыки, клевер) поднимают отдачу выше этих цифр — это подарок, а не подкрутка против игрока.</p>
        <div class="brow"><a class="btn b-sec" href="${C.REPO_URL}" target="_blank" rel="noopener">Открыть код на GitHub ↗</a></div>`,
    });
  };

  /* ---------- Профиль (имя обязательно при первом входе) ---------- */
  const refLink = () => C.SITE_URL + '?' + C.REF.param + '=' + (S().name || 'друг').replace(/[\s&#?%+/=]/g, encodeURIComponent);
  const copyText = (text, ok, sub) => {
    const done = () => note(ok, sub, '📋');
    try {
      navigator.clipboard.writeText(text).then(done, () => note('Не получилось скопировать', 'Выдели ссылку вручную', '!'));
    } catch (e) { note('Не получилось скопировать', 'Выдели ссылку вручную', '!'); }
  };
  M.copyText = copyText;
  M.refLink = refLink;
  M.profile = (force = false) => {
    const s = S();
    const locked = force && !s.name;
    let av = s.avatar;
    const body = html`
      ${locked ? html`<p class="sub">Как тебя звать? Имя будет в шапке и в зале славы.</p>` : ''}
      <div class="field">
        <label class="label" for="nameIn">Имя</label>
        <input id="nameIn" class="inp text" maxlength="20" autocomplete="off" placeholder="Например, Егор" value="${s.name}">
      </div>
      <div class="field" style="margin-top:16px"><span class="label">Аватар</span>
        <div class="avatar-row" role="group" aria-label="Аватар">${UI.avatarList().map((a, i) => html`<button data-av="${i}" aria-pressed="${i === av}" aria-label="Аватар ${i + 1}">${a}</button>`)}</div>
      </div>
      ${locked ? '' : html`<div class="field" style="margin-top:16px"><span class="label">Позвать друга</span>
        <div class="donate-row" style="justify-content:flex-start"><input class="inp text" id="refLink" readonly value="${refLink()}" style="flex:1;min-width:0"><button class="btn b-sec" id="refCopy">Скопировать</button></div>
        <small class="muted" style="font-size:var(--fs-12)">Новичок по этой ссылке получит ${U.fmt(C.REF.bonus)} E на старт.</small>
      </div>`}
      <div class="brow" style="margin-top:24px;justify-content:flex-end">
        ${locked || !EC.econ.casinoOpen() ? '' : html`<button class="btn b-gho" data-go="titles">Титулы</button>`}
        <button class="btn b-pri" id="nameOk">${locked ? 'Начать' : 'Сохранить'}</button>
      </div>`;
    EC.modal.open({
      title: locked ? 'Добро пожаловать' : 'Профиль',
      locked,
      body,
      onClose: () => EC.bus.emit('profile-closed'),
      onMount: (el) => {
        const input = UI.$('#nameIn', el);
        el.addEventListener('click', (e) => {
          const b = e.target.closest('[data-av]');
          if (!b) return;
          av = +b.dataset.av;
          UI.$$('[data-av]', el).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
          EC.sound.play('click');
        });
        const apply = () => {
          const v = input.value.trim().slice(0, 20);
          if (!v) { note('Нужно имя', 'Хотя бы одна буква', '!'); input.focus(); return; }
          s.name = v;
          s.avatar = av;
          if (!s.nameBonusGiven && v.toLowerCase().replace('ё', 'е') === 'егор') {
            s.nameBonusGiven = true;
            EC.econ.addMoney(10000);
            note('Егор?! Тот самый?', '+10 000 E на старт', '👑', 'win');
            EC.sound.play('bonus');
          }
          EC.store.commit('profile');
          EC.modal.close();
        };
        UI.$('#nameOk', el).onclick = apply;
        const rc = UI.$('#refCopy', el);
        if (rc) rc.onclick = () => copyText(UI.$('#refLink', el).value, 'Ссылка скопирована', 'Отправь другу в чат');
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') apply(); });
        setTimeout(() => { input.focus(); input.select(); }, 30);
      },
    });
  };

  /* ---------- «Отчислен из казино»: денег нет на минимальную ставку → назад к учёбе ---------- */
  M.bankrupt = () => {
    const s = S();
    EC.modal.open({
      title: 'Отчислен из казино',
      body: html`<div class="bankrupt">
        <p class="sign">ОТЧИСЛЕН</p>
        <p class="sub" style="text-align:center;margin-top:12px">На минимальную ставку (${U.fmt(EC.econ.minBet())} E) не хватает. Не беда: сосед и кофе продолжают ботать, а зачётка всегда под рукой. Наботаешь — возвращайся.</p>
        <div class="stat-grid four" style="margin:16px 0">
          <div class="stat"><span class="label">Раунды</span><b>${U.fmt(s.games)}</b></div>
          <div class="stat"><span class="label">Победы</span><b>${U.fmt(s.wins)}</b></div>
          <div class="stat"><span class="label">Поражения</span><b>${U.fmt(s.losses)}</b></div>
          <div class="stat"><span class="label">Лучший куш</span><b>${U.big(s.biggestWin)}</b></div>
        </div>
        <div class="brow" style="justify-content:center">
          <button class="btn b-pri lg" data-go="study" data-close>Вернуться ботать</button>
        </div>
      </div>`,
    });
  };

  /* ---------- Настройки ---------- */
  M.settings = (tab = 'general') => {
    const s = S();
    const sw = (key, label, hint) => html`<div class="set-row"><div><b>${label}</b>${hint ? html`<small>${hint}</small>` : ''}</div>
      <button class="switch" role="switch" aria-checked="${!!s[key]}" data-sw="${key}" aria-label="${label}"></button></div>`;
    const range = (key, label) => html`<div class="set-row"><div><b>${label}</b></div><input type="range" min="0" max="100" value="${Math.round(s[key] * 100)}" data-vol="${key}" aria-label="${label}"></div>`;
    const tabs = [['general', 'Общие'], ['sound', 'Звук'], ['codes', 'Коды'], ['about', 'Об игре']];
    const body = html`
      <div class="seg quiet" role="tablist" style="margin-bottom:16px">${tabs.map(([id, n]) => html`<button data-tab="${id}" aria-pressed="${id === tab}">${n}</button>`)}</div>
      ${tab === 'general' ? html`
        ${sw('anim', 'Анимации', 'Выключи, если нужно быстро и без эффектов')}
        <div class="set-row"><div><b>Турбо</b><small>Скорость анимаций на столах, клавиша T</small></div>
          <div class="seg quiet">${[1, 2, 4].map((t) => html`<button data-turbo="${t}" aria-pressed="${s.turbo === t}">×${t}</button>`)}</div></div>
        <div class="set-row"><div><b>Обучение</b><small>Пройти подсказки на учёбе заново</small></div><button class="btn b-sec sm" id="tutBtn">Пройти заново</button></div>
        <div class="set-row"><div><b>Сохранение</b><small>Файл с прогрессом — перенести в другой браузер</small></div>
          <div class="brow"><button class="btn b-sec sm" id="exportBtn">Скачать</button><label class="btn b-sec sm">Загрузить<input id="importIn" type="file" accept="application/json" hidden></label></div></div>
        <div class="set-row"><div><b>Сброс прогресса</b><small>Снова первокурсник: учёба, уровни, достижения — всё с нуля</small></div><button class="btn b-los sm" id="resetBtn">Сбросить</button></div>` : ''}
      ${tab === 'sound' ? html`${sw('sound', 'Звук')}${range('volumeMaster', 'Общая громкость')}${range('volumeSfx', 'Эффекты')}${range('volumeUi', 'Интерфейс')}` : ''}
      ${tab === 'codes' ? html`
        <p class="sub">Секретные коды от разработчика.</p>
        <div class="donate-row" style="justify-content:flex-start"><input id="codeIn" class="inp text" autocomplete="off" placeholder="код" style="flex:1;min-width:0"><button class="btn b-pri" id="codeOk">Ввести</button></div>
        <div class="code-st" id="codeSt"></div>` : ''}
      ${tab === 'about' ? html`
        <div class="stat-grid">
          <div class="stat"><span class="label">Главный разработчик</span><b class="tx">Егор</b></div>
          <div class="stat"><span class="label">Спонсор</span><b class="tx">Калядка</b></div>
          <div class="stat" style="grid-column:1/-1"><span class="label">Отдельное спасибо</span><b class="tx">Полине за гориллу</b></div>
          <div class="stat" style="grid-column:1/-1"><span class="label">Спасибо</span><b class="tx">ChatGPT · DeepSeek · Claude</b></div>
        </div>
        <p class="sub" style="margin-top:16px">Егорики вымышленные. Никаких реальных денег — только азарт.</p>` : ''}`;
    EC.modal.open({
      title: 'Настройки', body,
      onMount: (el) => {
        el.onclick = (e) => {
          const t = e.target.closest('[data-tab],[data-sw],[data-turbo]');
          if (!t) return;
          if (t.dataset.tab) { M.settings(t.dataset.tab); return; }
          if (t.dataset.sw) {
            s[t.dataset.sw] = !s[t.dataset.sw];
            t.setAttribute('aria-checked', String(s[t.dataset.sw]));
          }
          if (t.dataset.turbo) {
            s.turbo = +t.dataset.turbo;
            UI.$$('[data-turbo]', el).forEach((x) => x.setAttribute('aria-pressed', String(x === t)));
          }
          EC.store.commit('settings');
          EC.sound.play('click');
        };
        UI.$$('[data-vol]', el).forEach((r) => r.addEventListener('input', () => {
          s[r.dataset.vol] = +r.value / 100;
          EC.store.save();
        }));
        UI.$$('[data-vol]', el).forEach((r) => r.addEventListener('change', () => EC.sound.play('coin')));
        UI.$('#tutBtn', el) && (UI.$('#tutBtn', el).onclick = () => EC.app.restartTutorial());
        const reset = UI.$('#resetBtn', el);
        if (reset) reset.onclick = () => {
          if (!reset.dataset.sure) { reset.dataset.sure = '1'; reset.textContent = 'Точно? Нажми ещё раз'; setTimeout(() => { if (reset.isConnected) { delete reset.dataset.sure; reset.textContent = 'Сбросить'; } }, 4000); return; }
          EC.modal.close(true);
          EC.app.reset();
        };
        const exp = UI.$('#exportBtn', el);
        if (exp) exp.onclick = () => {
          const a = document.createElement('a');
          a.href = URL.createObjectURL(new Blob([JSON.stringify(S(), null, 2)], { type: 'application/json' }));
          a.download = 'egor-casino-save.json';
          a.click();
          setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        };
        const imp = UI.$('#importIn', el);
        if (imp) imp.onchange = () => {
          const f = imp.files[0];
          if (!f) return;
          if (EC.econ.busy) { note('Сначала доиграй раунд', '', '!'); return; }
          const r = new FileReader();
          r.onload = () => {
            try {
              EC.store.replace(JSON.parse(r.result));
              EC.modal.close(true);
              EC.app.go(S().progress.casinoUnlocked ? '' : 'study', true);
              note('Сохранение загружено', 'С возвращением, ' + (S().name || 'игрок'), '✓');
            } catch (err) {
              note('Не получилось', 'Это не файл сохранения', '!');
            }
          };
          r.readAsText(f);
        };
        const ok = UI.$('#codeOk', el);
        if (ok) {
          const inp = UI.$('#codeIn', el);
          const go = () => { M.code(inp.value, UI.$('#codeSt', el)); inp.select(); };
          ok.onclick = go;
          inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
        }
      },
    });
  };

  /* ---------- Секретные коды ---------- */
  M.code = (raw, st) => {
    const s = S(), c = String(raw || '').trim().toLowerCase();
    const ok = (t) => UI.set(st, html`<span class="ok">✓ ${t}</span>`);
    const cheatWin = (net, label) => {
      EC.econ.addMoney(net);
      s.totalWon += net;
      EC.econ.checkTitles();
      EC.store.commit('balance');
      EC.bus.emit('win', { net, bet: 100, label, kind: 'win', cheat: true });
    };
    switch (c) {
      case 'admin': // консоль «Админ абьюз» — кнопка 🛠 у логотипа (js/ui/admin.js)
        EC.admin.set(true); EC.sound.play('bonus'); return ok('Админ абьюз включён — кнопка 🛠 у логотипа');
      case 'money': EC.econ.addMoney(10000); EC.store.commit('balance'); EC.sound.play('coin'); return ok('+10 000 E');
      case 'bonus': s.pendingBonus = true; EC.store.save(); EC.sound.play('bonus'); return ok('Следующий спин в слотах — бонус');
      case 'super': case 'win10': cheatWin(1000, 'Чит'); return ok('SUPER');
      case 'mega': case 'win100': cheatWin(10000, 'Чит'); return ok('MEGA');
      case 'ultra': case 'win1000': cheatWin(100000, 'Чит'); return ok('ULTRA');
      case 'bankrupt':
        if (EC.econ.busy) return UI.set(st, html`<span class="err">Не во время раунда</span>`);
        s.balance = 0; s.bankruptShown = false; EC.store.commit('balance'); EC.modal.close(true); EC.econ.checkBankrupt(); return;
      case 'gorilla': EC.modal.close(true); EC.fx.gorilla(); return;
      case 'boss': EC.modal.close(true); EC.fx.boss(); return;
      case 'kalyadka': EC.econ.unlock('kalyadka'); EC.store.commit('ach'); return ok('Спасибо, Калядка!');
      case 'vip3': s.totalWon = Math.max(s.totalWon, 50000); s.vip = 3; EC.econ.checkTitles(); EC.store.commit('vip'); return ok('Алмазный VIP');
      case 'podval': // открыть казино без учёбы (для автора)
        if (s.progress.casinoUnlocked) return ok('Подвал уже открыт');
        s.earnTotal = Math.max(s.earnTotal, C.EARN.door.rumors);
        EC.econ.addMoney(C.EARN.door.pass);
        EC.modal.close(true);
        EC.coach.stop();
        s.progress.tutorialStep = 4;
        if (EC.econ.buyPass()) EC.bus.emit('pass-bought');
        return;
      case 'lvl20':
        if (!s.progress.casinoUnlocked) return UI.set(st, html`<span class="err">Сначала открой подвал</span>`);
        EC.econ.addXp(Math.max(0, (C.xpForLevel(20) - s.xp) / EC.econ.xpMult()));
        EC.store.commit('level');
        return ok('Уровень ' + s.level + ' — все столы открыты');
      default: return UI.set(st, html`<span class="err">Такого кода нет</span>`);
    }
  };

  EC.modals = M;
})(globalThis.EC = globalThis.EC || {});
