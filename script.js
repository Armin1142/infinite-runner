// ---- Sabitler (oyunun "hissini" buradan ayarlıyoruz) ----
const GRAVITY = 0.42;
const FALL_MAX_SPEED = 8.5;  // düşerken ulaşabileceği en yüksek hız (sert inişi yumuşatır)
const JUMP_V = 13;           // normal zıplama hızı
const BOOST_MULT = 1.2;      // güç modundaki zıplama çarpanı (tavana değmesin diye sınırlı)
const BOOST_DURATION = 5000; // güç modu süresi (ms)
const PLAYER_SIZE = 36;
const PLAYER_X = 90;
const BASE_SPEED = 1.8;
const SPEED_PER_METER = 0.004; // zaman geçtikçe oyun hızlanır
const MAX_SPEED = 5;

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const W = canvas.width;
const H = canvas.height;
const GROUND_Y = H - 50;
const CEILING_Y = PLAYER_SIZE + 20;

// ---- Bölgeler (arkaplan/engel teması, mesafeye göre döner) ----
const BIOME_LENGTH = 220;
const BIOMES = ["forest", "park", "factory"];
const BIOME_SKY = {
  forest: ["#16281f", "#274a36"],
  park: ["#1e3350", "#3f6a8a"],
  factory: ["#2a262b", "#4a3f3a"],
};
const BIOME_HILL = { forest: "#1f3a2a", park: "#2c5170", factory: "#3a3236" };
const OBSTACLE_PALETTE = {
  forest: { spike: ["#9fd48a", "#3f8a3f"], block: ["#8a6a4a", "#5a4530"] },
  park: { spike: ["#ff8a8a", "#c22f2f"], block: ["#8a8f9a", "#565b64"] },
  factory: { spike: ["#ffb066", "#b5551d"], block: ["#6a6a72", "#3a3a40"] },
};
function getBiome(distance) {
  return BIOMES[Math.floor(distance / BIOME_LENGTH) % BIOMES.length];
}

// bölge sınırına yaklaşınca yumuşak geçiş (renkler ve dekor karışarak değişsin)
const BIOME_TRANSITION_FRAC = 0.18;
function getBiomeBlend(distance) {
  const pos = distance / BIOME_LENGTH;
  const idx = Math.floor(pos);
  const frac = pos - idx;
  const from = BIOMES[idx % BIOMES.length];
  const to = BIOMES[(idx + 1) % BIOMES.length];
  const startT = 1 - BIOME_TRANSITION_FRAC;
  const t = frac > startT ? (frac - startT) / BIOME_TRANSITION_FRAC : 0;
  return { from, to, t };
}
function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return { r: parseInt(h.substring(0, 2), 16), g: parseInt(h.substring(2, 4), 16), b: parseInt(h.substring(4, 6), 16) };
}
function lerpColor(hexA, hexB, t) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const r = Math.round(a.r + (b.r - a.r) * t);
  const g = Math.round(a.g + (b.g - a.g) * t);
  const bl = Math.round(a.b + (b.b - a.b) * t);
  return `rgb(${r}, ${g}, ${bl})`;
}

// ---- Helikopter modu (mavi token toplayınca başlar, süreye dayalı) ----
const HELI_TOKEN_DURATION = 9000; // ms — token toplayınca bu kadar helikopter kalırsın
const HELI_GRAVITY = 0.22; // daha yumuşak/kolay süzülme
const HELI_THRUST = 0.5;
const HELI_MAX_UP = -4.5;
const HELI_MAX_DOWN = 4.5;
const PIPE_GAP = 200; // daha geniş boşluk, daha kolay
const TRANSFORM_DURATION = 900; // ms — koşu <-> helikopter geçişinin süresi (daha yumuşak)
function easeInOutQuad(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

// ---- Karakter özelleştirme ----
const COLORS = [
  { id: "orange", nameKey: "colorOrange", cost: 0, top: "#ffb066", bottom: "#ff8a3d" },
  { id: "blue", nameKey: "colorBlue", cost: 20, top: "#6ec9ff", bottom: "#2f8fdb" },
  { id: "green", nameKey: "colorGreen", cost: 20, top: "#8bdb8b", bottom: "#3fae4c" },
  { id: "red", nameKey: "colorRed", cost: 20, top: "#ff8a8a", bottom: "#d94040" },
  { id: "gold", nameKey: "colorGold", cost: 60, top: "#fff3c4", bottom: "#e0a721" },
];
const HATS = [
  { id: "none", nameKey: "hatNone", cost: 0 },
  { id: "cap", nameKey: "hatCap", cost: 15 },
  { id: "top", nameKey: "hatTop", cost: 40 },
];
const GLASSES = [
  { id: "none", nameKey: "glassesNone", cost: 0 },
  { id: "sun", nameKey: "glassesSun", cost: 15 },
  { id: "round", nameKey: "glassesRound", cost: 15 },
];

// ---- Diller (i18n) ----
const LANG_KEY = "irLang";
const I18N = {
  tr: {
    subtitle: "Karakter kendi kendine koşar. Zıplamak için boşluk tuşuna bas.",
    rule1: "Zıplamak için <b>boşluk</b> tuşuna bas (mobilde ekrana dokun)",
    rule2: "Dikenler ve lav çukurlarından atlayarak kaç",
    rule3: "🪙 altın coinleri topla, puan kazan",
    rule4: "💜 mor coin: birkaç saniye daha yüksek zıplarsın",
    rule5: "🔵 mavi helikopter tokenı: bir süreliğine helikoptere dönüşürsün, yükselmek için boşluğu <b>basılı tut</b>",
    namePlaceholder: "İsmin (liderlik tablosu için)",
    startBtn: "▶ Başla",
    customizeBtn: "🎨 Karakter",
    leaderboardHeading: "🏆 Liderlik Tablosu",
    customizeHeading: "🎨 Karakteri Özelleştir",
    coinTotalPrefix: "🪙 Toplam: ",
    colorLabel: "Renk",
    hatLabel: "Şapka",
    glassesLabel: "Gözlük",
    closeBtn: "Kapat",
    gameoverHeading: "Oyun bitti!",
    retryBtn: "🔁 Tekrar oyna",
    muteTitle: "Sesi aç/kapat",
    bestPrefix: "En iyi: ",
    powerIndicator: "🚀 Güç modu!",
    scorePrefix: "Skor: ",
    scoreSending: "Skor liderlik tablosuna gönderiliyor…",
    scoreSent: "Skor gönderildi.",
    scoreNameTaken: "Bu isim başka biri tarafından kullanılıyor. Farklı bir isimle tekrar dene.",
    defaultPlayerName: "Oyuncu",
    leaderboardLoading: "Yükleniyor…",
    leaderboardUnavailable: "Liderlik tablosu şu an kullanılamıyor.",
    leaderboardEmpty: "Henüz kimse skor göndermemiş. İlk sen ol!",
    leaderboardLoadError: "Liderlik tablosu şu an yüklenemedi.",
    colorOrange: "Turuncu",
    colorBlue: "Mavi",
    colorGreen: "Yeşil",
    colorRed: "Kırmızı",
    colorGold: "Altın",
    hatNone: "Yok",
    hatCap: "Şapka",
    hatTop: "Silindir Şapka",
    glassesNone: "Yok",
    glassesSun: "Güneş Gözlüğü",
    glassesRound: "Yuvarlak Gözlük",
  },
  en: {
    subtitle: "The character runs on its own. Press space to jump.",
    rule1: "Press <b>space</b> to jump (tap the screen on mobile)",
    rule2: "Dodge spikes and lava pits by jumping over them",
    rule3: "🪙 Collect gold coins to earn points",
    rule4: "💜 Purple coin: jump higher for a few seconds",
    rule5: "🔵 Blue helicopter token: turns you into a helicopter for a while — <b>hold space</b> to rise",
    namePlaceholder: "Your name (for the leaderboard)",
    startBtn: "▶ Start",
    customizeBtn: "🎨 Character",
    leaderboardHeading: "🏆 Leaderboard",
    customizeHeading: "🎨 Customize Character",
    coinTotalPrefix: "🪙 Total: ",
    colorLabel: "Color",
    hatLabel: "Hat",
    glassesLabel: "Glasses",
    closeBtn: "Close",
    gameoverHeading: "Game over!",
    retryBtn: "🔁 Play again",
    muteTitle: "Toggle sound",
    bestPrefix: "Best: ",
    powerIndicator: "🚀 Power mode!",
    scorePrefix: "Score: ",
    scoreSending: "Sending score to the leaderboard…",
    scoreSent: "Score submitted.",
    scoreNameTaken: "This name is already taken by someone else. Try a different name.",
    defaultPlayerName: "Player",
    leaderboardLoading: "Loading…",
    leaderboardUnavailable: "The leaderboard is currently unavailable.",
    leaderboardEmpty: "No one has submitted a score yet. Be the first!",
    leaderboardLoadError: "The leaderboard couldn't be loaded right now.",
    colorOrange: "Orange",
    colorBlue: "Blue",
    colorGreen: "Green",
    colorRed: "Red",
    colorGold: "Gold",
    hatNone: "None",
    hatCap: "Cap",
    hatTop: "Top Hat",
    glassesNone: "None",
    glassesSun: "Sunglasses",
    glassesRound: "Round Glasses",
  },
  ar: {
    subtitle: "الشخصية تركض تلقائيًا. اضغط المسافة للقفز.",
    rule1: "اضغط <b>مسافة</b> للقفز (انقر الشاشة على الجوال)",
    rule2: "تفادَ الأشواك وحفر الحمم بالقفز فوقها",
    rule3: "🪙 اجمع العملات الذهبية لكسب النقاط",
    rule4: "💜 عملة بنفسجية: تقفز أعلى لبضع ثوانٍ",
    rule5: "🔵 رمز الهليكوبتر الأزرق: تتحول إلى هليكوبتر لفترة — <b>اضغط مع الاستمرار على المسافة</b> للصعود",
    namePlaceholder: "اسمك (للوحة المتصدرين)",
    startBtn: "▶ ابدأ",
    customizeBtn: "🎨 الشخصية",
    leaderboardHeading: "🏆 لوحة المتصدرين",
    customizeHeading: "🎨 تخصيص الشخصية",
    coinTotalPrefix: "🪙 الإجمالي: ",
    colorLabel: "اللون",
    hatLabel: "القبعة",
    glassesLabel: "النظارات",
    closeBtn: "إغلاق",
    gameoverHeading: "انتهت اللعبة!",
    retryBtn: "🔁 العب مجددًا",
    muteTitle: "تشغيل/كتم الصوت",
    bestPrefix: "الأفضل: ",
    powerIndicator: "🚀 وضع القوة!",
    scorePrefix: "النتيجة: ",
    scoreSending: "جارٍ إرسال النتيجة إلى لوحة المتصدرين…",
    scoreSent: "تم إرسال النتيجة.",
    scoreNameTaken: "هذا الاسم مستخدم بالفعل من قبل شخص آخر. جرّب اسمًا مختلفًا.",
    defaultPlayerName: "لاعب",
    leaderboardLoading: "جارٍ التحميل…",
    leaderboardUnavailable: "لوحة المتصدرين غير متاحة حاليًا.",
    leaderboardEmpty: "لم يرسل أحد نتيجة بعد. كن الأول!",
    leaderboardLoadError: "تعذر تحميل لوحة المتصدرين حاليًا.",
    colorOrange: "برتقالي",
    colorBlue: "أزرق",
    colorGreen: "أخضر",
    colorRed: "أحمر",
    colorGold: "ذهبي",
    hatNone: "بدون",
    hatCap: "قبعة",
    hatTop: "قبعة عالية",
    glassesNone: "بدون",
    glassesSun: "نظارة شمسية",
    glassesRound: "نظارة دائرية",
  },
  zh: {
    subtitle: "角色会自动奔跑。按空格键跳跃。",
    rule1: "按<b>空格键</b>跳跃(手机上点击屏幕)",
    rule2: "跳过尖刺和岩浆坑来躲避",
    rule3: "🪙 收集金币来获得分数",
    rule4: "💜 紫色金币：接下来几秒跳得更高",
    rule5: "🔵 蓝色直升机代币：短时间内变身直升机——<b>按住空格键</b>上升",
    namePlaceholder: "你的名字（用于排行榜）",
    startBtn: "▶ 开始",
    customizeBtn: "🎨 角色",
    leaderboardHeading: "🏆 排行榜",
    customizeHeading: "🎨 自定义角色",
    coinTotalPrefix: "🪙 总计：",
    colorLabel: "颜色",
    hatLabel: "帽子",
    glassesLabel: "眼镜",
    closeBtn: "关闭",
    gameoverHeading: "游戏结束！",
    retryBtn: "🔁 再玩一次",
    muteTitle: "开启/关闭声音",
    bestPrefix: "最佳：",
    powerIndicator: "🚀 强化模式！",
    scorePrefix: "分数：",
    scoreSending: "正在提交分数到排行榜…",
    scoreSent: "分数已提交。",
    scoreNameTaken: "这个名字已被别人使用，换个名字试试吧。",
    defaultPlayerName: "玩家",
    leaderboardLoading: "加载中…",
    leaderboardUnavailable: "排行榜目前不可用。",
    leaderboardEmpty: "还没有人提交分数，快来当第一个！",
    leaderboardLoadError: "排行榜暂时无法加载。",
    colorOrange: "橙色",
    colorBlue: "蓝色",
    colorGreen: "绿色",
    colorRed: "红色",
    colorGold: "金色",
    hatNone: "无",
    hatCap: "鸭舌帽",
    hatTop: "高礼帽",
    glassesNone: "无",
    glassesSun: "墨镜",
    glassesRound: "圆框眼镜",
  },
  fr: {
    subtitle: "Le personnage court tout seul. Appuie sur espace pour sauter.",
    rule1: "Appuie sur <b>espace</b> pour sauter (touche l'écran sur mobile)",
    rule2: "Évite les pics et les fosses de lave en sautant par-dessus",
    rule3: "🪙 Ramasse des pièces d'or pour marquer des points",
    rule4: "💜 Pièce violette : tu sautes plus haut pendant quelques secondes",
    rule5: "🔵 Jeton hélicoptère bleu : tu te transformes en hélicoptère pendant un moment — <b>maintiens espace</b> pour monter",
    namePlaceholder: "Ton nom (pour le classement)",
    startBtn: "▶ Démarrer",
    customizeBtn: "🎨 Personnage",
    leaderboardHeading: "🏆 Classement",
    customizeHeading: "🎨 Personnaliser le personnage",
    coinTotalPrefix: "🪙 Total : ",
    colorLabel: "Couleur",
    hatLabel: "Chapeau",
    glassesLabel: "Lunettes",
    closeBtn: "Fermer",
    gameoverHeading: "Partie terminée !",
    retryBtn: "🔁 Rejouer",
    muteTitle: "Activer/couper le son",
    bestPrefix: "Meilleur : ",
    powerIndicator: "🚀 Mode puissance !",
    scorePrefix: "Score : ",
    scoreSending: "Envoi du score au classement…",
    scoreSent: "Score envoyé.",
    scoreNameTaken: "Ce nom est déjà pris par quelqu'un d'autre. Essaie un autre nom.",
    defaultPlayerName: "Joueur",
    leaderboardLoading: "Chargement…",
    leaderboardUnavailable: "Le classement est actuellement indisponible.",
    leaderboardEmpty: "Personne n'a encore envoyé de score. Sois le premier !",
    leaderboardLoadError: "Le classement n'a pas pu être chargé pour l'instant.",
    colorOrange: "Orange",
    colorBlue: "Bleu",
    colorGreen: "Vert",
    colorRed: "Rouge",
    colorGold: "Or",
    hatNone: "Aucun",
    hatCap: "Casquette",
    hatTop: "Haut-de-forme",
    glassesNone: "Aucune",
    glassesSun: "Lunettes de soleil",
    glassesRound: "Lunettes rondes",
  },
};
let currentLang = localStorage.getItem(LANG_KEY) || "tr";
function t(key) {
  return (I18N[currentLang] && I18N[currentLang][key]) ?? I18N.tr[key] ?? key;
}

// ---- DOM ----
const scoreEl = document.getElementById("score");
const coinsEl = document.getElementById("coins");
const bestEl = document.getElementById("best");
const powerIndicator = document.getElementById("power-indicator");
const startScreen = document.getElementById("start-screen");
const gameoverScreen = document.getElementById("gameover-screen");
const startBtn = document.getElementById("start-btn");
const finalDistanceEl = document.getElementById("final-distance");
const finalCoinsEl = document.getElementById("final-coins");
const finalBestEl = document.getElementById("final-best");
const scoreStatusEl = document.getElementById("score-status");
const retryBtn = document.getElementById("retry-btn");
const playerNameInput = document.getElementById("player-name");
const leaderboardScreen = document.getElementById("leaderboard-screen");
const leaderboardList = document.getElementById("leaderboard-list");
const leaderboardBtn = document.getElementById("leaderboard-btn");
const gameoverLeaderboardBtn = document.getElementById("gameover-leaderboard-btn");
const leaderboardCloseBtn = document.getElementById("leaderboard-close-btn");
const customizeBtn = document.getElementById("customize-btn");
const customizeScreen = document.getElementById("customize-screen");
const customizeCloseBtn = document.getElementById("customize-close-btn");
const totalCoinsEl = document.getElementById("total-coins");
const colorOptionsEl = document.getElementById("color-options");
const hatOptionsEl = document.getElementById("hat-options");
const glassesOptionsEl = document.getElementById("glasses-options");
const muteBtn = document.getElementById("mute-btn");
const langSelect = document.getElementById("lang-select");

const BEST_KEY = "sesliParkurBest";
const NAME_KEY = "sesliParkurName";
const MUTE_KEY = "irMuted";
const PROFILE_KEY = "irProfile";

// ---- Karakter profili (kalıcı coin + özelleştirme) ----
function loadProfile() {
  try {
    const raw = JSON.parse(localStorage.getItem(PROFILE_KEY));
    if (raw && raw.unlocked && raw.equipped) return raw;
  } catch (err) {
    /* bozuk veri, varsayılana dön */
  }
  return {
    totalCoins: 0,
    unlocked: { colors: ["orange"], hats: ["none"], glasses: ["none"] },
    equipped: { color: "orange", hat: "none", glasses: "none" },
  };
}
function saveProfile() {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}
let profile = loadProfile();

function renderOptions(container, list, unlockedIds, equippedId, onClick) {
  container.innerHTML = "";
  for (const item of list) {
    const btn = document.createElement("button");
    const owned = unlockedIds.includes(item.id);
    const name = t(item.nameKey);
    btn.textContent = owned ? name : `${name} (🪙${item.cost})`;
    btn.className = equippedId === item.id ? "equipped" : owned ? "" : "locked";
    btn.addEventListener("click", () => onClick(item.id));
    container.appendChild(btn);
  }
}

function equip(unlockedKey, equippedKey, id, list) {
  const item = list.find((i) => i.id === id);
  const unlockedIds = profile.unlocked[unlockedKey];
  if (!unlockedIds.includes(id)) {
    if (profile.totalCoins < item.cost) return; // yetersiz coin
    profile.totalCoins -= item.cost;
    unlockedIds.push(id);
  }
  profile.equipped[equippedKey] = id;
  saveProfile();
  renderCustomizeScreen();
}

function renderCustomizeScreen() {
  totalCoinsEl.textContent = profile.totalCoins;
  renderOptions(colorOptionsEl, COLORS, profile.unlocked.colors, profile.equipped.color, (id) =>
    equip("colors", "color", id, COLORS)
  );
  renderOptions(hatOptionsEl, HATS, profile.unlocked.hats, profile.equipped.hat, (id) =>
    equip("hats", "hat", id, HATS)
  );
  renderOptions(glassesOptionsEl, GLASSES, profile.unlocked.glasses, profile.equipped.glasses, (id) =>
    equip("glasses", "glasses", id, GLASSES)
  );
}

// ---- Dil değişimi: tüm data-i18n etiketli elemanları ve dinamik metinleri günceller ----
function applyLanguage(lang) {
  currentLang = lang;
  localStorage.setItem(LANG_KEY, lang);
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  langSelect.value = lang;

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.innerHTML = t(el.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  document.querySelectorAll("[data-i18n-title]").forEach((el) => {
    el.title = t(el.dataset.i18nTitle);
  });

  bestEl.textContent = t("bestPrefix") + (localStorage.getItem(BEST_KEY) || 0) + " m";
  renderCustomizeScreen();
  if (!leaderboardScreen.classList.contains("hidden")) loadLeaderboard();
}

// ---- Liderlik tablosu (Firestore) ----
// Her isim "players" koleksiyonunda tek bir belge: aynı isim başka biri tarafından
// alınamasın diye bu cihaza özel rastgele bir "ownerToken" ile eşleştirilir ve bu
// eşleşme Firestore güvenlik kurallarında da doğrulanır (bkz. README).
let db = null;
try {
  firebase.initializeApp(FIREBASE_CONFIG);
  db = firebase.firestore();
} catch (err) {
  console.warn("Liderlik tablosu kullanılamıyor:", err);
}

const OWNER_TOKEN_KEY = "irOwnerToken";
function getOwnerToken() {
  let token = localStorage.getItem(OWNER_TOKEN_KEY);
  if (!token) {
    token = (crypto.randomUUID && crypto.randomUUID()) || Date.now().toString(36) + Math.random().toString(36).slice(2);
    localStorage.setItem(OWNER_TOKEN_KEY, token);
  }
  return token;
}
const ownerToken = getOwnerToken();

function normalizeName(name) {
  return name.trim().toLowerCase().replace(/[/.]/g, "").slice(0, 20) || "oyuncu";
}

function submitScore(name, meters) {
  if (!db) return Promise.resolve("");
  const ref = db.collection("players").doc(normalizeName(name));
  return ref
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return ref.set({ ownerToken, displayName: name, bestScore: meters, updatedAt: Date.now() }).then(() => "scoreSent");
      }
      const data = doc.data();
      if (data.ownerToken !== ownerToken) return "scoreNameTaken";
      if (meters > (data.bestScore || 0)) {
        return ref.set({ ownerToken, displayName: name, bestScore: meters, updatedAt: Date.now() }).then(() => "scoreSent");
      }
      return "scoreSent";
    })
    .catch((err) => {
      console.warn("Skor gönderilemedi:", err);
      return "";
    });
}

function loadLeaderboard() {
  leaderboardList.innerHTML = `<li class="leaderboard-status">${t("leaderboardLoading")}</li>`;
  if (!db) {
    leaderboardList.innerHTML = `<li class="leaderboard-status">${t("leaderboardUnavailable")}</li>`;
    return;
  }
  db.collection("players")
    .orderBy("bestScore", "desc")
    .limit(10)
    .get()
    .then((snapshot) => {
      if (snapshot.empty) {
        leaderboardList.innerHTML = `<li class="leaderboard-status">${t("leaderboardEmpty")}</li>`;
        return;
      }
      leaderboardList.innerHTML = snapshot.docs
        .map((doc) => {
          const d = doc.data();
          return `<li><span>${escapeHtml(d.displayName)}</span><span>${d.bestScore} m</span></li>`;
        })
        .join("");
    })
    .catch((err) => {
      console.warn("Liderlik tablosu yüklenemedi:", err);
      leaderboardList.innerHTML = `<li class="leaderboard-status">${t("leaderboardLoadError")}</li>`;
    });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ---- Ses (Web Audio ile basit efektler, dosya gerektirmez) ----
let audioCtx = null;
let masterGain = null;
let muted = localStorage.getItem(MUTE_KEY) === "1";
function ensureAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = muted ? 0 : 1;
    masterGain.connect(audioCtx.destination);
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
}
function toggleMute() {
  muted = !muted;
  localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  if (masterGain) masterGain.gain.value = muted ? 0 : 1;
  muteBtn.textContent = muted ? "🔇" : "🔊";
}
function tone(freq, dur, type, gainLevel, delay = 0) {
  if (!audioCtx) return;
  const t0 = audioCtx.currentTime + delay;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(gainLevel, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  osc.connect(gain).connect(masterGain);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}
function sfxJump() {
  if (!audioCtx) return;
  const t0 = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(300, t0);
  osc.frequency.exponentialRampToValueAtTime(680, t0 + 0.12);
  gain.gain.setValueAtTime(0.12, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.13);
  osc.connect(gain).connect(masterGain);
  osc.start(t0);
  osc.stop(t0 + 0.15);
}
function sfxCoin() {
  tone(1046, 0.09, "sine", 0.18);
  tone(1568, 0.09, "sine", 0.14, 0.06);
}
function sfxPower() {
  tone(523, 0.1, "square", 0.16);
  tone(659, 0.1, "square", 0.16, 0.09);
  tone(784, 0.16, "square", 0.16, 0.18);
}
function sfxHeli() {
  tone(440, 0.12, "sawtooth", 0.14);
  tone(660, 0.16, "sawtooth", 0.14, 0.1);
}
function sfxHit() {
  if (!audioCtx) return;
  const t0 = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(220, t0);
  osc.frequency.exponentialRampToValueAtTime(50, t0 + 0.4);
  gain.gain.setValueAtTime(0.2, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.4);
  osc.connect(gain).connect(masterGain);
  osc.start(t0);
  osc.stop(t0 + 0.42);
}

// ---- Durum ----
let player, obstacles, coins, particles, distance, speed, running;
let distanceSinceObstacle, distanceSinceCoin, distanceSincePipe;
let coinCount = 0;
let boostUntil = 0;
let heliUntil = 0;
let scrollX = 0; // arkaplan/dekor kayma miktarı (her karede hıza göre birikir, ışınlanma yapmaz)
let spaceHeld = false;

function resetState() {
  player = {
    y: GROUND_Y,
    vy: 0,
    grounded: true,
    squash: 1,
    mode: "run",
    transitioning: false,
    transitionFrom: 0,
    transitionTo: 0,
    transitionStart: 0,
  };
  obstacles = [];
  coins = [];
  particles = [];
  distance = 0;
  speed = BASE_SPEED;
  running = true;
  coinCount = 0;
  boostUntil = 0;
  heliUntil = 0;
  scrollX = 0;
  distanceSinceObstacle = nextObstacleDistance();
  distanceSinceCoin = nextCoinDistance();
  distanceSincePipe = nextPipeDistance();
}

function isBoosted() {
  return performance.now() < boostUntil;
}

function jump() {
  if (player.mode !== "run" || !player.grounded) return;
  const v = JUMP_V * (isBoosted() ? BOOST_MULT : 1);
  player.vy = -v;
  player.grounded = false;
  player.squash = 1.3;
  sfxJump();
}

function beginTransform(toMode, targetY) {
  player.mode = toMode;
  player.transitioning = true;
  player.transitionFrom = player.y;
  player.transitionTo = targetY;
  player.transitionStart = performance.now();
  player.vy = 0;
  addParticle(PLAYER_X + 15, player.y - 34, toMode === "heli" ? "🚁" : "🏃", "#ffffff");
}

// ---- Yer engelleri ----
function spawnObstacle() {
  const r = Math.random();
  const biome = getBiome(distance);
  if (r < 0.3) {
    const width = 50 + Math.random() * 70;
    obstacles.push({ type: "lava", x: W + 20, width, height: 0, biome });
  } else if (r < 0.65) {
    const heights = [30, 45, 65, 90, 120];
    const height = heights[Math.floor(Math.random() * heights.length)];
    obstacles.push({ type: "spike", x: W + 20, width: 26, height, biome });
  } else {
    const heights = [35, 55, 80];
    const height = heights[Math.floor(Math.random() * heights.length)];
    const width = 34 + Math.random() * 20;
    obstacles.push({ type: "block", x: W + 20, width, height, biome });
  }
}
function nextObstacleDistance() {
  return 70 + Math.random() * 100;
}

// ---- Helikopter borular ----
function spawnPipe() {
  const gapCenter = CEILING_Y + PIPE_GAP / 2 + 20 + Math.random() * (GROUND_Y - CEILING_Y - PIPE_GAP - 40);
  obstacles.push({
    type: "pipe",
    x: W + 20,
    width: 54,
    gapTop: gapCenter - PIPE_GAP / 2,
    gapBottom: gapCenter + PIPE_GAP / 2,
  });
}
function nextPipeDistance() {
  return 90 + Math.random() * 70; // daha seyrek, daha çok tepki süresi
}

// ---- Coinler ----
function spawnCoins() {
  if (player.mode === "heli") {
    const isPower = Math.random() < 0.15;
    const y = CEILING_Y + 30 + Math.random() * (GROUND_Y - CEILING_Y - 60);
    if (isPower) {
      coins.push({ x: W + 20, y, type: "power", taken: false });
      return;
    }
    const count = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      coins.push({ x: W + 20 + i * 28, y, type: "coin", taken: false });
    }
    return;
  }
  const roll = Math.random();
  if (roll < 0.08) {
    coins.push({ x: W + 20, y: GROUND_Y - 130, type: "heli", taken: false });
    return;
  }
  if (roll < 0.2) {
    coins.push({ x: W + 20, y: GROUND_Y - 150, type: "power", taken: false });
    return;
  }
  const heightAbove = [30, 80, 140][Math.floor(Math.random() * 3)];
  const count = 1 + Math.floor(Math.random() * 3);
  for (let i = 0; i < count; i++) {
    coins.push({ x: W + 20 + i * 28, y: GROUND_Y - heightAbove, type: "coin", taken: false });
  }
}
function nextCoinDistance() {
  return 90 + Math.random() * 130;
}

function addParticle(x, y, text, color) {
  particles.push({ x, y, vy: -1.2, alpha: 1, text, color });
}

// ---- Güncelleme ----
function update(time) {
  // helikopter modu süresi dolunca normale dön (giriş, mavi tokeni toplayınca tetiklenir)
  if (player.mode === "heli" && !player.transitioning && performance.now() > heliUntil) {
    beginTransform("run", GROUND_Y);
    distanceSinceObstacle = nextObstacleDistance();
    distanceSinceCoin = nextCoinDistance();
  }

  // fizik
  if (player.transitioning) {
    const elapsed = performance.now() - player.transitionStart;
    const t = Math.min(1, elapsed / TRANSFORM_DURATION);
    player.y = player.transitionFrom + (player.transitionTo - player.transitionFrom) * easeInOutQuad(t);
    if (t >= 1) {
      player.transitioning = false;
      player.y = player.transitionTo;
      player.grounded = player.mode === "run";
    }
  } else if (player.mode === "run") {
    player.vy += GRAVITY;
    if (player.vy > FALL_MAX_SPEED) player.vy = FALL_MAX_SPEED;
    player.y += player.vy;
    if (player.y >= GROUND_Y) {
      player.y = GROUND_Y;
      player.vy = 0;
      player.grounded = true;
    }
    if (player.y < CEILING_Y) {
      player.y = CEILING_Y;
      if (player.vy < 0) player.vy = 0;
    }
  } else {
    if (spaceHeld) player.vy -= HELI_THRUST;
    else player.vy += HELI_GRAVITY;
    player.vy = Math.max(HELI_MAX_UP, Math.min(HELI_MAX_DOWN, player.vy));
    player.y += player.vy;
    player.y = Math.max(CEILING_Y, Math.min(GROUND_Y, player.y));
  }
  player.squash += (1 - player.squash) * 0.2;

  // hız zamanla artar
  speed = Math.min(MAX_SPEED, BASE_SPEED + distance * SPEED_PER_METER);
  distance += speed * 0.05;
  scrollX += speed;

  // engel/boru üretimi ve kaydırma
  if (player.mode === "run") {
    distanceSinceObstacle -= speed * 0.05;
    if (distanceSinceObstacle <= 0) {
      spawnObstacle();
      distanceSinceObstacle = nextObstacleDistance();
    }
  } else {
    distanceSincePipe -= speed * 0.05;
    if (distanceSincePipe <= 0) {
      spawnPipe();
      distanceSincePipe = nextPipeDistance();
    }
  }
  for (const o of obstacles) o.x -= speed;
  obstacles = obstacles.filter((o) => o.x + o.width > -5);

  // coin üretimi ve kaydırma
  distanceSinceCoin -= speed * 0.05;
  if (distanceSinceCoin <= 0) {
    spawnCoins();
    distanceSinceCoin = nextCoinDistance();
  }
  for (const c of coins) c.x -= speed;
  coins = coins.filter((c) => c.x > -20 && !c.taken);

  // parçacıklar (coin/güç toplama efekti)
  for (const p of particles) {
    p.y += p.vy;
    p.alpha -= 0.025;
  }
  particles = particles.filter((p) => p.alpha > 0);

  // oyuncunun kaba çarpışma kutusu (helikopter görseli daha küçük olduğu için kutusu da küçük)
  const pLeft = PLAYER_X + PLAYER_SIZE * 0.3;
  const pRight = PLAYER_X + PLAYER_SIZE * 0.7;
  const pTop = player.mode === "heli" ? player.y - 20 : player.y - 56;
  const pBottom = player.mode === "heli" ? player.y + 10 : player.y;

  // engel/boru çarpışması (dönüşüm sırasında kısa süreli dokunulmazlık)
  if (!player.transitioning) {
    for (const o of obstacles) {
      const overlapX = pRight > o.x && pLeft < o.x + o.width;
      if (!overlapX) continue;
      if (o.type === "spike" || o.type === "block") {
        const oTop = GROUND_Y - o.height;
        if (player.y > oTop) {
          endGame();
          return;
        }
      } else if (o.type === "lava") {
        if (player.grounded) {
          endGame();
          return;
        }
      } else if (o.type === "pipe") {
        if (pTop < o.gapTop || pBottom > o.gapBottom) {
          endGame();
          return;
        }
      }
    }
  }

  // coin toplama
  for (const c of coins) {
    if (c.taken) continue;
    const overlapX = pRight > c.x - 12 && pLeft < c.x + 12;
    const overlapY = pBottom > c.y - 14 && pTop < c.y + 14;
    if (overlapX && overlapY) {
      c.taken = true;
      if (c.type === "power") {
        boostUntil = performance.now() + BOOST_DURATION;
        addParticle(c.x, c.y, "GÜÇ!", "#c48bff");
        sfxPower();
      } else if (c.type === "heli") {
        heliUntil = performance.now() + HELI_TOKEN_DURATION;
        if (player.mode !== "heli") {
          beginTransform("heli", GROUND_Y - 150);
          distanceSincePipe = nextPipeDistance();
          distanceSinceCoin = nextCoinDistance();
        }
        addParticle(c.x, c.y, "🚁", "#8ad4ff");
        sfxHeli();
      } else {
        coinCount++;
        addParticle(c.x, c.y, "+1", "#ffd35c");
        sfxCoin();
      }
    }
  }
}

// ---- Çizim ----
function draw(time) {
  const { from, to, t } = getBiomeBlend(distance);
  ctx.clearRect(0, 0, W, H);

  // gökyüzü (bölge sınırında yumuşak geçiş)
  const skyFrom = BIOME_SKY[from];
  const skyTo = BIOME_SKY[to];
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, lerpColor(skyFrom[0], skyTo[0], t));
  grad.addColorStop(1, lerpColor(skyFrom[1], skyTo[1], t));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // bulutlar
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  const cloudOffset = (time * 0.004) % 200;
  for (let i = -1; i < W / 200 + 1; i++) {
    const cx = i * 200 - cloudOffset;
    ctx.beginPath();
    ctx.ellipse(cx, 60, 40, 16, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + 30, 70, 30, 14, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // uzak tepeler (paralaks, bölge sınırında yumuşak geçiş)
  ctx.fillStyle = lerpColor(BIOME_HILL[from], BIOME_HILL[to], t);
  const hillOffset = (scrollX * 0.35) % 120;
  for (let i = -1; i < W / 120 + 1; i++) {
    const hx = i * 120 - hillOffset;
    ctx.beginPath();
    ctx.ellipse(hx, GROUND_Y + 10, 90, 40, 0, Math.PI, 0);
    ctx.fill();
  }

  // yakın plan bölge dekoru (ağaç/lamba/fabrika) — sınırda yumuşak solma ile karışır
  // (artık her bölge aynı hızda ve kendi aralığına göre kaydığı için katmanlar
  // birbirine göre kaymıyor, sadece solarak geçiş yapıyor)
  ctx.globalAlpha = 1 - t;
  drawBiomeDecor(from, time);
  if (t > 0) {
    ctx.globalAlpha = t;
    drawBiomeDecor(to, time);
  }
  ctx.globalAlpha = 1;

  // zemin
  ctx.fillStyle = "#3a4568";
  ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
  ctx.fillStyle = "#35d0ba";
  ctx.fillRect(0, GROUND_Y, W, 3);

  // engeller / borular
  for (const o of obstacles) {
    if (o.type === "spike") {
      const top = GROUND_Y - o.height;
      const colors = OBSTACLE_PALETTE[o.biome].spike;
      const spikeGrad = ctx.createLinearGradient(0, top, 0, GROUND_Y);
      spikeGrad.addColorStop(0, colors[0]);
      spikeGrad.addColorStop(1, colors[1]);
      ctx.fillStyle = spikeGrad;
      ctx.strokeStyle = "rgba(0,0,0,0.35)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(o.x, GROUND_Y);
      ctx.lineTo(o.x + o.width / 2, top);
      ctx.lineTo(o.x + o.width, GROUND_Y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (o.type === "block") {
      const top = GROUND_Y - o.height;
      const colors = OBSTACLE_PALETTE[o.biome].block;
      const blockGrad = ctx.createLinearGradient(0, top, 0, GROUND_Y);
      blockGrad.addColorStop(0, colors[0]);
      blockGrad.addColorStop(1, colors[1]);
      ctx.fillStyle = blockGrad;
      ctx.strokeStyle = "rgba(0,0,0,0.35)";
      ctx.lineWidth = 2;
      ctx.fillRect(o.x, top, o.width, o.height);
      ctx.strokeRect(o.x, top, o.width, o.height);
    } else if (o.type === "lava") {
      const bubble = Math.sin(time * 0.006 + o.x * 0.1) * 3;
      const lavaGrad = ctx.createLinearGradient(0, GROUND_Y, 0, H);
      lavaGrad.addColorStop(0, "#ffcf5c");
      lavaGrad.addColorStop(0.4, "#ff7a2e");
      lavaGrad.addColorStop(1, "#8f1c0f");
      ctx.fillStyle = lavaGrad;
      ctx.fillRect(o.x, GROUND_Y + bubble, o.width, H - GROUND_Y - bubble);
      ctx.fillStyle = "#ffdd8a";
      for (let i = 0; i < o.width; i += 18) {
        const by = GROUND_Y + 6 + Math.sin(time * 0.008 + o.x + i) * 4;
        ctx.beginPath();
        ctx.arc(o.x + i + 9, by, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (o.type === "pipe") {
      const g = ctx.createLinearGradient(o.x, 0, o.x + o.width, 0);
      g.addColorStop(0, "#3fae4c");
      g.addColorStop(1, "#2c7d38");
      ctx.fillStyle = g;
      ctx.fillRect(o.x, 0, o.width, o.gapTop);
      ctx.fillRect(o.x, o.gapBottom, o.width, H - o.gapBottom);
      ctx.strokeStyle = "rgba(0,0,0,0.3)";
      ctx.lineWidth = 2;
      ctx.strokeRect(o.x, 0, o.width, o.gapTop);
      ctx.strokeRect(o.x, o.gapBottom, o.width, H - o.gapBottom);
    }
  }

  // coinler
  for (const c of coins) {
    const spin = Math.abs(Math.cos(time * 0.006 + c.x * 0.05));
    const radius = 11;
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.scale(Math.max(0.25, spin), 1);
    const coinGrad = ctx.createRadialGradient(0, 0, 1, 0, 0, radius);
    if (c.type === "power") {
      coinGrad.addColorStop(0, "#e6ccff");
      coinGrad.addColorStop(1, "#8b3fe0");
      ctx.shadowColor = "#c48bff";
      ctx.shadowBlur = 14;
    } else if (c.type === "heli") {
      coinGrad.addColorStop(0, "#d8f3ff");
      coinGrad.addColorStop(1, "#2f8fdb");
      ctx.shadowColor = "#8ad4ff";
      ctx.shadowBlur = 14;
    } else {
      coinGrad.addColorStop(0, "#fff3c4");
      coinGrad.addColorStop(1, "#e0a721");
      ctx.shadowColor = "#ffd35c";
      ctx.shadowBlur = 8;
    }
    ctx.fillStyle = coinGrad;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    if (c.type === "heli") {
      ctx.strokeStyle = "#0b3350";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-7, 0);
      ctx.lineTo(7, 0);
      ctx.moveTo(0, -7);
      ctx.lineTo(0, 7);
      ctx.stroke();
    }
    ctx.restore();
  }

  // karakter
  drawPlayer(time);

  // parçacıklar (+1 / GÜÇ!)
  ctx.textAlign = "center";
  ctx.font = "bold 14px Segoe UI, sans-serif";
  for (const p of particles) {
    ctx.fillStyle = p.color;
    ctx.globalAlpha = Math.max(0, p.alpha);
    ctx.fillText(p.text, p.x, p.y);
  }
  ctx.globalAlpha = 1;
}

function drawBiomeDecor(biome, time) {
  // her desenin kayma periyodu kendi aralığına (spacing) eşit olmalı,
  // yoksa döngü noktasında (bir ağaç/direk sahneden çıkarken) sıçrama olur
  const scroll = scrollX * 0.7;
  if (biome === "forest") {
    const offset = scroll % 140;
    ctx.fillStyle = "#123120";
    for (let i = -1; i < W / 140 + 1; i++) {
      const x = i * 140 - offset;
      ctx.fillRect(x - 3, GROUND_Y - 70, 6, 70);
      ctx.beginPath();
      ctx.moveTo(x - 24, GROUND_Y - 60);
      ctx.lineTo(x, GROUND_Y - 110);
      ctx.lineTo(x + 24, GROUND_Y - 60);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x - 19, GROUND_Y - 82);
      ctx.lineTo(x, GROUND_Y - 128);
      ctx.lineTo(x + 19, GROUND_Y - 82);
      ctx.closePath();
      ctx.fill();
    }
  } else if (biome === "park") {
    const offset = scroll % 180;
    for (let i = -1; i < W / 180 + 1; i++) {
      const x = i * 180 - offset;
      ctx.fillStyle = "#1c2942";
      ctx.fillRect(x - 2, GROUND_Y - 90, 4, 90);
      ctx.fillStyle = "#ffe9a8";
      ctx.beginPath();
      ctx.arc(x, GROUND_Y - 95, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#2c5170";
      ctx.fillRect(x - 26, GROUND_Y - 14, 30, 4);
    }
  } else if (biome === "factory") {
    const offset = scroll % 160;
    for (let i = -1; i < W / 160 + 1; i++) {
      const x = i * 160 - offset;
      const hgt = 90 + (i % 3) * 20;
      ctx.fillStyle = "#241f22";
      ctx.fillRect(x - 30, GROUND_Y - hgt, 60, hgt);
      ctx.fillStyle = "rgba(255, 210, 120, 0.55)";
      for (let wy = GROUND_Y - hgt + 14; wy < GROUND_Y - 12; wy += 22) {
        ctx.fillRect(x - 18, wy, 10, 12);
        ctx.fillRect(x + 8, wy, 10, 12);
      }
      ctx.fillStyle = "#1a1618";
      ctx.fillRect(x + 18, GROUND_Y - hgt - 24, 10, 24);
      ctx.fillStyle = "rgba(160,160,170,0.35)";
      for (let s = 0; s < 3; s++) {
        const sy = GROUND_Y - hgt - 24 - s * 16 - (time * 0.02) % 16;
        ctx.beginPath();
        ctx.arc(x + 23, sy, 6 + s * 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

function drawPlayer(time) {
  if (player.mode === "heli") {
    drawHeli(time);
    return;
  }

  const bodyH = PLAYER_SIZE * player.squash;
  const bodyW = PLAYER_SIZE * 0.8;
  const bodyY = player.y - bodyH;
  // havadayken hafifçe ileri kayar, sanki ileri doğru zıplayıp düşüyormuş gibi görünsün
  const airT = Math.min(1, (GROUND_Y - player.y) / 150);
  const forwardOffset = airT * 14;
  const bodyX = PLAYER_X + forwardOffset;

  // yerdeki gölge (havada küçülür, karakterin altında kalır)
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath();
  ctx.ellipse(PLAYER_X + forwardOffset + bodyW / 2, GROUND_Y + 4, 16 * (1 - airT * 0.6), 5 * (1 - airT * 0.6), 0, 0, Math.PI * 2);
  ctx.fill();

  const boosted = isBoosted();
  const colorDef = COLORS.find((c) => c.id === profile.equipped.color) || COLORS[0];
  const bodyGrad = ctx.createLinearGradient(bodyX, bodyY, bodyX, bodyY + bodyH);
  if (boosted) {
    bodyGrad.addColorStop(0, "#e6ccff");
    bodyGrad.addColorStop(1, "#8b3fe0");
  } else {
    bodyGrad.addColorStop(0, colorDef.top);
    bodyGrad.addColorStop(1, colorDef.bottom);
  }

  // gövde
  ctx.fillStyle = bodyGrad;
  roundRect(ctx, bodyX, bodyY, bodyW, bodyH, 9);
  ctx.fill();

  const legColor = boosted ? "#8b3fe0" : colorDef.bottom;
  // koşu temposu: gerçek bir insan adımı gibi, hız arttıkça çok da çılgınlaşmasın
  const runOmega = 0.011 * Math.sqrt(speed / BASE_SPEED);

  if (player.grounded) {
    const legPhase = Math.sin(time * runOmega) * 10;
    const hipY = player.y - 12;
    const kneeY = player.y - 5;

    ctx.strokeStyle = legColor;
    ctx.lineWidth = 5;
    ctx.lineCap = "round";

    // sol bacak (diz bükümlü)
    let hipX = bodyX + 7;
    let footX = hipX + legPhase;
    ctx.beginPath();
    ctx.moveTo(hipX, hipY);
    ctx.quadraticCurveTo(hipX + legPhase * 0.5, kneeY, footX, player.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(footX - 4, player.y);
    ctx.lineTo(footX + 5, player.y);
    ctx.stroke();

    // sağ bacak (ters fazda)
    hipX = bodyX + bodyW - 7;
    footX = hipX - legPhase;
    ctx.beginPath();
    ctx.moveTo(hipX, hipY);
    ctx.quadraticCurveTo(hipX - legPhase * 0.5, kneeY, footX, player.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(footX - 5, player.y);
    ctx.lineTo(footX + 4, player.y);
    ctx.stroke();

    // kollar (bacakların tersi yönde sallanır)
    ctx.lineWidth = 4;
    const shoulderY = bodyY + 9;
    ctx.beginPath();
    ctx.moveTo(bodyX + 3, shoulderY);
    ctx.lineTo(bodyX + 3 - legPhase * 0.6, shoulderY + 13);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(bodyX + bodyW - 3, shoulderY);
    ctx.lineTo(bodyX + bodyW - 3 + legPhase * 0.6, shoulderY + 13);
    ctx.stroke();
  } else {
    // havadayken bacaklar toplu, kollar yukarı kalkık
    ctx.strokeStyle = legColor;
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(bodyX + 8, player.y - 4);
    ctx.lineTo(bodyX + 4, player.y + 6);
    ctx.moveTo(bodyX + bodyW - 8, player.y - 4);
    ctx.lineTo(bodyX + bodyW - 4, player.y + 6);
    ctx.stroke();

    ctx.lineWidth = 4;
    const shoulderY = bodyY + 9;
    ctx.beginPath();
    ctx.moveTo(bodyX + 3, shoulderY);
    ctx.lineTo(bodyX - 5, shoulderY - 11);
    ctx.moveTo(bodyX + bodyW - 3, shoulderY);
    ctx.lineTo(bodyX + bodyW + 5, shoulderY - 11);
    ctx.stroke();
  }

  // kafa
  const headCx = bodyX + bodyW * 0.55;
  const headCy = bodyY - 9;
  ctx.fillStyle = boosted ? "#c48bff" : colorDef.top;
  ctx.beginPath();
  ctx.arc(headCx, headCy, 13, 0, Math.PI * 2);
  ctx.fill();

  // saç
  ctx.fillStyle = "#3a2a1a";
  ctx.beginPath();
  ctx.arc(headCx, headCy - 5, 11.5, Math.PI * 1.05, Math.PI * 1.95);
  ctx.fill();

  // gözler (iki tane)
  ctx.fillStyle = "#1a1200";
  ctx.beginPath();
  ctx.arc(headCx + 1.5, headCy - 1, 1.8, 0, Math.PI * 2);
  ctx.arc(headCx + 7.5, headCy - 1, 1.8, 0, Math.PI * 2);
  ctx.fill();

  // ağız (koşarken sabit gülümseme, havadayken şaşkın "o")
  ctx.strokeStyle = "#1a1200";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  if (player.grounded) {
    ctx.arc(headCx + 3, headCy + 4, 3, 0, Math.PI);
  } else {
    ctx.arc(headCx + 4, headCy + 5, 2, 0, Math.PI * 2);
  }
  ctx.stroke();

  drawAccessories(headCx, headCy);
}

function drawAccessories(headCx, headCy) {
  const glasses = profile.equipped.glasses;
  const hat = profile.equipped.hat;

  if (glasses === "sun") {
    ctx.fillStyle = "#1a1a1a";
    roundRect(ctx, headCx - 9, headCy - 5, 16, 6, 3);
    ctx.fill();
  } else if (glasses === "round") {
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(headCx - 3, headCy - 2, 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(headCx + 6, headCy - 2, 4, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (hat === "cap") {
    ctx.fillStyle = "#3fae4c";
    ctx.beginPath();
    ctx.arc(headCx, headCy - 11, 10, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(headCx - 2, headCy - 17, 15, 5);
  } else if (hat === "top") {
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(headCx - 8, headCy - 29, 16, 16);
    ctx.fillRect(headCx - 12, headCy - 14, 24, 4);
  }
}

function drawHeli(time) {
  const x = PLAYER_X;
  const y = player.y;
  const colorDef = COLORS.find((c) => c.id === profile.equipped.color) || COLORS[0];

  // gövde
  ctx.fillStyle = colorDef.top;
  roundRect(ctx, x, y - 14, 34, 20, 8);
  ctx.fill();

  // kuyruk
  ctx.fillStyle = colorDef.bottom;
  ctx.fillRect(x - 16, y - 7, 18, 6);
  ctx.beginPath();
  ctx.moveTo(x - 16, y - 7);
  ctx.lineTo(x - 16, y - 17);
  ctx.lineTo(x - 8, y - 7);
  ctx.closePath();
  ctx.fill();

  // kokpit camı
  ctx.fillStyle = "rgba(200,230,255,0.85)";
  ctx.beginPath();
  ctx.arc(x + 25, y - 4, 6, 0, Math.PI * 2);
  ctx.fill();

  // iniş kızakları
  ctx.strokeStyle = "#2a2a2a";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x + 2, y + 9);
  ctx.lineTo(x + 30, y + 9);
  ctx.moveTo(x + 6, y + 9);
  ctx.lineTo(x + 6, y + 4);
  ctx.moveTo(x + 26, y + 9);
  ctx.lineTo(x + 26, y + 4);
  ctx.stroke();

  // dönen pervane
  const spin = (time * 0.03) % (Math.PI * 2);
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 17 - Math.cos(spin) * 26, y - 16 - Math.sin(spin) * 4);
  ctx.lineTo(x + 17 + Math.cos(spin) * 26, y - 16 + Math.sin(spin) * 4);
  ctx.stroke();
  ctx.fillStyle = "#333";
  ctx.beginPath();
  ctx.arc(x + 17, y - 16, 3, 0, Math.PI * 2);
  ctx.fill();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ---- Ana döngü ----
function loop(time) {
  if (!running) return;
  update(time);
  draw(time);

  scoreEl.textContent = Math.floor(distance) + " m";
  coinsEl.textContent = "🪙 " + coinCount;
  powerIndicator.classList.toggle("hidden", !isBoosted());

  requestAnimationFrame(loop);
}

function endGame() {
  running = false;
  sfxHit();
  const meters = Math.floor(distance);
  const best = Math.max(meters, parseInt(localStorage.getItem(BEST_KEY) || "0", 10));
  localStorage.setItem(BEST_KEY, best);
  bestEl.textContent = t("bestPrefix") + best + " m";
  finalDistanceEl.textContent = t("scorePrefix") + meters + " m";
  finalCoinsEl.textContent = "🪙 " + coinCount;
  finalBestEl.textContent = t("bestPrefix") + best + " m";
  scoreStatusEl.textContent = db ? t("scoreSending") : "";
  gameoverScreen.classList.remove("hidden");
  submitScore(currentPlayerName(), meters).then((statusKey) => {
    scoreStatusEl.textContent = statusKey ? t(statusKey) : "";
  });
  profile.totalCoins += coinCount;
  saveProfile();
}

function currentPlayerName() {
  const name = playerNameInput.value.trim() || t("defaultPlayerName");
  localStorage.setItem(NAME_KEY, name);
  return name;
}

function startGame() {
  resetState();
  gameoverScreen.classList.add("hidden");
  powerIndicator.classList.add("hidden");
  requestAnimationFrame(loop);
}

// ---- Kontrol: boşluk tuşu (koşarken tek zıplama, helikopterde basılı tutarak yüksel) ----
window.addEventListener("keydown", (e) => {
  if (e.code === "Space" && e.target !== playerNameInput) {
    e.preventDefault();
    if (!spaceHeld) {
      spaceHeld = true;
      if (player && player.mode === "run") jump();
    }
  }
});
window.addEventListener("keyup", (e) => {
  if (e.code === "Space") spaceHeld = false;
});

// ---- Kontrol: mobilde ekrana dokunma (boşluk tuşuyla aynı davranış) ----
canvas.addEventListener(
  "touchstart",
  (e) => {
    e.preventDefault();
    ensureAudio();
    if (!spaceHeld) {
      spaceHeld = true;
      if (player && player.mode === "run") jump();
    }
  },
  { passive: false }
);
canvas.addEventListener(
  "touchend",
  (e) => {
    e.preventDefault();
    spaceHeld = false;
  },
  { passive: false }
);
canvas.addEventListener(
  "touchcancel",
  (e) => {
    e.preventDefault();
    spaceHeld = false;
  },
  { passive: false }
);

// ---- Başlangıç akışı ----
startBtn.addEventListener("click", () => {
  ensureAudio();
  currentPlayerName();
  startScreen.classList.add("hidden");
  startGame();
});

retryBtn.addEventListener("click", () => {
  startGame();
});

let leaderboardReturnScreen = null;
leaderboardBtn.addEventListener("click", () => {
  leaderboardReturnScreen = startScreen;
  startScreen.classList.add("hidden");
  leaderboardScreen.classList.remove("hidden");
  loadLeaderboard();
});
gameoverLeaderboardBtn.addEventListener("click", () => {
  leaderboardReturnScreen = gameoverScreen;
  gameoverScreen.classList.add("hidden");
  leaderboardScreen.classList.remove("hidden");
  loadLeaderboard();
});
leaderboardCloseBtn.addEventListener("click", () => {
  leaderboardScreen.classList.add("hidden");
  if (leaderboardReturnScreen) leaderboardReturnScreen.classList.remove("hidden");
});

customizeBtn.addEventListener("click", () => {
  renderCustomizeScreen();
  customizeScreen.classList.remove("hidden");
});
customizeCloseBtn.addEventListener("click", () => {
  customizeScreen.classList.add("hidden");
});

muteBtn.addEventListener("click", toggleMute);
muteBtn.textContent = muted ? "🔇" : "🔊";

langSelect.addEventListener("change", () => applyLanguage(langSelect.value));

playerNameInput.value = localStorage.getItem(NAME_KEY) || "";
applyLanguage(currentLang);
