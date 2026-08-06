// 堆糖没有稳定的公开上传 DOM；通用字段优先，首次发布请映射字段。
import { registerAutofill } from "../lib/autofill-runner.js";

registerAutofill("scriptureDuitang", {
  fileInput: 'input[type="file"]',
  title: 'input[placeholder*="标题"], input[name*="title"]',
  description: 'textarea[placeholder*="描述"], textarea[placeholder*="内容"], div[contenteditable="true"]'
}, {
  buildDescription(entry) {
    return [entry.description, (entry.tags || []).map((tag) => `#${tag.replace(/^#/, "")}`).join(" ")].filter(Boolean).join("\n\n");
  }
});
