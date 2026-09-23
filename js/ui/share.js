/* Карточка выигрыша «Поделиться»: картинка 1200×630 на canvas + готовый текст для чата.
   Показывается на редких событиях: Crash ×10+, роял/стрит-флеш, Triple 777, ва-банк, MEGA/ULTRA WIN. */
(function (EC) {
  'use strict';
  const U = EC.util, UI = EC.ui, C = EC.config, html = U.html;
  const S = () => EC.store.state;

  const css = (v) => getComputedStyle(document.body).getPropertyValue(v).trim();

  async function draw(res, reason) {
    const s = S();
    const W = 1200, H = 630;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    const F = { d: css('--font-display'), n: css('--font-num'), u: css('--font-ui') };
    try {
      await Promise.all([document.fonts.load('64px ' + F.d), document.fonts.load('96px ' + F.n), document.fonts.load('600 32px ' + F.u)]);
    } catch (e) { /* шрифты не критичны */ }
    const bg = css('--n-950'), pink = css('--pink-500'), gold = css('--gold-500'), tx = css('--n-0'), tx2 = css('--n-300'), cyan = css('--cyan-500');
    // фон
    g.fillStyle = bg;
    g.fillRect(0, 0, W, H);
    const grad = g.createRadialGradient(W * 0.5, -80, 40, W * 0.5, -80, 720);
    grad.addColorStop(0, pink + '55');
    grad.addColorStop(1, bg + '00');
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
    g.strokeStyle = pink + '66';
    g.lineWidth = 2;
    g.strokeRect(24, 24, W - 48, H - 48);
    // вывеска
    g.textBaseline = 'alphabetic';
    g.font = '56px ' + F.d;
    g.fillStyle = pink;
    g.shadowColor = pink;
    g.shadowBlur = 28;
    g.fillText('ЕГОР КАЗИНО', 72, 130);
    g.shadowBlur = 0;
    // сумма
    g.font = '500 120px ' + F.n;
    g.fillStyle = gold;
    g.shadowColor = gold;
    g.shadowBlur = 30;
    g.fillText('+' + U.fmt(res.net) + ' E', 72, 330);
    g.shadowBlur = 0;
    // за что
    g.font = '600 40px ' + F.u;
    g.fillStyle = tx;
    g.fillText(reason, 72, 400);
    const base = res.bet || (res.meta && res.meta.nominal) || 0;
    if (base > 0) {
      g.font = '500 32px ' + F.n;
      g.fillStyle = cyan;
      g.fillText(U.mult((res.net + base) / base) + ' от ставки', 72, 450);
    }
    // игрок
    g.font = '600 36px ' + F.u;
    g.fillStyle = tx;
    g.fillText(UI.avatar() + '  ' + (s.name || 'Игрок'), 72, 540);
    // водяной знак
    g.font = '28px ' + F.u;
    g.fillStyle = tx2;
    g.textAlign = 'right';
    g.fillText(C.SITE_URL.replace(/^https:\/\//, '').replace(/\/$/, ''), W - 72, 540);
    return cv;
  }

  const shareText = (res, reason) =>
    `Поднял +${U.fmt(res.net)} E в Егор Казино — ${reason} 🎰 Заходи: ${EC.modals.refLink()}`;

  async function open(res, reason) {
    const cv = await draw(res, reason);
    const url = cv.toDataURL('image/png');
    const blob = await new Promise((r) => cv.toBlob(r, 'image/png'));
    const text = shareText(res, reason);
    const file = blob && typeof File === 'function' ? new File([blob], 'egor-casino-win.png', { type: 'image/png' }) : null;
    const canNative = !!(file && navigator.canShare && navigator.canShare({ files: [file] }));
    EC.app.track('event/share-open');
    EC.modal.open({
      title: 'Поделиться выигрышем',
      wide: true,
      body: html`<img class="share-prev" src="${url}" alt="Карточка выигрыша: +${U.fmt(res.net)} E, ${reason}">
        <p class="sub" style="margin-top:12px">${text}</p>
        <div class="brow">
          ${canNative ? html`<button class="btn b-pri" data-sh="native">Отправить…</button>` : ''}
          <button class="btn ${canNative ? 'b-sec' : 'b-pri'}" data-sh="img">Скопировать картинку</button>
          <button class="btn b-sec" data-sh="text">Скопировать текст</button>
          <button class="btn b-gho" data-sh="save">Сохранить PNG</button>
        </div>`,
      onMount: (el) => {
        el.onclick = async (e) => {
          const b = e.target.closest('[data-sh]');
          if (!b) return;
          const k = b.dataset.sh;
          EC.app.track('event/share-' + k);
          try {
            if (k === 'native') await navigator.share({ files: [file], text });
            else if (k === 'img') {
              await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
              EC.fx.note({ title: 'Картинка скопирована', text: 'Вставь в чат', icon: '📋' });
            } else if (k === 'text') EC.modals.copyText(text, 'Текст скопирован', 'Вставь в чат вместе с картинкой');
            else if (k === 'save') {
              const a = document.createElement('a');
              a.href = url;
              a.download = 'egor-casino-win.png';
              a.click();
            }
          } catch (err) {
            if (k === 'img') EC.fx.note({ title: 'Браузер не даёт скопировать картинку', text: 'Нажми «Сохранить PNG»', icon: '!' });
          }
        };
      },
    });
  }

  EC.share = { open, draw, shareText };
})(globalThis.EC = globalThis.EC || {});
