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
  currentGame: null,
  gameKey: null,
  paused: false,
  lastT: 0,

  W() { return this.canvas.clientWidth || window.innerWidth; },
  H() { return this.canvas.clientHeight || window.innerHeight; },

  hudUpdate(g) {
    if (g.twoPlayer) {
      $('hud-score').innerHTML =
        '<span style="color:#2563eb">🔵 <b>' + g.scoreA + '</b></span> ⚔️ <span style="color:#dc2626"><b>' + g.scoreB + '</b> 🔴</span>';
      $('hud-lives').innerHTML = '';
    } else {
      $('hud-score').innerHTML = '⭐ <b>' + g.score + '</b>';
      if (g.lives !== null && g.lives !== undefined) {
        $('hud-lives').innerHTML = '❤️'.repeat(Math.max(0, g.lives)) + '<span style="opacity:.25">' + '❤️'.repeat(Math.max(0, 3 - g.lives)) + '</span>';
      } else $('hud-lives').innerHTML = '';
    }
  },
  hudTimer(sec) { $('hud-timer').innerHTML = '⏱ <b>' + sec + '</b>'; },
  onEnd(game) { showResults(this.gameKey, game); }
};

app.ctx = app.canvas.getContext('2d');

/* ---------- ضبط الكانفس على مقاس النافذة (HiDPI) ---------- */
function resizeCanvas() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
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
  $('btn-camera').textContent = '⏳ جاري تشغيل الكاميرا...';
  try {
    app.engine = new MotionEngine($('cam'));
    app.engine.mirror = localStorage.getItem('kc_mirror') !== 'off';
    applyMirror();
    app.engine.setSensitivity(parseInt(localStorage.getItem('kc_sens') || '3', 10));
    await app.engine.start();
    app.demoMode = false;
    $('cam-status').textContent = '🎥 الكاميرا شغالة — الصورة لا تُرسل لأي مكان';
    show('cam-status');
    gotoMenu();
  } catch (e) {
    let msg = 'تعذّر تشغيل الكاميرا 😕';
    if (e && (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError'))
      msg = 'منعت المتصفح من استخدام الكاميرا.\nاسمح للكاميرا من إعدادات المتصفح ثم حاول مرة ثانية، أو العب بالماوس.';
    else if (e && e.name === 'NotFoundError') msg = 'ما لقينا كاميرا متصلة بالجهاز 😕';
    else if (location.protocol === 'file:') msg = 'افتح اللعبة عبر run.bat وليس مباشرة من الملف (الكاميرا تحتاج خادم محلي)';
    err.textContent = msg;
    err.classList.remove('hidden');
  }
  $('btn-camera').disabled = false;
  $('btn-camera').textContent = '🎥 تشغيل الكاميرا واللعب';
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
  for (const n of ['3', '2', '1', 'انطلق!']) {
    numEl.textContent = n;
    // إعادة تشغيل الأنيميشن
    numEl.style.animation = 'none'; void numEl.offsetWidth; numEl.style.animation = '';
    if (n === 'انطلق!') SFX.go(); else SFX.tick();
    await new Promise(r => setTimeout(r, 850));
  }
  hide('screen-countdown');
  app.paused = false;
  app.lastT = performance.now();
  app.currentGame.elapsed = 0;
  if (app.engine) app.engine.prev = null; // تجاهل الحركة أثناء العد
}

function stopGame() {
  app.currentGame = null;
  app.paused = false;
}

/* ---------- النتائج ---------- */
function showResults(key, game) {
  stopGame();
  hideAllScreens();
  const def = GAMES[key];

  if (game.twoPlayer) {
    // وضع اللاعبَين: عرض نتيجتي الجهتين والفائز
    $('res-stars').classList.add('hidden');
    $('res-score').classList.add('hidden');
    $('res-best').classList.add('hidden');
    $('res-2p').classList.remove('hidden');
    $('res-scoreA').textContent = game.scoreA;
    $('res-scoreB').textContent = game.scoreB;
    let title;
    if (game.scoreA > game.scoreB) title = 'فاز اللاعب الأزرق! 🔵🏆';
    else if (game.scoreB > game.scoreA) title = 'فاز اللاعب الأحمر! 🔴🏆';
    else title = 'تعادل! 🤝';
    $('res-title').textContent = title;
    SFX.win();
  } else {
    $('res-stars').classList.remove('hidden');
    $('res-score').classList.remove('hidden');
    $('res-best').classList.remove('hidden');
    $('res-2p').classList.add('hidden');

    const score = game.score;
    const bestKey = 'kc_best_' + key;
    const best = Math.max(score, parseInt(localStorage.getItem(bestKey) || '0', 10));
    localStorage.setItem(bestKey, best);

    const stars = score >= def.stars[2] ? 3 : score >= def.stars[1] ? 2 : score >= def.stars[0] ? 1 : 0;
    $('res-stars').innerHTML =
      '⭐'.repeat(stars) + '<span class="off">' + '⭐'.repeat(3 - stars) + '</span>';
    $('res-title').textContent = stars === 3 ? 'مذهل! أنت بطل! 🏆' : stars === 2 ? 'أحسنت! 🎉' : stars === 1 ? 'جيد جداً! 👍' : 'حاول مرة ثانية! 💪';
    $('res-score').innerHTML = 'نتيجتك: <b>' + score + '</b>';
    $('res-best').textContent = 'أفضل نتيجة لك: ' + best + ' | ' + def.icon + ' ' + def.name;
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

  if (app.engine) app.engine.update(app.W(), app.H());

  if (app.currentGame && !app.paused) {
    app.currentGame.update(dt);
  }
  if (app.currentGame) {
    app.currentGame.draw(app.ctx);
    // تلميح "حرّك إيدك" عند سكون الطفل
    const idle = app.engine && app.engine.ready && app.engine.isIdle(5000);
    $('hint-move').classList.toggle('hidden', !idle || app.paused);
  }
}
function loop(t) {
  step(t);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
// شبكة أمان: لو توقف rAF (تبويب خلفي أو متصفح مقيد) نكمل بمؤقت
setInterval(() => {
  if (performance.now() - app.lastT > 200) step(performance.now());
}, 100);

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
  const [x] = canvasPos(e);
  app.currentGame.onPointerMove && app.currentGame.onPointerMove(x);
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

function applyMirror() {
  $('cam').classList.toggle('no-mirror', app.engine && !app.engine.mirror);
  $('set-mirror').style.opacity = app.engine && !app.engine.mirror ? .6 : 1;
}
$('set-mirror').addEventListener('click', () => {
  if (!app.engine) return;
  app.engine.mirror = !app.engine.mirror;
  localStorage.setItem('kc_mirror', app.engine.mirror ? 'on' : 'off');
  app.engine.prev = null;
  applyMirror(); SFX.click();
});

/* ---------- ربط الأحداث ---------- */
$('btn-camera').addEventListener('click', startCamera);
$('btn-demo').addEventListener('click', () => { SFX.click(); startDemo(); });
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
