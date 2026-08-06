// Point-and-click field mapper. Platform upload pages change their markup
// often enough that hardcoded selectors WILL eventually break; this lets you
// fix it yourself in the browser instead of waiting on a code update:
// click "映射字段" in the popup, then click each field on the page in order.
import { getUniqueSelector } from "./dom.js";
import { DEFAULT_LANGUAGE } from "./i18n.js";

const STEP_LABELS = {
  fileInput: {
    zh: "① 点击视频/图片上传按钮（<input type=file>）",
    en: "① Click the video/image upload button (<input type=file>)",
    fr: "① Cliquez sur le bouton de téléversement vidéo/image (<input type=file>)"
  },
  title: {
    zh: "② 点击标题输入框",
    en: "② Click the title field",
    fr: "② Cliquez sur le champ du titre"
  },
  description: {
    zh: "③ 点击简介/描述输入框",
    en: "③ Click the description field",
    fr: "③ Cliquez sur le champ de description"
  },
  tagInput: {
    zh: "④ 点击标签输入框（没有就跳过）",
    en: "④ Click the tags field (skip if there isn't one)",
    fr: "④ Cliquez sur le champ des tags (passez si absent)"
  }
};

const SKIP_LABEL = { zh: "跳过", en: "Skip", fr: "Passer" };
const FALLBACK_STEP_LABEL = { zh: "点击对应字段", en: "Click the matching field", fr: "Cliquez sur le champ correspondant" };

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

/**
 * Walks the caller through clicking fileInput / title / description / tagInput
 * on the current page, in that order. Resolves with a selector map, e.g.
 * { fileInput: "#upload-input", title: "textarea.title", ... }.
 */
export function startFieldMapping(steps = ["fileInput", "title", "description", "tagInput"], lang = DEFAULT_LANGUAGE) {
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
      label.textContent = (stepEntry && (stepEntry[lang] || stepEntry[DEFAULT_LANGUAGE])) || fallback;
    }

    function onClick(e) {
      e.preventDefault();
      e.stopPropagation();
      const target = e.target;
      // <input type=file> is often visually hidden behind a styled button;
      // walk up to find one nearby if the direct click target isn't it.
      const fileInput = target.matches?.('input[type="file"]')
        ? target
        : target.closest("label, button")?.querySelector('input[type="file"]');

      const el = steps[i] === "fileInput" && fileInput ? fileInput : target;
      map[steps[i]] = getUniqueSelector(el);
      i++;
      next();
    }

    skipBtn.addEventListener("click", () => {
      map[steps[i]] = null; // explicitly disable — otherwise the merge would fall back to the (also broken) default
      i++;
      next();
    });

    document.addEventListener("click", onClick, true);
    next();
  });
}
