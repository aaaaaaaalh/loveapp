# Supabase 接入代码与本地验收

日期：2026-10-10，工作区：`E:\loveapp`，版本：`0.2.0-dev.1`。

用户已选择接入 Supabase，范围为账号登录、持久保存和双人同步。保留已认可的界面，默认姓名为石若瀚 / 张潋镕，恋爱开始日期为 2026-04-20；照片、留言、愿望、礼物初始全部为空。没有添加虚构生活内容。

**本地实现和测试已完成，真实云端验收尚未执行。** 当前没有 `.env.local`，未获得可连接的 Supabase 项目，也未在真实项目中执行迁移。5173 的用户预览继续使用明确标识的内存演示模式。下面的受控浏览器测试与内存 PostgreSQL 测试不能证明托管 Auth、Storage 或 Realtime 已工作。

## 实际执行结果

| 项目 | 实际结果 |
| --- | --- |
| 安装依赖 | 已成功安装 `@supabase/supabase-js` 2.117.3 和仅用于开发测试的 `@electric-sql/pglite` 0.5.8；锁文件已更新 |
| `npm.cmd run lint` | 通过，0 错误、0 警告；新增权限断言后再次执行通过 |
| `npm.cmd run build` | 通过，TypeScript 和 Vite 构建成功；CSS 49.92 kB，JS 464.02 kB。使用当前空 Supabase 配置构建，真实配置后需重新构建 |
| `npm.cmd run test:db` | 8 passed、0 failed、0 skipped；包含 1 个父测试与 7 组权限检查。最终一轮 2.35 秒 |
| `npm.cmd run test:e2e` | 21 passed、0 failed、0 skipped；13 个演示测试和 8 个云端流程模拟测试，最终一轮 74.9 秒 |
| `npm.cmd audit --audit-level=high` | 实际返回 `found 0 vulnerabilities` |
| 本地预览 | 原有 `npm.cmd run dev` 服务保留，`http://127.0.0.1:5173/` 实际返回 HTTP 200 |
| Git | `main` 保留，尚无提交，`git ls-files` 为空；没有提交、推送或部署 |
| 忽略规则 | `git check-ignore` 实际确认 node_modules、dist、缓存、临时文件、测试输出、`.env.local`、`.env.production`、私钥文件均被忽略；空白 `.env.example` 保留为配置模板 |

浏览器使用 Windows 本机 Google Chrome 与 Playwright；测试临时服务分别在 5176、5177 运行，结束后退出，不影响 5173 的用户预览，不访问或写入真实 Supabase。最终报告为忽略的运行文件 `test-results/report.json`。

## 浏览器实际覆盖

| 项目 | 结果与范围 |
| --- | --- |
| 原有六页与空白内容 | 通过。首页、照片、留言、愿望、礼物、个人页，直接刷新、导航、空状态、用户指定姓名日期 |
| 六种宽度 | 通过。375、390、430、768、1024、1440px × 六页共 36 组；额外覆盖登录、创建/加入空间、邀请码、账号编辑界面，未发现横向溢出；原有手机导航与页尾遮挡检查通过 |
| 样式与动画 | 通过。Tailwind 4 真实工具类、圆角、网格、瀑布流、Framer Motion 渐入、打字效果及减少动画偏好；人工查看了新增创建空间、邀请与资料编辑截图 |
| 演示交互 | 通过。上传预览、照片切换、Object URL 释放、留言发布排序、愿望增删改与完成关联、礼物增删改、资料跨页同步；刷新回到空白且明确提示未持久化 |
| 登录与注册客户端流程 | 模拟测试通过。错误密码提示、邮箱确认提示、登录、刷新恢复会话、退出及退出后不再显示私密内容；没有发送真实确认邮件 |
| 双人空间 | 模拟测试通过。创建空白空间、生成邀请码、第二个独立浏览器账号加入、双方「我/对方」身份映射、作者映射与跨账号留言读取 |
| 保存与刷新 | 模拟测试通过。照片、留言、愿望、礼物、资料调用真实 SDK 的请求流程；刷新从受控测试后台重新获取内容。并未验证真实云端持久化 |
| 失败与慢请求 | 模拟测试通过。500 错误保留输入、不提前提示成功，禁用重复提交及弹窗关闭；照片记录失败后清理已上传文件并保留预览供重试 |
| 同步 | 模拟 WebSocket 更新即时反映到页面；未广播的删除由 15 秒补偿刷新读取。未验证托管 Realtime 网络行为 |
| 浏览器错误 | 所有测试的未捕获 JavaScript 错误均为零；控制台无非预期错误。云端失败测试仅排除有意构造的 HTTP 400/500 资源错误 |

截图在 `docs/qa/`：`login-390.png`、`login-1440.png`、`create-space-390.png`、`join-space-390.png`、`invite-390.png`、`invite-1440.png`、`account-edit-390.png`，以及更新后的六页截图。全页截图中的固定元素位置可能受截图时滚动位置影响；宽度和遮挡断言使用实际视口坐标。没有做 iOS/Android 真机或 Safari/Firefox 测试。

## SQL 与权限实际覆盖

[`tests/database.test.ts`](../tests/database.test.ts) 在 PGlite 内存 PostgreSQL 中执行完整迁移，使用最小 Auth/Storage 系统表模拟：

- 创建空间只写入用户指定姓名日期，生活记录为空；账号只能绑定一个空间。
- 未登录者和外部用户不能读取或修改空间；成员不能直接写入成员表或读取私有邀请表。
- 邀请码可轮换、有有效期、仅使用一次，最多加入第二名成员。
- 真实用户 UUID 必须匹配作者；成员不能伪造作者、插入自选 ID 或创建时间，不能改写原作者。
- 愿望、礼物、完成照片不能引用其他空间或外部成员。
- Storage 策略限制成员读取、本人路径上传，以及只清理本人未关联记录的文件。
- 双方更新资料按各自身份正确映射；日期允许清空，空昵称被拒绝。

这是实际 PostgreSQL/RLS 执行，仍未验证真实项目的默认授权、Auth JWT、Storage HTTP 服务或 SQL Editor 执行结果。

## 主要新增与修改

- `src/services/supabaseClient.ts`、`supabaseRepository.ts`：配置、SDK、数据访问、私有上传、签名地址、订阅与补偿刷新。
- `AuthProvider`、`CloudGate`、`LoginPage`、`OnboardingPage`、`AccountPanel`、`InvitePartner`：登录保护、双人绑定、退出和账号界面。
- `useAuth`、`useSave`、`useSpace` 与数据类型：共享身份和异步状态；原有编辑、上传、删除弹窗适配实际保存结果。
- `src/index.css`、布局和个人页：延续暖色设计，按演示/云端显示保存说明与同步状态。
- `supabase/migrations/202610100001_private_space.sql`：业务表、RPC、RLS、私有照片桶及 Realtime publication。
- `.env.example`、包文件、测试配置、`scripts/test-browser.mjs`、数据库和浏览器测试、README 与接入文档。

现有根 Git、MIT 授权与原作者版权声明保留；未创建项目副本或嵌套仓库。

## 真实服务待办

按 [`supabase-setup.md`](supabase-setup.md) 创建或选择空项目，执行完整迁移，设置邮箱确认和本地重定向地址，将项目 URL 与公开 publishable key 写入根目录 `.env.local`。不需要提供数据库密码、账号密码或管理员密钥。

配置完成后重启预览，再执行真实邮箱登录、双方账号绑定、刷新持久保存、私有照片读取、双人同步与外部访问拒绝验收。当前没有部署或上传 GitHub。找回密码、头像上传、离线编辑、备份与真实惊喜购买状态均未新增。
