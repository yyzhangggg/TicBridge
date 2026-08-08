// Renders the scheduling/autofill panel UI into a shadow root. Ported from the
// old popup/popup.js (which ran inside Chrome's native popup window), adapted
// for running inside a <div> injected into the platform's own page:
//   - element lookups are scoped to the shadow root instead of the top document
//   - there is no other tab to find/message: autofill calls the platform's own
//     content-script functions (autofillApi) directly, in the same JS realm
//   - autofill/map-fields are only actionable while the selected tab matches
//     platformId (the platform this content script — and its page — actually is);
//     other tabs remain usable for viewing/editing that platform's schedule
import {
  WEEKDAYS,
  TIME_SLOTS,
  mergeWeekConfig,
  buildWeekEntries,
  resolveWeeklyGoal
} from "./schedule.js";
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
} from "./storage.js";
import { parseFolderId } from "./drive.js";
import { t, weekdayLabel, setCurrentLanguage, getCurrentLanguage } from "./i18n.js";
import { labelForError } from "./errors.js";

const PLATFORM_IDS = ["tiktok", "rednote", "bilibili"];
const VALID_PAGES = ["tiktok", "rednote", "bilibili", "profile"];
const DEFAULT_PAGE = "tiktok";

// Solid-color presets for the panel background (Theme section, Profile page).
// "default" matches the shipped look in popup-panel-styles.js (#f8f6f2).
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

function normalizePageId(pageId) {
  return VALID_PAGES.includes(pageId) ? pageId : DEFAULT_PAGE;
}

/**
 * Mounts the panel into `root` (a ShadowRoot already containing the markup
 * built by popup-overlay.js's buildPanelMarkup — i.e. #appBg/#hdSub/#langSelect/
 * #panelClose/#pageTabs/#pageContent already exist).
 *
 * options:
 *   platformId  - which platform this content script (and its page) is: "tiktok" | "bilibili" | "rednote"
 *   autofillApi - { runPreflight, runAutofill, runFieldMapping } returned by this
 *                 platform's registerAutofill() call, invoked directly (same page, same JS realm)
 *   onClose     - called when the user dismisses the panel (× button)
 *   onRequestHide / onRequestShow - hide/show the panel host while field-mapping
 *                 is in progress, so the panel itself can't be mistaken for a page field to map
 */
export function mountPopupPanel(root, { platformId, autofillApi, onClose, onRequestHide, onRequestShow }) {
  const pageContentEl = root.getElementById("pageContent");
  const appBgEl = root.getElementById("appBg");

  function applyTheme(theme) {
    if (theme?.mode === "custom" && theme.imageDataUrl) {
      appBgEl.style.background = `#f8f6f2 url("${theme.imageDataUrl}") center / cover no-repeat`;
    } else {
      const preset = THEME_PRESETS.find((p) => p.id === theme?.presetId) || THEME_PRESETS[0];
      appBgEl.style.background = preset.color;
    }
  }

  function renderStaticText() {
    root.getElementById("hdSub").textContent = t("appSubtitle");
    root.querySelectorAll(".tab").forEach((btn) => {
      btn.textContent = t(TAB_LABEL_KEYS[btn.dataset.page]);
    });
  }

  let currentPage = DEFAULT_PAGE;
  let selectedEntry = null;

  function renderTabs() {
    root.querySelectorAll(".tab").forEach((btn) => {
      btn.classList.toggle("on", btn.dataset.page === currentPage);
    });
  }

  // Shows the last-persisted connection result on panel open, without making a live
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

    for (const pid of PLATFORM_IDS) {
      const box = document.createElement("div");
      box.className = "drive-box";

      const positioningLabel = document.createElement("div");
      positioningLabel.className = "field-label";
      positioningLabel.textContent = `${t(TAB_LABEL_KEYS[pid])} — ${t("positioningLabel")}`;
      box.appendChild(positioningLabel);

      const positioningInput = document.createElement("textarea");
      positioningInput.className = "positioning-input";
      positioningInput.rows = 2;
      positioningInput.placeholder = t("positioningPlaceholder");
      positioningInput.value = (await getPositioning(pid)) ?? "";
      positioningInput.addEventListener("change", async () => {
        await setPositioning(pid, positioningInput.value.trim());
      });
      box.appendChild(positioningInput);

      const input = document.createElement("input");
      input.type = "text";
      input.placeholder = t("drivePlaceholder");
      input.value = await getDriveFolderId(pid);
      box.appendChild(input);

      const goalRow = document.createElement("label");
      goalRow.className = "goal-row";
      goalRow.textContent = t("goalPrefix");
      const goalInput = document.createElement("input");
      goalInput.type = "number";
      goalInput.min = "0";
      goalInput.max = "10";
      goalInput.className = "goal-input";
      const storedGoal = await getWeeklyGoal(pid);
      goalInput.value = resolveWeeklyGoal(pid, storedGoal);
      goalRow.appendChild(goalInput);
      goalRow.appendChild(document.createTextNode(t("goalSuffix")));
      goalInput.addEventListener("change", async () => {
        const goal = Math.max(0, Math.min(10, Number(goalInput.value) || 0));
        goalInput.value = goal;
        await setWeeklyGoal(pid, goal);
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
      renderCachedStatus(status, await getDriveStatus(pid));
      box.appendChild(status);

      saveBtn.addEventListener("click", async () => {
        const folderId = parseFolderId(input.value);
        await setDriveFolderId(pid, folderId);
        status.textContent = t("connecting");
        // background.js persists the result to storage as it checks, so a later
        // panel open can show this outcome again without another live API call.
        const response = await chrome.runtime.sendMessage({ type: "CHECK_DRIVE_CONNECTION", platformId: pid });
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

  // The panel deliberately asks background.js to sign in. Account metadata is safe
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
  async function renderPlatformPage(pageId) {
    const rawConfig = await getRawWeekConfig(pageId);
    const weekConfig = mergeWeekConfig(pageId, rawConfig);
    const rows = buildWeekEntries(pageId, weekConfig);
    const goal = resolveWeeklyGoal(pageId, await getWeeklyGoal(pageId));
    const activeCount = rows.filter((r) => r.entry).length;
    const isOwnPlatform = pageId === platformId;

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
          const statusEl = root.getElementById("autofillStatus");
          if (statusEl) {
            statusEl.classList.remove("fail");
            statusEl.textContent = t("goalMetWarning", goal);
          }
          return;
        }
        await setDayConfig(pageId, row.jsDay, { active: checkbox.checked });
        if (selectedEntry?.weekday === row.jsDay) selectedEntry = null;
        renderPlatformPage(pageId);
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
        await setDayConfig(pageId, row.jsDay, { time: timeSelect.value });
        if (selectedEntry?.weekday === row.jsDay) {
          selectedEntry = { ...selectedEntry, time: timeSelect.value };
          root.getElementById("detailTime").textContent = timeSelect.value;
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

    root.getElementById("detailTitle").addEventListener("change", async (e) => {
      if (!selectedEntry) return;
      await setDayConfig(pageId, selectedEntry.weekday, { title: e.target.value });
      selectedEntry = { ...selectedEntry, title: e.target.value };
      updateSelectedRowContent();
    });

    root.getElementById("detailDesc").addEventListener("change", async (e) => {
      if (!selectedEntry) return;
      await setDayConfig(pageId, selectedEntry.weekday, { description: e.target.value });
      selectedEntry = { ...selectedEntry, description: e.target.value };
    });

    root.getElementById("detailTags").addEventListener("change", async (e) => {
      if (!selectedEntry) return;
      const tags = e.target.value.split(",").map((s) => s.trim()).filter(Boolean);
      e.target.value = tags.join(", ");
      await setDayConfig(pageId, selectedEntry.weekday, { tags });
      selectedEntry = { ...selectedEntry, tags };
    });

    // A preview taken at PREFLIGHT time is what confirmFillBtn actually sends —
    // not whatever selectedEntry happens to be when the user clicks confirm — so
    // the confirmation is always for the exact content that was previewed, even
    // if the user edits the title/desc/tags fields in between.
    let pendingEntry = null;

    function resetAutofillPreview() {
      pendingEntry = null;
      root.getElementById("autofillPreview").style.display = "none";
      root.getElementById("autofillPreview").replaceChildren();
      root.getElementById("autofillConfirmActions").style.display = "none";
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

    root.getElementById("autofillBtn").addEventListener("click", async () => {
      if (!selectedEntry) return;
      const statusEl = root.getElementById("autofillStatus");
      const previewEl = root.getElementById("autofillPreview");
      const confirmActionsEl = root.getElementById("autofillConfirmActions");
      resetAutofillPreview();
      statusEl.classList.remove("fail");
      if (!isOwnPlatform) {
        statusEl.classList.add("fail");
        statusEl.textContent = t("crossPlatformHint");
        return;
      }
      statusEl.textContent = t("preflightRunning");
      try {
        const response = await autofillApi.runPreflight(selectedEntry);
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

    root.getElementById("cancelFillBtn").addEventListener("click", () => {
      resetAutofillPreview();
      const statusEl = root.getElementById("autofillStatus");
      statusEl.classList.remove("fail");
      statusEl.textContent = "";
    });

    root.getElementById("confirmFillBtn").addEventListener("click", async () => {
      if (!pendingEntry) return;
      const statusEl = root.getElementById("autofillStatus");
      const entryToFill = pendingEntry;
      resetAutofillPreview();
      statusEl.classList.remove("fail");
      statusEl.textContent = t("filling");
      try {
        const response = await autofillApi.runAutofill({ ...entryToFill, confirmed: true });
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

    root.getElementById("mapFieldsBtn").addEventListener("click", async () => {
      resetAutofillPreview();
      const statusEl = root.getElementById("autofillStatus");
      statusEl.classList.remove("fail");
      if (!isOwnPlatform) {
        statusEl.classList.add("fail");
        statusEl.textContent = t("crossPlatformHint");
        return;
      }
      statusEl.textContent = t("mappingHint");
      // Field-mapping walks the user through clicking real fields on the page —
      // the panel itself has to get out of the way so a click on it can't be
      // mistaken for a page field.
      onRequestHide?.();
      try {
        const response = await autofillApi.runFieldMapping();
        statusEl.textContent = response?.ok ? t("mappingSaved") : t("mappingFailed");
      } catch (err) {
        statusEl.classList.add("fail");
        statusEl.textContent = t("pageNotConnected");
      } finally {
        onRequestShow?.();
      }
    });

    function selectEntry(row, rowEl) {
      selectedEntry = row.entry;
      root.querySelectorAll(".day-row.selected").forEach((el) => el.classList.remove("selected"));
      rowEl.classList.add("selected");
      fillDetail(row.entry);
      resetAutofillPreview();
      const statusEl = root.getElementById("autofillStatus");
      statusEl.textContent = "";
      statusEl.classList.remove("fail");
    }
  }

  function fillDetail(entry) {
    const autofillBtn = root.getElementById("autofillBtn");
    autofillBtn.disabled = !entry;

    const titleEl = root.getElementById("detailTitle");
    const descEl = root.getElementById("detailDesc");
    const tagsEl = root.getElementById("detailTags");

    if (!entry) {
      root.getElementById("detailType").textContent = "";
      root.getElementById("detailTime").textContent = "";
      titleEl.value = "";
      titleEl.placeholder = t("selectDayHint");
      titleEl.disabled = true;
      descEl.value = "";
      descEl.disabled = true;
      tagsEl.value = "";
      tagsEl.disabled = true;
      return;
    }

    root.getElementById("detailType").textContent = entry.contentType;
    root.getElementById("detailTime").textContent = entry.time;
    titleEl.value = entry.title;
    titleEl.disabled = false;
    descEl.value = entry.description;
    descEl.disabled = false;
    tagsEl.value = entry.tags.join(", ");
    tagsEl.disabled = false;
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

  root.getElementById("pageTabs").addEventListener("click", async (e) => {
    const btn = e.target.closest(".tab");
    if (!btn) return;
    const pageId = normalizePageId(btn.dataset.page);
    await setSelectedPlatform(pageId);
    renderPage(pageId);
  });

  root.getElementById("langSelect").addEventListener("change", async (e) => {
    const lang = e.target.value;
    await setLanguage(lang);
    setCurrentLanguage(lang);
    renderStaticText();
    renderPage(currentPage);
  });

  root.getElementById("panelClose").addEventListener("click", () => onClose?.());

  (async function init() {
    const lang = await getLanguage();
    setCurrentLanguage(lang);
    root.getElementById("langSelect").value = lang;
    renderStaticText();

    applyTheme(await getTheme());

    const lastPage = normalizePageId(await getSelectedPlatform());
    renderPage(lastPage);
  })();
}
