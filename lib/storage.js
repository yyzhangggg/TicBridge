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
  const { [KEYS.DRIVE_FOLDERS]: all } = await chrome.storage.local.get(KEYS.DRIVE_FOLDERS);
  return (all && all[platformId]) || "";
}

export async function setDriveFolderId(platformId, folderId) {
  const { [KEYS.DRIVE_FOLDERS]: all } = await chrome.storage.local.get(KEYS.DRIVE_FOLDERS);
  const next = { ...(all || {}), [platformId]: folderId };
  await chrome.storage.local.set({ [KEYS.DRIVE_FOLDERS]: next });
}

export async function getFieldMap(platformId) {
  const { [KEYS.FIELD_MAP]: all } = await chrome.storage.local.get(KEYS.FIELD_MAP);
  return (all && all[platformId]) || null;
}

export async function setFieldMap(platformId, map) {
  const { [KEYS.FIELD_MAP]: all } = await chrome.storage.local.get(KEYS.FIELD_MAP);
  const next = { ...(all || {}), [platformId]: map };
  await chrome.storage.local.set({ [KEYS.FIELD_MAP]: next });
}

export async function getRawWeekConfig(platformId) {
  const { [KEYS.WEEK_CONFIG]: all } = await chrome.storage.local.get(KEYS.WEEK_CONFIG);
  return (all && all[platformId]) || {};
}

export async function setDayConfig(platformId, jsDay, partialConfig) {
  const { [KEYS.WEEK_CONFIG]: all } = await chrome.storage.local.get(KEYS.WEEK_CONFIG);
  const platformConfig = (all && all[platformId]) || {};
  const nextPlatformConfig = { ...platformConfig, [jsDay]: { ...platformConfig[jsDay], ...partialConfig } };
  const next = { ...(all || {}), [platformId]: nextPlatformConfig };
  await chrome.storage.local.set({ [KEYS.WEEK_CONFIG]: next });
}

/** null means "no override saved yet" — caller should fall back to the platform's default goal. */
export async function getWeeklyGoal(platformId) {
  const { [KEYS.WEEKLY_GOAL]: all } = await chrome.storage.local.get(KEYS.WEEKLY_GOAL);
  return all && platformId in all ? all[platformId] : null;
}

export async function setWeeklyGoal(platformId, goal) {
  const { [KEYS.WEEKLY_GOAL]: all } = await chrome.storage.local.get(KEYS.WEEKLY_GOAL);
  const next = { ...(all || {}), [platformId]: goal };
  await chrome.storage.local.set({ [KEYS.WEEKLY_GOAL]: next });
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
  const { [KEYS.POSITIONING]: all } = await chrome.storage.local.get(KEYS.POSITIONING);
  return all && platformId in all ? all[platformId] : null;
}

export async function setPositioning(platformId, text) {
  const { [KEYS.POSITIONING]: all } = await chrome.storage.local.get(KEYS.POSITIONING);
  const next = { ...(all || {}), [platformId]: text };
  await chrome.storage.local.set({ [KEYS.POSITIONING]: next });
}

/** null means "never checked yet" — caller should show a neutral/unknown state, not "disconnected". */
export async function getDriveStatus(platformId) {
  const { [KEYS.DRIVE_STATUS]: all } = await chrome.storage.local.get(KEYS.DRIVE_STATUS);
  return (all && all[platformId]) || null;
}

export async function setDriveStatus(platformId, status) {
  const { [KEYS.DRIVE_STATUS]: all } = await chrome.storage.local.get(KEYS.DRIVE_STATUS);
  const next = { ...(all || {}), [platformId]: status };
  await chrome.storage.local.set({ [KEYS.DRIVE_STATUS]: next });
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
