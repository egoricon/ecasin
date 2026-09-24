/* Прогон в настоящем браузере по пути игрока из роадмапа:
   имя → обучение на учёбе → дверь в подвал → сцена → фриспины → столы → магазин (каждый предмет) →
   «Отчислен из казино» → телефон → реферальная ссылка → старый сейв.
   Запуск: node tests/e2e/smoke.js [папка-для-скриншотов]
   Нужен playwright (npm i -g playwright или npx playwright install chromium). */
const path = require('path');
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }

const OUT = process.argv[2] || path.join(__dirname, 'shots');
const URL = 'file://' + path.join(__dirname, '..', '..', 'index.html');
require('fs').mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const check = (cond, msg) => { if (!cond) errors.push(msg); };
  const newPage = async (viewport, init) => {
    const p = await browser.newPage({ viewport, ignoreHTTPSErrors: true });
    if (init) await p.addInitScript(init);
    p.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    p.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g|ERR_CERT|net::|favicon/.test(m.text())) errors.push('console: ' + m.text()); });
    return p;
  };
  const shot = (p, name, full) => p.screenshot({ path: path.join(OUT, name + '.png'), fullPage: !!full });
  const ev = (p, fn, arg) => p.evaluate(fn, arg);

  /* ---------- 1. Первый вход: имя, учёба, обучение ---------- */
  const page = await newPage({ width: 1360, height: 900 });
  await page.goto(URL);
  await page.waitForSelector('#nameIn');
  await page.keyboard.press('Escape');
  check(await page.$('#nameIn'), 'модалку имени закрыли Escape');
  await page.fill('#nameIn', 'Тест');
  await page.keyboard.press('Enter');
  await page.waitForSelector('.coach-tip');
  check(await ev(page, () => document.documentElement.dataset.theme) === 'bsuir', 'на старте не тема БГУИР');
  check(await ev(page, () => document.getElementById('modeSeg').hidden), 'переключатель режимов виден до открытия казино');
  check(await ev(page, () => EC.store.state.balance) === 0, 'стартовый баланс не 0');
  await shot(page, '01-study-coach');

  // Шаг 1: 10 кликов (клики вне подсветки заблокированы)
  const clk = async (n) => { for (let i = 0; i < n; i++) await page.click('#clk'); };
  await clk(10);
  await page.waitForTimeout(150);
  check(await ev(page, () => EC.store.state.progress.tutorialStep) === 1, 'обучение не перешло на шаг 2 после 10 кликов');
  // Шаг 2: копим на конспект и покупаем его
  while (await ev(page, () => EC.store.state.balance < 15)) await clk(1);
  await page.waitForTimeout(250);
  await page.click('[data-buy="konspekt"]');
  await page.waitForTimeout(150);
  check(await ev(page, () => EC.store.state.progress.tutorialStep) === 2, 'обучение не перешло на шаг 3 после конспекта');
  await shot(page, '02-study-coach-life');
  // Шаг 3: копим на кофе и покупаем
  for (let i = 0; i < 80 && !(await page.$('[data-buy="coffee"]:not([disabled])')); i++) await clk(1);
  await page.waitForTimeout(250);
  await page.click('[data-buy="coffee"]');
  await page.waitForTimeout(250);
  check(await ev(page, () => EC.store.state.progress.tutorialStep) === 3, 'обучение не перешло на шаг 4 после кофе');
  await page.click('[data-coach-ok]');
  await page.waitForTimeout(200);
  check(!(await page.$('.coach')), 'подсветка не закрылась после обучения');
  check(await ev(page, () => EC.store.state.progress.tutorialStep) === 4, 'обучение не пройдено');
  await shot(page, '03-study', true);

  // Пробел = клик по зачётке
  const c0 = await ev(page, () => EC.store.state.clicks);
  await page.mouse.click(5, 300);
  await page.keyboard.press('Space');
  check(await ev(page, () => EC.store.state.clicks) === c0 + 1, 'пробел не ботает');

  /* ---------- 2. Подвал: пропуск и сцена ---------- */
  await ev(page, () => { const s = EC.store.state; s.earnTotal = 40000; s.balance = 12000; EC.store.commit('earn'); });
  await page.waitForSelector('[data-act="pass"]:not([disabled])');
  await shot(page, '04-door-ready');
  await page.click('[data-act="pass"]');
  await page.waitForTimeout(1500);
  await shot(page, '05-scene');
  await page.waitForFunction(() => !EC.scene.running(), null, { timeout: 8000 });
  await page.waitForTimeout(400);
  check(await ev(page, () => document.documentElement.dataset.theme) === 'neon', 'после сцены не неон');
  check(await ev(page, () => location.hash) === '#/', 'после сцены не лобби');
  const seg = await ev(page, () => ({ hidden: document.getElementById('modeSeg').hidden, labels: [...document.querySelectorAll('[data-mode-btn]')].map((b) => b.textContent.trim()) }));
  check(!seg.hidden && seg.labels.join('/') === 'Депать/Ботать', 'переключатель режимов: ' + JSON.stringify(seg));
  check(await page.$('.gcard.locked'), 'нет запертых столов в лобби');
  await shot(page, '06-lobby', true);

  // Запертый стол не открывается
  await ev(page, () => { location.hash = '#/game/poker'; });
  await page.waitForTimeout(300);
  check(await ev(page, () => location.hash) === '#/', 'запертый стол открылся по ссылке');

  /* ---------- 3. Бесплатные спины ---------- */
  await page.click('[data-go="game"][data-id="slots"]');
  await page.waitForSelector('#primaryBtn');
  await ev(page, () => { EC.store.state.turbo = 4; });
  for (let i = 0; i < 3; i++) {
    const before = await ev(page, () => EC.store.state.balance);
    await page.click('#primaryBtn');
    await page.waitForFunction(() => !EC.econ.busy, null, { timeout: 30000 });
    await page.waitForTimeout(200);
    const after = await ev(page, () => EC.store.state.balance);
    check(after >= before, 'бесплатный спин списал деньги');
    if (await page.$('.win-ov')) await page.click('.win-ov');
  }
  check(await ev(page, () => EC.store.state.progress.freeSpinsLeft) === 0, 'фриспины не закончились');
  check(await ev(page, () => document.getElementById('primaryBtn').textContent.trim()) === 'Крутить', 'кнопка не вернулась в «Крутить»');

  /* ---------- 4. Все столы (уровень 20 кодом) ---------- */
  await ev(page, () => { EC.store.state.balance = 50000; EC.econ.addXp(5000); EC.store.commit('level'); });
  const play = async (id, fn) => {
    await ev(page, (g) => { location.hash = '#/game/' + g; }, id);
    await page.waitForSelector('#primaryBtn');
    await page.fill('#betIn', '100');
    await fn();
    await page.waitForFunction(() => !EC.econ.busy, null, { timeout: 30000 });
    await page.waitForTimeout(250);
    await ev(page, () => document.querySelectorAll('.win-ov').forEach((o) => o.remove()));
    await shot(page, 'game-' + id);
  };
  const primary = () => page.click('#primaryBtn');
  await play('roulette', async () => { await page.click('[data-pick="straight:17"]'); await primary(); });
  await play('slots', async () => { await page.click('[data-v="book"]'); await page.waitForTimeout(200); await page.fill('#betIn', '100'); await primary(); });
  await play('crash', async () => { await page.fill('#crAuto', '0'); await primary(); await page.waitForTimeout(500); await primary(); });
  await play('blackjack', async () => { await primary(); await page.waitForTimeout(600); if (await page.$('[data-act="stand"]:not([disabled])')) await page.click('[data-act="stand"]'); });
  await play('baccarat', async () => { await page.click('[data-on="banker"]'); await primary(); });
  await play('poker', async () => {
    await primary(); await page.waitForTimeout(300);
    await page.click('[data-act="check"]'); await page.waitForTimeout(500);
    await page.click('[data-act="check"]'); await page.waitForTimeout(700);
    await page.click('[data-act="raise"]');
  });
  await play('video', async () => { await primary(); await page.waitForTimeout(400); await page.click('[data-i="0"]'); await primary(); });
  await play('dice', async () => { await primary(); });

  /* ---------- 4б. Автоматы: лобби, спин, «Инфо», автоигра останавливается без Егориков ---------- */
  const MACHINES = ['mini777', 'knowledge', 'fishing', 'clusters'];
  await ev(page, () => { location.hash = '#/'; });
  await page.waitForTimeout(300);
  check(await ev(page, (ids) => ids.every((id) => document.querySelector(`.games.machines [data-go="game"][data-id="${id}"]`)), MACHINES), 'не все автоматы в лобби');
  for (const id of MACHINES) {
    const g0 = await ev(page, (g) => EC.store.state.gamesBy[g], id);
    await play(id, primary);
    check(await ev(page, (g) => EC.store.state.gamesBy[g], id) === g0 + 1, id + ': спин не засчитан ровно один раз');
    check(await ev(page, () => EC.store.state.pendingRound === null), id + ': раунд не закрыт');
    await page.click('[data-act="info"]');
    await page.waitForSelector('.m-info .m-pay');
    await shot(page, 'machine-' + id + '-info');
    await page.keyboard.press('Escape');
  }
  // Автоигра ×25 при балансе на 3 минимальные ставки: три проигрыша подряд — и стоп (исход подменён на проигрышный только для теста)
  await ev(page, () => { location.hash = '#/game/mini777'; });
  await page.waitForSelector('#primaryBtn');
  const minB = await ev(page, () => Math.max(EC.econ.minBet(), EC.config.MACHINES.mini777.minBet)); // VIP поднимает минимум
  await ev(page, (b) => {
    const L = EC.machines.logic.mini777, orig = L.play;
    L.play = (M, rnd) => { let o; do { o = orig(M, rnd); } while (o.m > 0); return o; };
    window.__restorePlay = () => { L.play = orig; };
    EC.store.state.balance = 3 * b; EC.store.commit('balance');
  }, minB);
  await page.fill('#betIn', String(minB));
  const a0 = await ev(page, () => EC.store.state.gamesBy.mini777);
  await page.click('[data-auto="25"]');
  await page.waitForFunction(() => document.getElementById('autoStop').hidden && !EC.econ.busy, null, { timeout: 30000 });
  await page.waitForTimeout(1500);
  const auto = await ev(page, () => ({ bal: EC.store.state.balance, lbl: document.getElementById('autoLbl').textContent }));
  // Пассивный доход учёбы может докапать пару Егориков — важно, что денег меньше ставки и автоигра стоит
  const spun = await ev(page, () => EC.store.state.gamesBy.mini777) - a0;
  check(auto.bal < minB && auto.lbl === 'Автоигра', 'автоигра не остановилась: ' + JSON.stringify(auto));
  check(spun >= 3 && spun < 25, 'автоигра без денег не остановилась вовремя: ' + spun + ' спинов');
  await ev(page, () => { window.__restorePlay(); EC.modal.close(true); EC.store.state.balance = 50000; EC.store.commit('balance'); EC.econ.checkBankrupt(); });
  await page.waitForTimeout(1000);
  await ev(page, () => EC.modal.close(true));

  /* ---------- 5. Магазин: каждый предмет покупается и работает ---------- */
  await ev(page, () => { location.hash = '#/'; EC.store.state.balance = 100000; EC.store.commit('balance'); });
  await page.waitForTimeout(300);
  await page.click('[data-go="shop"]');
  for (const cat of ['look', 'profile', 'perk']) {
    await page.click(`[data-cat="${cat}"]`);
    const ids = await ev(page, (c) => EC.config.SHOP.filter((x) => x.cat === c).map((x) => x.id), cat);
    for (const id of ids) {
      await page.click(`[data-shop="buy"][data-id="${id}"]`);
      await page.waitForTimeout(80);
      check(await ev(page, (x) => EC.store.state.shopOwned[x], id), 'не купился предмет ' + id);
    }
    await shot(page, 'shop-' + cat);
  }
  await page.keyboard.press('Escape');
  const fx = await ev(page, () => {
    const b = document.body.dataset, s = EC.store.state;
    return {
      neon: b.neon, fire: b.fire, cardback: b.cardback, dice: b.dice, wheel: b.wheel, frame: b.frame,
      crown: document.getElementById('whoName').textContent.includes('♛'),
      clover: document.getElementById('balClover').textContent === '♣',
      avatars: EC.ui.avatarList().length,
      mascot: EC.econ.xpMult(), mug: EC.earn.multiplier(),
      fire2: getComputedStyle(document.querySelector('.topbar'), '::after').opacity,
      back: getComputedStyle(document.body).getPropertyValue('--card-back').trim(),
    };
  });
  for (const k of ['neon', 'fire', 'cardback', 'dice', 'wheel', 'frame']) check(fx[k] === '1', 'не включился предмет ' + k);
  check(fx.crown && fx.clover, 'корона/клевер не видны');
  check(fx.avatars === 14, 'VIP-аватары не добавились: ' + fx.avatars);
  check(Math.abs(fx.mascot - 1.1) < 1e-9, 'талисман не даёт +10% опыта');
  check(fx.mug >= 1.1 - 1e-9, 'кружка не даёт +10% к учёбе');
  check(fx.fire2 === '1', 'огненная кромка не видна');
  // Алмазный след и конфетти
  await page.mouse.move(400, 400); await page.mouse.move(420, 410); await page.mouse.move(460, 430);
  check(await page.$('.trail'), 'алмазный след не рисуется');
  await ev(page, () => EC.fx.win({ net: 600, bet: 100, kind: 'win', meta: {} }));
  await page.waitForTimeout(100);
  check(await page.$('.particles'), 'конфетти не выстрелило на ×7');
  // Выключение предмета
  await page.click('[data-go="shop"]');
  await page.click('[data-cat="look"]');
  await page.click('[data-shop="toggle"][data-id="fire"]');
  await page.keyboard.press('Escape');
  check(await ev(page, () => document.body.dataset.fire) === '0', 'предмет не выключается');
  // В теме БГУИР оформление казино не работает
  await page.click('[data-mode-btn="study"]');
  await page.waitForTimeout(300);
  check(await ev(page, () => document.documentElement.dataset.theme === 'bsuir' && document.body.dataset.neon === '0'), 'неон горит на учёбе');
  await shot(page, '07-study-after-casino');
  await page.click('[data-mode-btn="casino"]');
  await page.waitForTimeout(300);

  /* ---------- 6. Модалки и «Поделиться» ---------- */
  for (const m of ['skills', 'titles', 'achievements', 'stats', 'rules', 'fair', 'settings', 'profile']) {
    await ev(page, (x) => EC.modals[x](), m);
    await page.waitForTimeout(200);
    await shot(page, 'modal-' + m);
    await page.keyboard.press('Escape');
  }
  await ev(page, () => EC.bus.emit('win', { net: 24000, bet: 1000, pay: 25000, kind: 'win', game: 'crash', meta: { share: 'Crash ×25.00', label: 'Crash' } }));
  await page.waitForSelector('[data-share]');
  await shot(page, '08-win-share');
  await page.click('[data-share]');
  await page.waitForSelector('.share-prev');
  await page.waitForTimeout(300);
  await shot(page, '09-share-card');
  await page.keyboard.press('Escape');

  /* ---------- 7. Отчислен из казино → назад ботать (через код разработчика в настройках) ---------- */
  await ev(page, () => { location.hash = '#/'; });
  await page.waitForTimeout(300);
  await page.click('[data-go="settings"]');
  await page.click('[data-tab="codes"]');
  await page.fill('#codeIn', 'bankrupt');
  await page.click('#codeOk');
  await page.waitForSelector('.bankrupt', { timeout: 5000 });
  await shot(page, '10-bankrupt');
  await page.click('.bankrupt [data-go="study"]');
  await page.waitForTimeout(400);
  check(await ev(page, () => location.hash) === '#/study', '«Вернуться ботать» не ведёт на учёбу');

  /* ---------- 8. Телефон ---------- */
  const m = await newPage({ width: 390, height: 844 });
  await m.goto(URL);
  await m.waitForSelector('#nameIn');
  await m.fill('#nameIn', 'Полина');
  await m.keyboard.press('Enter');
  await m.waitForSelector('.coach-tip');
  await m.screenshot({ path: path.join(OUT, 'm-study-coach.png') });
  await ev(m, () => { EC.coach.stop(); const s = EC.store.state; s.progress.tutorialStep = 4; s.earnTotal = 60000; s.clickerLvl.konspekt = 5; s.clickerLvl.coffee = 3; s.clickerLvl.sosed = 2; EC.store.commit('earn'); });
  await m.waitForTimeout(300);
  await m.screenshot({ path: path.join(OUT, 'm-study.png'), fullPage: true });
  await ev(m, () => { const s = EC.store.state; s.balance = 20000; EC.econ.buyPass(); s.progress.unlockSceneSeen = true; EC.app.go('', true); });
  await m.waitForTimeout(500);
  await m.screenshot({ path: path.join(OUT, 'm-lobby.png'), fullPage: true });
  for (const g of ['slots', 'dice']) {
    await ev(m, (x) => { location.hash = '#/game/' + x; }, g);
    await m.waitForTimeout(500);
    await m.screenshot({ path: path.join(OUT, 'm-' + g + '.png'), fullPage: true });
  }
  const overflow = await ev(m, () => document.documentElement.scrollWidth - window.innerWidth);
  check(overflow <= 0, 'горизонтальная прокрутка на телефоне: ' + overflow + 'px');

  /* ---------- 9. Реферальная ссылка ---------- */
  const r = await newPage({ width: 1280, height: 800 });
  await r.goto(URL + '?ref=Ваня#/');
  await r.waitForSelector('#nameIn');
  const ref = await ev(r, () => ({ bal: EC.store.state.balance, by: EC.store.state.refBy, url: location.search }));
  check(ref.bal === 500 && ref.by === 'Ваня' && ref.url === '', 'реферал: ' + JSON.stringify(ref));

  /* ---------- 10. Сейв старой версии: ветеран сразу в казино ---------- */
  const v = await newPage({ width: 1280, height: 800 }, () => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('egor-casino-v3', JSON.stringify({ name: 'Старый', balance: 4321, games: 150, xp: 900, level: 10, totalWon: 12000, ach: [true, true], shopOwned: [true, true, false, false, true], shopEquipped: [true, false, false, false, true], title: 'gambler' }));
  });
  await v.goto(URL);
  await v.waitForTimeout(800);
  const vet = await ev(v, () => ({ theme: document.documentElement.dataset.theme, hash: location.hash, bal: EC.store.state.balance, lvl: EC.store.state.level, name: EC.store.state.name, crown: EC.store.state.shopEquipped.crown, modal: EC.modal.isOpen(), coach: EC.coach.active() }));
  check(vet.theme === 'neon' && vet.hash === '#/' && vet.bal === 4321 && vet.lvl === 10 && vet.name === 'Старый' && vet.crown && !vet.modal && !vet.coach, 'ветеран: ' + JSON.stringify(vet));
  await v.screenshot({ path: path.join(OUT, '11-veteran.png') });

  await browser.close();
  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'OK — ошибок нет');
  process.exit(errors.length ? 1 : 0);
})();
