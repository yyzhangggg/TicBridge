// Google Drive v3 wrapper — only used from background.js (service worker),
// since chrome.identity + fetch with an OAuth bearer token belong there, not
// in content scripts running on third-party pages.
//
// Setup required once (see README.md "Google Drive setup"):
//   1. Create a Google Cloud project, enable the Drive API.
//   2. Create an OAuth Client ID of type "Chrome Extension", using this
//      extension's ID (chrome://extensions, after loading unpacked).
//   3. Paste that client ID into manifest.json -> oauth2.client_id.
import { AUTOFILL_ERRORS, tagError } from "./errors.js";
import { clearCachedGoogleToken, getGoogleAuthToken } from "./auth.js";

/** Accepts either a bare folder ID or a full "drive.google.com/drive/folders/<id>" link. */
export function parseFolderId(input) {
  const trimmed = input.trim();
  const match = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : trimmed;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);
const RETRY_DELAYS_MS = [400, 1200, 3000]; // capped exponential-ish backoff, 3 extra attempts

/** Fetch with retry for *transient* failures only — network blips, rate limiting, 5xx. */
async function fetchWithRetry(url, options) {
  let lastErr;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      const res = await fetch(url, options);
      if (res.ok || !RETRYABLE_STATUS.has(res.status)) return res;
      lastErr = tagError(new Error(`Drive request failed: ${res.status} ${res.statusText}`), AUTOFILL_ERRORS.FILE_FETCH_FAILED);
    } catch (err) {
      lastErr = err; // network error (offline, DNS, reset) — worth retrying
    }
    if (attempt < RETRY_DELAYS_MS.length) await sleep(RETRY_DELAYS_MS[attempt]);
  }
  throw tagError(lastErr, AUTOFILL_ERRORS.FILE_FETCH_FAILED);
}

async function rawFetch(url, token, options) {
  const res = await fetchWithRetry(url, {
    ...options,
    headers: { ...options?.headers, Authorization: `Bearer ${token}` }
  });
  if (res.status === 401) {
    throw tagError(new Error("Drive token expired"), "token-expired"); // internal-only code, resolved below
  }
  if (!res.ok) {
    throw tagError(
      new Error(`Drive request failed: ${res.status} ${res.statusText}`),
      AUTOFILL_ERRORS.FILE_FETCH_FAILED
    );
  }
  return res;
}

/** Gets a token and fetches url, retrying once with a fresh token on a 401. */
async function authorizedFetch(url, options) {
  for (let attempt = 0; attempt < 2; attempt++) {
    let token;
    try {
      token = await getGoogleAuthToken(true);
    } catch (err) {
      throw tagError(err, AUTOFILL_ERRORS.AUTH_FAILED);
    }

    try {
      return await rawFetch(url, token, options);
    } catch (err) {
      if (err.code !== "token-expired") throw err; // already tagged FILE_FETCH_FAILED
      await clearCachedGoogleToken(token);
      if (attempt === 1) throw tagError(err, AUTOFILL_ERRORS.AUTH_FAILED);
      // else: loop once more with a fresh token
    }
  }
}

/** Newest video/image directly inside the given folder (non-recursive). */
export async function getNewestFileInFolder(folderId) {
  const q = `'${folderId}' in parents and trashed = false and (mimeType contains 'video/' or mimeType contains 'image/')`;
  const params = new URLSearchParams({
    q,
    orderBy: "modifiedTime desc",
    pageSize: "1",
    fields: "files(id,name,mimeType,modifiedTime,size)"
  });
  const res = await authorizedFetch(`https://www.googleapis.com/drive/v3/files?${params}`);
  const data = await res.json();
  return data.files?.[0] || null;
}

/**
 * Streams a file's bytes as they arrive off the network instead of buffering
 * the whole thing into one ArrayBuffer — large videos would otherwise sit
 * fully in service-worker memory before a single giant structured-clone
 * message could even be sent to the content script. Yields Uint8Array chunks
 * as the underlying network read produces them (no forced re-chunking).
 *
 * Resumable: if the stream drops partway through, retries the GET with a
 * Range header starting from the last byte received, instead of restarting
 * the whole file from zero.
 */
export async function* streamFile(fileId) {
  let received = 0;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    const options = received > 0 ? { headers: { Range: `bytes=${received}-` } } : undefined;
    let res;
    try {
      res = await authorizedFetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, options);
    } catch (err) {
      if (attempt === RETRY_DELAYS_MS.length) throw err;
      await sleep(RETRY_DELAYS_MS[attempt]);
      continue;
    }

    // A resumed download is only safe when Drive honoured the Range request.
    // If a proxy/server ignores it and returns the complete file (200), appending
    // those bytes would silently produce a corrupt upload. Fail visibly instead
    // of handing a damaged file to the publishing page.
    if (received > 0) {
      const contentRange = res.headers.get("content-range");
      if (res.status !== 206 || !contentRange?.startsWith(`bytes ${received}-`)) {
        throw tagError(
          new Error("Drive did not honour the download resume range"),
          AUTOFILL_ERRORS.FILE_FETCH_FAILED
        );
      }
    }

    if (!res.body) {
      throw tagError(new Error("Drive returned an empty response body"), AUTOFILL_ERRORS.FILE_FETCH_FAILED);
    }

    const reader = res.body.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) return;
        received += value.byteLength;
        yield value;
      }
    } catch (err) {
      if (attempt === RETRY_DELAYS_MS.length) {
        throw tagError(err, AUTOFILL_ERRORS.FILE_FETCH_FAILED);
      }
      await sleep(RETRY_DELAYS_MS[attempt]);
      // loop again, resuming via Range from `received`
    }
  }
}
