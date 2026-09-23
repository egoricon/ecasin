/* Дымовой прогон в настоящем браузере: все экраны, по раунду в каждой игре, «Заработок», телефон.
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
  const newPage = async (viewport) => {
    const p = await browser.newPage({ viewport, ignoreHTTPSErrors: true });
    p.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    p.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g|ERR_CERT|net::/.test(m.text())) errors.push('console: ' + m.text()); });
    return p;
  };
  const shot = (p, name, full) => p.screenshot({ path: path.join(OUT, name + '.png'), fullPage: !!full });
  const turbo = (p) => p.evaluate(() => { EC.store.state.turbo = 4; EC.store.save(); });

  const page = await newPage({ width: 1360, height: 900 });
  await page.goto(URL);
  await page.waitForSelector('#nameIn');
  // Модалка имени закрыться не должна
  await page.keyboard.press('Escape');
  if (!(await page.$('#nameIn'))) errors.push('name modal closed by Escape');
  await page.fill('#nameIn', 'Егор');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(400);
  const bal = await page.evaluate(() => EC.store.state.balance);
  if (bal !== 10100) errors.push('name bonus: balance ' + bal);
  await page.waitForTimeout(3600);
  await shot(page, '01-home', true);
  await turbo(page);

  const play = async (id, fn) => {
    await page.evaluate((g) => { location.hash = '#/game/' + g; }, id);
    await page.waitForSelector('#primaryBtn');
    await page.fill('#betIn', '100');
    await fn();
    await page.waitForFunction(() => !EC.econ.busy, null, { timeout: 30000 });
    await page.waitForTimeout(300);
    await shot(page, 'game-' + id);
  };
  const primary = () => page.click('#primaryBtn');

  await play('roulette', async () => { await page.click('[data-pick="straight:17"]'); await primary(); });
  await play('slots', async () => { await page.evaluate(() => { EC.store.state.pendingBonus = true; }); await primary(); await page.waitForTimeout(700); await shot(page, 'slots-bonus'); });
  await play('crash', async () => { await page.fill('#crAuto', '0'); await primary(); await page.waitForTimeout(600); await shot(page, 'crash-flight'); await primary(); });
  await play('blackjack', async () => {
    await primary();
    await page.waitForTimeout(700);
    if (await page.$('[data-act="stand"]:not([disabled])')) await page.click('[data-act="stand"]');
  });
  await play('baccarat', async () => { await page.click('[data-on="banker"]'); await primary(); });
  await play('poker', async () => {
    await primary();
    await page.waitForTimeout(300);
    await page.click('[data-act="check"]');
    await page.waitForTimeout(600);
    await page.click('[data-act="check"]');
    await page.waitForTimeout(800);
    await page.click('[data-act="raise"]');
  });
  await play('video', async () => { await primary(); await page.waitForTimeout(500); await page.click('[data-i="0"]'); await page.click('[data-i="1"]'); await primary(); });
  await play('dice', async () => { await primary(); });

  // Навигация посреди раунда запрещена
  await page.evaluate(() => { location.hash = '#/game/blackjack'; });
  await page.waitForSelector('#primaryBtn');
  await primary();
  await page.waitForTimeout(250);
  const busy = await page.evaluate(() => EC.econ.busy);
  if (busy) {
    await page.evaluate(() => { location.hash = '#/'; });
    await page.waitForTimeout(200);
    const stay = await page.evaluate(() => location.hash);
    if (stay !== '#/game/blackjack') errors.push('navigation during round was allowed: ' + stay);
    if (await page.$('[data-act="stand"]:not([disabled])')) await page.click('[data-act="stand"]');
    await page.waitForFunction(() => !EC.econ.busy);
  }

  // Заработок
  await page.click('[data-mode-btn="earn"]');
  await page.waitForSelector('.tut-step');
  await shot(page, 'earn-tutorial');
  for (let i = 0; i < 4; i++) await page.click('[data-tut="next"]');
  const before = await page.evaluate(() => EC.store.state.balance);
  for (let i = 0; i < 40; i++) await page.click('#clk');
  const after = await page.evaluate(() => EC.store.state.balance);
  if (after - before < 40) errors.push('clicks did not add balance: ' + (after - before));
  await page.click('[data-buy="notes"]');
  await page.click('[data-tab="life"]');
  await page.click('[data-buy="coffee"]');
  await page.waitForTimeout(1200);
  await shot(page, 'earn', true);
  const mode = await page.evaluate(() => document.body.dataset.mode);
  if (mode !== 'earn') errors.push('body mode not earn: ' + mode);

  // Модалки
  for (const m of ['shop', 'skills', 'titles', 'achievements', 'stats', 'rules', 'settings']) {
    await page.click('[data-mode-btn="casino"]');
    await page.evaluate((x) => EC.modals[x](), m);
    await page.waitForTimeout(250);
    await shot(page, 'modal-' + m);
    await page.keyboard.press('Escape');
  }
  await page.click('[data-go="donate"]');
  await page.click('#donBtn');
  await page.waitForTimeout(500);
  await shot(page, 'donate');

  // Телефон
  const m = await newPage({ width: 390, height: 844 });
  await m.goto(URL);
  await m.waitForSelector('#nameIn');
  await m.fill('#nameIn', 'Полина');
  await m.keyboard.press('Enter');
  await m.waitForTimeout(3500);
  await m.screenshot({ path: path.join(OUT, 'm-home.png'), fullPage: true });
  for (const g of ['roulette', 'slots', 'blackjack', 'poker', 'video']) {
    await m.evaluate((x) => { location.hash = '#/game/' + x; }, g);
    await m.waitForTimeout(500);
    await m.screenshot({ path: path.join(OUT, 'm-' + g + '.png'), fullPage: true });
  }
  await m.click('[data-mode-btn="earn"]');
  await m.waitForTimeout(600);
  await m.keyboard.press('Escape');
  await m.waitForTimeout(300);
  await m.screenshot({ path: path.join(OUT, 'm-earn.png'), fullPage: true });
  const overflow = await m.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (overflow > 0) errors.push('mobile horizontal overflow: ' + overflow + 'px');

  await browser.close();
  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'OK — ошибок нет');
  process.exit(errors.length ? 1 : 0);
})();
