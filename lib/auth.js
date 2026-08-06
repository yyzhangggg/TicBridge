// Google OAuth helpers. This module is imported by the background service worker
// only: popup/content scripts request actions through runtime messages and never
// receive a bearer token.

let memoTokenPromise = null;

function requestToken(interactive) {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive }, (token) => {
      if (chrome.runtime.lastError || !token) {
        reject(new Error(chrome.runtime.lastError?.message || "No Google auth token returned"));
        return;
      }
      resolve(token);
    });
  });
}

/** Uses Chrome's cached token when available and only displays Google UI when needed. */
export async function getGoogleAuthToken(interactive = true) {
  if (memoTokenPromise) return memoTokenPromise;
  memoTokenPromise = (async () => {
    try {
      return await requestToken(false);
    } catch {
      if (!interactive) throw new Error("No cached Google auth token");
      return requestToken(true);
    }
  })();
  try {
    return await memoTokenPromise;
  } catch (err) {
    memoTokenPromise = null;
    throw err;
  }
}

/** Removes one token from Chrome's cache; the next interactive request can choose another Gmail account. */
export function clearCachedGoogleToken(token) {
  memoTokenPromise = null;
  if (!token) return Promise.resolve();
  return new Promise((resolve) => chrome.identity.removeCachedAuthToken({ token }, resolve));
}

/** Returns non-sensitive account metadata for display in the extension UI. */
export async function getGoogleAccount(token) {
  const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) throw new Error(`Google account lookup failed: ${response.status}`);
  const data = await response.json();
  return {
    id: data.sub || "",
    email: data.email || "",
    name: data.name || "",
    picture: data.picture || ""
  };
}
