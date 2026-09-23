/* Разовая сцена открытия казино (~2,5 с): БГУИР гаснет сверху вниз, экран темнеет,
   загорается неоновая вывеска с гулом. Есть «Пропустить»; без анимаций — простое затухание 300 мс. */
(function (EC) {
  'use strict';
  const UI = EC.ui;

  let running = false;

  function unlockCasino(onDone) {
    if (running) return;
    running = true;
    const o = document.createElement('div');
    o.className = 'scene';
    o.innerHTML = '<h1 class="sign">ЕГОР КАЗИНО</h1><button class="btn b-gho scene-skip">Пропустить</button>';
    document.body.appendChild(o);
    const timers = [];
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      timers.forEach(clearTimeout);
      document.body.classList.remove('scene-out');
      if (onDone) onDone();
      o.style.transition = 'opacity 400ms ease';
      o.style.opacity = '0';
      setTimeout(() => { o.remove(); running = false; }, 420);
    };
    o.querySelector('.scene-skip').onclick = finish;

    if (!UI.animOn()) { // reduced-motion или «Анимации: выкл»
      o.classList.add('fade');
      requestAnimationFrame(() => o.classList.add('dark'));
      timers.push(setTimeout(finish, 300));
      return;
    }
    // Элементы учёбы гаснут по очереди сверху вниз
    const parts = [UI.$('.topbar')].concat(UI.$$('.view.on > *'));
    parts.forEach((p, i) => p && p.style.setProperty('--i', i));
    document.body.classList.add('scene-out');
    timers.push(setTimeout(() => o.classList.add('dark'), 600));
    timers.push(setTimeout(() => {
      EC.app.setTheme('neon'); // за чёрным экраном — сразу в неон
      EC.sound.play('hum');
      o.classList.add('lit');
    }, 1250));
    timers.push(setTimeout(finish, 2700));
  }

  EC.scene = { unlockCasino, running: () => running };
})(globalThis.EC = globalThis.EC || {});
