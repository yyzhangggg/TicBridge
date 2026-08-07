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
  DESCRIPTION_VERIFY_FAILED: "description-verify-failed",
  // Preflight-only codes: caught before anything is written, not after.
  // A selector (title/description/tags) resolved to more than one element on
  // the page — filling "the first match" would be a guess, not a fill.
  FIELD_AMBIGUOUS: "field-ambiguous",
  // Same idea but specifically for the upload control: more than one
  // <input type=file>-shaped candidate on the page (e.g. a decoy/hidden input,
  // or separate cover + video pickers), so which one is "the" file input is
  // ambiguous and picking one blind risks uploading into the wrong slot.
  FILE_SELECTION_AMBIGUOUS: "file-selection-ambiguous",
  // Selector matched exactly one element, but it isn't actually usable right
  // now (disabled, hidden, zero-size, aria-disabled) — e.g. gated behind a
  // step the page hasn't reached yet.
  FIELD_NOT_EDITABLE: "field-not-editable",
  // An AUTOFILL write was requested without having gone through the
  // preview-then-confirm step first. See autofill-runner.js's PREFLIGHT / AUTOFILL
  // split — this is the guardrail that keeps a stray/replayed AUTOFILL message
  // from writing to the page without the user ever having seen a preview.
  WRITE_NOT_CONFIRMED: "write-not-confirmed"
};

const REMAP_HINT = { zh: "，可点击「映射字段」手动指定", en: " — try “Map fields” to set it manually", fr: " — essayez « Mapper les champs » pour le définir manuellement" };
// Ambiguity isn't a "selector found nothing" problem — re-mapping IS the fix,
// because it pins down exactly one element instead of leaving multiple matches.
const AMBIGUOUS_HINT = { zh: "，请使用「映射字段」手动指定唯一的目标元素", en: " — use “Map fields” to pin down the one intended element", fr: " — utilisez « Mapper les champs » pour désigner l’unique élément visé" };
// Not-editable is different: re-mapping to the same (already-correct) element
// won't help, so this hint points at *why* it's unusable instead.
const NOT_EDITABLE_HINT = {
  zh: "，请检查该字段是否被禁用/隐藏，或是否需要先完成页面上的前置步骤",
  en: " — check whether the field is disabled/hidden, or whether an earlier step on the page needs to be completed first",
  fr: " — vérifiez si le champ est désactivé/masqué, ou si une étape précédente de la page doit d’abord être complétée"
};

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
  },
  [AUTOFILL_ERRORS.FIELD_AMBIGUOUS]: {
    zh: `页面上匹配到多个候选字段，无法确定该填哪一个${AMBIGUOUS_HINT.zh}`,
    en: `Found multiple matching fields on the page — can't tell which one is correct${AMBIGUOUS_HINT.en}`,
    fr: `Plusieurs champs correspondants trouvés sur la page — impossible de déterminer le bon${AMBIGUOUS_HINT.fr}`
  },
  [AUTOFILL_ERRORS.FILE_SELECTION_AMBIGUOUS]: {
    zh: `页面上匹配到多个可能的上传框，无法确定该用哪一个${AMBIGUOUS_HINT.zh}`,
    en: `Found multiple possible upload fields on the page — can't tell which one is correct${AMBIGUOUS_HINT.en}`,
    fr: `Plusieurs champs de téléversement possibles trouvés sur la page — impossible de déterminer le bon${AMBIGUOUS_HINT.fr}`
  },
  [AUTOFILL_ERRORS.FIELD_NOT_EDITABLE]: {
    zh: `找到了字段，但它当前不可编辑（禁用/隐藏/尺寸为零）${NOT_EDITABLE_HINT.zh}`,
    en: `Found the field, but it isn't editable right now (disabled/hidden/zero-size)${NOT_EDITABLE_HINT.en}`,
    fr: `Champ trouvé, mais non modifiable actuellement (désactivé/masqué/taille nulle)${NOT_EDITABLE_HINT.fr}`
  },
  [AUTOFILL_ERRORS.WRITE_NOT_CONFIRMED]: {
    zh: "填充尚未经过预览确认，已阻止写入 — 请先点击「预览」，确认无误后再点击「确认填充」",
    en: "Autofill hasn't been confirmed via preview yet — the write was blocked. Click “Preview” first, then “Confirm fill” once it looks right",
    fr: "Le remplissage n’a pas encore été confirmé via l’aperçu — l’écriture a été bloquée. Cliquez d’abord sur « Aperçu », puis sur « Confirmer le remplissage » une fois vérifié"
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
