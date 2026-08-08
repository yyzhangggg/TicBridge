// 小红书创作服务平台首页 (creator.xiaohongshu.com/new/home).
// No form here, just a nav button that routes to /publish/publish — auto-click
// it so the rednote.js autofill panel gets a chance to run one step sooner.
import { clickPublishButton } from "../lib/click-publish.js";

clickPublishButton(["发布作品", "发布笔记"]).catch(() => {});
