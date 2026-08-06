// 小红书创作服务平台发布页 (creator.xiaohongshu.com/publish/publish).
// RedNote has a title field but tags are typed inline into the body as
// "#tag" text (there's no separate tag input), so tags get folded into the
// description like TikTok's caption. Best-effort selectors — verify with
// 映射字段 in the popup before relying on it.
import { registerAutofill } from "../lib/autofill-runner.js";

const DEFAULT_SELECTORS = {
  fileInput: ['input[type="file"]'],
  title: ['input[placeholder*="标题"]', 'input[name="title"]', 'input[aria-label*="标题"]'],
  description: [
    'div.ql-editor[contenteditable="true"]',
    'div[contenteditable="true"]',
    'textarea[placeholder*="正文"]',
    'textarea[placeholder*="描述"]',
    'textarea[aria-label*="描述"]'
  ]
};

registerAutofill(["rednote", "scriptureRednote"], DEFAULT_SELECTORS, {
  buildDescription(entry) {
    const tags = (entry.tags || []).map((t) => (t.startsWith("#") ? t : `#${t}`)).join(" ");
    return [entry.description, tags].filter(Boolean).join("\n\n");
  }
});
