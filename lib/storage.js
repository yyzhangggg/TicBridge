// Thin wrapper around chrome.storage.local — keeps all storage keys in one place.

const KEYS = {
  SELECTED_PLATFORM: "selectedPlatform",
  DRIVE_FOLDERS: "driveFolders", // { [platformId]: folderId } — each platform watches its own folder
  DRIVE_STATUS: "driveStatus", // { [platformId]: { ok, fileName, modifiedTime, message, checkedAt } } — last known connection result, so the popup can show it on open without re-hitting the Drive API
  FIELD_MAP: "fieldMap", // per-platform CSS selector overrides captured by the "map fields" tool
  WEEK_CONFIG: "weekConfig", // { [platformId]: { [jsDay]: { active, time, contentType } } }
  WEEKLY_GOAL: "weeklyGoal", // { [platformId]: number } — 0 means no cap
  LANGUAGE: "language", // "zh" | "en" | "fr" — popup + on-page banner UI language
  POSITIONING: "positioning", // { [platformId]: string } — user-editable override of the platform's default label/positioning
  THEME: "theme", // { mode: "preset" | "custom", presetId?: string, imageDataUrl?: string } — popup background
  GOOGLE_ACCOUNT: "googleAccount" // { id, email, name, picture } — display-only, never an OAuth token
};

// Older releases kept every platform's value inside one shared object (for
// example, { tiktok: "…", rednote: "…" }). A read-modify-write from two
// extension contexts could then cause one platform save to overwrite the other.
// New records use one storage key per platform. Getters still read the legacy
// object as a fallback, so existing users keep their settings without a risky
// one-time migration.
const PLATFORM_KEY_PREFIX = "platform:";
const platformKey = (group, platformId) => `${PLATFORM_KEY_PREFIX}${group}:${platformId}`;
const writeQueues = new Map();

function enqueueWrite(key, task) {
  const previous = writeQueues.get(key) || Promise.resolve();
  const next = previous.catch(() => {}).then(task);
  const tracked = next.finally(() => {
    if (writeQueues.get(key) === tracked) writeQueues.delete(key);
  });
  writeQueues.set(key, tracked);
  return tracked;
}

async function getPlatformValue(group, legacyKey, platformId) {
  const key = platformKey(group, platformId);
  const stored = await chrome.storage.local.get([key, legacyKey]);
  if (Object.prototype.hasOwnProperty.call(stored, key)) return stored[key];
  return stored[legacyKey]?.[platformId];
}

export async function getSelectedPlatform() {
  const { [KEYS.SELECTED_PLATFORM]: v } = await chrome.storage.local.get(KEYS.SELECTED_PLATFORM);
  // New installs open the first tab. Existing users keep their saved selection,
  // so this does not disrupt an in-progress post.
  return v || "tiktok";
}

export async function setSelectedPlatform(platformId) {
  await chrome.storage.local.set({ [KEYS.SELECTED_PLATFORM]: platformId });
}

export async function getDriveFolderId(platformId) {
  return (await getPlatformValue("driveFolders", KEYS.DRIVE_FOLDERS, platformId)) || "";
}

export async function setDriveFolderId(platformId, folderId) {
  const key = platformKey("driveFolders", platformId);
  await enqueueWrite(key, () => chrome.storage.local.set({ [key]: folderId }));
}

export async function getFieldMap(platformId) {
  return (await getPlatformValue("fieldMap", KEYS.FIELD_MAP, platformId)) || null;
}

export async function setFieldMap(platformId, map) {
  const key = platformKey("fieldMap", platformId);
  await enqueueWrite(key, () => chrome.storage.local.set({ [key]: map }));
}

export async function getRawWeekConfig(platformId) {
  return (await getPlatformValue("weekConfig", KEYS.WEEK_CONFIG, platformId)) || {};
}

export async function setDayConfig(platformId, jsDay, partialConfig) {
  const key = platformKey("weekConfig", platformId);
  await enqueueWrite(key, async () => {
    const current = (await getPlatformValue("weekConfig", KEYS.WEEK_CONFIG, platformId)) || {};
    const next = { ...current, [jsDay]: { ...current[jsDay], ...partialConfig } };
    await chrome.storage.local.set({ [key]: next });
  });
}

/** null means "no override saved yet" — caller should fall back to the platform's default goal. */
export async function getWeeklyGoal(platformId) {
  const value = await getPlatformValue("weeklyGoal", KEYS.WEEKLY_GOAL, platformId);
  return value === undefined ? null : value;
}

export async function setWeeklyGoal(platformId, goal) {
  const key = platformKey("weeklyGoal", platformId);
  await enqueueWrite(key, () => chrome.storage.local.set({ [key]: goal }));
}

export async function getLanguage() {
  const { [KEYS.LANGUAGE]: v } = await chrome.storage.local.get(KEYS.LANGUAGE);
  return v || "zh";
}

export async function setLanguage(lang) {
  await chrome.storage.local.set({ [KEYS.LANGUAGE]: lang });
}

/** null means "not customized yet" — caller should fall back to the platform's default label. */
export async function getPositioning(platformId) {
  const value = await getPlatformValue("positioning", KEYS.POSITIONING, platformId);
  return value === undefined ? null : value;
}

export async function setPositioning(platformId, text) {
  const key = platformKey("positioning", platformId);
  await enqueueWrite(key, () => chrome.storage.local.set({ [key]: text }));
}

/** null means "never checked yet" — caller should show a neutral/unknown state, not "disconnected". */
export async function getDriveStatus(platformId) {
  return (await getPlatformValue("driveStatus", KEYS.DRIVE_STATUS, platformId)) || null;
}

export async function setDriveStatus(platformId, status) {
  const key = platformKey("driveStatus", platformId);
  await enqueueWrite(key, () => chrome.storage.local.set({ [key]: status }));
}

export async function getGoogleAccount() {
  const { [KEYS.GOOGLE_ACCOUNT]: account } = await chrome.storage.local.get(KEYS.GOOGLE_ACCOUNT);
  return account || null;
}

export async function setGoogleAccount(account) {
  if (account) {
    await chrome.storage.local.set({ [KEYS.GOOGLE_ACCOUNT]: account });
  } else {
    await chrome.storage.local.remove(KEYS.GOOGLE_ACCOUNT);
  }
}

const DEFAULT_THEME = { mode: "preset", presetId: "default" };

export async function getTheme() {
  const { [KEYS.THEME]: v } = await chrome.storage.local.get(KEYS.THEME);
  return v || DEFAULT_THEME;
}

export async function setTheme(theme) {
  await chrome.storage.local.set({ [KEYS.THEME]: theme });
}
