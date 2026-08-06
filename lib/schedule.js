// Schedule engine — pure data + pure functions, no chrome.* calls here so it can be
// unit-tested / reused by background.js (service worker) and popup.js (UI) alike.
//
// Model: a recurring Mon-Sun week template per platform, not a specific month's calendar dates.
// Each weekday is either inactive, or active with a chosen time slot — both editable by the
// user (see storage.js getWeekConfig/setDayConfig). PLATFORMS below intentionally ships with no
// content, no active days, and no goal: every user starts from a blank slate and fills in their
// own title/description/tags/positioning per day.

export const PLATFORMS = {
  tiktok: {
    id: "tiktok",
    label: "TikTok",
    defaultActiveDays: [],
    weeklyGoal: 0,
    contentType: "",
    structureNote: "",
    hooks: [{ zh: "", en: "" }],
    tags: []
  },

  rednote: {
    id: "rednote",
    label: "小红书",
    defaultActiveDays: [],
    weeklyGoal: 0,
    contentType: "",
    structureNote: "",
    hooks: [{ zh: "", en: "" }],
    tags: []
  },

  bilibili: {
    id: "bilibili",
    label: "Bilibili",
    defaultActiveDays: [],
    weeklyGoal: 0,
    contentType: "",
    structureNote: "",
    hooks: [{ zh: "", en: "" }],
    tags: []
  }
};

// Monday-first, matching the requested display order. jsDay is JS's Date#getDay() value (Sun=0).
export const WEEKDAYS = [
  { key: "mon", jsDay: 1, label: "周一" },
  { key: "tue", jsDay: 2, label: "周二" },
  { key: "wed", jsDay: 3, label: "周三" },
  { key: "thu", jsDay: 4, label: "周四" },
  { key: "fri", jsDay: 5, label: "周五" },
  { key: "sat", jsDay: 6, label: "周六" },
  { key: "sun", jsDay: 0, label: "周日" }
];

export const TIME_SLOTS = ["09:00", "12:00", "15:00", "18:00", "20:00", "21:00"];
const DEFAULT_TIME_SLOT = "18:00";

function buildDescription(platform, hook) {
  const lines = [];
  if (hook.zh) lines.push(hook.zh);
  if (hook.en) lines.push(hook.en);
  if (platform.structureNote) lines.push("", platform.structureNote);
  return lines.join("\n");
}

/** storedGoal is whatever storage.js's getWeeklyGoal returned — null falls back to the platform default. */
export function resolveWeeklyGoal(platformId, storedGoal) {
  return storedGoal ?? PLATFORMS[platformId].weeklyGoal;
}

/** The out-of-the-box state for one weekday, before any user edits. */
export function defaultDayConfig(platformId, jsDay) {
  const platform = PLATFORMS[platformId];
  return {
    active: platform.defaultActiveDays.includes(jsDay),
    time: DEFAULT_TIME_SLOT,
    contentType: platform.contentType
  };
}

/** Fills in any weekday missing from a partial stored config with its default. */
export function mergeWeekConfig(platformId, rawConfigByDay) {
  const merged = {};
  for (const { jsDay } of WEEKDAYS) {
    merged[jsDay] = { ...defaultDayConfig(platformId, jsDay), ...(rawConfigByDay?.[jsDay] || {}) };
  }
  return merged;
}

/**
 * Builds the postable content (title/description/tags) for one active weekday, or null if inactive.
 * dayConfig.title/description/tags — when present — are user edits (saved via storage.js
 * setDayConfig) that override the platform defaults below; those defaults are blank out of the
 * box, so content always comes from the user, never pre-written for them.
 */
export function buildEntry(platformId, jsDay, dayConfig) {
  if (!dayConfig.active) return null;

  const platform = PLATFORMS[platformId];
  const contentType = dayConfig.contentType || platform.contentType;
  const hook = platform.hooks[0] || { zh: "", en: "" };

  return {
    platformId,
    weekday: jsDay,
    time: dayConfig.time,
    contentType,
    title: dayConfig.title ?? hook.zh,
    description: dayConfig.description ?? buildDescription(platform, hook),
    tags: dayConfig.tags ?? platform.tags
  };
}

/** One row per Mon-Sun weekday: { key, jsDay, label, config, entry }. entry is null when inactive. */
export function buildWeekEntries(platformId, weekConfig) {
  return WEEKDAYS.map(({ key, jsDay, label }) => ({
    key,
    jsDay,
    label,
    config: weekConfig[jsDay],
    entry: buildEntry(platformId, jsDay, weekConfig[jsDay])
  }));
}
