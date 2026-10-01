/* ============================================================
   محرك كشف الحركة من الكاميرا (frame differencing)
   - يصغّر الصورة إلى 160x120 ويقارن كل إطار مع السابق
   - يعطي: طاقة الحركة عند أي نقطة + مركز الحركة (كامل الشاشة
     ولكل نصف شاشة على حدة لوضع اللاعبين)
   - المراكز مخزنة كنسب (0..1) من عرض/ارتفاع الشاشة
   - كل المعالجة محلية داخل الجهاز، لا شيء يُرسل للإنترنت
   ============================================================ */
'use strict';

class MotionEngine {
  constructor(videoEl) {
    this.video = videoEl;
    this.MW = 160; this.MH = 120;
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.MW; this.canvas.height = this.MH;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    this.cur = new Uint8Array(this.MW * this.MH);
    this.prev = null;
    this.mask = new Uint8Array(this.MW * this.MH);
    this.ready = false;
    this.mirror = true;              // العرض كالمرآة (سيلفي)
    this.diffThreshold = 28;         // عتبة فرق الإطارات (أقل = أكثر حساسية)
    this.motionLevel = 0;            // 0..1 نسبة البكسلات المتحركة
    // مركز الحركة كنسب 0..1 من الشاشة
    this.cx = 0.5; this.cy = 0.5;
    this.hasTrack = false;
    // مراكز كل نصف (يسار/يمين الشاشة) لوضع اللاعبَين
    this.cxL = 0.25; this.cxR = 0.75;
    this.hasTrackL = false; this.hasTrackR = false;
    this.lastMoveTime = 0;
    this.stream = null;
  }

  async start() {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
      audio: false
    });
    this.stream = stream;
    this.video.srcObject = stream;
    await this.video.play();
    // انتظار أبعاد الفيديو الفعلية
    await new Promise(res => {
      if (this.video.videoWidth > 0) return res();
      this.video.onloadedmetadata = res;
    });
    this.prev = null; // إعادة تهيئة عند البدء
    this.ready = true;
  }

  stop() {
    if (this.stream) this.stream.getTracks().forEach(t => t.stop());
    this.stream = null;
    this.ready = false;
    this.video.srcObject = null;
  }

  /* حساب عتبة الحساسية من إعداد المستخدم (1..5) */
  setSensitivity(level) {
    // 1 = حساسية عالية (عتبة منخفضة) ... 5 = حساسية منخفضة
    const table = [16, 22, 28, 36, 46];
    this.diffThreshold = table[Math.max(0, Math.min(4, level - 1))];
  }

  /* تحديث قناع الحركة كل إطار. W,H = مقاس الكانفس المنطقي (CSS px) */
  update(W, H) {
    if (!this.ready || this.video.readyState < 2) return;
    const { MW, MH, ctx, cur } = this;
    try { ctx.drawImage(this.video, 0, 0, MW, MH); } catch (e) { return; }
    const d = ctx.getImageData(0, 0, MW, MH).data;
    let i = 0, p = 0;
    for (let y = 0; y < MH; y++) {
      for (let x = 0; x < MW; x++) {
        // luma سريعة: (r*77 + g*151 + b*28) >> 8
        cur[i] = (d[p] * 77 + d[p + 1] * 151 + d[p + 2] * 28) >> 8;
        p += 4; i++;
      }
    }

    const mask = this.mask, prev = this.prev, th = this.diffThreshold;
    const half = MW >> 1;
    let count = 0, sumX = 0, sumY = 0;         // الشاشة كاملة
    let cL = 0, sXL = 0, sYL = 0;              // النصف الأيسر
    let cR = 0, sXR = 0, sYR = 0;              // النصف الأيمن
    if (prev) {
      for (let j = 0; j < mask.length; j++) {
        const diff = cur[j] > prev[j] ? cur[j] - prev[j] : prev[j] - cur[j];
        if (diff > th) {
          const mx = j % MW, my = (j / MW) | 0;
          mask[j] = 1; count++; sumX += mx; sumY += my;
          if (mx < half) { cL++; sXL += mx; sYL += my; }
          else { cR++; sXR += mx; sYR += my; }
        } else mask[j] = 0;
      }
    }
    this.motionLevel = count / mask.length;

    let moved = false;
    const a = 0.25; // تمهيد
    if (count > 60) {
      const nx = (sumX / count) / MW, ny = (sumY / count) / MH;
      const [sx, sy] = this.camToScreen(nx, ny, W, H);
      this.cx += (sx / W - this.cx) * a;
      this.cy += (sy / H - this.cy) * a;
      this.hasTrack = true;
      moved = true;
    }
    // مراكز نصفي الشاشة: نحدد الجهة بعد تحويل المرآة (cover crop + scaleX(-1))
    // حتى يطابق كل نصف ما يراه الطفل فعلاً على الشاشة، بصرف النظر عن إعداد المرآة
    const trackHalf = (cnt, sumHalfX, sumHalfY) => {
      if (cnt <= 40) return;
      const nx = (sumHalfX / cnt) / MW, ny = (sumHalfY / cnt) / MH;
      const [sx] = this.camToScreen(nx, ny, W, H);
      if (sx < W / 2) { this.cxL += (sx / W - this.cxL) * a; this.hasTrackL = true; }
      else { this.cxR += (sx / W - this.cxR) * a; this.hasTrackR = true; }
      moved = true;
    };
    trackHalf(cL, sXL, sYL);
    trackHalf(cR, sXR, sYR);
    if (moved) this.lastMoveTime = performance.now();

    // تبديل المخازن
    this.prev = this.cur;
    this.cur = new Uint8Array(MW * MH);
  }

  /* تحويل نقطة شاشة (CSS px) إلى إحداثيات شبكة العمل، مع مراعاة قصّ cover والمرآة */
  screenToWork(sx, sy, W, H) {
    const VW = this.video.videoWidth || 640, VH = this.video.videoHeight || 480;
    const s = Math.max(W / VW, H / VH);
    const dw = VW * s, dh = VH * s;
    const ox = (W - dw) / 2, oy = (H - dh) / 2;
    let vx = (sx - ox) / s;
    if (this.mirror) vx = (W - sx - ox) / s;
    const vy = (sy - oy) / s;
    const wx = Math.max(0, Math.min(this.MW - 1, vx * this.MW / VW));
    const wy = Math.max(0, Math.min(this.MH - 1, vy * this.MH / VH));
    return [wx, wy];
  }

  /* العكس: إحداثيات كاميرا منطقية (0..1) إلى شاشة (CSS px) */
  camToScreen(nx, ny, W, H) {
    const VW = this.video.videoWidth || 640, VH = this.video.videoHeight || 480;
    const s = Math.max(W / VW, H / VH);
    const dw = VW * s, dh = VH * s;
    const ox = (W - dw) / 2, oy = (H - dh) / 2;
    let vx = nx * VW * s;
    if (this.mirror) vx = dw - vx;
    return [ox + vx, oy + ny * VH * s];
  }

  /* طاقة الحركة (0..1) داخل دائرة نصف قطرها rScreen حول نقطة شاشة */
  energyAt(sx, sy, rScreen, W, H) {
    if (!this.prev) return 0;
    const [wx, wy] = this.screenToWork(sx, sy, W, H);
    const VW = this.video.videoWidth || 640, VH = this.video.videoHeight || 480;
    const s = Math.max(W / VW, H / VH);
    const r = Math.max(3, rScreen / s * (this.MW / VW));
    const x0 = Math.max(0, Math.floor(wx - r)), x1 = Math.min(this.MW - 1, Math.ceil(wx + r));
    const y0 = Math.max(0, Math.floor(wy - r)), y1 = Math.min(this.MH - 1, Math.ceil(wy + r));
    let hit = 0, total = 0;
    const r2 = r * r;
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const dx = x - wx, dy = y - wy;
        if (dx * dx + dy * dy <= r2) { total++; if (this.mask[y * this.MW + x]) hit++; }
      }
    }
    return total ? hit / total : 0;
  }

  /* هل تحرك اللاعب خلال آخر مهلة (ملي ثانية)؟ */
  isIdle(ms) { return performance.now() - this.lastMoveTime > ms; }
}
