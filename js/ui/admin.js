/* «Админ абьюз» — консоль со всеми кодами разработчика.
   Кнопка 🛠 у логотипа появляется после кода admin (Настройки → Коды) и прячется командой «admin off».
   Флаг — отдельный ключ localStorage, сохранение игры не меняется. Всё только на вымышленных Егориках. */
(function (EC) {
  'use strict';
  const U = EC.util, UI = EC.ui, C = EC.config, html = U.html;
  const S = () => EC.store.state;
  const KEY = 'egor-casino-admin';

  const A = {};
  let memOn = false; // если localStorage недоступен (приватный режим) — хотя бы до перезагрузки
  A.isOn = () => {
    try { return localStorage.getItem(KEY) === '1' || memOn; } catch (e) { return memOn; }
  };
  A.set = (on) => {
    memOn = on;
    try { if (on) localStorage.setItem(KEY, '1'); else localStorage.removeItem(KEY); } catch (e) { /* приватный режим */ }
    A.sync();
  };
  A.sync = () => { const b = UI.$('#adminBtn'); if (b) b.hidden = !A.isOn(); };

  /* ---------- Помощники ---------- */
  const err = (t) => ({ err: t });
  const casino = () => S().progress.casinoUnlocked;
  const money = (n) => () => {
    EC.econ.addMoney(n);
    EC.store.commit('balance');
    EC.sound.play('coin');
    return '+' + U.fmt(n) + ' E';
  };
  const toLevel = (n) => {
    const s = S();
    if (!casino()) return err('Сначала открой подвал — команда podval');
    n = U.clamp(Math.floor(n), 1, 100);
    if (!Number.isFinite(n) || n <= s.level) return err('Уже уровень ' + s.level + ' — только вверх');
    EC.econ.addXp(Math.max(0, (C.xpForLevel(n) - s.xp) / EC.econ.xpMult()) + 1e-6);
    EC.store.commit('level');
    return 'Уровень ' + s.level;
  };
  const vip = (i) => () => {
    const s = S();
    s.totalWon = Math.max(s.totalWon, C.VIP[i].min);
    s.vip = Math.max(s.vip, i);
    EC.econ.checkTitles();
    EC.store.commit('vip');
    return `VIP ${C.VIP[i].n} · мин. ставка ${U.fmt(C.VIP[i].minBet)} E`;
  };

  /* Автоматы: следующий спин выбранного автомата гарантированно с фичей.
     Исход честный — берётся первый по порядку спин генератора, где фича выпала. */
  const forced = {};
  const force = (id, want, what) => () => {
    const L = EC.machines.logic[id];
    if (!L.adminWrapped) {
      const orig = L.play;
      L.adminWrapped = true;
      L.play = (M, rnd) => {
        const w = forced[id];
        if (!w) return orig(M, rnd);
        delete forced[id];
        for (let i = 0; i < 1e6; i++) { const o = orig(M, rnd); if (w(o)) return o; }
        return orig(M, rnd);
      };
    }
    forced[id] = want;
    return `Следующий спин в «${C.MACHINES[id].n}» — ${what}`;
  };

  /* ---------- Все команды. code — что вводить в консоли; arg — команда с числом ---------- */
  const GROUPS = [
    { n: 'Егорики', items: [
      { code: 'cash1k', n: '+1 000 E', run: money(1000) },
      { code: 'money', n: '+10 000 E', old: true },
      { code: 'cash100k', n: '+100 000 E', run: money(100000) },
      { code: 'cash1m', n: '+1 000 000 E', run: money(1000000) },
      { code: 'bal', n: 'Точный баланс', arg: 'сумма', run: (v) => {
        v = Math.floor(Number(v));
        if (!Number.isFinite(v) || v < 0) return err('Нужно число от 0: bal 5000');
        S().balance = v;
        EC.store.commit('balance');
        EC.econ.checkBankrupt();
        return 'Баланс ' + U.fmt(v) + ' E';
      } },
      { code: 'bankrupt', n: 'Обнулить → «Отчислен»', old: true },
    ] },
    { n: 'Прогресс казино', items: [
      { code: 'podval', n: 'Открыть подвал', old: true },
      { code: 'lvlup', n: '+1 уровень', run: () => toLevel(S().level + 1) },
      { code: 'lvl20', n: 'Уровень 20 — всё открыто', old: true },
      { code: 'lvl', n: 'До уровня', arg: 'номер', run: (v) => toLevel(Number(v)) },
      { code: 'sp5', n: '+5 очков навыков', run: () => {
        if (!casino()) return err('Сначала открой подвал — команда podval');
        S().skillPoints += 5;
        EC.store.commit('skills');
        return 'Очков навыков: ' + S().skillPoints;
      } },
      { code: 'free3', n: '+3 бесплатных спина', run: () => {
        if (!casino()) return err('Сначала открой подвал — команда podval');
        const p = S().progress;
        p.freeSpinsLeft = Math.min(10, p.freeSpinsLeft + 3);
        EC.store.commit('balance');
        return 'Бесплатных спинов на «Классике»: ' + p.freeSpinsLeft;
      } },
      { code: 'quests', n: 'Выполнить квесты дня', run: () => {
        if (!EC.econ.isOpen('quests')) return err('Квесты открываются на 2-м уровне казино');
        EC.econ.refreshQuests();
        S().quests.forEach((id) => { const q = C.QUESTS.find((x) => x.id === id); if (q) EC.econ.tickQuest(q.t, q.need); });
        EC.store.commit('quests');
        return 'Квесты дня выполнены';
      } },
      { code: 'ach', n: 'Все достижения', run: () => {
        const s = S();
        C.ACH.forEach((a) => { s.ach[a.id] = true; });
        EC.econ.checkTitles();
        EC.store.commit('ach');
        return `Открыто ${C.ACH.length} достижений (без наград)`;
      } },
      { code: 'vip1', n: 'VIP Бронзовый', run: vip(1) },
      { code: 'vip2', n: 'VIP Золотой', run: vip(2) },
      { code: 'vip3', n: 'VIP Алмазный', old: true },
    ] },
    { n: 'Учёба', items: [
      { code: 'study', n: '+100 000 наботано', run: () => {
        S().earnTotal += 100000;
        EC.econ.addMoney(100000);
        EC.store.commit('balance');
        return '+100 000 E на учёбе — апгрейды и дверь ближе';
      } },
      { code: 'tutorial', n: 'Обучение заново', run: () => { EC.modal.close(true); EC.app.restartTutorial(); return null; } },
    ] },
    { n: 'Следующий спин', items: [
      { code: 'bonus', n: 'Слоты: бонус-игра', old: true },
      { code: 'force-book', n: 'Книга Знаний: фриспины', run: force('knowledge', (o) => o.bonus && o.bonus.spins.some((s) => s.expand), 'фриспины с раскрытием') },
      { code: 'force-cyber', n: 'Кибер-Кластеры: фриспины', run: force('clusters', (o) => o.bonus, 'фриспины с множителями') },
      { code: 'force-hold', n: 'Рыбалка: Hold & Spin', run: force('fishing', (o) => o.hold, 'Hold & Spin') },
      { code: 'force-ded', n: 'Рыбалка: фриспины с дедом', run: force('fishing', (o) => o.bonus, 'фриспины с дедом') },
      { code: 'force-nudge', n: 'Мини-777: нюдж', run: force('mini777', (o) => o.nudge, 'нюдж') },
      { code: 'force-x10', n: 'Мини-777: множитель ×10', run: force('mini777', (o) => o.mult === 10, 'выигрыш с ×10') },
    ] },
    { n: 'Эффекты', items: [
      { code: 'super', n: 'SUPER WIN · +1 000 E', old: true },
      { code: 'mega', n: 'MEGA WIN · +10 000 E', old: true },
      { code: 'ultra', n: 'ULTRA WIN · +100 000 E', old: true },
      { code: 'gorilla', n: 'Горилла', old: true },
      { code: 'boss', n: 'Босс', old: true },
      { code: 'kalyadka', n: 'Спасибо Калядке', old: true },
    ] },
    { n: 'Магазин', items: [
      { code: 'shopall', n: 'Весь магазин бесплатно', run: () => {
        const s = S();
        C.SHOP.forEach((it) => { s.shopOwned[it.id] = true; s.shopEquipped[it.id] = true; });
        EC.store.commit('shop');
        return `Куплено и надето: ${C.SHOP.length} предметов`;
      } },
    ] },
  ];
  const ALL = GROUPS.flatMap((g) => g.items);

  /* Выполнить команду: «money», «lvl 12», «bal 5000», «admin off». Возвращает { ok, text } или null (модалку закрыли). */
  A.run = (raw) => {
    const line = String(raw || '').trim().toLowerCase();
    if (!line) return null;
    if (line === 'admin off') { A.set(false); EC.modal.close(true); return null; }
    if (line === 'admin') return { ok: true, text: 'Админ абьюз уже включён' };
    const [cmd, arg] = line.split(/\s+/);
    const a = ALL.find((x) => x.code === (x.arg ? cmd : line));
    if (a && !a.old) {
      if (a.arg && arg == null) return { ok: false, text: `Нужно число: ${a.code} <${a.arg}>` };
      const r = a.run(arg);
      if (r == null) return null;
      return r.err ? { ok: false, text: r.err } : { ok: true, text: r };
    }
    // Старые коды — через тот же обработчик, что в Настройках → Коды
    const tmp = document.createElement('div');
    EC.modals.code(line, tmp);
    if (!tmp.textContent) return null;
    return { ok: !tmp.querySelector('.err'), text: tmp.textContent.replace(/^[✓\s]+/, '') };
  };

  /* ---------- Консоль ---------- */
  A.open = () => {
    const tile = (a) => (a.arg
      ? html`<div class="adm-act adm-arg"><b>${a.n}</b><span class="adm-argrow"><input class="inp" type="number" min="0" inputmode="numeric" placeholder="${a.arg}" data-arg="${a.code}" aria-label="${a.n}"><button class="btn b-sec sm" data-adm="${a.code}">OK</button></span><code>${a.code} &lt;${a.arg}&gt;</code></div>`
      : html`<button class="adm-act" data-adm="${a.code}"><b>${a.n}</b><code>${a.code}</code></button>`);
    const body = html`<div class="adm">
      <p class="sub">Режим разработчика: мгновенно и бесплатно. Любую команду можно ввести строкой ниже или нажать кнопку.</p>
      <form class="adm-cli" id="admCli" autocomplete="off">
        <span aria-hidden="true">&gt;</span>
        <input id="admIn" class="inp text" placeholder="money · lvl 12 · bal 5000 · force-hold" aria-label="Команда">
        <button class="btn b-pri sm" type="submit">Выполнить</button>
      </form>
      <div class="adm-log" id="admLog" aria-live="polite"></div>
      ${GROUPS.map((g) => html`<section class="adm-sec"><h3>${g.n}</h3><div class="adm-grid">${g.items.map(tile)}</div></section>`)}
      <div class="adm-foot"><button class="btn b-gho sm" data-adm="admin off">Спрятать кнопку админки</button><code>admin off</code></div>
    </div>`;
    EC.modal.open({
      title: 'Админ абьюз', wide: true, body,
      onMount: (el) => {
        const log = UI.$('#admLog', el), input = UI.$('#admIn', el);
        const exec = (line) => {
          const r = A.run(line);
          if (!r || !log.isConnected) return;
          log.insertAdjacentHTML('afterbegin', String(html`<div class="${r.ok ? 'ok' : 'err'}"><code>&gt; ${line}</code> ${r.ok ? '✓' : '✕'} ${r.text}</div>`));
          while (log.children.length > 6) log.lastElementChild.remove();
        };
        UI.$('#admCli', el).onsubmit = (e) => { e.preventDefault(); exec(input.value); input.select(); };
        el.addEventListener('click', (e) => {
          const b = e.target.closest('[data-adm]');
          if (!b) return;
          const code = b.dataset.adm, inp = UI.$(`[data-arg="${code}"]`, el);
          exec(inp ? code + ' ' + (inp.value || '') : code);
        });
        el.addEventListener('keydown', (e) => {
          const inp = e.target.closest('[data-arg]');
          if (inp && e.key === 'Enter') exec(inp.dataset.arg + ' ' + (inp.value || ''));
        });
      },
    });
  };

  EC.admin = A;
  EC.modals.admin = A.open; // кнопка у логотипа — data-go="admin"
  A.sync();
})(globalThis.EC = globalThis.EC || {});
