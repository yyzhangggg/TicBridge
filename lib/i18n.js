// Trilingual (zh/en/fr) UI-chrome strings for the popup + on-page field-mapping banner.
// Deliberately does NOT translate post content (title/description/tags/positioning) —
// that's user-authored copy in whatever language the user writes it in, not interface text.

export const LANGUAGES = ["zh", "en", "fr"];
export const LANGUAGE_LABELS = { zh: "中文", en: "EN", fr: "FR" };
export const DEFAULT_LANGUAGE = "zh";

let currentLanguage = DEFAULT_LANGUAGE;

export function setCurrentLanguage(lang) {
  currentLanguage = LANGUAGES.includes(lang) ? lang : DEFAULT_LANGUAGE;
}

export function getCurrentLanguage() {
  return currentLanguage;
}

const WEEKDAY_LABELS = {
  mon: { zh: "周一", en: "Mon", fr: "Lun" },
  tue: { zh: "周二", en: "Tue", fr: "Mar" },
  wed: { zh: "周三", en: "Wed", fr: "Mer" },
  thu: { zh: "周四", en: "Thu", fr: "Jeu" },
  fri: { zh: "周五", en: "Fri", fr: "Ven" },
  sat: { zh: "周六", en: "Sat", fr: "Sam" },
  sun: { zh: "周日", en: "Sun", fr: "Dim" }
};

export function weekdayLabel(key, lang = currentLanguage) {
  const entry = WEEKDAY_LABELS[key];
  return entry ? entry[lang] || entry[DEFAULT_LANGUAGE] : key;
}

const STRINGS = {
  appSubtitle: { zh: "排期助手", en: "Scheduler", fr: "Planificateur" },
  tabTiktok: { zh: "TikTok", en: "TikTok", fr: "TikTok" },
  tabRednote: { zh: "小红书", en: "RedNote", fr: "RedNote" },
  tabBilibili: { zh: "Bilibili", en: "Bilibili", fr: "Bilibili" },
  tabProfile: { zh: "Profile", en: "Profile", fr: "Profil" },

  drivePlaceholder: {
    zh: "粘贴 Google Drive 文件夹链接或 ID",
    en: "Paste Google Drive folder link or ID",
    fr: "Collez le lien ou l’ID du dossier Google Drive"
  },
  goalPrefix: { zh: "目标：一周发 ", en: "Goal: ", fr: "Objectif : " },
  goalSuffix: {
    zh: " 篇（0 = 不限）",
    en: " posts / week (0 = no limit)",
    fr: " publications / semaine (0 = illimité)"
  },
  saveConnect: { zh: "保存并连接", en: "Save & connect", fr: "Enregistrer et connecter" },
  connecting: {
    zh: "连接中…（首次会弹出 Google 登录授权）",
    en: "Connecting… (first time will prompt a Google sign-in)",
    fr: "Connexion… (la première fois affichera une connexion Google)"
  },
  notConnected: {
    zh: (reason, message) => `未连接（${reason}）：${message}`,
    en: (reason, message) => `Not connected (${reason}): ${message}`,
    fr: (reason, message) => `Non connecté (${reason}) : ${message}`
  },
  connected: {
    zh: (name, when) => `已连接，最新素材：${name}（${when}）`,
    en: (name, when) => `Connected. Latest file: ${name} (${when})`,
    fr: (name, when) => `Connecté. Dernier fichier : ${name} (${when})`
  },
  statusUnknown: {
    zh: "尚未检查连接状态 — 点击「保存并连接」检查",
    en: "Connection not checked yet — click Save & connect",
    fr: "Connexion non vérifiée — cliquez sur Enregistrer et connecter"
  },
  statusLastChecked: {
    zh: (when) => `（上次检查：${when}）`,
    en: (when) => ` (last checked ${when})`,
    fr: (when) => ` (dernière vérification : ${when})`
  },
  profileHint: {
    zh: "扩展只使用发布者在 manifest 中配置的 OAuth Client ID；不会要求上传 API Key 或 client secret。登录和 Drive 请求都只在扩展后台执行。",
    en: "The extension uses the publisher-configured OAuth Client ID in its manifest; it never asks for an API key or client secret. Sign-in and Drive requests run only in the extension background.",
    fr: "L’extension utilise l’ID client OAuth configuré par l’éditeur dans son manifeste et ne demande jamais de clé API ni de secret client. La connexion et les requêtes Drive s’exécutent uniquement en arrière-plan."
  },
  googleAccountTitle: { zh: "Google 账号", en: "Google account", fr: "Compte Google" },
  googleNotSignedIn: { zh: "尚未登录 Gmail", en: "Not signed in to Gmail", fr: "Pas connecté à Gmail" },
  googleSignedInAs: {
    zh: (email) => `已登录：${email}`,
    en: (email) => `Signed in as: ${email}`,
    fr: (email) => `Connecté en tant que : ${email}`
  },
  googleLogin: { zh: "登录 Gmail", en: "Sign in to Gmail", fr: "Se connecter à Gmail" },
  googleSwitch: { zh: "切换 Gmail", en: "Switch Gmail", fr: "Changer de compte Gmail" },
  googleSigningIn: { zh: "正在打开 Google 登录…", en: "Opening Google sign-in…", fr: "Ouverture de la connexion Google…" },
  googleLoginFailed: {
    zh: (reason) => `Google 登录失败：${reason}`,
    en: (reason) => `Google sign-in failed: ${reason}`,
    fr: (reason) => `Échec de la connexion Google : ${reason}`
  },

  goalProgressWithGoal: {
    zh: (active, goal) => `本周已选 ${active} / ${goal} 篇`,
    en: (active, goal) => `${active} / ${goal} selected this week`,
    fr: (active, goal) => `${active} / ${goal} sélectionné(s) cette semaine`
  },
  goalProgressNoGoal: {
    zh: (active) => `本周已选 ${active} 篇（目标不限，去 Profile 页可设置）`,
    en: (active) => `${active} selected this week (no limit — set one on the Profile page)`,
    fr: (active) => `${active} sélectionné(s) cette semaine (sans limite — réglable dans Profil)`
  },
  goalMetWarning: {
    zh: (goal) => `已达每周目标 ${goal} 篇 — 先关掉一天再勾新的，或去 Profile 页调整目标`,
    en: (goal) => `Weekly goal of ${goal} reached — turn off a day before adding a new one, or adjust the goal on the Profile page`,
    fr: (goal) => `Objectif hebdomadaire de ${goal} atteint — désactivez un jour avant d’en ajouter un, ou ajustez l’objectif dans Profil`
  },
  notScheduled: { zh: "未安排", en: "Not scheduled", fr: "Non planifié" },

  autofillBtn: { zh: "在当前页面自动填充", en: "Autofill this page", fr: "Remplissage automatique de cette page" },
  mapFieldsBtn: { zh: "映射字段（自动填充失败时用）", en: "Map fields (use if autofill fails)", fr: "Mapper les champs (si le remplissage échoue)" },
  filling: { zh: "正在填充…", en: "Filling…", fr: "Remplissage…" },
  filled: { zh: "已填充", en: "Filled", fr: "Rempli" },
  fillFailed: {
    zh: (reason) => `填充失败：${reason}`,
    en: (reason) => `Autofill failed: ${reason}`,
    fr: (reason) => `Échec du remplissage : ${reason}`
  },
  fillFailedGeneric: { zh: "fail to fill", en: "fail to fill", fr: "fail to fill" },
  fillFailedNoTab: {
    zh: "填充失败：页面未连接（请确认已打开对应平台的发布页面并刷新）",
    en: "Autofill failed: page not connected (make sure the platform's publish page is open and refreshed)",
    fr: "Échec du remplissage : page non connectée (assurez-vous que la page de publication est ouverte et actualisée)"
  },
  pageNotConnected: {
    zh: "页面未连接（请确认已打开对应平台的发布页面并刷新）",
    en: "Page not connected (make sure the platform's publish page is open and refreshed)",
    fr: "Page non connectée (assurez-vous que la page de publication est ouverte et actualisée)"
  },
  mappingHint: {
    zh: "切到网页，按提示依次点击每个字段…",
    en: "Switch to the web page and click each field as prompted…",
    fr: "Passez à la page web et cliquez sur chaque champ selon les instructions…"
  },
  mappingSaved: { zh: "字段映射已保存", en: "Field mapping saved", fr: "Mappage des champs enregistré" },
  mappingFailed: { zh: "映射失败", en: "Mapping failed", fr: "Échec du mappage" },
  selectDayHint: {
    zh: "先在上面勾选并点开一个已启用的日期",
    en: "Check and open an enabled day above first",
    fr: "Cochez et ouvrez d’abord un jour activé ci-dessus"
  },

  positioningLabel: { zh: "账号定位", en: "Account positioning", fr: "Positionnement du compte" },
  positioningPlaceholder: {
    zh: "描述这个平台账号的内容方向和受众…",
    en: "Describe this account's content direction and audience…",
    fr: "Décrivez l’orientation de contenu et le public de ce compte…"
  },
  tagsInputPlaceholder: {
    zh: "标签，用逗号分隔",
    en: "Tags, comma-separated",
    fr: "Tags, séparés par des virgules"
  },

  themeSectionTitle: { zh: "主题", en: "Theme", fr: "Thème" },
  themeUploadBtn: { zh: "上传图片", en: "Upload image", fr: "Téléverser une image" },
  themeUploadHint: {
    zh: "建议尺寸 380×600px 左右（或相近比例，太窄/太宽的图会被裁切），支持 JPG / PNG / WebP，文件大小不超过 1.5MB",
    en: "Recommended size ~380×600px (or a similar aspect ratio — very different ratios get cropped), JPG / PNG / WebP, under 1.5MB",
    fr: "Taille recommandée ~380×600px (ou un rapport similaire — un rapport très différent sera recadré), JPG / PNG / WebP, moins de 1,5 Mo"
  },
  themeRemoveCustomBtn: {
    zh: "移除图片，恢复纯色背景",
    en: "Remove image, use solid color",
    fr: "Supprimer l’image, utiliser une couleur unie"
  },
  themeTooLarge: {
    zh: "图片太大，请压缩到 1.5MB 以内",
    en: "Image is too large — please keep it under 1.5MB",
    fr: "Image trop volumineuse — restez sous 1,5 Mo"
  },
  themeUnsupportedFormat: {
    zh: "只支持 JPG / PNG / WebP 格式",
    en: "Only JPG / PNG / WebP are supported",
    fr: "Seuls les formats JPG / PNG / WebP sont pris en charge"
  },
  themeCustomActive: {
    zh: "已使用自定义背景图片",
    en: "Custom background image applied",
    fr: "Image de fond personnalisée appliquée"
  },

  disclaimerTitle: { zh: "⚠ 风险提示", en: "⚠ Risk notice", fr: "⚠ Avertissement" },
  disclaimerBody: {
    zh: "本扩展只负责在第三方平台的发布页里自动填写标题/简介/标签/素材，不会自动点击发布——是否发布，始终由你自己确认。但这种自动填表行为仍可能违反 TikTok / Bilibili / 小红书等平台的服务条款；如果因此导致账号被限流、封禁或其他处罚，后果由你自行承担，本工具不对此负责。请自行评估风险后使用。",
    en: "This extension only autofills the title/description/tags/media on a third-party platform's publish page — it never clicks publish for you; that decision is always yours. That said, automated form-filling like this may still violate the Terms of Service of platforms such as TikTok, Bilibili, or RedNote. If your account is restricted, suspended, or otherwise penalized as a result, that risk is yours to bear — this tool takes no responsibility. Use at your own discretion.",
    fr: "Cette extension se contente de préremplir le titre/la description/les tags/le média sur la page de publication d’une plateforme tierce — elle ne clique jamais sur « publier » à votre place ; cette décision vous revient toujours. Cela dit, ce type de remplissage automatisé peut néanmoins enfreindre les conditions d’utilisation de plateformes comme TikTok, Bilibili ou RedNote. Si votre compte est restreint, suspendu ou pénalisé de toute autre manière en conséquence, ce risque vous incombe — cet outil décline toute responsabilité. À utiliser à vos propres risques."
  }
};

export function t(key, ...args) {
  const entry = STRINGS[key];
  if (!entry) return key;
  const value = entry[currentLanguage] ?? entry[DEFAULT_LANGUAGE];
  return typeof value === "function" ? value(...args) : value;
}
