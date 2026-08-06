# TicBridge

<p align="center">
  <img src="TicBridge-profile.png" alt="TicBridge profile icon" width="240" />
</p>

<p align="center"><img src="divider.svg" width="100%" height="6" alt="" /></p>

TicBridge is a Chrome extension designed to automate the flow of content publishing by pulling the latest assets from Google Drive and filling in the required fields on publishing pages across platforms such as Douyin, TikTok, Bilibili, Xiaohongshu, Instagram, Pinterest, and YouTube. It helps creators prepare publishing material more efficiently, reduce repetitive manual work, and keep the weekly schedule and publishing targets organized.

The extension includes a popup-based workflow for managing publishing tasks, a background service worker for Google authentication and Drive access, and platform-specific content scripts that can inject content into upload forms. Each publishing target can be configured independently, so different content lines such as worship music videos, scripture wallpapers, portrait shoots, or daily photography can all be managed with their own Drive folders and scheduling rules.

The project is structured around a simple idea: use Google Drive as the content source of truth, let the extension read the newest file from the configured folder, and then assist the user in completing the publish page with title, description, tags, and media input. It does not directly submit the post for you, but it greatly reduces the effort of moving assets and copy between storage and the publishing platform.

The extension also includes a field-mapping tool, which is useful when a platform changes its upload page structure or when the default selectors no longer work. In those cases, the user can manually re-map the file input, title field, desc field, and tags field so the autofill flow continues to work. Because the extension relies on Google OAuth through Chrome identity, it avoids storing passwords and keeps the token handling in the background service worker.

To use the extension, load it in Chrome in developer mode, configure the Google Drive API and OAuth client ID, then connect the Drive folder for each publishing target. After that, the popup can be used to select the desired day, time slot, and autofill action for the target platform. The project is intentionally modular so that new platforms and new content strategies can be added without rewriting the whole system.

The extension also supports a custom popup theme, so users can upload a personal background image as the popup wallpaper. For the extension icon itself, a profile picture or branding asset can be linked to the manifest so it appears in the Chrome toolbar and extension management page. This version of the project uses a profile image as the main icon asset, with the standard 16/48/128 sizes prepared for Chrome.

The project is intended for publishing assistance and content workflow automation. It should be used responsibly, in line with the terms of the relevant platforms, and with human review before any publication. It is not designed to bypass platform restrictions or auto-publish content without the user’s confirmation.

<p align="center"><img src="divider.svg" width="100%" height="6" alt="" /></p>

TicBridge 是一个 Chrome 扩展，目标是把内容发布流程自动化：它会从 Google Drive 读取最新素材，并在抖音、TikTok、Bilibili、小红书、Instagram、Pinterest、YouTube 等平台的发布页面中自动填充所需字段。它能帮助创作者更高效地准备素材、减少重复手动操作，并统一管理周排期与发布目标。

这个扩展包含一个弹窗式工作流，用来管理发布任务；同时有后台 service worker 负责 Google 登录与 Drive 访问；此外还提供各平台内容脚本，可以把素材和文案注入到上传表单中。每个发布目标都可以单独配置，因此像古筝赞美诗、经文壁纸、素人写真、日常摄影等不同内容线，都可以各自使用自己的 Google Drive 文件夹和排期规则。

项目的核心思路很简单：把 Google Drive 作为素材源头，让扩展读取指定文件夹中最新的文件，然后辅助用户把媒体、标题、简介、标签等信息填入发布页面。它不会直接替你提交发布，但可以显著减少在素材存储和平台发布页面之间来回复制内容的工作量。

扩展还内置了字段映射工具，当平台上传页结构发生变化，或者默认选择器失效时，用户可以手动重新映射文件上传按钮、标题框、简介框和标签框，从而让自动填充继续生效。由于它依赖 Chrome 的 identity API 进行 Google OAuth，扩展本身不会保存用户密码，令牌处理也会保留在后台服务进程中。

使用时，先在 Chrome 中以开发者模式加载扩展，然后配置 Google Drive API 与 OAuth 客户端 ID，并为每个发布目标连接对应的 Drive 文件夹。之后即可通过弹窗选择目标平台、日期、时间槽和自动填充动作。这个项目采用模块化结构，后续如果要新增平台或新增内容策略，可以在不重写整个系统的前提下继续扩展。

扩展也支持自定义弹窗主题，用户可以上传自己的背景图片作为弹窗壁纸。对于扩展图标本身，也可以把个人头像或品牌图像接入到清单文件中，让它在 Chrome 工具栏和扩展管理页中显示出来。当前版本已经把一张 profile 图片作为主图标资源，并准备好了 16/48/128 三种尺寸，适配 Chrome 的扩展图标显示要求。

这个项目的用途是辅助内容发布与内容工作流自动化。请在遵守相关平台规则、隐私要求和内容规范的前提下使用它，并在实际发布前进行人工确认。它并不用于绕过平台限制或在未获得用户确认的情况下自动发布内容。

<p align="center"><img src="divider.svg" width="100%" height="6" alt="" /></p>

## Features / 功能

- Read the latest assets from a specified Google Drive folder and prepare them for publishing / 从指定 Google Drive 文件夹读取最新素材，并为发布做准备
- Automatically fill media, title, description, and tags on publishing pages / 在发布页自动填充视频/图片、标题、简介、标签
- Support independent configuration for each platform target and weekly schedule / 支持每个平台独立配置发布目标和周排期
- Provide a field-mapping tool for selector failures on upload pages / 提供字段映射工具，解决平台上传页选择器失效问题
- Use Chrome OAuth through chrome.identity so the extension does not store user passwords / 后台使用 chrome.identity 管理 Google OAuth Token，扩展不保存用户密码

## Project Structure / 目录结构

- [extension/manifest.json](manifest.json) - Chrome extension manifest / Chrome 扩展清单
- [extension/background.js](background.js) - background service worker for Google sign-in, Drive API calls, and message routing / 后台 service worker，负责 Google 登录、Drive API 调用、消息路由
- [extension/content-scripts](content-scripts) - platform-specific content scripts / 各平台内容脚本
- [extension/lib](lib) - shared utilities / 通用工具模块
- [extension/popup](popup) - popup UI / 弹窗 UI
- [plan](../plan) - publishing plans and content strategy documents / 发布计划和内容策略文档
- [CLAUDE.md](../CLAUDE.md) - overall project strategy and platform workflow / 总体项目说明与平台策略

## Installation and Usage / 安装与使用

1. Open Chrome and go to chrome://extensions / 打开 Chrome，进入 chrome://extensions
2. Turn on Developer mode / 打开右上角“开发者模式”
3. Click “Load unpacked” and select the [extension](.) folder / 点击“加载已解压的扩展程序”，选择 [extension](.) 文件夹
4. Record the assigned extension ID for OAuth setup / 记录扩展 ID，用于创建 Google OAuth 客户端
5. In Google Cloud Console, enable the Drive API and create an OAuth client ID for a Chrome extension / 在 Google Cloud Console 中启用 Drive API，并创建 Chrome 扩展的 OAuth 客户端 ID
6. Paste the generated client ID into [extension/manifest.json](manifest.json) under oauth2.client_id / 将生成的 Client ID 填入 [extension/manifest.json](manifest.json) 的 oauth2.client_id
7. Reload the extension, open the popup, and connect Google Drive / 重新加载扩展，打开扩展弹窗，登录 Google 并连接 Drive
8. Configure a Drive folder link for each publishing target / 为每个平台配置对应的 Google Drive 文件夹链接

## Notes / 说明

- The extension does not directly submit posts; it fills the fields on the publishing page for you to review and publish manually / 扩展不直接自动提交发布内容，仅自动填充上传页面字段，供你人工检查并发布
- For first-time use, run the field-mapping flow to verify the selectors on the target platform page / 首次使用建议先运行“映射字段”功能，确认页面选择器准确
- The extension icon is now connected to a profile image asset in the icons folder, so it will appear in Chrome after reload / 扩展图标已经接入 icons 文件夹中的头像资源，重新加载后会在 Chrome 中显示

## Disclaimer / 免责声明

This extension is intended for workflow automation and publishing assistance. It does not bypass platform restrictions, violate platform policies, or auto-publish content without your review. Please use it responsibly and comply with the applicable platform terms and privacy requirements.

此扩展用于辅助内容发布和素材管理，不用于绕过平台限制、规避平台规则或在未人工确认的情况下自动发布内容。请遵守相关平台条款和隐私要求，合理使用。

## License / 许可证

This project is licensed under the GNU General Public License v3.0 — see the [LICENSE](LICENSE) file for the full text.

Copyright (C) 2026 Yanying Zhang

本项目采用 GNU General Public License v3.0 许可证，完整文本见 [LICENSE](LICENSE) 文件。

版权所有 (C) 2026 Yanying Zhang
