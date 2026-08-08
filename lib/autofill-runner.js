// Shared autofill engine for every platform content script.
// Each platform file just supplies DEFAULT_SELECTORS + a platformId and calls
// registerAutofill(), which returns { runPreflight, runAutofill, runFieldMapping }
// for the in-page popup panel (see popup-overlay.js) to call directly — this file
// owns merging in any user-captured field-map overrides and actually filling +
// verifying the DOM.
import {
  waitForElement,
  fillTextField,
  fillTagInput,
  buildFile,
  setFileInputFiles,
  fieldLooksFilled,
  findFieldCandidates,
  isInteractable
} from "./dom.js";
import { startFieldMapping } from "./field-map.js";
import { getFieldMap, setFieldMap, getLanguage } from "./storage.js";
import { AUTOFILL_ERRORS, labelForError } from "./errors.js";
import { downloadNewestDriveFile } from "./drive-client.js";

async function failure(code) {
  const lang = await getLanguage();
  return { ok: false, code, reason: labelForError(code, lang) };
}

export function registerAutofill(
  platformIds,
  DEFAULT_SELECTORS,
  { dropTargetSelector, buildTitle, buildDescription, buildTags } = {}
) {
  const supportedPlatformIds = Array.isArray(platformIds) ? platformIds : [platformIds];

  async function resolveSelectors(platformId) {
    const override = await getFieldMap(platformId);
    return { ...DEFAULT_SELECTORS, ...(override || {}) };
  }

  // Checks one field's selector against the live page *without* touching it:
  // does it match anything, does it match exactly one thing, and is that one
  // thing actually usable right now. This is the read-only counterpart to the
  // fill step below — same selector resolution, but reporting instead of typing.
  function checkField(selectors, { notFoundCode, ambiguousCode }) {
    if (!selectors) return { status: "skipped" };
    const { matches } = findFieldCandidates(selectors);
    if (matches.length === 0) return { status: "not-found", code: notFoundCode };
    if (matches.length > 1) return { status: "ambiguous", code: ambiguousCode, count: matches.length };
    if (!isInteractable(matches[0])) return { status: "not-editable", code: AUTOFILL_ERRORS.FIELD_NOT_EDITABLE };
    return { status: "ok" };
  }

  // Read-only pass over the page: for every field this platform is configured to
  // fill, report whether it exists, is unambiguous, and is actually interactable —
  // all *before* runAutofill types a single character. This is what lets the popup
  // show the user a preview ("here's what will be touched, and here's what's
  // already broken") instead of discovering a bad field only after writing to it.
  async function runPreflight(entry) {
    const platformId = entry?.platformId;
    if (!supportedPlatformIds.includes(platformId)) return null;
    const selectors = await resolveSelectors(platformId);
    const lang = await getLanguage();

    const titleText = buildTitle ? buildTitle(entry) : entry.title;
    const descText = buildDescription ? buildDescription(entry) : entry.description;
    const tags = buildTags ? buildTags(entry) : entry.tags;

    const fields = {
      fileInput: selectors.fileInput
        ? checkField(selectors.fileInput, {
            notFoundCode: AUTOFILL_ERRORS.FILE_INPUT_NOT_FOUND,
            ambiguousCode: AUTOFILL_ERRORS.FILE_SELECTION_AMBIGUOUS
          })
        : { status: "skipped" },
      title: selectors.title
        ? checkField(selectors.title, {
            notFoundCode: AUTOFILL_ERRORS.TITLE_NOT_FOUND,
            ambiguousCode: AUTOFILL_ERRORS.FIELD_AMBIGUOUS
          })
        : { status: "skipped" },
      description: selectors.description
        ? checkField(selectors.description, {
            notFoundCode: AUTOFILL_ERRORS.DESCRIPTION_NOT_FOUND,
            ambiguousCode: AUTOFILL_ERRORS.FIELD_AMBIGUOUS
          })
        : { status: "skipped" },
      tagInput: selectors.tagInput && tags?.length
        ? checkField(selectors.tagInput, {
            notFoundCode: AUTOFILL_ERRORS.TAG_INPUT_NOT_FOUND,
            ambiguousCode: AUTOFILL_ERRORS.FIELD_AMBIGUOUS
          })
        : { status: "skipped" }
    };

    const issues = [];
    for (const [field, result] of Object.entries(fields)) {
      if (result.status === "ok" || result.status === "skipped") continue;
      issues.push({ field, status: result.status, code: result.code, reason: labelForError(result.code, lang) });
    }

    return {
      ok: issues.length === 0,
      fields,
      issues,
      preview: { title: titleText, description: descText, tags }
    };
  }

  // Invariant: this function only fills and verifies DOM fields — it must never
  // locate or click a publish/submit button. Actual posting always requires a
  // manual click from the account owner; that's the line between "autofill
  // assistant" and "autoposting bot," and it must not move.
  async function runAutofill(entry) {
    const platformId = entry?.platformId;
    if (!supportedPlatformIds.includes(platformId)) return null;
    // The popup's flow is preview (PREFLIGHT) -> show it to the user -> only then
    // send AUTOFILL with confirmed:true. A write that shows up without that flag
    // skipped the preview the user was supposed to see, so it's refused rather
    // than silently filling the page.
    if (!entry.confirmed) return failure(AUTOFILL_ERRORS.WRITE_NOT_CONFIRMED);
    const selectors = await resolveSelectors(platformId);

    const driveResponse = await downloadNewestDriveFile(platformId);
    if (driveResponse?.error) {
      return failure(driveResponse.code || AUTOFILL_ERRORS.FILE_FETCH_FAILED);
    }

    const titleText = buildTitle ? buildTitle(entry) : entry.title;
    const descText = buildDescription ? buildDescription(entry) : entry.description;
    const tags = buildTags ? buildTags(entry) : entry.tags;

    // Each field is resolved (and reported) independently — a fallback chain
    // that fails on one field shouldn't hide which specific field broke.
    let fileInputEl, titleEl, descEl, tagEl;

    if (selectors.fileInput && driveResponse?.file && driveResponse?.blob) {
      try {
        fileInputEl = await waitForElement(selectors.fileInput);
      } catch (err) {
        return failure(AUTOFILL_ERRORS.FILE_INPUT_NOT_FOUND);
      }
      const dropTarget = dropTargetSelector ? document.querySelector(dropTargetSelector) : null;
      const file = buildFile(driveResponse.blob, driveResponse.file.name, driveResponse.file.mimeType);
      setFileInputFiles(fileInputEl, file, dropTarget);
    }

    if (selectors.title) {
      try {
        titleEl = await waitForElement(selectors.title);
      } catch (err) {
        return failure(AUTOFILL_ERRORS.TITLE_NOT_FOUND);
      }
      await fillTextField(titleEl, titleText);
    }

    if (selectors.description) {
      try {
        descEl = await waitForElement(selectors.description);
      } catch (err) {
        return failure(AUTOFILL_ERRORS.DESCRIPTION_NOT_FOUND);
      }
      await fillTextField(descEl, descText);
    }

    if (selectors.tagInput && tags?.length) {
      try {
        tagEl = await waitForElement(selectors.tagInput);
      } catch (err) {
        return failure(AUTOFILL_ERRORS.TAG_INPUT_NOT_FOUND);
      }
      await fillTagInput(tagEl, tags);
    }

    // Filling didn't throw, but a framework-controlled input can silently revert
    // itself (e.g. React ignoring a non-native set) — so re-read what's actually there.
    if (fileInputEl && !(fileInputEl.files && fileInputEl.files.length > 0)) {
      return failure(AUTOFILL_ERRORS.FILE_VERIFY_FAILED);
    }
    if (titleEl && !fieldLooksFilled(titleEl, titleText)) {
      return failure(AUTOFILL_ERRORS.TITLE_VERIFY_FAILED);
    }
    if (descEl && !fieldLooksFilled(descEl, descText)) {
      return failure(AUTOFILL_ERRORS.DESCRIPTION_VERIFY_FAILED);
    }

    return { ok: true };
  }

  // Walks the user through clicking each field on the page and saves the
  // resulting selector overrides. Defaults to this content script's own
  // (first) platform id since the popup panel always calls this without
  // an argument — mapping only ever targets the platform the page is on.
  async function runFieldMapping(platformId = supportedPlatformIds[0]) {
    if (!supportedPlatformIds.includes(platformId)) return { ok: false };
    const lang = await getLanguage();
    const map = await startFieldMapping(Object.keys(DEFAULT_SELECTORS), lang);
    await setFieldMap(platformId, map);
    return { ok: true, map };
  }

  return { platformIds: supportedPlatformIds, runPreflight, runAutofill, runFieldMapping };
}
