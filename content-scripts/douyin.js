// 抖音创作服务中心。抖音通常使用一个文案框，因此标题、简介和标签合并填入。
// 页面改版后请使用扩展的「映射字段」保存当前账号的选择器。
import { registerAutofill } from "../lib/autofill-runner.js";

registerAutofill("douyin", {
  fileInput: 'input[type="file"]',
  description: 'div[contenteditable="true"], textarea[placeholder*="描述"], textarea[placeholder*="文案"]'
}, {
  buildDescription(entry) {
    const tags = (entry.tags || []).map((tag) => tag.startsWith("#") ? tag : `#${tag}`).join(" ");
    return [entry.title, entry.description, tags].filter(Boolean).join("\n\n");
  }
});
