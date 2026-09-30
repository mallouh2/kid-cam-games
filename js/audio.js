/* ============================================================
   المؤثرات الصوتية — WebAudio بدون أي ملفات صوتية
   ============================================================ */
'use strict';

const SFX = {
  ctx: null,
  muted: localStorage.getItem('kc_sound') === 'off',

  ensure() {
    if (this.muted) return null;
    if (!this.ctx) {
      try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch (e) { return null; }
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  },

  tone(freq, dur, type = 'sine', vol = .25, delay = 0, freqEnd = null) {
    const ctx = this.ensure(); if (!ctx) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, t0);
    if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(.001, t0 + dur);
    osc.connect(g); g.connect(ctx.destination);
    osc.start(t0); osc.stop(t0 + dur + .05);
  },

  noise(dur = .3, vol = .3) {
    const ctx = this.ensure(); if (!ctx) return;
    const len = ctx.sampleRate * dur;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const g = ctx.createGain(); g.gain.value = vol;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900;
    src.connect(f); f.connect(g); g.connect(ctx.destination);
    src.start();
  },

  pop()     { this.tone(600, .14, 'sine', .3, 0, 150); this.tone(900, .08, 'triangle', .15); },
  golden()  { this.tone(880, .1, 'sine', .3); this.tone(1174, .1, 'sine', .3, .08); this.tone(1568, .16, 'sine', .3, .16); },
  catchFruit() { this.tone(880, .09, 'sine', .3); this.tone(1318, .14, 'sine', .3, .07); },
  bomb()    { this.noise(.4, .5); this.tone(120, .3, 'square', .25, 0, 60); },
  bonk()    { this.tone(180, .12, 'square', .35, 0, 90); this.tone(500, .06, 'triangle', .2); },
  tick()    { this.tone(620, .08, 'sine', .22); },
  go()      { this.tone(880, .25, 'sine', .3); },
  click()   { this.tone(420, .06, 'triangle', .2); },
  win() {
    [523, 659, 784, 1046].forEach((f, i) => this.tone(f, .18, 'triangle', .3, i * .13));
  },
  lose()    { this.tone(300, .3, 'sawtooth', .2, 0, 150); }
};
