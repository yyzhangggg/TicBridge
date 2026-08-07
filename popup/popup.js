import {
  WEEKDAYS,
  TIME_SLOTS,
  mergeWeekConfig,
  buildWeekEntries,
  resolveWeeklyGoal
} from "../lib/schedule.js";
import {
  getSelectedPlatform,
  setSelectedPlatform,
  getDriveFolderId,
  setDriveFolderId,
  getRawWeekConfig,
  setDayConfig,
  getWeeklyGoal,
  setWeeklyGoal,
  getLanguage,
  setLanguage,
  getPositioning,
  setPositioning,
  getTheme,
  setTheme,
  getDriveStatus
} from "../lib/storage.js";
import { parseFolderId } from "../lib/drive.js";
import { t, weekdayLabel, setCurrentLanguage, getCurrentLanguage } from "../lib/i18n.js";
import { labelForError } from "../lib/errors.js";

const pageContentEl = document.getElementById("pageContent");
const PLATFORM_IDS = ["tiktok", "rednote", "bilibili"];
const VALID_PAGES = ["tiktok", "rednote", "bilibili", "profile"];
const DEFAULT_PAGE = "tiktok";

// Solid-color presets for the popup background (Theme section, Profile page).
// "default" matches the shipped look in popup.css (#f8f6f2).
const THEME_PRESETS = [
  { id: "default", color: "#f8f6f2" },
  { id: "sage", color: "#dfe6da" },
  { id: "blush", color: "#f3ddd8" },
  { id: "sand", color: "#ece2cf" },
  { id: "slate", color: "#dbe1e6" },
  { id: "ink", color: "#2a2926" }
];
const MAX_THEME_IMAGE_BYTES = 1.5 * 1024 * 1024;
const THEME_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

function applyTheme(theme) {
  if (theme?.mode === "custom" && theme.imageDataUrl) {
    document.body.style.background = `#f8f6f2 url("${theme.imageDataUrl}") center / cover no-repeat`;
  } else {
    const preset = THEME_PRESETS.find((p) => p.id === theme?.presetId) || THEME_PRESETS[0];
    document.body.style.background = preset.color;
  }
}

const TAB_LABEL_KEYS = {
  tiktok: "tabTiktok",
  rednote: "tabRednote",
  bilibili: "tabBilibili",
  profile: "tabProfile"
};

const FIELD_NAME_KEYS = {
  fileInput: "fieldNameFileInput",
  title: "fieldNameTitle",
  description: "fieldNameDescription",
  tagInput: "fieldNameTagInput"
};

function renderStaticText() {
  document.getElementById("hdSub").textContent = t("appSubtitle");
  document.querySelectorAll(".tab").forEach((btn) => {
    btn.textContent = t(TAB_LABEL_KEYS[btn.dataset.page]);
  });
}

async function getActiveTabForPlatform(platformId) {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab?.id) throw new Error("no-active-tab");

  const url = tab.url || "";
  const expectedPatterns = {
    tiktok: /^https:\/\/(www\.)?tiktok\.com\/(tiktokstudio\/upload|upload)/,
    rednote: /^https:\/\/creator\.xiaohongshu\.com\/publish\/publish/,
    bilibili: /^https:\/\/member\.bilibili\.com\/platform\/upload/
  };
  if (expectedPatterns[platformId] && !expectedPatterns[platformId].test(url)) {
    throw new Error("wrong-page");
  }

  return tab;
}

let currentPage = DEFAULT_PAGE;
let selectedEntry = null;

function renderTabs() {
  document.querySelectorAll(".tab").forEach((btn) => {
    btn.classList.toggle("on", btn.dataset.page === currentPage);
  });
}

// Shows the last-persisted connection result on popup open, without making a live
// Drive call — a fresh check only happens when the user clicks "Save & connect".
function renderCachedStatus(statusEl, cached) {
  if (!cached) {
    statusEl.textContent = t("statusUnknown");
    return;
  }
  const when = new Date(cached.checkedAt).toLocaleString();
  statusEl.textContent = cached.ok
    ? t("connected", cached.fileName, new Date(cached.modifiedTime).toLocaleString()) + t("statusLastChecked", when)
    : t("notConnected", labelForError(cached.code, getCurrentLanguage()), cached.message) + t("statusLastChecked", when);
}

// --- Profile page: one Drive-link block per platform, OAuth kicks in on first save ---
async function renderProfilePage() {
  const wrap = document.createElement("div");
  wrap.appendChild(await buildGoogleAccountSection());

  for (const platformId of PLATFORM_IDS) {
    const box = document.createElement("div");
    box.className = "drive-box";

    const positioningLabel = document.createElement("div");
    positioningLabel.className = "field-label";
    positioningLabel.textContent = `${t(TAB_LABEL_KEYS[platformId])} — ${t("positioningLabel")}`;
    box.appendChild(positioningLabel);

    const positioningInput = document.createElement("textarea");
    positioningInput.className = "positioning-input";
    positioningInput.rows = 2;
    positioningInput.placeholder = t("positioningPlaceholder");
    positioningInput.value = (await getPositioning(platformId)) ?? "";
    positioningInput.addEventListener("change", async () => {
      await setPositioning(platformId, positioningInput.value.trim());
    });
    box.appendChild(positioningInput);

    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = t("drivePlaceholder");
    input.value = await getDriveFolderId(platformId);
    box.appendChild(input);

    const goalRow = document.createElement("label");
    goalRow.className = "goal-row";
    goalRow.textContent = t("goalPrefix");
    const goalInput = document.createElement("input");
    goalInput.type = "number";
    goalInput.min = "0";
    goalInput.max = "10";
    goalInput.className = "goal-input";
    const storedGoal = await getWeeklyGoal(platformId);
    goalInput.value = resolveWeeklyGoal(platformId, storedGoal);
    goalRow.appendChild(goalInput);
    goalRow.appendChild(document.createTextNode(t("goalSuffix")));
    goalInput.addEventListener("change", async () => {
      const goal = Math.max(0, Math.min(10, Number(goalInput.value) || 0));
      goalInput.value = goal;
      await setWeeklyGoal(platformId, goal);
    });
    box.appendChild(goalRow);

    const actions = document.createElement("div");
    actions.className = "drive-box-actions";
    const saveBtn = document.createElement("button");
    saveBtn.className = "btn-secondary";
    saveBtn.textContent = t("saveConnect");
    actions.appendChild(saveBtn);
    box.appendChild(actions);

    const status = document.createElement("p");
    status.className = "drive-status";
    renderCachedStatus(status, await getDriveStatus(platformId));
    box.appendChild(status);

    saveBtn.addEventListener("click", async () => {
      const folderId = parseFolderId(input.value);
      await setDriveFolderId(platformId, folderId);
      status.textContent = t("connecting");
      // background.js persists the result to storage as it checks, so a later
      // popup open can show this outcome again without another live API call.
      const response = await chrome.runtime.sendMessage({ type: "CHECK_DRIVE_CONNECTION", platformId });
      if (response?.error) {
        status.textContent = t("notConnected", response.reason, response.message);
      } else if (response?.file) {
        const when = new Date(response.file.modifiedTime).toLocaleString();
        status.textContent = t("connected", response.file.name, when);
      }
    });

    wrap.appendChild(box);
  }

  const hint = document.createElement("p");
  hint.className = "hint";
  hint.textContent = t("profileHint");
  wrap.appendChild(hint);

  wrap.appendChild(await buildThemeSection());
  wrap.appendChild(buildDisclaimerSection());

  pageContentEl.replaceChildren(wrap);
}

// --- Profile page footer: risk disclaimer (autofill = form-filling only, ToS risk is real) ---
function buildDisclaimerSection() {
  const section = document.createElement("div");
  section.className = "disclaimer-box";

  const heading = document.createElement("div");
  heading.className = "field-label";
  heading.textContent = t("disclaimerTitle");
  section.appendChild(heading);

  const body = document.createElement("p");
  body.className = "hint";
  body.textContent = t("disclaimerBody");
  section.appendChild(body);

  return section;
}

// The popup deliberately asks background.js to sign in. Account metadata is safe
// to display here, while the OAuth bearer token never leaves the service worker.
async function buildGoogleAccountSection() {
  const section = document.createElement("div");
  section.className = "google-account-box";

  const heading = document.createElement("div");
  heading.className = "field-label";
  heading.textContent = t("googleAccountTitle");
  section.appendChild(heading);

  const response = await chrome.runtime.sendMessage({ type: "GET_GOOGLE_ACCOUNT" });
  let account = response?.account || null;

  const status = document.createElement("p");
  status.className = "google-account-status";
  const renderAccount = () => {
    status.textContent = account?.email ? t("googleSignedInAs", account.email) : t("googleNotSignedIn");
  };
  renderAccount();
  section.appendChild(status);

  const actions = document.createElement("div");
  actions.className = "drive-box-actions";
  const loginBtn = document.createElement("button");
  loginBtn.type = "button";
  loginBtn.className = "btn-secondary";
  loginBtn.textContent = t("googleLogin");
  actions.appendChild(loginBtn);

  const switchBtn = document.createElement("button");
  switchBtn.type = "button";
  switchBtn.className = "btn-secondary";
  switchBtn.textContent = t("googleSwitch");
  switchBtn.disabled = !account;
  actions.appendChild(switchBtn);
  section.appendChild(actions);

  async function signIn(type) {
    loginBtn.disabled = true;
    switchBtn.disabled = true;
    status.textContent = t("googleSigningIn");
    try {
      const result = await chrome.runtime.sendMessage({ type });
      if (result?.error || !result?.account) throw new Error(result?.reason || "No Google account returned");
      account = result.account;
      renderAccount();
      switchBtn.disabled = false;
    } catch (err) {
      status.textContent = t("googleLoginFailed", err.message);
      switchBtn.disabled = !account;
    } finally {
      loginBtn.disabled = false;
    }
  }

  loginBtn.addEventListener("click", () => signIn("LOGIN_GOOGLE"));
  switchBtn.addEventListener("click", () => signIn("SWITCH_GOOGLE_ACCOUNT"));
  return section;
}

// --- Theme block (inside Profile page): solid-color presets, or a user-uploaded background image ---
async function buildThemeSection() {
  const section = document.createElement("div");
  section.className = "theme-box";

  const heading = document.createElement("div");
  heading.className = "field-label";
  heading.textContent = t("themeSectionTitle");
  section.appendChild(heading);

  const theme = await getTheme();

  const swatchRow = document.createElement("div");
  swatchRow.className = "swatch-row";
  THEME_PRESETS.forEach((preset) => {
    const swatch = document.createElement("button");
    swatch.type = "button";
    swatch.className = "swatch";
    swatch.style.background = preset.color;
    swatch.title = preset.id;
    if (theme.mode !== "custom" && theme.presetId === preset.id) swatch.classList.add("on");
    swatch.addEventListener("click", async () => {
      const nextTheme = { mode: "preset", presetId: preset.id };
      await setTheme(nextTheme);
      applyTheme(nextTheme);
      section.querySelectorAll(".swatch").forEach((el) => el.classList.remove("on"));
      swatch.classList.add("on");
      status.textContent = "";
    });
    swatchRow.appendChild(swatch);
  });
  section.appendChild(swatchRow);

  const uploadRow = document.createElement("div");
  uploadRow.className = "drive-box-actions";

  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = THEME_IMAGE_TYPES.join(",");
  fileInput.style.display = "none";

  const uploadBtn = document.createElement("button");
  uploadBtn.type = "button";
  uploadBtn.className = "btn-secondary";
  uploadBtn.textContent = t("themeUploadBtn");
  uploadBtn.addEventListener("click", () => fileInput.click());
  uploadRow.appendChild(uploadBtn);
  uploadRow.appendChild(fileInput);

  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className = "btn-secondary";
  removeBtn.textContent = t("themeRemoveCustomBtn");
  removeBtn.style.display = theme.mode === "custom" ? "" : "none";
  removeBtn.addEventListener("click", async () => {
    const nextTheme = { mode: "preset", presetId: "default" };
    await setTheme(nextTheme);
    applyTheme(nextTheme);
    removeBtn.style.display = "none";
    status.textContent = "";
    section.querySelectorAll(".swatch").forEach((el) => el.classList.toggle("on", el.title === "default"));
  });
  uploadRow.appendChild(removeBtn);
  section.appendChild(uploadRow);

  const uploadHint = document.createElement("p");
  uploadHint.className = "hint";
  uploadHint.textContent = t("themeUploadHint");
  section.appendChild(uploadHint);

  const status = document.createElement("p");
  status.className = "drive-status";
  if (theme.mode === "custom") status.textContent = t("themeCustomActive");
  section.appendChild(status);

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    if (!THEME_IMAGE_TYPES.includes(file.type)) {
      status.textContent = t("themeUnsupportedFormat");
      fileInput.value = "";
      return;
    }
    if (file.size > MAX_THEME_IMAGE_BYTES) {
      status.textContent = t("themeTooLarge");
      fileInput.value = "";
      return;
    }
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    const nextTheme = { mode: "custom", imageDataUrl: dataUrl };
    await setTheme(nextTheme);
    applyTheme(nextTheme);
    section.querySelectorAll(".swatch").forEach((el) => el.classList.remove("on"));
    removeBtn.style.display = "";
    status.textContent = t("themeCustomActive");
  });

  return section;
}

// --- Platform pages: Mon-Sun week list + detail + autofill ---
async function renderPlatformPage(platformId) {
  const rawConfig = await getRawWeekConfig(platformId);
  const weekConfig = mergeWeekConfig(platformId, rawConfig);
  const rows = buildWeekEntries(platformId, weekConfig);
  const goal = resolveWeeklyGoal(platformId, await getWeeklyGoal(platformId));
  const activeCount = rows.filter((r) => r.entry).length;

  const wrap = document.createElement("div");

  const progress = document.createElement("p");
  progress.className = "goal-progress";
  progress.textContent = goal > 0 ? t("goalProgressWithGoal", activeCount, goal) : t("goalProgressNoGoal", activeCount);
  if (goal > 0 && activeCount >= goal) progress.classList.add("goal-met");
  wrap.appendChild(progress);

  const list = document.createElement("div");
  list.className = "week-list";

  rows.forEach((row) => {
    const rowEl = document.createElement("div");
    rowEl.className = "day-row" + (row.entry ? " active" : " inactive");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = row.config.active;
    checkbox.addEventListener("click", async (e) => {
      e.stopPropagation();
      const turningOn = checkbox.checked;
      if (turningOn && !row.config.active && goal > 0 && activeCount + 1 > goal) {
        checkbox.checked = false;
        const statusEl = document.getElementById("autofillStatus");
        if (statusEl) {
          statusEl.classList.remove("fail");
          statusEl.textContent = t("goalMetWarning", goal);
        }
        return;
      }
      await setDayConfig(platformId, row.jsDay, { active: checkbox.checked });
      if (selectedEntry?.weekday === row.jsDay) selectedEntry = null;
      renderPlatformPage(platformId);
    });
    rowEl.appendChild(checkbox);

    const label = document.createElement("span");
    label.className = "day-label";
    label.textContent = weekdayLabel(row.key);
    rowEl.appendChild(label);

    const content = document.createElement("span");
    content.className = "day-content";
    content.textContent = row.entry ? `${row.entry.contentType} — ${row.entry.title}` : t("notScheduled");
    if (row.entry) {
      content.addEventListener("click", () => selectEntry(row, rowEl));
    }
    rowEl.appendChild(content);

    const timeSelect = document.createElement("select");
    timeSelect.className = "time-select";
    TIME_SLOTS.forEach((slot) => {
      const opt = document.createElement("option");
      opt.value = slot;
      opt.textContent = slot;
      if (slot === row.config.time) opt.selected = true;
      timeSelect.appendChild(opt);
    });
    timeSelect.addEventListener("click", (e) => e.stopPropagation());
    timeSelect.addEventListener("change", async () => {
      await setDayConfig(platformId, row.jsDay, { time: timeSelect.value });
      if (selectedEntry?.weekday === row.jsDay) {
        selectedEntry = { ...selectedEntry, time: timeSelect.value };
        document.getElementById("detailTime").textContent = timeSelect.value;
      }
    });
    rowEl.appendChild(timeSelect);

    if (selectedEntry && row.entry && selectedEntry.weekday === row.jsDay) {
      rowEl.classList.add("selected");
    }

    list.appendChild(rowEl);
  });

  wrap.appendChild(list);

  // Always-present autofill window for this page, not just something that appears
  // once you pick a day — it starts in a placeholder/disabled state instead.
  const detail = document.createElement("section");
  detail.className = "detail";
  detail.id = "detailPanel";
  detail.innerHTML = `
    <div class="detail-row">
      <span class="detail-label" id="detailType"></span>
      <span class="detail-time" id="detailTime"></span>
    </div>
    <input class="detail-title" id="detailTitle" type="text" />
    <textarea class="detail-desc" id="detailDesc" rows="3"></textarea>
    <input class="detail-tags" id="detailTags" type="text" placeholder="${t("tagsInputPlaceholder")}" />
    <button class="btn-autofill" id="autofillBtn">${t("autofillBtn")}</button>
    <button class="btn-secondary" id="mapFieldsBtn">${t("mapFieldsBtn")}</button>
    <div class="autofill-status" id="autofillStatus"></div>
    <div class="autofill-preview" id="autofillPreview" style="display:none;"></div>
    <div class="autofill-confirm-actions" id="autofillConfirmActions" style="display:none;">
      <button class="btn-autofill" id="confirmFillBtn">${t("confirmFillBtn")}</button>
      <button class="btn-secondary" id="cancelFillBtn">${t("cancelFillBtn")}</button>
    </div>
  `;
  wrap.appendChild(detail);

  pageContentEl.replaceChildren(wrap);

  fillDetail(selectedEntry);

  function updateSelectedRowContent() {
    if (!selectedEntry) return;
    const rowEl = list.querySelector(".day-row.selected");
    if (rowEl) rowEl.querySelector(".day-content").textContent = `${selectedEntry.contentType} — ${selectedEntry.title}`;
  }

  document.getElementById("detailTitle").addEventListener("change", async (e) => {
    if (!selectedEntry) return;
    await setDayConfig(platformId, selectedEntry.weekday, { title: e.target.value });
    selectedEntry = { ...selectedEntry, title: e.target.value };
    updateSelectedRowContent();
  });

  document.getElementById("detailDesc").addEventListener("change", async (e) => {
    if (!selectedEntry) return;
    await setDayConfig(platformId, selectedEntry.weekday, { description: e.target.value });
    selectedEntry = { ...selectedEntry, description: e.target.value };
  });

  document.getElementById("detailTags").addEventListener("change", async (e) => {
    if (!selectedEntry) return;
    const tags = e.target.value.split(",").map((s) => s.trim()).filter(Boolean);
    e.target.value = tags.join(", ");
    await setDayConfig(platformId, selectedEntry.weekday, { tags });
    selectedEntry = { ...selectedEntry, tags };
  });

  // A preview taken at PREFLIGHT time is what confirmFillBtn actually sends —
  // not whatever selectedEntry happens to be when the user clicks confirm — so
  // the confirmation is always for the exact content that was previewed, even
  // if the user edits the title/desc/tags fields in between.
  let pendingEntry = null;

  function resetAutofillPreview() {
    pendingEntry = null;
    document.getElementById("autofillPreview").style.display = "none";
    document.getElementById("autofillPreview").replaceChildren();
    document.getElementById("autofillConfirmActions").style.display = "none";
  }

  function renderPreflightIssues(statusEl, previewEl, issues) {
    statusEl.classList.add("fail");
    statusEl.textContent = t("preflightFailed");
    previewEl.replaceChildren();
    issues.forEach((issue) => {
      const line = document.createElement("div");
      const fieldLabel = t(FIELD_NAME_KEYS[issue.field]) || issue.field;
      line.textContent = t("preflightFieldLine", fieldLabel, issue.reason);
      previewEl.appendChild(line);
    });
    previewEl.style.display = "";
  }

  function renderPreflightPreview(statusEl, previewEl, preview) {
    statusEl.classList.remove("fail");
    statusEl.textContent = t("preflightOk");
    previewEl.replaceChildren();
    const titleLine = document.createElement("div");
    titleLine.textContent = t("previewTitleLabel") + (preview.title || "");
    previewEl.appendChild(titleLine);
    const descLine = document.createElement("div");
    descLine.textContent = t("previewDescLabel") + (preview.description || "");
    previewEl.appendChild(descLine);
    if (preview.tags?.length) {
      const tagsLine = document.createElement("div");
      tagsLine.textContent = t("previewTagsLabel") + preview.tags.join(", ");
      previewEl.appendChild(tagsLine);
    }
    previewEl.style.display = "";
  }

  document.getElementById("autofillBtn").addEventListener("click", async () => {
    if (!selectedEntry) return;
    const statusEl = document.getElementById("autofillStatus");
    const previewEl = document.getElementById("autofillPreview");
    const confirmActionsEl = document.getElementById("autofillConfirmActions");
    resetAutofillPreview();
    statusEl.classList.remove("fail");
    statusEl.textContent = t("preflightRunning");
    try {
      const tab = await getActiveTabForPlatform(platformId);
      const response = await chrome.tabs.sendMessage(tab.id, { type: "PREFLIGHT", entry: selectedEntry });
      if (response?.ok) {
        pendingEntry = { ...selectedEntry };
        renderPreflightPreview(statusEl, previewEl, response.preview);
        confirmActionsEl.style.display = "";
      } else {
        renderPreflightIssues(statusEl, previewEl, response?.issues || []);
      }
    } catch (err) {
      statusEl.classList.add("fail");
      statusEl.textContent = t("fillFailedNoTab");
    }
  });

  document.getElementById("cancelFillBtn").addEventListener("click", () => {
    resetAutofillPreview();
    const statusEl = document.getElementById("autofillStatus");
    statusEl.classList.remove("fail");
    statusEl.textContent = "";
  });

  document.getElementById("confirmFillBtn").addEventListener("click", async () => {
    if (!pendingEntry) return;
    const statusEl = document.getElementById("autofillStatus");
    const entryToFill = pendingEntry;
    resetAutofillPreview();
    statusEl.classList.remove("fail");
    statusEl.textContent = t("filling");
    try {
      const tab = await getActiveTabForPlatform(platformId);
      const response = await chrome.tabs.sendMessage(tab.id, {
        type: "AUTOFILL",
        entry: { ...entryToFill, confirmed: true }
      });
      if (response?.ok) {
        statusEl.textContent = t("filled");
      } else {
        statusEl.classList.add("fail");
        statusEl.textContent = t("fillFailed", response?.reason || t("fillFailedGeneric"));
      }
    } catch (err) {
      statusEl.classList.add("fail");
      statusEl.textContent = t("fillFailedNoTab");
    }
  });

  document.getElementById("mapFieldsBtn").addEventListener("click", async () => {
    resetAutofillPreview();
    const statusEl = document.getElementById("autofillStatus");
    statusEl.classList.remove("fail");
    statusEl.textContent = t("mappingHint");
    try {
      const tab = await getActiveTabForPlatform(platformId);
      const response = await chrome.tabs.sendMessage(tab.id, { type: "MAP_FIELDS", platformId });
      statusEl.textContent = response?.ok ? t("mappingSaved") : t("mappingFailed");
    } catch (err) {
      statusEl.classList.add("fail");
      statusEl.textContent = t("pageNotConnected");
    }
  });

  function selectEntry(row, rowEl) {
    selectedEntry = row.entry;
    document.querySelectorAll(".day-row.selected").forEach((el) => el.classList.remove("selected"));
    rowEl.classList.add("selected");
    fillDetail(row.entry);
    resetAutofillPreview();
    const statusEl = document.getElementById("autofillStatus");
    statusEl.textContent = "";
    statusEl.classList.remove("fail");
  }
}

function fillDetail(entry) {
  const autofillBtn = document.getElementById("autofillBtn");
  autofillBtn.disabled = !entry;

  const titleEl = document.getElementById("detailTitle");
  const descEl = document.getElementById("detailDesc");
  const tagsEl = document.getElementById("detailTags");

  if (!entry) {
    document.getElementById("detailType").textContent = "";
    document.getElementById("detailTime").textContent = "";
    titleEl.value = "";
    titleEl.placeholder = t("selectDayHint");
    titleEl.disabled = true;
    descEl.value = "";
    descEl.disabled = true;
    tagsEl.value = "";
    tagsEl.disabled = true;
    return;
  }

  document.getElementById("detailType").textContent = entry.contentType;
  document.getElementById("detailTime").textContent = entry.time;
  titleEl.value = entry.title;
  titleEl.disabled = false;
  descEl.value = entry.description;
  descEl.disabled = false;
  tagsEl.value = entry.tags.join(", ");
  tagsEl.disabled = false;
}

function normalizePageId(pageId) {
  return VALID_PAGES.includes(pageId) ? pageId : DEFAULT_PAGE;
}

async function renderPage(pageId) {
  currentPage = normalizePageId(pageId);
  selectedEntry = null;
  renderTabs();

  if (currentPage === "profile") {
    await renderProfilePage();
  } else {
    await renderPlatformPage(currentPage);
  }
}

document.getElementById("pageTabs").addEventListener("click", async (e) => {
  const btn = e.target.closest(".tab");
  if (!btn) return;
  const pageId = normalizePageId(btn.dataset.page);
  await setSelectedPlatform(pageId);
  renderPage(pageId);
});

document.getElementById("langSelect").addEventListener("change", async (e) => {
  const lang = e.target.value;
  await setLanguage(lang);
  setCurrentLanguage(lang);
  document.documentElement.lang = lang;
  renderStaticText();
  renderPage(currentPage);
});

(async function init() {
  const lang = await getLanguage();
  setCurrentLanguage(lang);
  document.documentElement.lang = lang;
  document.getElementById("langSelect").value = lang;
  renderStaticText();

  applyTheme(await getTheme());

  const lastPage = normalizePageId(await getSelectedPlatform());
  renderPage(lastPage);
})();
