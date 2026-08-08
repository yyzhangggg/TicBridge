// 抖音创作者服务平台首页 (creator.douyin.com/creator-micro/home).
// No form here, just a nav button that routes to the upload flow. There's no
// Douyin autofill content script yet — this only handles the click-through.
import { clickPublishButton } from "../lib/click-publish.js";

clickPublishButton(["发布作品", "发布视频"]).catch(() => {});
