// Bilibili 创作中心投稿页 (member.bilibili.com/platform/upload).
// Placeholder-text selectors are used instead of generated class names —
// those change on every frontend rebuild, placeholder copy is more stable.
// Still best-effort: verify with 映射字段 in the popup before relying on it.
import { registerAutofill } from "../lib/autofill-runner.js";

const DEFAULT_SELECTORS = {
  fileInput: 'input[type="file"]',
  title: 'input[placeholder*="标题"]',
  description: 'textarea[placeholder*="简介"], div.ql-editor[contenteditable="true"]',
  tagInput: 'input[placeholder*="标签"]'
};

registerAutofill("bilibili", DEFAULT_SELECTORS, {
  buildTags(entry) {
    return (entry.tags || []).map((t) => t.replace(/^#/, ""));
  }
});
