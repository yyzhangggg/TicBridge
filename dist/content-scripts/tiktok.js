(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __esm = (fn, res, err) => function __init() {
    if (err) throw err[0];
    try {
      return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
    } catch (e) {
      throw err = [e], e;
    }
  };
  var __commonJS = (cb, mod) => function __require() {
    try {
      return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
    } catch (e) {
      throw mod = 0, e;
    }
  };

  // lib/dom.js
  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  function randomDelay(minMs, maxMs) {
    return sleep(minMs + Math.random() * (maxMs - minMs));
  }
  function dispatchPointerSequence(el) {
    const opts = { bubbles: true, cancelable: true };
    el.dispatchEvent(new PointerEvent("pointerdown", opts));
    el.dispatchEvent(new MouseEvent("mousedown", opts));
    el.focus();
    el.dispatchEvent(new PointerEvent("pointerup", opts));
    el.dispatchEvent(new MouseEvent("mouseup", opts));
    el.dispatchEvent(new MouseEvent("click", opts));
  }
  function nativeValueSetter(el) {
    const proto = el.tagName === "TEXTAREA" ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
    return Object.getOwnPropertyDescriptor(proto, "value")?.set;
  }
  async function typeNativeValue(el, value) {
    const setter = nativeValueSetter(el);
    dispatchPointerSequence(el);
    let typed = "";
    for (const char of value) {
      typed += char;
      el.dispatchEvent(new KeyboardEvent("keydown", { key: char, bubbles: true }));
      if (setter) {
        setter.call(el, typed);
      } else {
        el.value = typed;
      }
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new KeyboardEvent("keyup", { key: char, bubbles: true }));
      await randomDelay(25, 80);
    }
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }
  function setNativeValue(el, value) {
    const setter = nativeValueSetter(el);
    if (setter) {
      setter.call(el, value);
    } else {
      el.value = value;
    }
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }
  function clearEditableText(el) {
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }
  function insertCharAtCaret(el, char) {
    const sel = window.getSelection();
    let range;
    if (sel && sel.rangeCount > 0 && el.contains(sel.anchorNode)) {
      range = sel.getRangeAt(0);
    } else {
      range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
    }
    range.deleteContents();
    const textNode = document.createTextNode(char);
    range.insertNode(textNode);
    range.setStartAfter(textNode);
    range.setEndAfter(textNode);
    sel.removeAllRanges();
    sel.addRange(range);
  }
  async function typeEditableText(el, value) {
    dispatchPointerSequence(el);
    clearEditableText(el);
    for (const char of value) {
      el.dispatchEvent(new KeyboardEvent("keydown", { key: char, bubbles: true }));
      el.dispatchEvent(new InputEvent("beforeinput", { bubbles: true, cancelable: true, inputType: "insertText", data: char }));
      insertCharAtCaret(el, char);
      el.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: char }));
      el.dispatchEvent(new KeyboardEvent("keyup", { key: char, bubbles: true }));
      await randomDelay(25, 80);
    }
    el.dispatchEvent(new Event("change", { bubbles: true }));
    el.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true, data: value }));
  }
  function setEditableValue(el, value) {
    el.textContent = value;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }
  async function fillTextField(el, value) {
    if (el.isContentEditable) {
      await typeEditableText(el, value);
      if (!fieldLooksFilled(el, value)) setEditableValue(el, value);
    } else {
      await typeNativeValue(el, value);
      if (!fieldLooksFilled(el, value)) setNativeValue(el, value);
    }
  }
  function readFieldValue(el) {
    if (!el) return "";
    return el.isContentEditable ? el.textContent || "" : el.value ?? "";
  }
  function fieldLooksFilled(el, expectedText) {
    const expected = (expectedText || "").trim().slice(0, 12);
    if (!expected) return true;
    return readFieldValue(el).trim().includes(expected);
  }
  async function fillTagInput(el, tags) {
    for (const tag of tags) {
      await fillTextField(el, tag);
      el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", bubbles: true }));
      el.dispatchEvent(new KeyboardEvent("keyup", { key: "Enter", code: "Enter", bubbles: true }));
      await randomDelay(250, 700);
    }
  }
  function buildFile(blob, name, mimeType) {
    return new File([blob], name, { type: mimeType });
  }
  function setFileInputFiles(inputEl, file, dropTarget) {
    dispatchPointerSequence(inputEl);
    const dt = new DataTransfer();
    dt.items.add(file);
    inputEl.files = dt.files;
    inputEl.dispatchEvent(new Event("change", { bubbles: true }));
    inputEl.dispatchEvent(new Event("input", { bubbles: true }));
    if (dropTarget) {
      const dropEvent = new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: dt });
      dropTarget.dispatchEvent(dropEvent);
    }
  }
  function getUniqueSelector(el) {
    if (el.id) return `#${CSS.escape(el.id)}`;
    const testId = el.getAttribute("data-testid") || el.getAttribute("data-e2e");
    if (testId) return `[data-testid="${CSS.escape(testId)}"], [data-e2e="${CSS.escape(testId)}"]`;
    const tag = el.tagName.toLowerCase();
    const name = el.getAttribute("name");
    if (name) return `${tag}[name="${CSS.escape(name)}"]`;
    const ariaLabel = el.getAttribute("aria-label");
    if (ariaLabel) return `${tag}[aria-label="${CSS.escape(ariaLabel)}"]`;
    const placeholder = el.getAttribute("placeholder");
    if (placeholder) return `${tag}[placeholder="${CSS.escape(placeholder)}"]`;
    const path = [];
    let node = el;
    while (node && node.nodeType === Node.ELEMENT_NODE && node !== document.body) {
      let selector = node.tagName.toLowerCase();
      if (node.parentElement) {
        const siblings = Array.from(node.parentElement.children).filter((c) => c.tagName === node.tagName);
        if (siblings.length > 1) {
          selector += `:nth-of-type(${siblings.indexOf(node) + 1})`;
        }
      }
      path.unshift(selector);
      node = node.parentElement;
    }
    return path.join(" > ");
  }
  function candidateList(selectors) {
    return (Array.isArray(selectors) ? selectors : [selectors]).filter(Boolean);
  }
  function queryFirst(selectors) {
    for (const sel of candidateList(selectors)) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    return null;
  }
  function waitForElement(selectors, timeoutMs = 8e3) {
    return new Promise((resolve, reject) => {
      const existing = queryFirst(selectors);
      if (existing) return resolve(existing);
      const observer = new MutationObserver(() => {
        const found = queryFirst(selectors);
        if (found) {
          observer.disconnect();
          resolve(found);
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Timed out waiting for any of: ${candidateList(selectors).join(" | ")}`));
      }, timeoutMs);
    });
  }
  var init_dom = __esm({
    "lib/dom.js"() {
    }
  });

  // lib/i18n.js
  var DEFAULT_LANGUAGE;
  var init_i18n = __esm({
    "lib/i18n.js"() {
      DEFAULT_LANGUAGE = "zh";
    }
  });

  // lib/field-map.js
  function createBanner(lang) {
    const banner = document.createElement("div");
    banner.style.cssText = `
    position: fixed; top: 12px; left: 50%; transform: translateX(-50%);
    z-index: 2147483647; background: #1a1816; color: #fff; font-family: sans-serif;
    font-size: 13px; padding: 10px 16px; border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,.3);
    display: flex; align-items: center; gap: 12px;
  `;
    const label = document.createElement("span");
    const skipBtn = document.createElement("button");
    skipBtn.textContent = SKIP_LABEL[lang] || SKIP_LABEL[DEFAULT_LANGUAGE];
    skipBtn.style.cssText = "background:#4a4845;color:#fff;border:none;border-radius:5px;padding:4px 10px;cursor:pointer;font-size:12px;";
    banner.appendChild(label);
    banner.appendChild(skipBtn);
    document.body.appendChild(banner);
    return { banner, label, skipBtn };
  }
  function startFieldMapping(steps = ["fileInput", "title", "description", "tagInput"], lang = DEFAULT_LANGUAGE) {
    return new Promise((resolve) => {
      const { banner, label, skipBtn } = createBanner(lang);
      const map = {};
      let i = 0;
      function cleanup() {
        document.removeEventListener("click", onClick, true);
        banner.remove();
      }
      function next() {
        if (i >= steps.length) {
          cleanup();
          resolve(map);
          return;
        }
        const stepEntry = STEP_LABELS[steps[i]];
        const fallback = `${FALLBACK_STEP_LABEL[lang] || FALLBACK_STEP_LABEL[DEFAULT_LANGUAGE]} (${steps[i]})`;
        label.textContent = stepEntry && (stepEntry[lang] || stepEntry[DEFAULT_LANGUAGE]) || fallback;
      }
      function onClick(e) {
        if (banner.contains(e.target)) return;
        e.preventDefault();
        e.stopPropagation();
        const target = e.target;
        const fileInput = target.matches?.('input[type="file"]') ? target : target.closest("label, button")?.querySelector('input[type="file"]');
        const el = steps[i] === "fileInput" && fileInput ? fileInput : target;
        map[steps[i]] = getUniqueSelector(el);
        i++;
        next();
      }
      skipBtn.addEventListener("click", () => {
        map[steps[i]] = null;
        i++;
        next();
      });
      document.addEventListener("click", onClick, true);
      next();
    });
  }
  var STEP_LABELS, SKIP_LABEL, FALLBACK_STEP_LABEL;
  var init_field_map = __esm({
    "lib/field-map.js"() {
      init_dom();
      init_i18n();
      STEP_LABELS = {
        fileInput: {
          zh: "\u2460 \u70B9\u51FB\u89C6\u9891/\u56FE\u7247\u4E0A\u4F20\u6309\u94AE\uFF08<input type=file>\uFF09",
          en: "\u2460 Click the video/image upload button (<input type=file>)",
          fr: "\u2460 Cliquez sur le bouton de t\xE9l\xE9versement vid\xE9o/image (<input type=file>)"
        },
        title: {
          zh: "\u2461 \u70B9\u51FB\u6807\u9898\u8F93\u5165\u6846",
          en: "\u2461 Click the title field",
          fr: "\u2461 Cliquez sur le champ du titre"
        },
        description: {
          zh: "\u2462 \u70B9\u51FB\u7B80\u4ECB/\u63CF\u8FF0\u8F93\u5165\u6846",
          en: "\u2462 Click the description field",
          fr: "\u2462 Cliquez sur le champ de description"
        },
        tagInput: {
          zh: "\u2463 \u70B9\u51FB\u6807\u7B7E\u8F93\u5165\u6846\uFF08\u6CA1\u6709\u5C31\u8DF3\u8FC7\uFF09",
          en: "\u2463 Click the tags field (skip if there isn't one)",
          fr: "\u2463 Cliquez sur le champ des tags (passez si absent)"
        }
      };
      SKIP_LABEL = { zh: "\u8DF3\u8FC7", en: "Skip", fr: "Passer" };
      FALLBACK_STEP_LABEL = { zh: "\u70B9\u51FB\u5BF9\u5E94\u5B57\u6BB5", en: "Click the matching field", fr: "Cliquez sur le champ correspondant" };
    }
  });

  // lib/storage.js
  async function getFieldMap(platformId) {
    const { [KEYS.FIELD_MAP]: all } = await chrome.storage.local.get(KEYS.FIELD_MAP);
    return all && all[platformId] || null;
  }
  async function setFieldMap(platformId, map) {
    const { [KEYS.FIELD_MAP]: all } = await chrome.storage.local.get(KEYS.FIELD_MAP);
    const next = { ...all || {}, [platformId]: map };
    await chrome.storage.local.set({ [KEYS.FIELD_MAP]: next });
  }
  async function getLanguage() {
    const { [KEYS.LANGUAGE]: v } = await chrome.storage.local.get(KEYS.LANGUAGE);
    return v || "zh";
  }
  var KEYS;
  var init_storage = __esm({
    "lib/storage.js"() {
      KEYS = {
        SELECTED_PLATFORM: "selectedPlatform",
        DRIVE_FOLDERS: "driveFolders",
        // { [platformId]: folderId } — each platform watches its own folder
        DRIVE_STATUS: "driveStatus",
        // { [platformId]: { ok, fileName, modifiedTime, message, checkedAt } } — last known connection result, so the popup can show it on open without re-hitting the Drive API
        FIELD_MAP: "fieldMap",
        // per-platform CSS selector overrides captured by the "map fields" tool
        WEEK_CONFIG: "weekConfig",
        // { [platformId]: { [jsDay]: { active, time, contentType } } }
        WEEKLY_GOAL: "weeklyGoal",
        // { [platformId]: number } — 0 means no cap
        LANGUAGE: "language",
        // "zh" | "en" | "fr" — popup + on-page banner UI language
        POSITIONING: "positioning",
        // { [platformId]: string } — user-editable override of the platform's default label/positioning
        THEME: "theme",
        // { mode: "preset" | "custom", presetId?: string, imageDataUrl?: string } — popup background
        GOOGLE_ACCOUNT: "googleAccount"
        // { id, email, name, picture } — display-only, never an OAuth token
      };
    }
  });

  // lib/errors.js
  function labelForError(code, lang = "zh") {
    const entry = LABELS[code];
    return entry && (entry[lang] || entry.zh) || FALLBACK[lang] || FALLBACK.zh;
  }
  var AUTOFILL_ERRORS, REMAP_HINT, LABELS, FALLBACK;
  var init_errors = __esm({
    "lib/errors.js"() {
      AUTOFILL_ERRORS = {
        DRIVE_NOT_CONNECTED: "drive-not-connected",
        AUTH_FAILED: "auth-failed",
        FILE_FETCH_FAILED: "file-fetch-failed",
        // Every candidate selector for this field was tried and none matched — the
        // page markup likely changed. Distinct code per field so the popup can tell
        // the user exactly which one broke instead of a generic "field not found".
        FILE_INPUT_NOT_FOUND: "file-input-not-found",
        TITLE_NOT_FOUND: "title-not-found",
        DESCRIPTION_NOT_FOUND: "description-not-found",
        TAG_INPUT_NOT_FOUND: "tag-input-not-found",
        // Selector matched and the fill call ran, but re-reading the field afterward
        // shows it didn't take (framework reverted it, wrong element, etc).
        FILE_VERIFY_FAILED: "file-verify-failed",
        TITLE_VERIFY_FAILED: "title-verify-failed",
        DESCRIPTION_VERIFY_FAILED: "description-verify-failed"
      };
      REMAP_HINT = { zh: "\uFF0C\u53EF\u70B9\u51FB\u300C\u6620\u5C04\u5B57\u6BB5\u300D\u624B\u52A8\u6307\u5B9A", en: " \u2014 try \u201CMap fields\u201D to set it manually", fr: " \u2014 essayez \xAB Mapper les champs \xBB pour le d\xE9finir manuellement" };
      LABELS = {
        [AUTOFILL_ERRORS.DRIVE_NOT_CONNECTED]: { zh: "Drive \u672A\u8FDE\u63A5", en: "Drive not connected", fr: "Drive non connect\xE9" },
        [AUTOFILL_ERRORS.AUTH_FAILED]: { zh: "\u6388\u6743\u5931\u8D25", en: "Authorization failed", fr: "\xC9chec de l\u2019autorisation" },
        [AUTOFILL_ERRORS.FILE_FETCH_FAILED]: { zh: "\u6587\u4EF6\u83B7\u53D6\u5931\u8D25", en: "Failed to fetch file", fr: "\xC9chec de r\xE9cup\xE9ration du fichier" },
        [AUTOFILL_ERRORS.FILE_INPUT_NOT_FOUND]: {
          zh: `\u627E\u4E0D\u5230\u6587\u4EF6\u4E0A\u4F20\u6846${REMAP_HINT.zh}`,
          en: `Couldn't find the file upload field${REMAP_HINT.en}`,
          fr: `Champ de t\xE9l\xE9versement introuvable${REMAP_HINT.fr}`
        },
        [AUTOFILL_ERRORS.TITLE_NOT_FOUND]: {
          zh: `\u627E\u4E0D\u5230\u6807\u9898\u6846${REMAP_HINT.zh}`,
          en: `Couldn't find the title field${REMAP_HINT.en}`,
          fr: `Champ du titre introuvable${REMAP_HINT.fr}`
        },
        [AUTOFILL_ERRORS.DESCRIPTION_NOT_FOUND]: {
          zh: `\u627E\u4E0D\u5230\u7B80\u4ECB\u6846${REMAP_HINT.zh}`,
          en: `Couldn't find the description field${REMAP_HINT.en}`,
          fr: `Champ de description introuvable${REMAP_HINT.fr}`
        },
        [AUTOFILL_ERRORS.TAG_INPUT_NOT_FOUND]: {
          zh: `\u627E\u4E0D\u5230\u6807\u7B7E\u6846${REMAP_HINT.zh}`,
          en: `Couldn't find the tags field${REMAP_HINT.en}`,
          fr: `Champ des tags introuvable${REMAP_HINT.fr}`
        },
        [AUTOFILL_ERRORS.FILE_VERIFY_FAILED]: {
          zh: `\u6587\u4EF6\u9009\u62E9\u540E\u672A\u751F\u6548${REMAP_HINT.zh}`,
          en: `File was selected but didn't take${REMAP_HINT.en}`,
          fr: `Le fichier s\xE9lectionn\xE9 n\u2019a pas \xE9t\xE9 pris en compte${REMAP_HINT.fr}`
        },
        [AUTOFILL_ERRORS.TITLE_VERIFY_FAILED]: {
          zh: `\u6807\u9898\u586B\u5145\u540E\u672A\u751F\u6548${REMAP_HINT.zh}`,
          en: `Title was filled but didn't take${REMAP_HINT.en}`,
          fr: `Le titre rempli n\u2019a pas \xE9t\xE9 pris en compte${REMAP_HINT.fr}`
        },
        [AUTOFILL_ERRORS.DESCRIPTION_VERIFY_FAILED]: {
          zh: `\u7B80\u4ECB\u586B\u5145\u540E\u672A\u751F\u6548${REMAP_HINT.zh}`,
          en: `Description was filled but didn't take${REMAP_HINT.en}`,
          fr: `La description remplie n\u2019a pas \xE9t\xE9 prise en compte${REMAP_HINT.fr}`
        }
      };
      FALLBACK = { zh: "\u586B\u5145\u5931\u8D25", en: "Autofill failed", fr: "\xC9chec du remplissage" };
    }
  });

  // lib/drive-client.js
  function downloadNewestDriveFile(platformId) {
    return new Promise((resolve) => {
      const port = chrome.runtime.connect({ name: "drive-download" });
      const segments = [];
      let settled = false;
      function finish(result) {
        if (settled) return;
        settled = true;
        resolve(result);
      }
      port.onMessage.addListener((msg) => {
        if (msg.type === "chunk") {
          segments.push(new Blob([msg.data]));
        } else if (msg.type === "done") {
          port.disconnect();
          finish({ file: msg.file, blob: new Blob(segments, { type: msg.file.mimeType }) });
        } else if (msg.type === "error") {
          port.disconnect();
          finish({ error: true, code: msg.code, message: msg.message });
        }
      });
      port.onDisconnect.addListener(() => {
        finish({ error: true, code: "file-fetch-failed", message: "Drive connection closed unexpectedly" });
      });
      port.postMessage({ type: "START", platformId });
    });
  }
  var init_drive_client = __esm({
    "lib/drive-client.js"() {
    }
  });

  // lib/autofill-runner.js
  async function failure(code) {
    const lang = await getLanguage();
    return { ok: false, code, reason: labelForError(code, lang) };
  }
  function registerAutofill(platformIds, DEFAULT_SELECTORS, { dropTargetSelector, buildTitle, buildDescription, buildTags } = {}) {
    const supportedPlatformIds = Array.isArray(platformIds) ? platformIds : [platformIds];
    async function resolveSelectors(platformId) {
      const override = await getFieldMap(platformId);
      return { ...DEFAULT_SELECTORS, ...override || {} };
    }
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
  var init_autofill_runner = __esm({
    "lib/autofill-runner.js"() {
      init_dom();
      init_field_map();
      init_storage();
      init_errors();
      init_drive_client();
    }
  });

  // content-scripts/tiktok.js
  var require_tiktok = __commonJS({
    "content-scripts/tiktok.js"() {
      init_autofill_runner();
      var DEFAULT_SELECTORS = {
        fileInput: ['input[type="file"]', 'input[accept*="video"]', 'input[accept*="image"]'],
        description: [
          'div[contenteditable="true"]',
          'div[role="textbox"][contenteditable="true"]',
          '[aria-label*="caption" i][contenteditable="true"]',
          "textarea"
        ]
      };
      registerAutofill("tiktok", DEFAULT_SELECTORS, {
        buildDescription(entry) {
          const tags = (entry.tags || []).map((t) => t.startsWith("#") ? t : `#${t}`).join(" ");
          return [entry.title, entry.description, tags].filter(Boolean).join("\n\n");
        }
      });
    }
  });
  require_tiktok();
})();
