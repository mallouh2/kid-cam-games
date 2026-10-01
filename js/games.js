/* ============================================================
   الألعاب الثلاث المصغّرة + الجسيمات والنصوص الطائرة
   كل لعبة تستقبل: app = { canvas, ctx, engine, W(), H(),
                          demoMode, players, onEnd(game), hudUpdate(g) }
   وضع اللاعبَين: النصف الأيسر = اللاعب الأزرق 🔵، الأيمن = الأحمر 🔴
   ============================================================ */
'use strict';

const P_COLORS = ['#60a5fa', '#f87171'];   // أزرق / أحمر
const P_EMojis = ['🔵', '🔴'];

/* ---------- عناصر مشتركة ---------- */
class Particles {
  constructor() { this.list = []; }
  burst(x, y, colors, n = 16, speed = 320) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = speed * (.4 + Math.random() * .8);
      this.list.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 120,
        r: 3 + Math.random() * 6, life: .7 + Math.random() * .4, age: 0,
        color: colors[(Math.random() * colors.length) | 0], grav: 700
      });
    }
  }
  update(dt) {
    for (const p of this.list) { p.age += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.grav * dt; }
    this.list = this.list.filter(p => p.age < p.life);
  }
  draw(ctx) {
    for (const p of this.list) {
      ctx.globalAlpha = Math.max(0, 1 - p.age / p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

class FloatTexts {
  constructor() { this.list = []; }
  add(x, y, txt, color = '#fff') { this.list.push({ x, y, txt, color, age: 0 }); }
  update(dt) { for (const t of this.list) { t.age += dt; t.y -= 55 * dt; } this.list = this.list.filter(t => t.age < 1); }
  draw(ctx) {
    for (const t of this.list) {
      ctx.globalAlpha = Math.max(0, 1 - t.age);
      ctx.font = '800 30px "Segoe UI", Arial';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(0,0,0,.45)';
      ctx.strokeText(t.txt, t.x, t.y); ctx.fillStyle = t.color;
      ctx.fillText(t.txt, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }
}

class GameBase {
  constructor(app) {
    this.app = app;
    this.particles = new Particles();
    this.texts = new FloatTexts();
    this.twoPlayer = app.players === 2;
    this.score = 0;        // لاعب واحد
    this.scoreA = 0;       // 🔵 يسار
    this.scoreB = 0;       // 🔴 يمين
    this.lives = null;     // null = بدون قلوب (ودائماً null بوضع اللاعبَين)
    this.shakeT = 0;
    this.timeLeft = 60;
    this.elapsed = 0;
    this.ended = false;
  }
  get W() { return this.app.W(); }
  get H() { return this.app.H(); }

  addScore(n, x, y, color) {
    this.score += n;
    this.texts.add(x, y, '+' + n, color);
    this.app.hudUpdate(this);
  }
  addScoreP(side, n, x, y) {
    if (side === 0) this.scoreA += n; else this.scoreB += n;
    this.texts.add(x, y, P_EMojis[side] + ' +' + n, P_COLORS[side]);
    this.app.hudUpdate(this);
  }
  /* جهة اللاعب حسب موقع x على الشاشة (وضع اللاعبَين) */
  sideOf(x) { return x < this.W / 2 ? 0 : 1; }

  endGame() { if (this.ended) return; this.ended = true; this.app.onEnd(this); }
  baseUpdate(dt) {
    this.elapsed += dt;
    if (!this.ended) {
      this.timeLeft -= dt;
      this.app.hudTimer(Math.max(0, Math.ceil(this.timeLeft)));
      if (this.timeLeft <= 0) this.endGame();
    }
    // تحديث النقاط بحد أقصى 4 مرات/ثانية (نقاط المسافة تتراكم بسرعة بالسباق)
    this._hudT = (this._hudT || 0) + dt;
    if (this._hudT > 0.25) { this._hudT = 0; this.app.hudUpdate(this); }
    this.particles.update(dt);
    this.texts.update(dt);
    if (this.shakeT > 0) this.shakeT -= dt;
  }
  baseDraw(ctx) {
    ctx.clearRect(0, 0, this.W, this.H);
    if (this.shakeT > 0) {
      const m = this.shakeT * 30;
      ctx.translate((Math.random() - .5) * m, (Math.random() - .5) * m);
    }
    this.particles.draw(ctx);
    this.texts.draw(ctx);
    if (this.twoPlayer) this.drawDivider(ctx);
  }
  /* خط فاصل + شعار كل لاعب بوضع اللاعبَين */
  drawDivider(ctx) {
    const W = this.W, H = this.H;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,.55)';
    ctx.lineWidth = 5; ctx.setLineDash([16, 12]);
    ctx.beginPath(); ctx.moveTo(W / 2, 64); ctx.lineTo(W / 2, H - 8); ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = '800 30px "Segoe UI", Arial';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 8;
    ctx.fillStyle = P_COLORS[0]; ctx.fillText('🔵 ' + this.scoreA, W * .25, 38);
    ctx.fillStyle = P_COLORS[1]; ctx.fillText(this.scoreB + ' 🔴', W * .75, 38);
    ctx.restore();
  }
  /* كشف الضرب: بالحركة من الكاميرا أو باللمس/الماوس */
  hitTest(x, y, r) {
    if (this.app.demoMode) return false; // بدون كاميرا يُستخدم onPointerDown
    const energy = this.app.engine.energyAt(x, y, r, this.W, this.H);
    return energy > 0.15 && this.app.engine.motionLevel > 0.008;
  }

  /* هدف ثنائي الأبعاد (x,y) من الكاميرا أو الماوس — للألعاب بالتحكم العمودي
     (التنين، العدّاء، قفازات المرمى). الكاميرا أساساً والماوس مؤقتاً */
  bodyTarget(side, now, cur, zone) {
    const eng = this.app.engine, W = this.W, H = this.H;
    let tx = cur.x, ty = cur.y;
    const p = side === null ? this._ptr : (this.bptr && this.bptr[side]);
    if (this.app.demoMode) {
      if (p) { tx = p.x; ty = p.y; }
    } else {
      const fresh = p && (now - p.t < 1800);
      if (fresh) { tx = p.x; ty = p.y; }
      else if (eng) {
        if (side === null && eng.hasTrack) { tx = eng.cx * W; ty = eng.cy * H; }
        else if (side === 0 && eng.hasTrackL) { tx = eng.cxL * W; ty = eng.cyL * H; }
        else if (side === 1 && eng.hasTrackR) { tx = eng.cxR * W; ty = eng.cyR * H; }
      }
    }
    return {
      x: Math.max(zone.x0, Math.min(zone.x1, tx)),
      y: Math.max(zone.y0, Math.min(zone.y1, ty))
    };
  }
  onPointerMove(x, y) {
    const p = { x, y, t: performance.now() };
    if (this.twoPlayer) {
      const s = x < this.W / 2 ? 0 : 1;
      (this.bptr = this.bptr || [null, null])[s] = p;
    } else this._ptr = p;
  }
  onPointerDown(x, y) { this.onPointerMove(x, y); }
}

/* ============================================================
   اللعبة 1: اضرب الكرات 🎈
   ============================================================ */
const BALL_COLORS = [
  ['#ff6b6b', '#c92a2a'], ['#4dabf7', '#1864ab'], ['#69db7c', '#2b8a3e'],
  ['#ffd43b', '#e67700'], ['#da77f2', '#862e9c'], ['#ff922b', '#d9480f']
];

const LEARN_LETTERS = {
  ar: ['أ', 'ب', 'ت', 'ج', 'د', 'ر', 'س', 'م', 'ن', 'ف', 'ك', 'ل'],
  en: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']
};
const LEARN_COLORS = [
  { ar: 'الحمراء', en: 'red' }, { ar: 'الزرقاء', en: 'blue' }, { ar: 'الخضراء', en: 'green' },
  { ar: 'الصفراء', en: 'yellow' }, { ar: 'البنفسجية', en: 'purple' }, { ar: 'البرتقالية', en: 'orange' }
];
const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';

class PopGame extends GameBase {
  constructor(app) {
    super(app);
    this.timeLeft = 60;
    this.balls = [];
    this.spawnT = .6;
    this.title = 'اضرب الكرات بإيدك!';
    this.learn = !!app.learnMode;
    this.learnState = null; // {cat:'num'|'letter'|'color', v, ci}
  }
  spawnBall() {
    const scale = Math.min(this.W, this.H) / 700;
    const r = (42 + Math.random() * 26) * Math.max(.65, scale);
    const m = r + 20;
    const ci = (Math.random() * BALL_COLORS.length) | 0;
    const letters = LEARN_LETTERS[LANG] || LEARN_LETTERS.en;
    this.balls.push({
      x: m + Math.random() * (this.W - m * 2),
      y: m + 80 + Math.random() * (this.H - m * 2 - 120),
      vx: (Math.random() - .5) * 90, vy: (Math.random() - .5) * 90,
      r, golden: this.learn ? false : Math.random() < .14, age: 0, life: 8,
      pop: -1, colors: BALL_COLORS[ci], ci,
      num: 1 + ((Math.random() * 9) | 0),
      let: letters[(Math.random() * letters.length) | 0]
    });
  }
  /* وضع تعلّم: اختيار هدف موجود فعلاً على إحدى الكرات الحية */
  pickLearnTarget() {
    const alive = this.balls.filter(b => b.pop < 0);
    if (!alive.length) return;
    const cat = ['num', 'letter', 'color'][(Math.random() * 3) | 0];
    if (cat === 'num') {
      const b = alive[(Math.random() * alive.length) | 0];
      this.learnState = { cat, v: b.num };
    } else if (cat === 'letter') {
      const b = alive[(Math.random() * alive.length) | 0];
      this.learnState = { cat, v: b.let };
    } else {
      const b = alive[(Math.random() * alive.length) | 0];
      this.learnState = { cat, ci: b.ci };
    }
    say(this.learnPrompt());
  }
  learnPrompt() {
    const L = this.learnState;
    if (!L) return '';
    if (L.cat === 'num') return t('learnHit') + ': ' + t('learnNum') + ' ' + (LANG === 'ar' ? AR_DIGITS[L.v] : L.v);
    if (L.cat === 'letter') return t('learnHit') + ': ' + t('learnLetter') + ' ' + L.v;
    return t('learnHit') + ': ' + t('learnBall') + ' ' + (LEARN_COLORS[L.ci][LANG] || LEARN_COLORS[L.ci].en);
  }
  learnMatches(b) {
    const L = this.learnState;
    if (!L) return false;
    if (L.cat === 'num') return b.num === L.v;
    if (L.cat === 'letter') return b.let === L.v;
    return b.ci === L.ci;
  }
  update(dt) {
    this.baseUpdate(dt);
    const prog = Math.min(1, this.elapsed / 60);
    this.spawnT -= dt;
    if (this.spawnT <= 0) {
      this.spawnBall();
      this.spawnT = 1.5 - prog * .75 + Math.random() * .3;
    }
    if (this.learn && !this.learnState) this.pickLearnTarget();
    for (const b of this.balls) {
      b.age += dt;
      if (b.pop >= 0) { b.pop += dt; continue; }
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.x < b.r + 8 || b.x > this.W - b.r - 8) { b.vx *= -1; b.x = Math.max(b.r + 8, Math.min(this.W - b.r - 8, b.x)); }
      if (b.y < b.r + 70 || b.y > this.H - b.r - 8) { b.vy *= -1; b.y = Math.max(b.r + 70, Math.min(this.H - b.r - 8, b.y)); }
      if (this.hitTest(b.x, b.y, b.r * 1.25)) this.popBall(b);
    }
    this.balls = this.balls.filter(b => b.pop < 0 ? b.age < b.life : b.pop < .3);
  }
  popBall(b) {
    if (b.pop >= 0) return;
    b.pop = 0;
    if (this.learn) {
      // وضع تعلّم: الصح +15 وهدف جديد، الغلط -5
      const side = this.twoPlayer ? this.sideOf(b.x) : null;
      if (this.learnMatches(b)) {
        if (side !== null) this.addScoreP(side, 15, b.x, b.y);
        else this.addScore(15, b.x, b.y, '#fde047');
        this.particles.burst(b.x, b.y, [b.colors[0], '#fff', '#fde047'], 20);
        SFX.golden();
        this.pickLearnTarget();
      } else {
        if (side !== null) { if (side === 0) this.scoreA = Math.max(0, this.scoreA - 5); else this.scoreB = Math.max(0, this.scoreB - 5); this.app.hudUpdate(this); }
        else { this.score = Math.max(0, this.score - 5); this.app.hudUpdate(this); }
        this.texts.add(b.x, b.y, '❌', '#f87171');
        this.particles.burst(b.x, b.y, [b.colors[0], '#9ca3af'], 10, 200);
        SFX.lose();
      }
      return;
    }
    const pts = b.golden ? 25 : 10;
    if (this.twoPlayer) {
      this.addScoreP(this.sideOf(b.x), pts, b.x, b.y);
    } else {
      this.addScore(pts, b.x, b.y, b.golden ? '#fbbf24' : '#a5f3fc');
    }
    this.particles.burst(b.x, b.y, [b.colors[0], '#fff', b.golden ? '#fde047' : '#a5f3fc'], 18);
    if (b.golden) SFX.golden(); else SFX.pop();
  }
  onPointerDown(x, y) {
    // دعم اللمس/الماوس حتى مع الكاميرا (مفيد للأطفال الصغار جداً)
    for (const b of this.balls) {
      const dx = x - b.x, dy = y - b.y;
      if (dx * dx + dy * dy <= (b.r * 1.3) ** 2) { this.popBall(b); return; }
    }
  }
  draw(ctx) {
    this.baseDraw(ctx);
    // شريط المطلوب في وضع تعلّم
    if (this.learn && this.learnState) {
      const txt = this.learnPrompt();
      ctx.save();
      ctx.font = '800 34px "Segoe UI", Arial';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const tw = ctx.measureText(txt).width + 60;
      ctx.fillStyle = 'rgba(15,8,50,.82)';
      ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect((this.W - tw) / 2, 62, tw, 62, 18) : ctx.rect((this.W - tw) / 2, 62, tw, 62);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fde047';
      ctx.fillText(txt, this.W / 2, 93);
      ctx.restore();
    }
    for (const b of this.balls) {
      ctx.save();
      let scale = 1, alpha = 1;
      if (b.pop >= 0) { scale = 1 + b.pop / .3 * .6; alpha = 1 - b.pop / .3; }
      else if (b.age > b.life - 1) alpha = (b.life - b.age); // وميض قبل الاختفاء
      else { scale = 1 + Math.sin(b.age * 4) * .04; } // نبض خفيف
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.translate(b.x, b.y); ctx.scale(scale, scale);
      const g = ctx.createRadialGradient(-b.r * .3, -b.r * .35, b.r * .1, 0, 0, b.r);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(.25, b.golden ? '#fde047' : b.colors[0]);
      g.addColorStop(1, b.golden ? '#d97706' : b.colors[1]);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, b.r, 0, Math.PI * 2); ctx.fill();
      // لمعة
      ctx.fillStyle = 'rgba(255,255,255,.7)';
      ctx.beginPath(); ctx.ellipse(-b.r * .35, -b.r * .4, b.r * .22, b.r * .13, -.6, 0, Math.PI * 2); ctx.fill();
      if (this.learn && this.learnState && this.learnState.cat !== 'color') {
        // الرقم أو الحرف على الكرة (وضع تعلّم)
        const label = this.learnState.cat === 'num'
          ? (LANG === 'ar' ? AR_DIGITS[b.num] : String(b.num))
          : b.let;
        ctx.font = `900 ${b.r * .95}px "Segoe UI", Arial`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineWidth = b.r * .12; ctx.strokeStyle = 'rgba(0,0,0,.55)';
        ctx.strokeText(label, 0, b.r * .05);
        ctx.fillStyle = '#fff';
        ctx.fillText(label, 0, b.r * .05);
      } else {
        // وجه مبتسم
        ctx.fillStyle = 'rgba(0,0,0,.75)';
        ctx.beginPath(); ctx.arc(-b.r * .28, -b.r * .05, b.r * .09, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(b.r * .28, -b.r * .05, b.r * .09, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,.75)'; ctx.lineWidth = Math.max(2, b.r * .06);
        ctx.beginPath(); ctx.arc(0, b.r * .18, b.r * .3, .25 * Math.PI, .75 * Math.PI); ctx.stroke();
      }
      if (b.golden) {
        ctx.font = `${b.r * .7}px serif`; ctx.textAlign = 'center';
        ctx.fillText('⭐', 0, -b.r * .75);
      }
      ctx.restore();
    }
  }
}

/* ============================================================
   اللعبة 2: اصطياد الفواكه 🍎
   ============================================================ */
const FRUITS = ['🍎', '🍌', '🍓', '🍇', '🍉', '🍊', '⭐'];

class CatchGame extends GameBase {
  constructor(app) {
    super(app);
    this.timeLeft = 90;
    this.lives = this.twoPlayer ? null : 3; // القلوب بوضع اللاعب الواحد فقط
    this.items = [];
    this.spawnT = .8;
    this.basketW = Math.min(170, this.W * .28);
    this.basketY = 0;
    this.flashT = 0;
    this.title = 'حرّك جسمك لتحريك السلة!';
    if (this.twoPlayer) {
      // سلة لكل نصف شاشة، لكل لاعب
      this.bx = [this.W * .25, this.W * .75];
      this.bptr = [null, null];      // آخر أمر ماوس لكل جهة
      this.bptrT = [0, 0];           // توقيته (للأولوية على الكاميرا مؤقتاً)
    } else {
      this.basketX = this.W / 2;
      this.pointerX = null;
      this.ptrT = 0;
    }
  }
  onPointerMove(x) {
    if (this.twoPlayer) {
      const s = this.sideOf(x);
      this.bptr[s] = x; this.bptrT[s] = performance.now();
    } else {
      this.pointerX = x; this.ptrT = performance.now();
    }
  }
  onPointerDown(x) { this.onPointerMove(x); }

  /* الهدف المناسب للسلة: الكاميرا أساساً، والماوس يتقدم مؤقتاً إذا تحرك حالياً */
  basketTarget(side /* null = لاعب واحد */, now) {
    const W = this.W;
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    if (side === null) {
      if (this.app.demoMode) {
        return this.pointerX !== null ? this.pointerX : this.basketX;
      }
      const ptrFresh = this.pointerX !== null && now - this.ptrT < 1800;
      if (ptrFresh) return this.pointerX;
      if (this.app.engine && this.app.engine.hasTrack)
        return clamp(this.app.engine.cx * W, this.basketW / 2 + 6, W - this.basketW / 2 - 6);
      return this.basketX;
    }
    // لاعبان: كل جهة تتبع حركة نصفها من الكاميرا (أو الماوس داخل نصفها)
    const lo = side === 0 ? this.basketW / 2 + 6 : W / 2 + 14;
    const hi = side === 0 ? W / 2 - 14 : W - this.basketW / 2 - 6;
    if (this.app.demoMode) {
      return this.bptr[side] !== null ? clamp(this.bptr[side], lo, hi) : this.bx[side];
    }
    const fresh = this.bptr[side] !== null && now - this.bptrT[side] < 1800;
    if (fresh) return clamp(this.bptr[side], lo, hi);
    const eng = this.app.engine;
    if (side === 0 && eng && eng.hasTrackL) return clamp(eng.cxL * W, lo, hi);
    if (side === 1 && eng && eng.hasTrackR) return clamp(eng.cxR * W, lo, hi);
    return this.bx[side];
  }

  update(dt) {
    this.baseUpdate(dt);
    const now = performance.now();
    this.basketY = this.H - 95;
    const prog = Math.min(1, this.elapsed / 90);

    // تحريك السلة/السلتين
    if (this.twoPlayer) {
      for (let s = 0; s < 2; s++) {
        const target = this.basketTarget(s, now);
        this.bx[s] += (target - this.bx[s]) * Math.min(1, dt * 7);
      }
    } else {
      const target = this.basketTarget(null, now);
      this.basketX += (target - this.basketX) * Math.min(1, dt * 7);
    }

    // إسقاط الأغراض
    this.spawnT -= dt;
    if (this.spawnT <= 0) {
      const isBomb = Math.random() < (this.twoPlayer ? .16 : .18);
      const isStar = !isBomb && Math.random() < .12;
      this.items.push({
        x: 50 + Math.random() * (this.W - 100), y: -50,
        vy: (170 + prog * 200) * (isBomb ? 1.05 : .8 + Math.random() * .45),
        emoji: isBomb ? '💣' : (isStar ? '⭐' : FRUITS[(Math.random() * 6) | 0]),
        type: isBomb ? 'bomb' : (isStar ? 'star' : 'fruit'),
        rot: Math.random() * Math.PI, vr: (Math.random() - .5) * 3
      });
      this.spawnT = (this.twoPlayer ? 1.05 : 1.15) - prog * .5 + Math.random() * .35;
    }

    const half = this.basketW / 2 + 18;
    for (const it of this.items) {
      it.y += it.vy * dt; it.rot += it.vr * dt;
      // هل وقع في إحدى السلتين؟
      const catchers = this.twoPlayer ? [0, 1] : [null];
      for (const s of catchers) {
        const bx = s === null ? this.basketX : this.bx[s];
        if (it.y > this.basketY - 45 && it.y < this.basketY + 35 && Math.abs(it.x - bx) < half) {
          it.dead = true;
          if (it.type === 'bomb') {
            this.shakeT = .45; this.flashT = .5;
            SFX.bomb();
            this.particles.burst(it.x, it.y, ['#ef4444', '#f97316', '#7f1d1d'], 22);
            this.texts.add(it.x, it.y - 30, '💥', '#ef4444');
            if (this.twoPlayer) {
              // بالتنافس: القنبلة تنقص نقاط الجهة (بدون قلوب)
              if (s === 0) this.scoreA = Math.max(0, this.scoreA - 20);
              else this.scoreB = Math.max(0, this.scoreB - 20);
              this.texts.add(it.x, it.y - 70, P_EMojis[s] + ' -20', P_COLORS[s]);
              this.app.hudUpdate(this);
            } else {
              this.lives--;
              this.app.hudUpdate(this);
              if (this.lives <= 0) { this.endGame(); return; }
            }
          } else {
            const pts = it.type === 'star' ? 25 : 10;
            if (this.twoPlayer) this.addScoreP(s, pts, it.x, this.basketY - 40);
            else this.addScore(pts, it.x, this.basketY - 40, it.type === 'star' ? '#fbbf24' : '#86efac');
            if (it.type === 'star') SFX.golden(); else SFX.catchFruit();
            this.particles.burst(it.x, this.basketY - 20, ['#86efac', '#fde047', '#fff'], 10, 200);
          }
          break;
        }
      }
      if (it.y > this.H + 60) it.dead = true;
    }
    this.items = this.items.filter(it => !it.dead);
    if (this.flashT > 0) this.flashT -= dt;
  }

  draw(ctx) {
    this.baseDraw(ctx);
    const size = 58;
    for (const it of this.items) {
      ctx.save();
      ctx.translate(it.x, it.y); ctx.rotate(it.rot);
      ctx.font = `${size}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(it.emoji, 0, 0);
      ctx.restore();
    }
    // السلة/السلتان
    const drawBasket = (bx, side) => {
      ctx.save();
      ctx.translate(bx, this.basketY);
      ctx.font = `${this.basketW * .8}px serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 12;
      ctx.fillText('🧺', 0, 0);
      if (side !== null && this.twoPlayer) {
        ctx.font = '700 26px "Segoe UI", Arial';
        ctx.fillStyle = P_COLORS[side];
        ctx.shadowBlur = 6;
        ctx.fillText(P_EMojis[side], 0, -this.basketW * .82);
      }
      ctx.restore();
    };
    if (this.twoPlayer) { drawBasket(this.bx[0], 0); drawBasket(this.bx[1], 1); }
    else drawBasket(this.basketX, null);
    // وميض أحمر عند الانفجار
    if (this.flashT > 0) {
      ctx.fillStyle = `rgba(239,68,68,${this.flashT * .5})`;
      ctx.fillRect(-40, -40, this.W + 80, this.H + 80);
    }
  }
}

/* ============================================================
   اللعبة 3: اضرب الخُلد 🐹
   ============================================================ */
class WhackGame extends GameBase {
  constructor(app) {
    super(app);
    this.timeLeft = 60;
    this.cells = [];
    this.spawnT = .5;
    this.title = 'اضرب الخُلد لما يطلع!';
    this.layout();
  }
  layout() {
    this.cells = [];
    const mk = (x, y, w, h, player) =>
      this.cells.push({ x, y, w, h, player, mole: null });
    if (this.twoPlayer) {
      // لكل لاعب شبكة 2×2 داخل نصفه
      const c = Math.min(this.W * .17, this.H * .21, 150);
      const gapX = c * .45, gapY = c * .28;
      const bw = 2 * c + gapX, bh = 2 * (c * .85) + gapY;
      for (let s = 0; s < 2; s++) {
        const ox = (this.W / 2 - bw) / 2 + s * (this.W / 2);
        const oy = Math.max(80, (this.H - bh) / 2);
        for (let r = 0; r < 2; r++) for (let col = 0; col < 2; col++)
          mk(ox + col * (c + gapX), oy + r * (c * .85 + gapY), c, c * .85, s);
      }
    } else {
      // شبكة 3×3 كاملة الشاشة
      const c = Math.min(this.W * .3, this.H * .26, 190);
      const gapX = c * .35, gapY = c * .3;
      const gw = 3 * c + 2 * gapX, gh = 3 * (c * .85) + 2 * gapY;
      const ox = (this.W - gw) / 2, oy = Math.max(70, (this.H - gh) / 2);
      for (let r = 0; r < 3; r++) for (let col = 0; col < 3; col++)
        mk(ox + col * (c + gapX), oy + r * (c * .85 + gapY), c, c * .85, 0);
    }
  }
  spawnMole() {
    let empty = this.cells.filter(c => !c.mole);
    if (!empty.length) return;
    if (this.twoPlayer) {
      // عدالة: الجهة الأقل نشاطاً أولاً
      const act = s => this.cells.filter(c => c.player === s && c.mole && c.mole.hit < 0).length;
      const a = act(0), b = act(1);
      if (a !== b) empty = empty.filter(c => c.player === (a < b ? 0 : 1));
    }
    const cell = empty[(Math.random() * empty.length) | 0];
    const prog = Math.min(1, this.elapsed / 60);
    cell.mole = {
      golden: Math.random() < .15,
      prog: 0, upTime: 1.5 - prog * .7,
      hit: -1
    };
  }
  update(dt) {
    this.baseUpdate(dt);
    const prog = Math.min(1, this.elapsed / 60);
    this.spawnT -= dt;
    const activeCount = this.cells.filter(c => c.mole && c.mole.hit < 0 && c.mole.prog > .5).length;
    const wantActive = this.twoPlayer
      ? (prog < .33 ? 2 : prog < .7 ? 4 : 6)   // بالمجموع للجهتين
      : (prog < .33 ? 1 : prog < .7 ? 2 : 3);
    if (this.spawnT <= 0 && activeCount < wantActive) {
      this.spawnMole();
      this.spawnT = .55 + Math.random() * .4 - prog * .2;
    }
    for (const c of this.cells) {
      const m = c.mole; if (!m) continue;
      if (m.hit >= 0) { m.hit += dt; if (m.hit > .35) c.mole = null; continue; }
      m.prog += dt * 5; // سرعة الطلوع
      if (m.prog >= 1) {
        m.prog = 1;
        m.upTime -= dt;
        const cx = c.x + c.w / 2, cy = c.y + c.h * .45, r = c.w * .62;
        if (this.hitTest(cx, cy, r)) { this.bonk(c, cx, cy); continue; }
        if (m.upTime <= 0) { m.prog -= dt * 4; if (m.prog <= 0) c.mole = null; } // نزول
      }
    }
  }
  bonk(cell, cx, cy) {
    const m = cell.mole;
    m.hit = 0;
    const pts = m.golden ? 25 : 10;
    if (this.twoPlayer) this.addScoreP(cell.player, pts, cx, cy - 40);
    else this.addScore(pts, cx, cy - 40, m.golden ? '#fbbf24' : '#fde68a');
    this.particles.burst(cx, cy - 20, ['#fde68a', '#fbbf24', '#fff', '#a3e635'], 16);
    SFX.bonk();
  }
  onPointerDown(x, y) {
    for (const c of this.cells) {
      if (x < c.x - 14 || x > c.x + c.w + 14 || y < c.y - 20 || y > c.y + c.h + 20) continue;
      const m = c.mole;
      if (m && m.hit < 0 && m.prog > .35) {
        this.bonk(c, c.x + c.w / 2, c.y + c.h * .45);
        return;
      }
    }
  }
  draw(ctx) {
    this.baseDraw(ctx);
    for (const c of this.cells) {
      const cx = c.x + c.w / 2, hy = c.y + c.h * .68;
      const rx = c.w * .46, ry = c.h * .17;

      // الحفرة (خلفية داكنة)
      ctx.fillStyle = 'rgba(30,20,10,.72)';
      ctx.beginPath(); ctx.ellipse(cx, hy + 8, rx, ry, 0, 0, Math.PI * 2); ctx.fill();

      const m = c.mole;
      if (m) {
        let lift = Math.max(0, Math.min(1, m.prog));
        const squash = m.hit >= 0 ? Math.max(.4, 1 - m.hit * 2) : 1;
        const g = c.w * .85;                       // حجم الخُلد
        const glyphH = g * .74;                    // الارتفاع الفعلي للرمز
        // خط الأرض = hy. عند lift=0 يكون الخُلد كله تحت الخط (مخفي)، وعند lift=1 فوقه بالكامل
        const baseline = (hy + glyphH + ry + 6) - lift * (glyphH + ry + 4);
        ctx.save();
        // قصّ كل شيء فوق خط الأرض: الخُلد يطلع من الحفرة كامل الوجه
        ctx.beginPath();
        ctx.rect(c.x - c.w * .3, 0, c.w * 1.6, hy + ry * .9);
        ctx.clip();
        ctx.translate(cx, baseline);
        ctx.scale(1, squash);
        ctx.font = `${g}px serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
        ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 6;
        ctx.fillText(m.hit >= 0 ? '😵' : (m.golden ? '🌟' : '🐹'), 0, 0);
        ctx.restore();
      }

      // حافة الحفرة (أمامية)
      ctx.strokeStyle = 'rgba(90,60,25,.85)'; ctx.lineWidth = 8;
      ctx.beginPath(); ctx.ellipse(cx, hy + 10, rx, ry, 0, .1 * Math.PI, .9 * Math.PI); ctx.stroke();

      // شعار اللاعب على الجهة (وضع اللاعبَين)
      if (this.twoPlayer) {
        ctx.font = '700 24px "Segoe UI", Arial';
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.fillStyle = P_COLORS[c.player];
        ctx.fillText(P_EMojis[c.player], cx, c.y - 30);
      }
    }
  }
}

/* ============================================================
   اللعبة 4: سباق السيارات 🚗 (بمبدأ Kart Racing على LeapTV)
   الطفل يحرك جسمه يمين/يسار لقيادة العربية، يتفادى العوائق
   ويجمع النجوم والجواهر وصواريخ السرعة
   ============================================================ */
const R_OBSTACLES = ['🚧', '🪨', '🛢️', '🌵'];

class RaceGame extends GameBase {
  constructor(app) {
    super(app);
    this.timeLeft = 90;
    this.lives = this.twoPlayer ? null : 3;
    this.title = 'حرّك جسمك يمين ويسار لقيادة العربية!';
    this.kartW = Math.min(110, this.W * (this.twoPlayer ? .11 : .13));
    this.kartY = 0;
    this.flashT = 0;
    if (this.twoPlayer) {
      this.bptr = [null, null]; this.bptrT = [0, 0];
    } else {
      this.pointerX = null; this.ptrT = 0;
    }
    const W = this.W;
    this.roads = [];
    const mkRoad = (x0, x1, side) => this.roads.push({
      x0, x1, side, kartX: (x0 + x1) / 2, lean: 0, prevX: (x0 + x1) / 2,
      inv: 0, boost: 0, scroll: 0, dist: 0, items: [], spawnT: .7
    });
    if (this.twoPlayer) {
      mkRoad(W * .04, W / 2 - W * .025, 0);
      mkRoad(W / 2 + W * .025, W * .96, 1);
    } else {
      mkRoad(W * .08, W * .92, 0);
    }
  }

  onPointerMove(x) {
    if (this.twoPlayer) {
      const s = x < this.W / 2 ? 0 : 1;
      this.bptr[s] = x; this.bptrT[s] = performance.now();
    } else {
      this.pointerX = x; this.ptrT = performance.now();
    }
  }
  onPointerDown(x) { this.onPointerMove(x); }

  /* هدف القيادة: الكاميرا أساساً، والماوس يتقدم مؤقتاً (نفس منطق السلة) */
  kartTarget(r, now) {
    const lo = r.x0 + this.kartW / 2, hi = r.x1 - this.kartW / 2;
    const clamp = v => Math.max(lo, Math.min(hi, v));
    const eng = this.app.engine;
    if (this.app.demoMode) {
      if (this.twoPlayer) return this.bptr[r.side] !== null ? clamp(this.bptr[r.side]) : r.kartX;
      return this.pointerX !== null ? clamp(this.pointerX) : r.kartX;
    }
    if (this.twoPlayer) {
      const fresh = this.bptr[r.side] !== null && now - this.bptrT[r.side] < 1800;
      if (fresh) return clamp(this.bptr[r.side]);
      if (r.side === 0 && eng && eng.hasTrackL) return clamp(eng.cxL * this.W);
      if (r.side === 1 && eng && eng.hasTrackR) return clamp(eng.cxR * this.W);
      return r.kartX;
    }
    const ptrFresh = this.pointerX !== null && now - this.ptrT < 1800;
    if (ptrFresh) return clamp(this.pointerX);
    if (eng && eng.hasTrack) return clamp(eng.cx * this.W);
    return r.kartX;
  }

  update(dt) {
    this.baseUpdate(dt);
    const now = performance.now();
    this.kartY = this.H - 120;
    const prog = Math.min(1, this.elapsed / 90);
    const baseSpeed = 300 + 400 * prog;

    for (const r of this.roads) {
      const speed = baseSpeed * (r.boost > 0 ? 1.6 : 1) * (r.inv > 0 ? .7 : 1);

      // القيادة + ميل العربية مع الحركة
      // (ملاحظة: الاسم target وليس t — لا تسمّه t لأنه يحجب دالة الترجمة t())
      const target = this.kartTarget(r, now);
      const oldX = r.kartX;
      r.kartX += (target - r.kartX) * Math.min(1, dt * 7);
      const vx = (r.kartX - oldX) / Math.max(dt, .001);
      r.lean += (Math.max(-.35, Math.min(.35, vx / 1100)) - r.lean) * .15;

      // المسافة تتحول نقاط (ضعفية أثناء التعزيز) — بدون تحديث HUD هنا (يتولاه baseUpdate)
      r.scroll += speed * dt; r.dist += speed * dt;
      if (r.dist >= 30) {
        r.dist -= 30;
        const pts = r.boost > 0 ? 2 : 1;
        if (this.twoPlayer) { if (r.side === 0) this.scoreA += pts; else this.scoreB += pts; }
        else this.score += pts;
      }
      if (r.inv > 0) r.inv -= dt;
      if (r.boost > 0) r.boost -= dt;

      // توليد الأغراض
      r.spawnT -= dt;
      if (r.spawnT <= 0) {
        const roll = Math.random();
        let type = 'obstacle', emoji = R_OBSTACLES[(Math.random() * R_OBSTACLES.length) | 0];
        if (roll < .20) { type = 'star'; emoji = '⭐'; }
        else if (roll < .28) { type = 'gem'; emoji = '💎'; }
        else if (roll < .35) { type = 'rocket'; emoji = '🚀'; }
        const iw = 60;
        r.items.push({
          x: r.x0 + iw / 2 + Math.random() * (r.x1 - r.x0 - iw),
          y: -70, type, emoji, rot: 0, vr: (Math.random() - .5) * 2
        });
        r.spawnT = Math.max(.32, .75 - prog * .35) + Math.random() * .25;
      }

      // حركة وتصادم
      const half = this.kartW / 2 + 22;
      for (const it of r.items) {
        it.y += speed * dt; it.rot += it.vr * dt;
        if (it.y > this.kartY - 45 && it.y < this.kartY + 35 && Math.abs(it.x - r.kartX) < half) {
          it.dead = true;
          if (it.type === 'obstacle') {
            if (r.inv <= 0) {
              this.shakeT = .45; this.flashT = .5;
              SFX.bomb();
              this.particles.burst(it.x, it.y, ['#ef4444', '#f97316', '#7f1d1d'], 20);
              this.texts.add(it.x, it.y - 30, '💥', '#ef4444');
              r.inv = 1.6; r.boost = 0;
              if (this.twoPlayer) {
                if (r.side === 0) this.scoreA = Math.max(0, this.scoreA - 20);
                else this.scoreB = Math.max(0, this.scoreB - 20);
                this.texts.add(it.x, it.y - 70, P_EMojis[r.side] + ' -20', P_COLORS[r.side]);
                this.app.hudUpdate(this);
              } else {
                this.lives--;
                this.app.hudUpdate(this);
                if (this.lives <= 0) { this.endGame(); return; }
              }
            }
          } else if (it.type === 'star') {
            if (this.twoPlayer) this.addScoreP(r.side, 10, it.x, it.y);
            else this.addScore(10, it.x, it.y, '#fde047');
            SFX.catchFruit();
            this.particles.burst(it.x, it.y, ['#fde047', '#fff'], 10, 200);
          } else if (it.type === 'gem') {
            if (this.twoPlayer) this.addScoreP(r.side, 25, it.x, it.y);
            else this.addScore(25, it.x, it.y, '#67e8f9');
            SFX.golden();
            this.particles.burst(it.x, it.y, ['#67e8f9', '#fff', '#a5f3fc'], 14);
          } else if (it.type === 'rocket') {
            r.boost = 3;
            SFX.go();
            this.texts.add(it.x, it.y - 20, t('boost'), '#fb923c');
          }
        }
        if (it.y > this.H + 90) it.dead = true;
      }
      r.items = r.items.filter(it => !it.dead);
    }
    if (this.flashT > 0) this.flashT -= dt;
  }

  draw(ctx) {
    this.baseDraw(ctx);
    for (const r of this.roads) {
      // الطريق
      ctx.fillStyle = 'rgba(35,38,52,.78)';
      ctx.fillRect(r.x0, 60, r.x1 - r.x0, this.H - 60);
      ctx.fillStyle = 'rgba(255,255,255,.75)';
      ctx.fillRect(r.x0, 60, 6, this.H - 60);
      ctx.fillRect(r.x1 - 6, 60, 6, this.H - 60);
      // خطوط الحارات المتحركة: تنزل تحت مع الشارع (إحساس التقدم للأمام)
      const dashH = 46, gap = 34, period = dashH + gap;
      const off = r.scroll % period;
      ctx.fillStyle = 'rgba(255,255,255,.5)';
      for (let li = 1; li < 3; li++) {
        const lx = r.x0 + (r.x1 - r.x0) * li / 3;
        for (let y = 60 + off - period; y < this.H; y += period)
          ctx.fillRect(lx - 3, y, 6, dashH);
      }
      // الأغراض (بدون ظلال — الظلال مكلفة وتقطّع الرسم مع كثرة العناصر)
      for (const it of r.items) {
        ctx.save();
        ctx.translate(it.x, it.y); ctx.rotate(it.rot);
        ctx.font = '56px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(it.emoji, 0, 0);
        ctx.restore();
      }
      // العربية (تومض أثناء المناعة، ولهب أثناء التعزيز)
      if (r.boost > 0) {
        ctx.save();
        ctx.font = `${this.kartW * .55}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('🔥', r.kartX, this.kartY + this.kartW * .5);
        ctx.restore();
      }
      ctx.save();
      ctx.translate(r.kartX, this.kartY);
      ctx.rotate(Math.PI / 2 + r.lean); // 🏎️ يواجه اليسار أصلاً → تدوير للأعلى + ميل القيادة
      if (r.inv > 0) ctx.globalAlpha = .5 + .4 * Math.sin(this.elapsed * 25);
      ctx.font = `${this.kartW}px serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 12;
      ctx.fillText('🏎️', 0, 0);
      ctx.restore();
      // شعار اللاعب فوق عربيته (وضع اللاعبَين)
      if (this.twoPlayer) {
        ctx.font = '700 24px "Segoe UI", Arial';
        ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        ctx.fillStyle = P_COLORS[r.side];
        ctx.fillText(P_EMojis[r.side], r.kartX, this.kartY - this.kartW * .62);
      }
    }
    // وميض أحمر عند الاصطدام
    if (this.flashT > 0) {
      ctx.fillStyle = `rgba(239,68,68,${this.flashT * .5})`;
      ctx.fillRect(-40, -40, this.W + 80, this.H + 80);
    }
  }
}

/* ============================================================
   اللعبة 5: التنين الطاير 🐉 (مثل Flying Dragon على LeapMove)
   تحكم ببعدين: جسم يمين/يسار + فوق/تحت — اجمع الجواهر واعبر الحلقات
   ============================================================ */
const D_OBSTACLES = ['🪨', '⛈️', '🦅', '🌵'];

class DragonGame extends GameBase {
  constructor(app) {
    super(app);
    this.timeLeft = 90;
    this.lives = this.twoPlayer ? null : 3;
    this.title = 'حرّك جسمك لتحليق التنين!';
    this.dragR = Math.min(96, this.W * .1);
    this.flashT = 0;
    this.zones = []; this.drags = [];
    const W = this.W;
    const mk = (zx0, zx1, side) => {
      this.zones.push({ x0: zx0, x1: zx1, y0: 100, y1: this.H - 90 });
      this.drags.push({ x: (zx0 + zx1) / 2, y: this.H * .5, side, inv: 0, scroll: 0, dist: 0, items: [], spawnT: .6 });
    };
    if (this.twoPlayer) {
      for (let s = 0; s < 2; s++) {
        const hx = s === 0 ? 0 : W / 2, hw = W / 2;
        mk(hx + hw * .12, hx + hw * .58, s);
      }
    } else mk(W * .12, W * .58, 0);
  }
  update(dt) {
    this.baseUpdate(dt);
    const now = performance.now();
    const prog = Math.min(1, this.elapsed / 90);
    const speed = 260 + 300 * prog;
    for (let i = 0; i < this.drags.length; i++) {
      const d = this.drags[i], z = this.zones[i];
      const tgt = this.bodyTarget(this.twoPlayer ? d.side : null, now, d, z);
      d.x += (tgt.x - d.x) * Math.min(1, dt * 6);
      d.y += (tgt.y - d.y) * Math.min(1, dt * 6);
      d.scroll += speed * dt; d.dist += speed * dt;
      if (d.dist >= 40) {
        d.dist -= 40;
        if (this.twoPlayer) { if (d.side === 0) this.scoreA++; else this.scoreB++; }
        else this.score++;
      }
      if (d.inv > 0) d.inv -= dt;
      // توليد
      d.spawnT -= dt;
      if (d.spawnT <= 0) {
        const roll = Math.random();
        let type = 'obstacle', emoji = D_OBSTACLES[(Math.random() * D_OBSTACLES.length) | 0];
        if (roll < .26) { type = 'gem'; emoji = '💎'; }
        else if (roll < .35) { type = 'star'; emoji = '⭐'; }
        else if (roll < .40) { type = 'heart'; emoji = '❤️'; }
        else if (roll < .48) { type = 'ring'; emoji = ''; }
        const zoneRight = z.x1 + (this.W - z.x1) + 60; // يدخل من حافة الشاشة/النصف
        d.items.push({
          x: zoneRight, y: 110 + Math.random() * (this.H - 220),
          type, emoji, wob: Math.random() * Math.PI * 2
        });
        d.spawnT = Math.max(.3, .6 - prog * .28) + Math.random() * .25;
      }
      const xLimit = z.x0 - (this.twoPlayer ? (d.side === 0 ? 0 : this.W / 2) : 0) - 100;
      for (const it of d.items) {
        it.x -= speed * dt;
        it.wob += dt * 3;
        const iy = it.y + Math.sin(it.wob) * 14;
        const dx = it.x - d.x, dy = iy - d.y;
        const dist2 = dx * dx + dy * dy;
        if (it.type === 'ring') {
          if (dist2 < 55 * 55) { // عبور من داخل الحلقة
            it.dead = true;
            if (this.twoPlayer) this.addScoreP(d.side, 25, it.x, iy);
            else this.addScore(25, it.x, iy, '#fbbf24');
            this.particles.burst(it.x, iy, ['#fbbf24', '#fff', '#fb923c'], 14);
            SFX.golden();
          }
        } else if (dist2 < (this.dragR * .7 + 30) ** 2) {
          it.dead = true;
          if (it.type === 'obstacle') {
            if (d.inv <= 0) {
              this.shakeT = .45; this.flashT = .5; d.inv = 1.6;
              SFX.bomb();
              this.particles.burst(it.x, iy, ['#ef4444', '#f97316'], 18);
              if (this.twoPlayer) {
                if (d.side === 0) this.scoreA = Math.max(0, this.scoreA - 20);
                else this.scoreB = Math.max(0, this.scoreB - 20);
                this.texts.add(it.x, iy - 40, P_EMojis[d.side] + ' -20', P_COLORS[d.side]);
                this.app.hudUpdate(this);
              } else {
                this.lives--;
                this.app.hudUpdate(this);
                if (this.lives <= 0) { this.endGame(); return; }
              }
            }
          } else if (it.type === 'heart') {
            SFX.catchFruit();
            if (!this.twoPlayer && this.lives < 3) { this.lives++; this.app.hudUpdate(this); this.texts.add(it.x, iy, '❤️+', '#fda4af'); }
            else {
              if (this.twoPlayer) this.addScoreP(d.side, 15, it.x, iy);
              else this.addScore(15, it.x, iy, '#fda4af');
            }
          } else {
            const pts = it.type === 'star' ? 25 : 10;
            if (this.twoPlayer) this.addScoreP(d.side, pts, it.x, iy);
            else this.addScore(pts, it.x, iy, it.type === 'star' ? '#fbbf24' : '#67e8f9');
            if (it.type === 'star') SFX.golden(); else SFX.catchFruit();
            this.particles.burst(it.x, iy, ['#67e8f9', '#fff'], 10, 200);
          }
        }
        if (it.x < xLimit) it.dead = true;
      }
      d.items = d.items.filter(it => !it.dead);
    }
  }
  draw(ctx) {
    this.baseDraw(ctx);
    for (let i = 0; i < this.drags.length; i++) {
      const d = this.drags[i];
      for (const it of d.items) {
        const iy = it.y + Math.sin(it.wob) * 14;
        if (it.type === 'ring') {
          ctx.save();
          ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 13;
          ctx.shadowColor = '#f59e0b'; ctx.shadowBlur = 14;
          ctx.beginPath(); ctx.arc(it.x, iy, 55, 0, Math.PI * 2); ctx.stroke();
          ctx.restore();
        } else {
          ctx.save();
          ctx.font = '52px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(it.emoji, it.x, iy);
          ctx.restore();
        }
      }
      // التنين (🐉 يواجه اليسار أصلاً → قلبه ليواجه اليمين)
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.scale(-1, 1);
      if (d.inv > 0) ctx.globalAlpha = .5 + .4 * Math.sin(this.elapsed * 25);
      ctx.font = `${this.dragR * 1.15}px serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 10;
      ctx.fillText('🐉', 0, 0);
      ctx.restore();
      if (this.twoPlayer) {
        ctx.font = '700 24px "Segoe UI", Arial';
        ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        ctx.fillStyle = P_COLORS[d.side];
        ctx.fillText(P_EMojis[d.side], d.x, d.y - this.dragR * .7);
      }
    }
  }
}

/* ============================================================
   اللعبة 6: الرقص واللمس 🕺 (مثل Dance & Learn)
   مناطق مضيئة تظهر — المسها بإيدك أو جسمك قبل ما تختفي
   ============================================================ */
class PoseGame extends GameBase {
  constructor(app) {
    super(app);
    this.timeLeft = 60;
    this.lives = null; // لعبة انسيابية بدون قلوب
    this.title = 'المس الكرة المضيئة بإيدك!';
    this.zones = [];
    this.targets = this.twoPlayer ? [null, null] : [null];
    this.lastZi = [-1, -1];
    this.streak = 0;
    const W = this.W, H = this.H;
    if (this.twoPlayer) {
      for (let s = 0; s < 2; s++) {
        const hx = s === 0 ? 0 : W / 2, hw = W / 2;
        for (const fy of [.3, .68]) for (const fx of [.28, .72])
          this.zones.push({ x: hx + hw * fx, y: H * fy, r: Math.min(hw, H) * .16 + 18, side: s });
      }
    } else {
      for (const fy of [.26, .55, .82]) for (const fx of [.18, .82])
        this.zones.push({ x: W * fx, y: H * fy, r: Math.min(W, H) * .13 + 26, side: 0 });
    }
  }
  spawnTarget(side) {
    const pool = this.zones.filter((z, i) => z.side === side && i !== this.lastZi[side]);
    const idx = this.zones.indexOf(pool[(Math.random() * pool.length) | 0]);
    this.lastZi[side] = idx;
    const ttl = Math.max(2.1, 3.4 - this.elapsed * .02);
    this.targets[side] = { zi: idx, born: performance.now(), ttl };
    SFX.tick();
  }
  hitTarget(side, zone) {
    const fast = (performance.now() - this.targets[side].born) < 1000;
    const pts = fast ? 15 : 10;
    this.streak++;
    if (this.twoPlayer) this.addScoreP(side, pts, zone.x, zone.y);
    else this.addScore(pts, zone.x, zone.y, fast ? '#fde047' : '#a5f3fc');
    if (this.streak > 0 && this.streak % 5 === 0) {
      if (this.twoPlayer) this.addScoreP(side, 20, zone.x, zone.y - 50);
      else this.addScore(20, zone.x, zone.y - 50, '#fb923c');
      this.texts.add(zone.x, zone.y - 90, '🔥 x' + this.streak, '#fb923c');
    }
    this.particles.burst(zone.x, zone.y, ['#a5f3fc', '#fde047', '#fff', P_COLORS[side]], 18);
    if (fast) SFX.golden(); else SFX.catchFruit();
    this.spawnTarget(side);
  }
  update(dt) {
    this.baseUpdate(dt);
    for (let s = 0; s < this.targets.length; s++) {
      if (!this.targets[s]) { this.spawnTarget(s); continue; }
      const zone = this.zones[this.targets[s].zi];
      const age = (performance.now() - this.targets[s].born) / 1000;
      if (this.hitTest(zone.x, zone.y, zone.r)) { this.hitTarget(s, zone); continue; }
      if (age > this.targets[s].ttl) { // فات الوقت
        this.streak = 0;
        SFX.lose();
        this.texts.add(zone.x, zone.y, '💤', '#9ca3af');
        this.spawnTarget(s);
      }
    }
  }
  onPointerDown(x, y) {
    for (let s = 0; s < this.targets.length; s++) {
      const tg = this.targets[s];
      if (!tg) continue;
      const zone = this.zones[tg.zi];
      const dx = x - zone.x, dy = y - zone.y;
      if (dx * dx + dy * dy <= zone.r * zone.r) { this.hitTarget(s, zone); return; }
    }
  }
  draw(ctx) {
    this.baseDraw(ctx);
    const pulse = .5 + .5 * Math.sin(this.elapsed * 4);
    // بقاع خافتة لكل المناطق
    ctx.save();
    ctx.globalAlpha = .13;
    for (const z of this.zones) {
      ctx.fillStyle = P_COLORS[z.side];
      ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    // الهدف النشط لكل جهة
    for (let s = 0; s < this.targets.length; s++) {
      const tg = this.targets[s];
      if (!tg) continue;
      const zone = this.zones[tg.zi];
      const age = (performance.now() - tg.born) / 1000;
      const left = Math.max(0, 1 - age / tg.ttl);
      ctx.save();
      const g = ctx.createRadialGradient(zone.x, zone.y, zone.r * .1, zone.x, zone.y, zone.r);
      g.addColorStop(0, 'rgba(255,255,255,.95)');
      g.addColorStop(.5, this.twoPlayer ? P_COLORS[s] : '#22d3ee');
      g.addColorStop(1, 'rgba(34,211,238,.15)');
      ctx.fillStyle = g;
      ctx.globalAlpha = .75 + pulse * .25;
      ctx.beginPath(); ctx.arc(zone.x, zone.y, zone.r * (0.92 + pulse * .08), 0, Math.PI * 2); ctx.fill();
      // حلقة الوقت المتبقي
      ctx.globalAlpha = 1;
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.arc(zone.x, zone.y, zone.r + 10, -Math.PI / 2, -Math.PI / 2 + left * Math.PI * 2);
      ctx.stroke();
      ctx.font = '800 26px "Segoe UI", Arial';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff';
      ctx.fillText('+10', zone.x, zone.y);
      ctx.restore();
    }
  }
}

/* ============================================================
   اللعبة 7: حراسة المرمى 🥅 (مثل Sports!)
   كرات تتطاير نحو الشبكة — صدّها بحركة جسمك وإيدك
   ============================================================ */
class GoalieGame extends GameBase {
  constructor(app) {
    super(app);
    this.timeLeft = 90;
    this.lives = this.twoPlayer ? null : 3; // الأهداف ضدك باللاعب الواحد
    this.title = 'صدّ الكرات بجسمك وإيدك!';
    const W = this.W, H = this.H;
    this.goals = [];
    if (this.twoPlayer) {
      for (let s = 0; s < 2; s++) {
        const hx = s === 0 ? 0 : W / 2, hw = W / 2;
        this.goals.push({ gx: hx + hw * .07, gw: hw * .86, gy: H * .14, gh: H * .48, side: s });
      }
    } else {
      this.goals.push({ gx: W * .19, gw: W * .62, gy: H * .14, gh: H * .48, side: 0 });
    }
    this.balls = [];
    this.spawnT = .7;
    this.nextSide = 0;
    this.hands = this.goals.map(g => ({ x: g.gx + g.gw / 2, y: H * .8 }));
    this.flashT = 0;
  }
  update(dt) {
    this.baseUpdate(dt);
    const now = performance.now();
    const prog = Math.min(1, this.elapsed / 90);
    // القفازات تتبع يدي اللاعب (أو الماوس)
    for (let i = 0; i < this.goals.length; i++) {
      const g = this.goals[i];
      const h = this.hands[i];
      const tgt = this.bodyTarget(this.twoPlayer ? g.side : null, now, h, { x0: 20, x1: this.W - 20, y0: 70, y1: this.H - 30 });
      h.x += (tgt.x - h.x) * Math.min(1, dt * 8);
      h.y += (tgt.y - h.y) * Math.min(1, dt * 8);
    }
    // إطلاق الكرات
    this.spawnT -= dt;
    if (this.spawnT <= 0) {
      const g = this.goals[this.nextSide];
      if (this.twoPlayer) this.nextSide = 1 - this.nextSide;
      const m = 60;
      this.balls.push({
        goal: g, side: g.side,
        sx: g.gx + g.gw / 2, sy: this.H + 60,
        tx: g.gx + m + Math.random() * (g.gw - m * 2),
        ty: g.gy + m + Math.random() * (g.gh - m * 2),
        t: 0, dur: Math.max(.95, 1.35 - prog * .4),
        golden: Math.random() < .15, done: false
      });
      this.spawnT = Math.max(1.05, 1.7 - prog * .6) + Math.random() * .3;
      SFX.tick();
    }
    for (const b of this.balls) {
      if (b.saved) { b.savedT = (b.savedT || 0) + dt; continue; }
      b.t += dt / b.dur;
      const e = Math.min(1, b.t);
      b.x = b.sx + (b.tx - b.sx) * e;
      b.y = b.sy + (b.ty - b.sy) * e;
      b.size = 26 + 38 * e;
      if (b.t >= .68 && this.hitTest(b.x, b.y, b.size + 26)) {
        b.saved = true; b.savedT = 0;
        const pts = b.golden ? 25 : 10;
        if (this.twoPlayer) this.addScoreP(b.side, pts, b.x, b.y - 30);
        else this.addScore(pts, b.x, b.y - 30, b.golden ? '#fbbf24' : '#a5f3fc');
        this.texts.add(b.x, b.y - 70, t('saveTxt'), b.golden ? '#fbbf24' : '#fff');
        this.particles.burst(b.x, b.y, ['#a5f3fc', '#fff', '#86efac'], 16);
        if (b.golden) SFX.golden(); else SFX.bonk();
        continue;
      }
      if (b.t >= 1) {
        // هدف!
        b.goalIn = true;
        this.shakeT = .4; this.flashT = .5;
        SFX.bomb();
        this.texts.add(b.tx, b.ty, t('goalTxt'), '#ef4444');
        this.particles.burst(b.tx, b.ty, ['#ef4444', '#fff'], 14);
        if (this.twoPlayer) {
          if (b.side === 0) this.scoreA = Math.max(0, this.scoreA - 15);
          else this.scoreB = Math.max(0, this.scoreB - 15);
          this.app.hudUpdate(this);
        } else {
          this.lives--;
          this.app.hudUpdate(this);
          if (this.lives <= 0) { this.endGame(); return; }
        }
      }
    }
    this.balls = this.balls.filter(b => !b.goalIn && !(b.saved && b.savedT > .45));
    if (this.flashT > 0) this.flashT -= dt;
  }
  onPointerDown(x, y) {
    for (const b of this.balls) {
      if (b.done || b.t < .35) continue;
      const dx = x - b.x, dy = y - b.y;
      if (dx * dx + dy * dy <= 90 * 90) {
        b.done = true; b.saved = true;
        const pts = b.golden ? 25 : 10;
        if (this.twoPlayer) this.addScoreP(b.side, pts, b.x, b.y - 30);
        else this.addScore(pts, b.x, b.y - 30, b.golden ? '#fbbf24' : '#a5f3fc');
        this.texts.add(b.x, b.y - 70, t('saveTxt'), '#fff');
        this.particles.burst(b.x, b.y, ['#a5f3fc', '#fff'], 16);
        SFX.bonk();
        return;
      }
    }
  }
  draw(ctx) {
    this.baseDraw(ctx);
    // المرمى + الشبكة
    for (const g of this.goals) {
      ctx.save();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 10; ctx.lineCap = 'round';
      ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.moveTo(g.gx, g.gy + g.gh);
      ctx.lineTo(g.gx, g.gy);
      ctx.lineTo(g.gx + g.gw, g.gy);
      ctx.lineTo(g.gx + g.gw, g.gy + g.gh);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = 2;
      for (let x = g.gx + 36; x < g.gx + g.gw; x += 36) {
        ctx.beginPath(); ctx.moveTo(x, g.gy); ctx.lineTo(x, g.gy + g.gh); ctx.stroke();
      }
      for (let y = g.gy + 34; y < g.gy + g.gh; y += 34) {
        ctx.beginPath(); ctx.moveTo(g.gx, y); ctx.lineTo(g.gx + g.gw, y); ctx.stroke();
      }
      ctx.restore();
    }
    // الكرات
    for (const b of this.balls) {
      if (b.done && b.saved) continue;
      ctx.save();
      if (b.golden) {
        ctx.fillStyle = 'rgba(251,191,36,.35)';
        ctx.beginPath(); ctx.arc(b.x, b.y, b.size + 16, 0, Math.PI * 2); ctx.fill();
      }
      ctx.font = `${b.size}px serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 8;
      ctx.fillText('⚽', b.x, b.y);
      ctx.restore();
    }
    // القفازات (تتبع يدي اللاعب)
    for (let i = 0; i < this.hands.length; i++) {
      const h = this.hands[i];
      const s = this.twoPlayer ? i : null;
      ctx.save();
      if (s !== null) {
        ctx.fillStyle = P_COLORS[s];
        ctx.beginPath(); ctx.arc(h.x, h.y + 10, 40, 0, Math.PI * 2); ctx.fill();
      }
      ctx.font = '64px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('🧤', h.x, h.y);
      ctx.restore();
    }
    if (this.flashT > 0) {
      ctx.fillStyle = `rgba(239,68,68,${this.flashT * .4})`;
      ctx.fillRect(-40, -40, this.W + 80, this.H + 80);
    }
  }
}

/* ============================================================
   اللعبة 8: عدّي العوائق 🏃 (مثل Jungle Ruins)
   اقفز فوق الجذوع وانبطح تحت النباتات — بالحركة العمودية
   ============================================================ */
class RunnerGame extends GameBase {
  constructor(app) {
    super(app);
    this.timeLeft = 90;
    this.lives = this.twoPlayer ? null : 3;
    this.title = 'اقفز فوق وانبطح تحت!';
    this.flashT = 0;
    const W = this.W, H = this.H;
    this.groundY = H - 95;
    this.runners = [];
    if (this.twoPlayer) {
      for (let s = 0; s < 2; s++) {
        const hx = s === 0 ? 0 : W / 2, hw = W / 2;
        this.runners.push({ x: hx + hw * .2, y: H * .6, side: s, inv: 0, scroll: 0, dist: 0, items: [], spawnT: .6 });
      }
    } else {
      this.runners.push({ x: W * .2, y: H * .6, side: 0, inv: 0, scroll: 0, dist: 0, items: [], spawnT: .6 });
    }
  }
  update(dt) {
    this.baseUpdate(dt);
    const now = performance.now();
    const prog = Math.min(1, this.elapsed / 90);
    const speed = 320 + 300 * prog;
    for (const r of this.runners) {
      const zone = { x0: r.x - 10, x1: r.x + 10, y0: this.H * .16, y1: this.H - 130 };
      const tgt = this.bodyTarget(this.twoPlayer ? r.side : null, now, r, zone);
      r.y += (tgt.y - r.y) * Math.min(1, dt * 6);
      r.scroll += speed * dt; r.dist += speed * dt;
      if (r.dist >= 35) {
        r.dist -= 35;
        if (this.twoPlayer) { if (r.side === 0) this.scoreA++; else this.scoreB++; }
        else this.score++;
      }
      if (r.inv > 0) r.inv -= dt;
      r.spawnT -= dt;
      if (r.spawnT <= 0) {
        const roll = Math.random();
        let it;
        if (roll < .38) it = { type: 'log', emoji: '🪵', y: this.groundY - 55 };
        else if (roll < .68) it = { type: 'vine', emoji: '🌿', y: 135 };
        else if (roll < .88) it = { type: 'banana', emoji: '🍌', y: this.H * .3 + Math.random() * (this.groundY - 90 - this.H * .3) };
        else it = { type: 'gem', emoji: '💎', y: this.H * .3 + Math.random() * (this.groundY - 90 - this.H * .3) };
        it.x = this.W + 60;
        r.items.push(it);
        r.spawnT = Math.max(.34, .62 - prog * .26) + Math.random() * .22;
      }
      for (const it of r.items) {
        it.x -= speed * dt;
        if (Math.abs(it.x - r.x) < 55) {
          if (it.type === 'log') {
            if (r.y > this.groundY - 195 && r.inv <= 0) { this.crash(r, it); }
          } else if (it.type === 'vine') {
            if (r.y < 295 && r.inv <= 0) { this.crash(r, it); }
          } else if (!it.taken && Math.abs(it.y - r.y) < 95) {
            it.taken = true; it.dead = true;
            const pts = it.type === 'gem' ? 25 : 10;
            if (this.twoPlayer) this.addScoreP(r.side, pts, it.x, it.y);
            else this.addScore(pts, it.x, it.y, it.type === 'gem' ? '#67e8f9' : '#fde047');
            if (it.type === 'gem') SFX.golden(); else SFX.catchFruit();
            this.particles.burst(it.x, it.y, ['#fde047', '#fff'], 8, 180);
          }
        }
        if (it.x < -80) it.dead = true;
      }
      r.items = r.items.filter(it => !it.dead);
    }
  }
  crash(r, it) {
    r.inv = 1.6;
    this.shakeT = .45; this.flashT = .5;
    SFX.bomb();
    this.particles.burst(it.x, it.y, ['#ef4444', '#f97316'], 16);
    if (this.twoPlayer) {
      if (r.side === 0) this.scoreA = Math.max(0, this.scoreA - 20);
      else this.scoreB = Math.max(0, this.scoreB - 20);
      this.texts.add(it.x, it.y - 40, P_EMojis[r.side] + ' -20', P_COLORS[r.side]);
      this.app.hudUpdate(this);
    } else {
      this.lives--;
      this.app.hudUpdate(this);
      if (this.lives <= 0) this.endGame();
    }
  }
  draw(ctx) {
    this.baseDraw(ctx);
    // الأرض والعشب
    ctx.save();
    ctx.fillStyle = 'rgba(20,83,45,.75)';
    ctx.fillRect(0, this.groundY + 30, this.W, this.H - this.groundY - 30);
    ctx.fillStyle = 'rgba(74,222,128,.8)';
    ctx.font = '30px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let x = 20; x < this.W; x += 70) ctx.fillText('🌱', x, this.groundY + 52);
    ctx.restore();
    for (const r of this.runners) {
      for (const it of r.items) {
        ctx.save();
        const sc = it.type === 'log' ? 1.25 : it.type === 'vine' ? 1.3 : 1;
        ctx.font = `${52 * sc}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(it.emoji, it.x, it.y);
        ctx.restore();
      }
      // العدّاء (🏃 يواجه اليسار أصلاً → قلبه ليواجه اليمين)
      ctx.save();
      const bob = Math.sin(this.elapsed * 11) * 5;
      ctx.translate(r.x, r.y + bob);
      ctx.scale(-1, 1);
      if (r.inv > 0) ctx.globalAlpha = .5 + .4 * Math.sin(this.elapsed * 25);
      ctx.font = '95px serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 10;
      ctx.fillText('🏃', 0, 0);
      ctx.restore();
      if (this.twoPlayer) {
        ctx.font = '700 24px "Segoe UI", Arial';
        ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        ctx.fillStyle = P_COLORS[r.side];
        ctx.fillText(P_EMojis[r.side], r.x, r.y - 70);
      }
    }
    if (this.flashT > 0) {
      ctx.fillStyle = `rgba(239,68,68,${this.flashT * .4})`;
      ctx.fillRect(-40, -40, this.W + 80, this.H + 80);
    }
  }
}

/* تعريفات الألعاب للقائمة */
const GAMES = {
  pop:    { cls: PopGame,    name: 'اضرب الكرات',   icon: '🎈', stars: [50, 120, 200], dur: 60 },
  catch:  { cls: CatchGame,  name: 'اصطياد الفواكه', icon: '🍎', stars: [150, 350, 600], dur: 90 },
  whack:  { cls: WhackGame,  name: 'اضرب الخُلد',    icon: '🐹', stars: [60, 130, 220], dur: 60 },
  race:   { cls: RaceGame,   name: 'سباق السيارات',  icon: '🚗', stars: [1500, 3000, 4500], dur: 90 },
  dragon: { cls: DragonGame, name: 'التنين الطاير',  icon: '🐉', stars: [400, 900, 1500], dur: 90 },
  dance:  { cls: PoseGame,   name: 'الرقص واللمس',   icon: '🕺', stars: [80, 160, 260], dur: 60 },
  goalie: { cls: GoalieGame, name: 'حراسة المرمى',   icon: '🥅', stars: [80, 150, 240], dur: 90 },
  runner: { cls: RunnerGame, name: 'عدّي العوائق',   icon: '🏃', stars: [500, 1000, 1600], dur: 90 }
};
