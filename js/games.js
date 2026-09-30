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
}

/* ============================================================
   اللعبة 1: اضرب الكرات 🎈
   ============================================================ */
const BALL_COLORS = [
  ['#ff6b6b', '#c92a2a'], ['#4dabf7', '#1864ab'], ['#69db7c', '#2b8a3e'],
  ['#ffd43b', '#e67700'], ['#da77f2', '#862e9c'], ['#ff922b', '#d9480f']
];

class PopGame extends GameBase {
  constructor(app) {
    super(app);
    this.timeLeft = 60;
    this.balls = [];
    this.spawnT = .6;
    this.title = 'اضرب الكرات بإيدك!';
  }
  spawnBall() {
    const scale = Math.min(this.W, this.H) / 700;
    const r = (42 + Math.random() * 26) * Math.max(.65, scale);
    const m = r + 20;
    this.balls.push({
      x: m + Math.random() * (this.W - m * 2),
      y: m + 80 + Math.random() * (this.H - m * 2 - 120),
      vx: (Math.random() - .5) * 90, vy: (Math.random() - .5) * 90,
      r, golden: Math.random() < .14, age: 0, life: 8,
      pop: -1, colors: BALL_COLORS[(Math.random() * BALL_COLORS.length) | 0]
    });
  }
  update(dt) {
    this.baseUpdate(dt);
    const prog = Math.min(1, this.elapsed / 60);
    this.spawnT -= dt;
    if (this.spawnT <= 0) {
      this.spawnBall();
      this.spawnT = 1.5 - prog * .75 + Math.random() * .3;
    }
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
      // وجه مبتسم
      ctx.fillStyle = 'rgba(0,0,0,.75)';
      ctx.beginPath(); ctx.arc(-b.r * .28, -b.r * .05, b.r * .09, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(b.r * .28, -b.r * .05, b.r * .09, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.75)'; ctx.lineWidth = Math.max(2, b.r * .06);
      ctx.beginPath(); ctx.arc(0, b.r * .18, b.r * .3, .25 * Math.PI, .75 * Math.PI); ctx.stroke();
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
        const t = this.basketTarget(s, now);
        this.bx[s] += (t - this.bx[s]) * Math.min(1, dt * 7);
      }
    } else {
      const t = this.basketTarget(null, now);
      this.basketX += (t - this.basketX) * Math.min(1, dt * 7);
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
      ctx.shadowColor = 'rgba(0,0,0,.4)'; ctx.shadowBlur = 8;
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

/* تعريفات الألعاب للقائمة */
const GAMES = {
  pop:   { cls: PopGame,   name: 'اضرب الكرات',   icon: '🎈', stars: [50, 120, 200], dur: 60 },
  catch: { cls: CatchGame, name: 'اصطياد الفواكه', icon: '🍎', stars: [150, 350, 600], dur: 90 },
  whack: { cls: WhackGame, name: 'اضرب الخُلد',    icon: '🐹', stars: [60, 130, 220], dur: 60 }
};
