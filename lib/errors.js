// Shared autofill failure taxonomy so background.js, drive.js, autofill-runner.js,
// and the popup all agree on the same codes/labels instead of one generic "fail to fill".

export const AUTOFILL_ERRORS = {
  DRIVE_NOT_CONNECTED: "drive-not-connected",
  AUTH_FAILED: "auth-failed",
  FILE_FETCH_FAILED: "file-fetch-failed",
  // Every candidate selector for this field was tried and none matched — the
  // page markup likely changed. Distinct code per field so the popup can tell
  // the user exactly which one broke instead of a generic "field not found".
  FILE_INPUT_NOT_FOUND: "file-input-not-found",
  TITLE_NOT_FOUND: "title-not-found",
  DESCRIPTION_NOT_FOUND: "description-not-found",
  TAG_INPUT_NOT_FOUND: "tag-input-not-found",
  // Selector matched and the fill call ran, but re-reading the field afterward
  // shows it didn't take (framework reverted it, wrong element, etc).
  FILE_VERIFY_FAILED: "file-verify-failed",
  TITLE_VERIFY_FAILED: "title-verify-failed",
  DESCRIPTION_VERIFY_FAILED: "description-verify-failed"
};

const REMAP_HINT = { zh: "，可点击「映射字段」手动指定", en: " — try “Map fields” to set it manually", fr: " — essayez « Mapper les champs » pour le définir manuellement" };

const LABELS = {
  [AUTOFILL_ERRORS.DRIVE_NOT_CONNECTED]: { zh: "Drive 未连接", en: "Drive not connected", fr: "Drive non connecté" },
  [AUTOFILL_ERRORS.AUTH_FAILED]: { zh: "授权失败", en: "Authorization failed", fr: "Échec de l’autorisation" },
  [AUTOFILL_ERRORS.FILE_FETCH_FAILED]: { zh: "文件获取失败", en: "Failed to fetch file", fr: "Échec de récupération du fichier" },
  [AUTOFILL_ERRORS.FILE_INPUT_NOT_FOUND]: {
    zh: `找不到文件上传框${REMAP_HINT.zh}`,
    en: `Couldn't find the file upload field${REMAP_HINT.en}`,
    fr: `Champ de téléversement introuvable${REMAP_HINT.fr}`
  },
  [AUTOFILL_ERRORS.TITLE_NOT_FOUND]: {
    zh: `找不到标题框${REMAP_HINT.zh}`,
    en: `Couldn't find the title field${REMAP_HINT.en}`,
    fr: `Champ du titre introuvable${REMAP_HINT.fr}`
  },
  [AUTOFILL_ERRORS.DESCRIPTION_NOT_FOUND]: {
    zh: `找不到简介框${REMAP_HINT.zh}`,
    en: `Couldn't find the description field${REMAP_HINT.en}`,
    fr: `Champ de description introuvable${REMAP_HINT.fr}`
  },
  [AUTOFILL_ERRORS.TAG_INPUT_NOT_FOUND]: {
    zh: `找不到标签框${REMAP_HINT.zh}`,
    en: `Couldn't find the tags field${REMAP_HINT.en}`,
    fr: `Champ des tags introuvable${REMAP_HINT.fr}`
  },
  [AUTOFILL_ERRORS.FILE_VERIFY_FAILED]: {
    zh: `文件选择后未生效${REMAP_HINT.zh}`,
    en: `File was selected but didn't take${REMAP_HINT.en}`,
    fr: `Le fichier sélectionné n’a pas été pris en compte${REMAP_HINT.fr}`
  },
  [AUTOFILL_ERRORS.TITLE_VERIFY_FAILED]: {
    zh: `标题填充后未生效${REMAP_HINT.zh}`,
    en: `Title was filled but didn't take${REMAP_HINT.en}`,
    fr: `Le titre rempli n’a pas été pris en compte${REMAP_HINT.fr}`
  },
  [AUTOFILL_ERRORS.DESCRIPTION_VERIFY_FAILED]: {
    zh: `简介填充后未生效${REMAP_HINT.zh}`,
    en: `Description was filled but didn't take${REMAP_HINT.en}`,
    fr: `La description remplie n’a pas été prise en compte${REMAP_HINT.fr}`
  }
};

const FALLBACK = { zh: "填充失败", en: "Autofill failed", fr: "Échec du remplissage" };

export function labelForError(code, lang = "zh") {
  const entry = LABELS[code];
  return (entry && (entry[lang] || entry.zh)) || FALLBACK[lang] || FALLBACK.zh;
}

// One-off failure messages that aren't tied to an AUTOFILL_ERRORS code.
export const MESSAGES = {
  noFolderLink: {
    zh: "还没有为这个平台保存 Drive 文件夹链接",
    en: "No Drive folder link saved for this platform yet",
    fr: "Aucun lien de dossier Drive enregistré pour cette plateforme"
  },
  emptyFolder: {
    zh: "文件夹里没有视频/图片文件",
    en: "No video/image files in the folder",
    fr: "Aucun fichier vidéo/image dans le dossier"
  }
};

export function messageFor(key, lang = "zh") {
  const entry = MESSAGES[key];
  return (entry && (entry[lang] || entry.zh)) || "";
}

export function tagError(err, code) {
  err.code = code;
  return err;
}
