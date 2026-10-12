# LoveApp v0.3.0 — GitHub Pages 部署

更新：2026-10-12。唯一工作区 E:\loveapp。用户已明确选择 GitHub 公开仓库，并同意源码保留真实默认信息：石若瀚 / 张潋镕，2026-04-20。此前的 Private 要求已由用户变更，Vercel、腾讯云和付费域名路线停止。

## 当前状态

- 仓库：https://github.com/aaaaaaaalh/loveapp ，已创建并验证为 Public，代码已推送。创建前检查同名仓库不存在，没有覆盖或删除现有历史。
- 正式网址：https://aaaaaaaalh.github.io/loveapp/ ，已上线，HTTPS 实测 HTTP 200。首次成功部署运行：38200784618。无需购买域名或付费套餐；仍受 GitHub Pages 的服务额度约束。
- 用户已明确确认推送并上线。GitHub CLI 的 repo/workflow 授权已验证，凭据不进入源码。
- 用户已在应用中启用 Full access，原 .git 目录写入恢复，113 个文件已成功暂存。切换运行用户后，Git 所有权检查通过仅对当前命令设置 safe.directory=E:/loveapp 解决，不修改全局配置，不重建仓库。
- 版本 0.3.0；首次上线提交 0a30a9b：v0.3.0 — Public deployment preparation。文件清单和安全检查在推送前已向用户展示并取得确认。

## 页面与路由

GitHub Pages 是静态托管，不能使用 Vercel/腾讯云的服务器路由回退。Pages 构建设置 GITHUB_PAGES=true，Vite base=/loveapp/，使用 HashRouter。正式照片地址为 /loveapp/#/photos，留言为 /loveapp/#/letters。浏览器刷新只请求 /loveapp/，无需 404 重定向技巧。

本地 npm.cmd run dev 保持原 BrowserRouter 与简洁路由。src/utils/assetUrl.ts 仅给内置 /images/ 插画加构建前缀，私有照片签名 URL、外部图片及 Object URL 保持原样。注册回调已适配部署子目录。

## 自动构建与发布

.github/workflows/pages.yml 使用 Node 24，npm ci → lint → 数据库本地测试 → Pages 构建 → 上传 dist → 发布。只授予 contents:read，以及发布任务所需的 pages:write、id-token:write。

整个流程受仓库变量 PAGES_DEPLOY_ENABLED=true 控制，已在用户确认后启用。两个 Actions secrets 已配置并核验名称：VITE_SUPABASE_URL、VITE_SUPABASE_PUBLISHABLE_KEY；它们是前端公开配置，编译后会出现在浏览器，secret 存储仅避免在源文件和构建日志中直接展示。不配置服务端管理密钥。

已通过 CLI 安全传入公开配置、启用 Pages 的 GitHub Actions 来源、更新原 Supabase Auth Site URL 为最终 /loveapp/ 地址，并保留两个本地 5173 回调。config diff 先确认仅两项 Auth 地址变更后执行 config push，复查 update=0，九项远端默认值保留。未重建数据库或放宽 RLS/Storage。

## 公开文件审查

完整拟提交文件：[deployment-files.txt](deployment-files.txt)。安全结果：[deployment-security.json](deployment-security.json)。源码、测试、迁移和文档可公开，包含用户已同意公开的姓名和纪念日。

.env.local、node_modules、dist、CLI 凭据、缓存、临时目录、测试运行输出和截图均被排除。照片和留言实际记录仍只在 Supabase，仓库不会包含用户上传的私人照片；tests/fixtures 两张公开素材仅用于测试。公开 publishable key 不等于授权，私有数据依赖 Auth 和 RLS。

## 本轮验收

姓名修改及回调适配后 lint 通过；GITHUB_PAGES=true 的 npm.cmd run build 通过，有 JS 超过 500 kB 的体积提示。npm.cmd run test:db 为 8 passed；npm.cmd run test:e2e 为 21 passed（57.0 秒）；GitHub Pages 专项为 37 passed，包含六页 × 六宽度和照片导航流程，浏览器错误列表为空。已移除不再使用的腾讯云 CLI 包装脚本，凭据忽略规则继续保留。

Pages 专项脚本：node --experimental-strip-types scripts/test-github-pages.mjs。它构建独立测试产物，用不提供 SPA 回退的严格静态服务器模拟 /loveapp/，验证六页六宽度、头像路径、Hash 导航与照片查询参数。Supabase 使用受控模拟，不写真实生活记录；结果不能标为公网验收。

云端只读查询没有找到原姓名“若瀚”、对方“张潋镕”、日期 2026-04-20 的空间，没有执行云端修改或删除。网站的默认姓名和测试配置已改为石若瀚。

## 公网验收

真实公网测试使用 LOVEAPP_TEST_URL=https://aaaaaaaalh.github.io/loveapp/ 运行 scripts/test-cloud-live.mjs，报告保存为 public-live-results.json，与历史本地云端测试区分。仅创建带 run marker 的临时测试账号，清理严格限定本次账号及其空间，不删除真实用户数据。国内实体手机网络效果需要用户实际检查，不能以浏览器尺寸模拟替代。

首次 GitHub Actions 的 lint、test:db、build、deploy 全部成功。重新运行本地 lint/build 通过。构建仍有大于 500 kB 的包体积提示；Actions 有旧 Node 20 action 运行时兼容性提示，本次实际在 Node 24 下成功，后续维护升级，不影响本次结果。

首次公网验证全部功能通过，但清理临时空间时浏览器仍保持 Realtime 订阅，导致清理后的一次读取出现 HTTP 406。测试脚本已调整为先关闭浏览器，再清理本次临时资源；最终报告以重跑结果为准，不掩盖首轮清理阶段的问题。

最终重跑（2026-10-12 03:49 UTC）11 组全部通过，退出码 0，failure=null、browserErrors=[]、connectionWarnings=[]。覆盖真实注册、登录、双人邀请、照片与留言刷新保留、愿望与礼物增改删、资料同步、匿名与跨空间隔离、私有照片、六页六尺寸和退出登录。本次临时账号与空间已清理。机器报告：[public-live-results.json](public-live-results.json)。实体手机网络和邮件投递未验证；当前无邮件确认要求，找回密码仍未实现。

## 两个人开始使用

1. 在电脑或手机打开上面的 HTTPS 网址。已有账号直接登录；没有账号时各自注册一个。
2. 一人创建情侣空间，在「我的」生成邀请码；另一人选择加入对方空间并输入邀请码。不要各自创建两个空间。
3. 上传照片或填写记录后，等待保存成功。成功保存到 Supabase 的记录刷新、换设备后仍可读取；没点保存的草稿不会自动保存。
4. 公网网站由 GitHub 托管，关闭本地电脑不会关闭网站。源码公开，私人内容仍受 Supabase 登录、双人空间权限和私有照片桶保护。

## 后续更新

在当前目录修改 → lint/build/测试 → 审查改动与敏感文件 → 确认推送 → GitHub Actions 自动发布 → 验证公网。正式发布后不需要本地电脑常开，Supabase 数据独立保存。国内手机的访问效果必须用实际网络验证，不能提前保证。

参考：[Vite GitHub Pages 部署](https://vite.dev/guide/static-deploy.html#github-pages)、[GitHub Pages 说明](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)。
