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
  slice()   { this.noise(.1, .18); this.tone(1500, .07, 'square', .16, 0, 500); this.tone(2200, .05, 'sine', .1, .04, 900); },
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

/* ============================================================
   محرك موسيقى EDM إيقاعية (بأسلوب Beat Saber) — مولّدة بالكامل
   عبر WebAudio: كيك 4-on-floor + هاي هات + بيس مشدود + ستابات
   لحنية على تتابع Am-F-C-G بسرعة 128 BPM، مع نبضات للمزامنة
   ============================================================ */
const MUSIC = {
  ctx: null, master: null, timer: null, nextT: 0, i: 0,
  bpm: 128, playing: false, onHalf: null,

  start() {
    if (this.playing) return;
    this.playing = true; this.i = 0;
    const ctx = SFX.ensure();
    if (!ctx) return; // صامت إذا الصوت مكتوم — اللعبة تستمر
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = SFX.muted ? 0 : .45;
    this.master.connect(ctx.destination);
    this.nextT = ctx.currentTime + .08;
    this.timer = setInterval(() => this.schedule(), 30);
  },

  stop() {
    this.playing = false;
    this.onHalf = null;
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    if (this.master && this.ctx) {
      try {
        this.master.gain.setTargetAtTime(0, this.ctx.currentTime, .05);
        const m = this.master;
        setTimeout(() => { try { m.disconnect(); } catch (e) { } }, 350);
      } catch (e) { }
      this.master = null;
    }
  },

  schedule() {
    if (!this.playing || !this.master) return;
    const spb = 60 / this.bpm / 2; // مدة الثُمن
    while (this.nextT < this.ctx.currentTime + .15) {
      try { this.note(this.i, this.nextT, spb); } catch (e) { }
      const d = Math.max(0, (this.nextT - this.ctx.currentTime) * 1000);
      const idx = this.i;
      if (this.onHalf) setTimeout(() => { if (this.onHalf) this.onHalf(idx); }, d);
      this.nextT += spb; this.i++;
    }
  },

  note(i, t, spb) {
    const ctx = this.ctx, out = this.master;
    const eighth = i % 8, bar = Math.floor(i / 8) % 4;
    // كيك على كل نبضة
    if (i % 2 === 0) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(160, t);
      o.frequency.exponentialRampToValueAtTime(46, t + .12);
      g.gain.setValueAtTime(.85, t);
      g.gain.exponentialRampToValueAtTime(.001, t + .17);
      o.connect(g); g.connect(out); o.start(t); o.stop(t + .2);
    }
    // هاي هات على الأثمان الفردية
    if (i % 2 === 1) {
      const len = .05, buf = ctx.createBuffer(1, ctx.sampleRate * len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let k = 0; k < d.length; k++) d[k] = (Math.random() * 2 - 1) * (1 - k / d.length);
      const s = ctx.createBufferSource(); s.buffer = buf;
      const g = ctx.createGain(); g.gain.value = .12;
      const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000;
      s.connect(f); f.connect(g); g.connect(out); s.start(t);
    }
    // بيس مشدود على كل ثُمن (Am F C G)
    const roots = [110, 87.31, 130.81, 98];
    const b = ctx.createOscillator(), bg = ctx.createGain(), bf = ctx.createBiquadFilter();
    b.type = 'sawtooth'; b.frequency.value = roots[bar] / 2;
    bf.type = 'lowpass'; bf.frequency.value = 420; bf.Q.value = 6;
    bg.gain.setValueAtTime(.32, t);
    bg.gain.exponentialRampToValueAtTime(.001, t + spb * .9);
    b.connect(bf); bf.connect(bg); bg.connect(out); b.start(t); b.stop(t + spb);
    // ستابات لحنية متعرّجة
    const stabPat = [0, 3, 5, 7, 10, 7, 5, 3];
    if (eighth % 2 === 0 || Math.random() < .3) {
      const s2 = ctx.createOscillator(), s2g = ctx.createGain();
      s2.type = 'square';
      s2.frequency.value = roots[bar] * 2 * Math.pow(2, stabPat[eighth] / 12);
      s2g.gain.setValueAtTime(.075, t);
      s2g.gain.exponentialRampToValueAtTime(.001, t + .18);
      s2.connect(s2g); s2g.connect(out); s2.start(t); s2.stop(t + .2);
    }
  }
};
