/* ============================================================
   ريموت الوي (Wii Remote) عبر WebHID — بدون أي درايفرز
   - اقتران بلوتوث عادي ثم زر 🎮 بالقائمة (مرة لكل ريموت)
   - الفتحة 0 = السيف الأحمر، الفتحة 1 = الأزرق (الـLED يبين)
   - قراءة الأزرار + التسارع من تقرير 0x35 المستمر
   - زوايا إمالة (pitch/roll) من متجه الجاذبية، وزر A يعيد التوسيط
   ============================================================ */
'use strict';

const WII = {
  devices: [null, null],
  state: [null, null],
  calib: [null, null],
  onConnect: null,

  supported() { return 'hid' in navigator; },

  /* الاتصال بأجهزة سبق السماح بها (بدون نافذة اختيار) */
  async autoConnect() {
    if (!this.supported()) return 0;
    try {
      const list = await navigator.hid.getDevices();
      let n = 0;
      for (const d of list) {
        if (d.vendorId === 0x057e && n < 2 && !d.opened) {
          try { await this.attach(n, d); n++; } catch (e) { }
        }
      }
    } catch (e) { }
    return n;
  },

  /* طلب جهاز جديد (لازم ضغطة زر من المستخدم) */
  async connectNext() {
    if (!this.supported()) throw new Error('no-hid');
    const slot = this.devices[0] ? 1 : 0;
    const dev = await navigator.hid.requestDevice({ filters: [{ vendorId: 0x057e }] });
    if (!dev) return null;
    await this.attach(slot, dev);
    return slot;
  },

  async attach(slot, d) {
    await d.open();
    // تفعيل التقارير المستمرة: أزرار + تسارع + IR (0x35)
    await d.sendReport(0x12, new Uint8Array([0x04, 0x35]));
    // إشعال LED حسب الفتحة (0x10 = LED1 للأحمر، 0x20 = LED2 للأزرق)
    await d.sendReport(0x11, new Uint8Array([1 << (4 + slot)]));
    d.addEventListener('inputreport', (e) => this.onReport(slot, e));
    d.addEventListener('disconnect', () => {
      this.devices[slot] = null; this.state[slot] = null;
      if (this.onConnect) this.onConnect();
    });
    this.devices[slot] = d;
    if (this.onConnect) this.onConnect();
  },

  /* تحليل تقرير الإدخال (أزرار + تسارع 10-bit) */
  onReport(slot, e) {
    if (e.reportId < 0x30 || e.reportId > 0x35) return;
    const d = new Uint8Array(e.data.buffer, e.data.byteOffset, e.data.byteLength);
    if (d.length < 6) return;
    const b1 = d[1] | 0, b2 = d[2] | 0;
    // التسارع 10 بت: 8 بت عليا في البايتات 3-5 و2 بت دنيا داخل بايت الأزرار الأول
    const ax = ((d[3] << 2) | (b1 & 3)) - 512;
    const ay = ((d[4] << 2) | ((b1 >> 2) & 3)) - 512;
    const az = ((d[5] << 2) | ((b1 >> 4) & 3)) - 512;
    const mag = Math.hypot(ax, ay, az) / 512;
    const len = Math.max(1, Math.hypot(ax, ay, az));
    const st = {
      gx: ax / len, gy: ay / len, gz: az / len,
      mag,
      btnA: !!(b2 & 0x08), btnB: !!(b2 & 0x04),
      pitch: Math.atan2(-ax, Math.hypot(ay, az)),
      roll: Math.atan2(ay, az),
      t: performance.now()
    };
    // التوسيط: أول قراءة أو بزر A
    if (!this.calib[slot] || st.btnA) this.calib[slot] = { p: st.pitch, r: st.roll };
    let dp = st.pitch - this.calib[slot].p;
    let dr = st.roll - this.calib[slot].r;
    st.dp = Math.atan2(Math.sin(dp), Math.cos(dp));   // لف إلى [-PI, PI]
    st.dr = Math.atan2(Math.sin(dr), Math.cos(dr));
    this.state[slot] = st;
  },

  /* موضع السيف داخل مستطيل من زاويتي الإمالة (±56 درجة) */
  saberPos(slot, rect) {
    const st = this.state[slot];
    if (!st || performance.now() - st.t > 2000) return null;
    const nx = Math.max(-1, Math.min(1, st.dr / (Math.PI / 3.2)));
    const ny = Math.max(-1, Math.min(1, -st.dp / (Math.PI / 3.2)));
    return {
      x: rect.x + (nx * .5 + .5) * rect.w,
      y: rect.y + (ny * .5 + .5) * rect.h,
      swing: st.mag > 1.9
    };
  }
};
