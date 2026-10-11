# Our Space · 我们的小世界

LoveApp v0.3.0：为两个人设计的中文、移动端优先生活记录空间。所有代码与开发文件位于 `E:\loveapp`，直接使用此根目录的现有 Git 仓库。当前正在准备 GitHub 公开仓库和 GitHub Pages 部署，尚未正式上线；实际进度、确认步骤和后续更新方式见 [部署说明](docs/deployment.md)。

已接入 Supabase 登录、双人空间、持久存储和同步，复用用户的 Free 新加坡项目。两个人各自用邮箱密码注册，无需确认邮件；一人创建空间，另一人通过邀请码加入。真实测试见 docs/cloud-cli-validation.md。当前仅本地预览，未部署公网网站。使用说明见 [`docs/supabase-setup.md`](docs/supabase-setup.md)。

## 本地启动

需要 Node.js 20.19+ 或 22.12+。本机验证环境为 Node.js 24.18.0、npm 11.16.0。

在 PowerShell 中执行：

```powershell
Set-Location E:\loveapp
npm.cmd install
npm.cmd run dev
```

打开终端显示的 Local 地址，默认是 `http://127.0.0.1:5173/`；端口被占用时，以 Vite 实际输出为准。服务绑定本机回环地址。使用 `npm.cmd` 可以避开本机 PowerShell 对 `npm.ps1` 的脚本限制。

`.npmrc` 将 npm 缓存限定在根目录的 `.npm-cache/`；Vite 排除缓存、浏览器临时文件和测试输出，避免 Windows 文件锁干扰预览。

本机 .env.local 已由 CLI 自动配置，使用登录保护的云端模式。未设置 Supabase 环境变量时使用独立演示，两种模式不会自动迁移或混合记录。

## 当前功能

| 页面 | 路由 | 页面功能 |
| --- | --- | --- |
| 首页 | `/` | 双方昵称与插画头像、按本地日历日期计算相恋天数、自己当天留言的首行、最近照片与留言、实际愿望完成进度、快捷入口 |
| 我们的回忆 | `/photos` | 响应式瀑布流、上传者筛选、大图与键盘翻页、私有照片上传 |
| 想对你说 | `/letters` | 发布、作者筛选、日期排序、情书阅读、空状态 |
| 我们的愿望清单 | `/wishes` | 新增、编辑、删除、三种状态、完成统计、完成日期与照片关联 |
| 心愿礼物 | `/gifts` | 双方分类、新增、编辑、删除、图片、参考价格、备注、链接与优先级 |
| 关于我们 | `/profile` | 修改双方昵称与恋爱开始日期、情侣信息、版本与网站说明 |

手机端提供固定底部导航和安全区留白，愿望页顶部可以直接切换礼物页面。桌面端使用顶部导航。Vite 开发和预览服务支持客户端路由刷新。

## 演示与云端模式

- **未配置 Supabase 时没有持久化。** 演示记录只在当前标签页内存中，内部切换会保留，刷新或关闭标签页会清空。
- 初始昵称为用户提供的「石若瀚 / 张潋镕」，恋爱开始日期为 `2026-04-20`。照片、留言、愿望和礼物初始均为空，不预填任何生活记录。
- 首页没有示例封面照片或预写的「今日一句」；上传照片后首页会显示自己的照片，当天发布留言后「今日一句」使用自己留言的首行。
- 云端模式使用各自的邮箱账号、一个最多两人的空间和一次性邀请码。服务端按真实用户 UUID 识别作者；双方登录时「我 / 对方」对应各自身份。数据库 RLS 和私有 Storage 策略限制空间成员访问。
- 照片选择时用 Object URL 预览。支持 JPG、PNG、WebP、GIF、AVIF，每张最多 12 MB、每次最多 12 张。取消/移除/替换会释放 URL；云端保存成功后改为私有签名地址，失败保留预览并清理未保存文件。演示照片刷新后消失。
- 写入时禁止重复提交，成功后才关闭弹窗；失败保留输入并显示错误。云端实时订阅更新，并每 15 秒刷新一次作为补偿；登出清除空间内存和订阅。
- 礼物的惊喜模式只有说明入口；当前没有隐藏购买状态、秘密记录或支付行为。
- 头像和礼物缺图占位为 SVG 插画。两张 Unsplash 图片仅在 `tests/fixtures/` 中用于自动化上传测试，不会作为网站内容显示，也不进入生产构建。
- 页脚和编辑弹窗根据实际模式显示保存方式。云端保存成功后刷新仍保留数据。

默认情侣配置与空列表在 `src/data/mockData.ts`。修改昵称或恋爱日期后，所有页面会即时读取同一份会话数据。

## 技术与结构

React 19、TypeScript、Vite 7、Tailwind CSS 4、Framer Motion、React Router、Lucide React。精确依赖版本由 `package-lock.json` 锁定。

```text
src/
  components/    通用界面、弹窗、表单、照片预览
  layouts/       全局布局、手机与桌面导航
  pages/         六个独立页面及 404 页面
  hooks/         共享数据、时间、打字动画、Object URL 与提示
  services/      数据接口、内存演示、Supabase 适配与登录状态
  data/          初始情侣配置、空记录与枚举标签
  types/         领域模型
  utils/         日期、URL 校验与动画预设
public/images/   原创 SVG 插画
tests/           Playwright 浏览器验收与测试专用图片
supabase/        数据库迁移、权限策略与私有存储配置
docs/            来源分析、验收报告与页面截图
```

## 检查与浏览器验收

```powershell
npm.cmd run lint
npm.cmd run build
npm.cmd run test:db
npm.cmd run test:e2e
npm.cmd audit
```

浏览器测试默认使用本机 Google Chrome。测试会在 5176 和 5177 临时启动独立 Vite 服务，分别使用空配置演示和受控 HTTP/WebSocket 模拟，不访问真实 Supabase 数据，结束后关闭测试服务。5173 的用户预览继续运行。

如果机器只有 Microsoft Edge，可以在当前 PowerShell 会话中执行 `$env:PLAYWRIGHT_CHANNEL = 'msedge'` 后运行测试。

覆盖六页六种宽度、主要演示交互、登录/注册、创建/加入空间、持久化客户端流程、WebSocket 更新、断线补偿、失败保留与文件回滚。SQL 测试使用 PGlite 内存 PostgreSQL 执行真实迁移和 RLS，模拟 Auth/Storage 系统表，不验证托管服务。结果在忽略的 `test-results/`；截图在 `docs/qa/`。v0.1.0 历史报告见 `docs/validation.md`，真实 Supabase 验收见 `docs/cloud-cli-validation.md`。`scripts/test-cloud-live.mjs` 是需要已登录 CLI 的独立真实云端测试，会创建并清理其专属临时账号和记录，不属于日常启动步骤。

`npm.cmd run preview` 可检查生产构建，默认使用另一个本地端口；不属于网站部署。

## 来源与授权

参考 [Navaneeth223/timeless-love-anniversary-app](https://github.com/Navaneeth223/timeless-love-anniversary-app)，基于提交 `474d8720761b87d9502ac8e319e602a5db5a4a71` 的配色、渐入动画、恋爱计时和打字效果进行改编。保留原作者 `Copyright (c) 2026 Navaneeth.k.v` 及完整 MIT 授权，见 `LICENSE`、`THIRD_PARTY_NOTICES.md` 与 `docs/reference-analysis.md`。

页面结构、导航、记录模块和数据层按长期情侣空间重新实现；未导入原项目的礼物生成器、链接编码、Cloudinary 上传、Git 历史或部署配置。

## 当前接入边界

真实项目迁移和客户端配置已完成。本阶段没有部署，未增加真实惊喜购买状态、头像上传、找回密码、离线编辑或数据库备份功能。localhost 仅供这台电脑访问，不能作为异地两部手机的在线网址。

## Git

保留根目录现有 `main` 分支；不创建嵌套仓库。`node_modules/`、`dist/`、缓存、临时文件、测试运行输出、`.env` 与密钥配置均应保持忽略。当前未自动提交、推送 GitHub 或部署。
