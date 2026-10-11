# 参考项目分析与整合范围

参考地址：<https://github.com/Navaneeth223/timeless-love-anniversary-app>

参考提交：`474d8720761b87d9502ac8e319e602a5db5a4a71`。

## 原项目结构

React / Vite 的单页项目，`src/App.jsx` 路由到 Creator 与 Anniversary。页面依赖 Tailwind、Framer Motion、React Router 和 Lucide；`data/defaultConfig.js` 管理默认内容；`hooks` 包含音频与打字效果；`lib` 管理 localStorage 草稿及 URL 分享编码。

主要资产是默认 React / Vite SVG 与展示截图，没有可直接作为两人日常相册使用的授权照片集。完整 MIT 许可已保存。

## 对 LoveApp 的适用性

柔和 rosewater / peach 色彩、渐入动画、恋爱计时和情书打字适合温暖的情侣空间。具体改编关系见根目录 `THIRD_PARTY_NOTICES.md`。

原 Creator 是一次性纪念礼物编辑器。其 Cloudinary 上传有预置云名称与上传 preset，URL 分享会序列化完整礼物内容。这些业务不适合 v0.1.0 的纯前端私人空间演示，因此没有引入。

## 整合结果

- 在现有 Git 根目录直接建立 TypeScript 工程，保留 `.git` 和 `main`。
- 新建六个页面及独立布局、可访问弹窗、模块表单、类型定义与模拟数据层。
- 使用 `useSyncExternalStore` 订阅单一会话仓库，内部路由切换后记录仍在；刷新恢复初始数据。
- 采用 Tailwind 4 的官方 Vite 插件，消除原 Tailwind 3 引入的已知间接依赖漏洞。
- 为后续远程数据访问预留 `SpaceRepository` 接口；当前无数据库与云上传连接。
- 使用 SVG 人物头像。初始照片、留言、愿望与礼物均为空；两张 Unsplash 图片只保存在 `tests/fixtures/`，用于隔离浏览器会话的上传验收。
- 未创建参考项目副本、嵌套仓库、部署目标或 GitHub 远端。
