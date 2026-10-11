# LoveApp v0.3.0 — GitHub Pages 部署

更新：2026-10-12。唯一工作区 E:\loveapp。用户已明确选择 GitHub 公开仓库，并同意源码保留真实默认信息：石若瀚 / 张潋镕，2026-04-20。此前的 Private 要求已由用户变更，Vercel、腾讯云和付费域名路线停止。

## 当前状态

- 仓库：https://github.com/aaaaaaaalh/loveapp ，已创建并验证为 Public，尚未推送代码。创建前检查同名仓库不存在，没有覆盖或删除现有历史。
- 预计网址：https://aaaaaaaalh.github.io/loveapp/ ，尚未上线，不能当作可用链接。无需购买域名或付费套餐；仍受 GitHub Pages 的服务额度约束。
- 本机 GitHub CLI 已通过官方授权登录 aaaaaaaalh，workflow 权限已补充并经 CLI 验证；令牌不进入聊天或源码。代码推送与生产发布仍等待用户最终确认。
- 用户已在应用中启用 Full access，原 .git 目录写入恢复，113 个文件已成功暂存。切换运行用户后，Git 所有权检查通过仅对当前命令设置 safe.directory=E:/loveapp 解决，不修改全局配置，不重建仓库。
- 版本 0.3.0；拟定提交：v0.3.0 — Public deployment preparation。推送与正式发布仍须按用户最初要求展示文件和安全结果后取得确认。

## 页面与路由

GitHub Pages 是静态托管，不能使用 Vercel/腾讯云的服务器路由回退。Pages 构建设置 GITHUB_PAGES=true，Vite base=/loveapp/，使用 HashRouter。正式照片地址为 /loveapp/#/photos，留言为 /loveapp/#/letters。浏览器刷新只请求 /loveapp/，无需 404 重定向技巧。

本地 npm.cmd run dev 保持原 BrowserRouter 与简洁路由。src/utils/assetUrl.ts 仅给内置 /images/ 插画加构建前缀，私有照片签名 URL、外部图片及 Object URL 保持原样。注册回调已适配部署子目录。

## 自动构建与发布

.github/workflows/pages.yml 使用 Node 24，npm ci → lint → 数据库本地测试 → Pages 构建 → 上传 dist → 发布。只授予 contents:read，以及发布任务所需的 pages:write、id-token:write。

整个流程受仓库变量 PAGES_DEPLOY_ENABLED=true 控制。用户确认前不设置这个开关，不会因为首次推送自动上线。配置两个 Actions secrets：VITE_SUPABASE_URL、VITE_SUPABASE_PUBLISHABLE_KEY；它们是前端公开配置，编译后会出现在浏览器，secret 存储仅避免在源文件和构建日志中直接展示。不允许配置服务端管理密钥。

在授权与确认完成后，通过 CLI 安全传入公开配置、启用 Pages 的 GitHub Actions 来源、更新原 Supabase Auth Site URL 为最终 /loveapp/ 地址，并保留两个本地 5173 回调。不会重建数据库或放宽 RLS/Storage。

## 公开文件审查

完整拟提交文件：[deployment-files.txt](deployment-files.txt)。安全结果：[deployment-security.json](deployment-security.json)。源码、测试、迁移和文档可公开，包含用户已同意公开的姓名和纪念日。

.env.local、node_modules、dist、CLI 凭据、缓存、临时目录、测试运行输出和截图均被排除。照片和留言实际记录仍只在 Supabase，仓库不会包含用户上传的私人照片；tests/fixtures 两张公开素材仅用于测试。公开 publishable key 不等于授权，私有数据依赖 Auth 和 RLS。

## 本轮验收

姓名修改及回调适配后 lint 通过；GITHUB_PAGES=true 的 npm.cmd run build 通过，有 JS 超过 500 kB 的体积提示。npm.cmd run test:db 为 8 passed；npm.cmd run test:e2e 为 21 passed（57.0 秒）；GitHub Pages 专项为 37 passed，包含六页 × 六宽度和照片导航流程，浏览器错误列表为空。已移除不再使用的腾讯云 CLI 包装脚本，凭据忽略规则继续保留。

Pages 专项脚本：node --experimental-strip-types scripts/test-github-pages.mjs。它构建独立测试产物，用不提供 SPA 回退的严格静态服务器模拟 /loveapp/，验证六页六宽度、头像路径、Hash 导航与照片查询参数。Supabase 使用受控模拟，不写真实生活记录；结果不能标为公网验收。

云端只读查询没有找到原姓名“若瀚”、对方“张潋镕”、日期 2026-04-20 的空间，没有执行云端修改或删除。网站的默认姓名和测试配置已改为石若瀚。

## 尚未执行

GitHub 推送、设置 Actions 配置、启用 Pages、最终域名 Auth 回调，以及真实公网 HTTPS、手机网络、注册/登录、邀请、持久化、同步和权限验收均待授权/确认完成后执行。不能把本地测试说成线上已通过。

## 后续更新

在当前目录修改 → lint/build/测试 → 审查改动与敏感文件 → 确认推送 → GitHub Actions 自动发布 → 验证公网。正式发布后不需要本地电脑常开，Supabase 数据独立保存。国内手机的访问效果必须用实际网络验证，不能提前保证。

参考：[Vite GitHub Pages 部署](https://vite.dev/guide/static-deploy.html#github-pages)、[GitHub Pages 说明](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)。
