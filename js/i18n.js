/* ============================================================
   الترجمة — English (default) / العربية
   LANG من localStorage (kc_lang)، والديفلت إنجليزي
   ============================================================ */
'use strict';

const I18N = {
  en: {
    title: 'Kid Cam Games 🎪',
    introH1: 'Camera Games',
    introSub: 'Play with your body and hands in front of the camera — no controller needed! 🙌',
    f1: '🎈 Pop the balls with your hand',
    f2: '🍎 Catch the fruits falling from above',
    f3: '🐹 Whack the mole when it pops out',
    f4: '🚗 Race a car with your body',
    btnCamera: '🎥 Start Camera & Play',
    btnDemo: '🖱️ Play without camera (mouse)',
    privacy: '🔒 The camera feed stays on your device — nothing is sent anywhere',
    waiting: '⏳ Starting camera...',
    langBtn: '🌐 العربية',
    menuTitle: 'Pick your game! 🎮',
    p1: '👤 1 Player',
    p2: '👥 2 Players 🔵🔴',
    sens: '🔍 Motion sensitivity',
    go: 'Go!',
    hintMove: '✋ Move your hands & body!',
    camStatus: '🎥 Camera on — video never leaves your device',
    resTitle3: 'Amazing! You are a champion! 🏆',
    resTitle2: 'Great job! 🎉',
    resTitle1: 'Very good! 👍',
    resTitle0: 'Try again! 💪',
    resScore: 'Your score',
    resBest: 'Your best',
    resNote: 'Blue plays the left side, Red plays the right',
    blueWins: 'Blue player wins! 🔵🏆',
    redWins: 'Red player wins! 🔴🏆',
    tie: "It's a tie! 🤝",
    btnReplay: '🔄 Play again!',
    btnMenu: '🏠 Main menu',
    pauseTitle: '⏸️ Paused',
    btnResume: '▶️ Resume',
    boost: '🚀 Speed!',
    errNotAllowed: 'The browser blocked the camera. Allow camera access in browser settings then try again, or play with the mouse.',
    errNotFound: 'No camera found on this device 😕',
    errFile: 'Open the game via run.bat, not directly from the file (the camera needs a local server)',
    errGeneric: 'Could not start the camera 😕',
    game_pop_name: 'Pop the Balls',
    game_pop_desc: 'Hit the ball with your hand!',
    game_catch_name: 'Catch the Fruits',
    game_catch_desc: 'Move your body to steer the basket!',
    game_whack_name: 'Whack the Mole',
    game_whack_desc: 'Hit the mole before it hides!',
    game_race_name: 'Car Race',
    game_race_desc: 'Move your body left & right to steer!',
    game_dragon_name: 'Flying Dragon',
    game_dragon_desc: 'Fly with your body, grab gems & rings!',
    game_dance_name: 'Dance & Touch',
    game_dance_desc: 'Touch the glowing orbs with your hands!',
    game_goalie_name: 'Goalkeeper',
    game_goalie_desc: 'Block the balls with your body!',
    game_runner_name: 'Jungle Run',
    game_runner_desc: 'Jump up & duck down to dodge!',
    game_space_name: 'Space Dragon 3D',
    game_space_desc: 'Fly through space, 3D behind the dragon!',
    modeNormal: '🎮 Normal',
    modeLearn: '🧠 Learn',
    learnHit: 'Hit',
    learnNum: 'number',
    learnLetter: 'letter',
    learnBall: 'the ball',
    saveTxt: 'SAVE! 🧤',
    goalTxt: 'GOAL! ⚽',
    f5: '🐉🥅🕺🏃 …and 4 more games inside!'
  },
  ar: {
    title: 'ألعاب الكاميرا للأطفال 🎪',
    introH1: 'ألعاب الكاميرا',
    introSub: 'العب بحركة جسمك وإيدك قدام الكاميرا — بدون أي تحكم! 🙌',
    f1: '🎈 اضرب الكرات بإيدك',
    f2: '🍎 اصطياد الفواكه اللي بتقع من فوق',
    f3: '🐹 اضرب الخُلد لما يطلع من حفرة',
    f4: '🚗 سباق سيارات بقيادة جسمك',
    btnCamera: '🎥 تشغيل الكاميرا واللعب',
    btnDemo: '🖱️ اللعب بدون كاميرا (بالماوس)',
    privacy: '🔒 الصورة تبقى داخل جهازك فقط ولا تُرسل لأي مكان',
    waiting: '⏳ جاري تشغيل الكاميرا...',
    langBtn: '🌐 English',
    menuTitle: 'اختار لعبتك! 🎮',
    p1: '👤 لاعب واحد',
    p2: '👥 لاعبان 🔵🔴',
    sens: '🔍 حساسية الحركة',
    go: 'انطلق!',
    hintMove: '✋ حرّك إيدك وجسمك!',
    camStatus: '🎥 الكاميرا شغالة — الصورة لا تُرسل لأي مكان',
    resTitle3: 'مذهل! أنت بطل! 🏆',
    resTitle2: 'أحسنت! 🎉',
    resTitle1: 'جيد جداً! 👍',
    resTitle0: 'حاول مرة ثانية! 💪',
    resScore: 'نتيجتك',
    resBest: 'أفضل نتيجة لك',
    resNote: 'اللاعب الأزرق يسار الشاشة، الأحمر يمينها',
    blueWins: 'فاز اللاعب الأزرق! 🔵🏆',
    redWins: 'فاز اللاعب الأحمر! 🔴🏆',
    tie: 'تعادل! 🤝',
    btnReplay: '🔄 مرة ثانية!',
    btnMenu: '🏠 القائمة الرئيسية',
    pauseTitle: '⏸️ استراحة',
    btnResume: '▶️ كمل اللعب',
    boost: '🚀 سرعة!',
    errNotAllowed: 'منعت المتصفح من استخدام الكاميرا.\nاسمح للكاميرا من إعدادات المتصفح ثم حاول مرة ثانية، أو العب بالماوس.',
    errNotFound: 'ما لقينا كاميرا متصلة بالجهاز 😕',
    errFile: 'افتح اللعبة عبر run.bat وليس مباشرة من الملف (الكاميرا تحتاج خادم محلي)',
    errGeneric: 'تعذّر تشغيل الكاميرا 😕',
    game_pop_name: 'اضرب الكرات',
    game_pop_desc: 'اضرب الكرة بإيدك لما تظهر!',
    game_catch_name: 'اصطياد الفواكه',
    game_catch_desc: 'حرّك جسمك لتحرّك السلة واصطاد!',
    game_whack_name: 'اضرب الخُلد',
    game_whack_desc: 'اضرب الخُلد بإيدك قبل ما يختفي!',
    game_race_name: 'سباق السيارات',
    game_race_desc: 'حرّك جسمك يمين ويسار لقيادة العربية!',
    game_dragon_name: 'التنين الطاير',
    game_dragon_desc: 'طر بجسمك، اجمع الجواهر واعبر الحلقات!',
    game_dance_name: 'الرقص واللمس',
    game_dance_desc: 'المس الكرات المضيئة بإيدك!',
    game_goalie_name: 'حراسة المرمى',
    game_goalie_desc: 'صدّ الكرات بجسمك وإيدك!',
    game_runner_name: 'عدّي العوائق',
    game_runner_desc: 'اقفز فوق وانبطح تحت لتفادي العوائق!',
    game_space_name: 'التنين الفضائي 3D',
    game_space_desc: 'اطر بالفضاء — الكاميرا خلف التنين!',
    modeNormal: '🎮 عادي',
    modeLearn: '🧠 تعلّم',
    learnHit: 'اضرب',
    learnNum: 'الرقم',
    learnLetter: 'الحرف',
    learnBall: 'الكرة',
    saveTxt: 'تصدي! 🧤',
    goalTxt: 'هدف! ⚽',
    f5: '🐉🥅🕺🏃 …و4 ألعاب أخرى بالداخل!'
  }
};

let LANG = localStorage.getItem('kc_lang') === 'ar' ? 'ar' : 'en'; // الديفلت إنجليزي

function t(key) {
  return (I18N[LANG] && I18N[LANG][key]) || I18N.en[key] || key;
}

function setLang(l) {
  LANG = (l === 'ar') ? 'ar' : 'en';
  localStorage.setItem('kc_lang', LANG);
  document.documentElement.lang = LANG;
  document.documentElement.dir = LANG === 'ar' ? 'rtl' : 'ltr';
  document.title = t('title');
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  // أزرار اللغة تعرض اسم اللغة الأخرى
  document.querySelectorAll('[data-lang-btn]').forEach(el => {
    el.textContent = t('langBtn');
  });
}
setLang(LANG);
