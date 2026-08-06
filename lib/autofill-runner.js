// Shared message-handling glue for every platform content script.
// Each platform file just supplies DEFAULT_SELECTORS + a platformId and calls
// registerAutofill(); this file owns talking to background.js, merging in any
// user-captured field-map overrides, and actually filling + verifying the DOM.
import {
  waitForElement,
  fillTextField,
  fillTagInput,
  buildFile,
  setFileInputFiles,
  fieldLooksFilled
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

  // Invariant: this function only fills and verifies DOM fields — it must never
  // locate or click a publish/submit button. Actual posting always requires a
  // manual click from the account owner; that's the line between "autofill
  // assistant" and "autoposting bot," and it must not move.
  async function runAutofill(entry) {
    const platformId = entry?.platformId;
    if (!supportedPlatformIds.includes(platformId)) return null;
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

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type === "AUTOFILL") {
      runAutofill(message.entry).then(sendResponse);
      return true;
    }
    if (message?.type === "MAP_FIELDS") {
      if (!supportedPlatformIds.includes(message.platformId)) return false;
      getLanguage().then((lang) => {
        startFieldMapping(Object.keys(DEFAULT_SELECTORS), lang).then(async (map) => {
          await setFieldMap(message.platformId, map);
          sendResponse({ ok: true, map });
        });
      });
      return true;
    }
    return false;
  });
}
