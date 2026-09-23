/* Звук: синтезированные тоны через Web Audio (никаких файлов). */
(function (EC) {
  'use strict';
  let ctx = null;
  const S = () => EC.store.state;

  // [частота, длительность, форма, громкость, задержка, слой]
  const P = {
    click: [[430, 0.06, 'sine', 0.025, 0, 'ui']],
    tick: [[660, 0.035, 'triangle', 0.012, 0, 'ui']],
    crit: [[880, 0.06, 'triangle', 0.03, 0], [1320, 0.12, 'sine', 0.03, 0.05]],
    buy: [[523, 0.07, 'triangle', 0.03, 0, 'ui'], [784, 0.12, 'triangle', 0.03, 0.06, 'ui']],
    win: [[660, 0.1, 'sine', 0.035, 0], [830, 0.12, 'sine', 0.04, 0.07], [1040, 0.18, 'triangle', 0.035, 0.15]],
    lose: [[250, 0.16, 'sine', 0.035, 0], [190, 0.2, 'triangle', 0.03, 0.09]],
    coin: [[880, 0.07, 'triangle', 0.035, 0], [1175, 0.13, 'sine', 0.03, 0.06]],
    level: [[523, 0.1, 'triangle', 0.03, 0], [659, 0.1, 'triangle', 0.03, 0.07], [784, 0.18, 'triangle', 0.04, 0.14]],
    reel: [[220, 0.045, 'square', 0.014, 0]],
    wheel: [[150, 0.08, 'triangle', 0.02, 0], [190, 0.1, 'triangle', 0.025, 0.08]],
    dice: [[300, 0.07, 'square', 0.02, 0], [420, 0.1, 'square', 0.02, 0.07]],
    deal: [[1200, 0.03, 'triangle', 0.015, 0]],
    bj: [[523, 0.1, 'triangle', 0.03, 0], [659, 0.1, 'triangle', 0.03, 0.08], [988, 0.18, 'triangle', 0.04, 0.16]],
    bonus: [[523, 0.09, 'triangle', 0.025, 0], [659, 0.09, 'triangle', 0.03, 0.07], [784, 0.11, 'triangle', 0.03, 0.14], [1047, 0.22, 'triangle', 0.035, 0.23]],
    crash: [[180, 0.1, 'sawtooth', 0.03, 0], [120, 0.28, 'sawtooth', 0.025, 0.08]],
    cash: [[784, 0.08, 'triangle', 0.035, 0], [1175, 0.16, 'triangle', 0.035, 0.06]],
    // Учёба: тихий «бумажный» щелчок
    paper: [[190, 0.03, 'triangle', 0.014, 0, 'ui'], [2600, 0.012, 'square', 0.003, 0.004, 'ui']],
    // Гул неоновой вывески в сцене открытия казино
    hum: [[55, 1.5, 'sawtooth', 0.018, 0], [110, 1.5, 'sine', 0.02, 0], [120, 0.06, 'square', 0.02, 0.28], [120, 0.06, 'square', 0.02, 0.6], [240, 0.9, 'triangle', 0.012, 0.62]],
    // Джекпот — узнаваемый стингер только для самых редких выигрышей
    jackpot: [[523, 0.1, 'square', 0.025, 0], [659, 0.1, 'square', 0.025, 0.08], [784, 0.1, 'square', 0.025, 0.16], [1047, 0.12, 'square', 0.03, 0.24],
      [1319, 0.12, 'triangle', 0.035, 0.34], [1568, 0.28, 'triangle', 0.04, 0.44], [2093, 0.5, 'sine', 0.03, 0.56], [1047, 0.7, 'sine', 0.025, 0.56], [784, 0.7, 'sine', 0.02, 0.56]],
  };

  function tone(f, d, type, v, delay, layer) {
    const s = S();
    const lm = layer === 'ui' ? s.volumeUi : s.volumeSfx;
    const vol = v * lm * s.volumeMaster;
    if (vol < 0.001) return;
    ctx = ctx || new (globalThis.AudioContext || globalThis.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g);
    g.connect(ctx.destination);
    o.start(t);
    o.stop(t + d + 0.02);
  }

  EC.sound = {
    play(name) {
      if (!S() || !S().sound) return;
      try {
        for (const a of P[name] || P.click) tone(a[0], a[1], a[2], a[3], a[4], a[5] || 'sfx');
      } catch (e) { /* нет Web Audio — играем молча */ }
    },
  };
  EC.bus.on('sound', (n) => EC.sound.play(n));
})(globalThis.EC = globalThis.EC || {});
