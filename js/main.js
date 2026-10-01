/* ============================================================
   الإدارة العامة: الشاشات، حلقة اللعب، HUD، النتائج، الإعدادات
   ============================================================ */
'use strict';

const $ = id => document.getElementById(id);

const app = {
  canvas: $('game'),
  ctx: null,
  engine: null,        // MotionEngine أو null في وضع الماوس
  demoMode: false,
  players: parseInt(localStorage.getItem('kc_players') || '1', 10) === 2 ? 2 : 1,
  learnMode: localStorage.getItem('kc_mode') === 'learn',
  currentGame: null,
  gameKey: null,
  paused: false,
  lastT: 0,

  W() { return this.canvas.clientWidth || window.innerWidth; },
  H() { return this.canvas.clientHeight || window.innerHeight; },

  hudUpdate(g) {
    // تحديث DOM فقط عند تغير القيمة (يمنع تخليط التخطيط كل إطار)
    let s;
    if (g.twoPlayer) {
      s = '<span style="color:#2563eb">🔵 <b>' + g.scoreA + '</b></span> ⚔️ <span style="color:#dc2626"><b>' + g.scoreB + '</b> 🔴</span>';
      if (this._hudScore !== s) { this._hudScore = s; $('hud-score').innerHTML = s; }
      if (this._hudLives !== '') { this._hudLives = ''; $('hud-lives').innerHTML = ''; }
    } else {
      s = '⭐ <b>' + g.score + '</b>';
      if (this._hudScore !== s) { this._hudScore = s; $('hud-score').innerHTML = s; }
      let l = '';
      if (g.lives !== null && g.lives !== undefined) {
        l = '❤️'.repeat(Math.max(0, g.lives)) + '<span style="opacity:.25">' + '❤️'.repeat(Math.max(0, 3 - g.lives)) + '</span>';
      }
      if (this._hudLives !== l) { this._hudLives = l; $('hud-lives').innerHTML = l; }
    }
  },
  hudTimer(sec) {
    const s = '⏱ <b>' + sec + '</b>';
    if (this._hudTime !== s) { this._hudTime = s; $('hud-timer').innerHTML = s; }
  },
  onEnd(game) { showResults(this.gameKey, game); }
};

app.ctx = app.canvas.getContext('2d');

/* ---------- ضبط الكانفس على مقاس النافذة (HiDPI) ---------- */
function resizeCanvas() {
  // سقف 1.5 يوفر رسم أقل بكثير على الشاشات عالية الكثافة بدون فرق ملموس للأطفال
  const dpr = Math.min(1.5, window.devicePixelRatio || 1);
  const w = window.innerWidth, h = window.innerHeight;
  app.canvas.width = Math.round(w * dpr);
  app.canvas.height = Math.round(h * dpr);
  app.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

/* ---------- الشاشات ---------- */
function show(id) { $(id).classList.remove('hidden'); }
function hide(id) { $(id).classList.add('hidden'); }
function hideAllScreens() {
  ['screen-intro', 'screen-menu', 'screen-results', 'screen-paused', 'screen-countdown', 'hud', 'hint-move']
    .forEach(hide);
}

/* ---------- بدء الكاميرا ---------- */
async function startCamera() {
  const err = $('intro-error');
  err.classList.add('hidden');
  $('btn-camera').disabled = true;
  $('btn-camera').textContent = t('waiting');
  try {
    app.engine = new MotionEngine($('cam'));
    app.engine.setSensitivity(parseInt(localStorage.getItem('kc_sens') || '3', 10));
    await app.engine.start();
    app.demoMode = false;
    $('cam-status').textContent = t('camStatus');
    show('cam-status');
    gotoMenu();
  } catch (e) {
    let msg = t('errGeneric');
    if (e && (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError'))
      msg = t('errNotAllowed');
    else if (e && e.name === 'NotFoundError') msg = t('errNotFound');
    else if (location.protocol === 'file:') msg = t('errFile');
    err.textContent = msg;
    err.classList.remove('hidden');
  }
  $('btn-camera').disabled = false;
  $('btn-camera').textContent = t('btnCamera');
}

function startDemo() {
  app.demoMode = true;
  app.engine = null;
  $('cam').style.display = 'none';
  $('cam-dim').style.display = 'none';
  document.body.style.background = 'linear-gradient(135deg,#0f766e,#1e3a8a)';
  gotoMenu();
}

function gotoMenu() {
  hideAllScreens();
  stopGame();
  show('screen-menu');
  SFX.click();
}

/* ---------- بدء لعبة ---------- */
async function startGame(key) {
  hideAllScreens();
  const def = GAMES[key];
  app.gameKey = key;
  app.currentGame = new def.cls(app);
  app.hudUpdate(app.currentGame);
  app.hudTimer(def.dur);
  show('hud');
  app.paused = true;

  // العد التنازلي 3..2..1
  show('screen-countdown');
  const numEl = $('count-num');
  for (const n of ['3', '2', '1', t('go')]) {
    numEl.textContent = n;
    // إعادة تشغيل الأنيميشن
    numEl.style.animation = 'none'; void numEl.offsetWidth; numEl.style.animation = '';
    if (n === t('go')) SFX.go(); else SFX.tick();
    await new Promise(r => setTimeout(r, 850));
  }
  hide('screen-countdown');
  app.paused = false;
  app.lastT = performance.now();
  app.currentGame.elapsed = 0;
  if (app.engine) app.engine.prev = null; // تجاهل الحركة أثناء العد
}

function stopGame() {
  if (app.currentGame && app.currentGame.destroy) { try { app.currentGame.destroy(); } catch (e) { } }
  MUSIC.stop();
  app.currentGame = null;
  app.paused = false;
  try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) { }
}

/* ---------- النطق الصوتي (وضع تعلّم) ---------- */
function say(text) {
  if (SFX.muted || !window.speechSynthesis || !text) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = LANG === 'ar' ? 'ar-SA' : 'en-US';
    u.rate = .95;
    speechSynthesis.speak(u);
  } catch (e) { /* النطق غير مدعوم — النص المكتوب يكفي */ }
}

/* ---------- النتائج ---------- */
function showResults(key, game) {
  stopGame();
  hideAllScreens();
  const def = GAMES[key];

  if (game.twoPlayer) {
    // وضع اللاعبَين: عرض نتيجتي الجهتين والفائز
    $('res-stars').classList.add('hidden');
    $('res-score-line').classList.add('hidden');
    $('res-best').classList.add('hidden');
    $('res-2p').classList.remove('hidden');
    $('res-scoreA').textContent = game.scoreA;
    $('res-scoreB').textContent = game.scoreB;
    let title;
    if (game.scoreA > game.scoreB) title = t('blueWins');
    else if (game.scoreB > game.scoreA) title = t('redWins');
    else title = t('tie');
    $('res-title').textContent = title;
    SFX.win();
  } else {
    $('res-stars').classList.remove('hidden');
    $('res-score-line').classList.remove('hidden');
    $('res-best').classList.remove('hidden');
    $('res-2p').classList.add('hidden');

    const score = game.score;
    const bestKey = 'kc_best_' + key;
    const best = Math.max(score, parseInt(localStorage.getItem(bestKey) || '0', 10));
    localStorage.setItem(bestKey, best);

    const stars = score >= def.stars[2] ? 3 : score >= def.stars[1] ? 2 : score >= def.stars[0] ? 1 : 0;
    $('res-stars').innerHTML =
      '⭐'.repeat(stars) + '<span class="off">' + '⭐'.repeat(3 - stars) + '</span>';
    $('res-title').textContent = t('resTitle' + stars);
    $('res-score-line').innerHTML = t('resScore') + ': <b>' + score + '</b>';
    $('res-best').textContent = t('resBest') + ': ' + best + ' | ' + def.icon + ' ' + t('game_' + key + '_name');
    if (stars >= 2) SFX.win(); else SFX.lose();
  }
  show('screen-results');
}

/* ---------- الإيقاف المؤقت ---------- */
function pauseGame() {
  if (!app.currentGame || app.paused) return;
  app.paused = true;
  show('screen-paused');
  SFX.click();
}
function resumeGame() {
  hide('screen-paused');
  app.paused = false;
  app.lastT = performance.now();
  if (app.engine) app.engine.prev = null;
  SFX.click();
}

/* ---------- حلقة اللعب الرئيسية ---------- */
function step(t) {
  const dt = Math.min(.05, (t - app.lastT) / 1000 || .016);
  if (t - app.lastT < 8) return; // حماية من الاستدعاء المزدوج
  app.lastT = t;

  if (app.engine) {
    // حارس الكاميرا: بعض المتصفحات توقف البث تلقائياً (توفير طاقة) — استئناف فوري
    if (app.engine.ready && app.engine.video.paused) app.engine.video.play().catch(() => {});
    app.engine.update(app.W(), app.H());
  }

  if (app.currentGame && !app.paused) {
    app.currentGame.update(dt);
  }
  if (app.currentGame) {
    app.currentGame.draw(app.ctx);
    // تلميح "حرّك إيدك" عند سكون الطفل (فقط عند تغير الحالة)
    const showHint = app.engine && app.engine.ready && app.engine.isIdle(5000) && !app.paused;
    if (app._hintState !== showHint) {
      app._hintState = showHint;
      $('hint-move').classList.toggle('hidden', !showHint);
    }
  }
}
function loop(t) {
  lastRafT = performance.now();
  // تحصين: أي استثناء في إطار واحد لا يقتل سلسلة rAF نهائياً
  try { step(t); } catch (e) { console.error('frame error:', e); }
  requestAnimationFrame(loop);
}
let lastRafT = 0;
requestAnimationFrame(loop);
// شبكة أمان 1: مؤقت عادي (لو توقف rAF)
setInterval(() => {
  if (performance.now() - app.lastT > 200) { try { step(performance.now()); } catch (e) { console.error(e); } }
}, 100);
// شبكة أمان 2: عامل خلفي — المتصفحات (خاصة المدمجة) توقف rAF وتخنق المؤقتات،
// لكن مؤقتات الـ Worker لا تُخنق، فيسوق حلقة اللعبة بسرعة كاملة عندما يتوقف rAF
try {
  const workerSrc = 'setInterval(function(){postMessage(0)},16)';
  const worker = new Worker(URL.createObjectURL(new Blob([workerSrc], { type: 'application/javascript' })));
  worker.onmessage = () => {
    if (performance.now() - lastRafT > 250) { try { step(performance.now()); } catch (e) { console.error(e); } }
  };
} catch (e) { /* متصفحات قديمة جداً بدون Worker: يكفي المؤقت العادي */ }

/* ---------- اللمس/الماوس ---------- */
function canvasPos(e) {
  const r = app.canvas.getBoundingClientRect();
  return [e.clientX - r.left, e.clientY - r.top];
}
app.canvas.addEventListener('pointerdown', e => {
  if (!app.currentGame || app.paused) return;
  const [x, y] = canvasPos(e);
  app.currentGame.onPointerDown && app.currentGame.onPointerDown(x, y);
});
app.canvas.addEventListener('pointermove', e => {
  if (!app.currentGame || app.paused) return;
  const [x, y] = canvasPos(e);
  app.currentGame.onPointerMove && app.currentGame.onPointerMove(x, y);
});

/* ---------- عدد اللاعبين ---------- */
function updatePlayersUI() {
  $('pl-1').classList.toggle('sel', app.players === 1);
  $('pl-2').classList.toggle('sel', app.players === 2);
}
$('pl-1').addEventListener('click', () => {
  app.players = 1; localStorage.setItem('kc_players', '1');
  updatePlayersUI(); SFX.click();
});
$('pl-2').addEventListener('click', () => {
  app.players = 2; localStorage.setItem('kc_players', '2');
  updatePlayersUI(); SFX.click();
});
updatePlayersUI();

/* ---------- وضع اللعب: عادي / تعلّم ---------- */
function updateModeUI() {
  $('mode-normal').classList.toggle('sel', !app.learnMode);
  $('mode-learn').classList.toggle('sel', app.learnMode);
}
$('mode-normal').addEventListener('click', () => {
  app.learnMode = false; localStorage.setItem('kc_mode', 'normal');
  updateModeUI(); SFX.click();
});
$('mode-learn').addEventListener('click', () => {
  app.learnMode = true; localStorage.setItem('kc_mode', 'learn');
  updateModeUI(); SFX.click();
});
updateModeUI();

/* ---------- الإعدادات ---------- */
$('set-sens').value = localStorage.getItem('kc_sens') || '3';
function applySens() {
  localStorage.setItem('kc_sens', $('set-sens').value);
  if (app.engine) app.engine.setSensitivity(parseInt($('set-sens').value, 10));
}
$('set-sens').addEventListener('input', applySens);

function updateSoundBtn() { $('set-sound').textContent = SFX.muted ? '🔇' : '🔊'; }
$('set-sound').addEventListener('click', () => {
  SFX.muted = !SFX.muted;
  localStorage.setItem('kc_sound', SFX.muted ? 'off' : 'on');
  updateSoundBtn(); SFX.click();
});
updateSoundBtn();

/* ---------- ربط الأحداث ---------- */
$('btn-camera').addEventListener('click', startCamera);
$('btn-demo').addEventListener('click', () => { SFX.click(); startDemo(); });
// زر تبديل اللغة (شاشة الترحيب + القائمة)
document.querySelectorAll('[data-lang-btn]').forEach(btn =>
  btn.addEventListener('click', () => { setLang(LANG === 'en' ? 'ar' : 'en'); SFX.click(); })
);
document.querySelectorAll('.game-card').forEach(btn =>
  btn.addEventListener('click', () => { SFX.click(); startGame(btn.dataset.game); })
);
$('btn-pause').addEventListener('click', pauseGame);
$('btn-resume').addEventListener('click', resumeGame);
$('btn-exit').addEventListener('click', gotoMenu);
$('btn-quit').addEventListener('click', gotoMenu);
$('btn-replay').addEventListener('click', () => startGame(app.gameKey));
$('btn-menu').addEventListener('click', gotoMenu);
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseGame(); });
window.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (app.currentGame && !app.paused) pauseGame();
    else if (app.currentGame) resumeGame();
  }
});
