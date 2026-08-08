import { getDriveFolderId, getGoogleAccount, getLanguage, setDriveStatus, setGoogleAccount } from "./lib/storage.js";
import { getNewestFileInFolder, streamFile } from "./lib/drive.js";
import { clearCachedGoogleToken, getGoogleAccount as fetchGoogleAccount, getGoogleAuthToken } from "./lib/auth.js";
import { AUTOFILL_ERRORS, labelForError, messageFor } from "./lib/errors.js";

async function failure(code, message) {
  const lang = await getLanguage();
  return { error: true, code, reason: labelForError(code, lang), message: message || labelForError(code, lang) };
}

async function getNewestDriveFile(platformId) {
  const folderId = await getDriveFolderId(platformId);
  if (!folderId) {
    const lang = await getLanguage();
    return failure(AUTOFILL_ERRORS.DRIVE_NOT_CONNECTED, messageFor("noFolderLink", lang));
  }
  try {
    const file = await getNewestFileInFolder(folderId);
    if (!file) {
      const lang = await getLanguage();
      return failure(AUTOFILL_ERRORS.FILE_FETCH_FAILED, messageFor("emptyFolder", lang));
    }
    return { file };
  } catch (err) {
    return failure(err.code || AUTOFILL_ERRORS.FILE_FETCH_FAILED, err.message);
  }
}

// Wraps getNewestDriveFile with a persisted status record, so the popup can show
// "last known connected" immediately on open instead of only right after a save click.
async function checkAndRecordStatus(platformId) {
  const result = await getNewestDriveFile(platformId);
  if (result.error) {
    await setDriveStatus(platformId, { ok: false, code: result.code, message: result.message, checkedAt: Date.now() });
  } else {
    // "Save & connect" can be the user's first authorization action, so also
    // persist the display-only account record even if they did not press the
    // separate Login Gmail button first.
    await syncGoogleAccount().catch(() => {});
    await setDriveStatus(platformId, {
      ok: true,
      fileName: result.file.name,
      modifiedTime: result.file.modifiedTime,
      checkedAt: Date.now()
    });
  }
  return result;
}

async function syncGoogleAccount() {
  const token = await getGoogleAuthToken(false);
  const account = await fetchGoogleAccount(token);
  await setGoogleAccount(account);
  return account;
}

async function loginWithGoogle() {
  const token = await getGoogleAuthToken(true);
  const account = await fetchGoogleAccount(token);
  await setGoogleAccount(account);
  return { ok: true, account };
}

async function switchGoogleAccount() {
  // Removing the old cached token before the interactive request makes Chrome show
  // the Google account chooser instead of silently reusing this extension's token.
  const oldToken = await getGoogleAuthToken(false).catch(() => null);
  await clearCachedGoogleToken(oldToken);
  await setGoogleAccount(null);
  return loginWithGoogle();
}

// No action.default_popup is set in manifest.json, so clicking the toolbar icon
// fires this instead of opening a native popup window. The panel itself lives in
// a content script already declaratively injected on the three platform pages
// (see manifest.json's content_scripts) — sendMessage just asks it to toggle. On
// any other page there's no listener, so this rejects; that's expected and silently
// ignored rather than treated as an error, since the extension has nothing to show there.
chrome.action.onClicked.addListener((tab) => {
  if (!tab?.id) return;
  chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_POPUP" }).catch(() => {});
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "GET_NEWEST_DRIVE_FILE") {
    checkAndRecordStatus(message.platformId).then(sendResponse);
    return true;
  }
  if (message?.type === "CHECK_DRIVE_CONNECTION") {
    checkAndRecordStatus(message.platformId).then(sendResponse);
    return true;
  }
  if (message?.type === "LOGIN_GOOGLE") {
    loginWithGoogle().then(sendResponse).catch((err) => sendResponse({ error: true, reason: err.message }));
    return true;
  }
  if (message?.type === "SWITCH_GOOGLE_ACCOUNT") {
    switchGoogleAccount().then(sendResponse).catch((err) => sendResponse({ error: true, reason: err.message }));
    return true;
  }
  if (message?.type === "GET_GOOGLE_ACCOUNT") {
    getGoogleAccount().then((account) => sendResponse({ ok: true, account }));
    return true;
  }
  return false;
});

// Streams a file's bytes to a content script as a sequence of chunk messages over a
// long-lived port, instead of buffering the whole file into one ArrayBuffer and sending
// it as a single structured-clone message (slow and memory-heavy for large videos).
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== "drive-download") return;

  port.onMessage.addListener(async (msg) => {
    if (msg?.type !== "START") return;
    const found = await getNewestDriveFile(msg.platformId);
    if (found.error) {
      port.postMessage({ type: "error", code: found.code, message: found.message });
      return;
    }
    try {
      for await (const chunk of streamFile(found.file.id)) {
        port.postMessage({ type: "chunk", data: chunk });
      }
      port.postMessage({ type: "done", file: found.file });
    } catch (err) {
      port.postMessage({ type: "error", code: err.code || AUTOFILL_ERRORS.FILE_FETCH_FAILED, message: err.message });
    }
  });
});
