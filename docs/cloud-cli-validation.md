# LoveApp v0.2.0 云端验收

日期：2026-10-11。唯一工作区：E:\loveapp。当前为两人私用的最简版本，沿用已认可的界面，停止增加功能。

## 交付状态

已复用用户确认的 LoveApp Free 组织下现有项目 rnramhagybuibobmketv，新加坡 ap-southeast-1。官方 CLI 登录、关联、数据库迁移、私有 Storage、Realtime、前端配置和本地回调已完成。没有新建收费资源、升级套餐、上传 GitHub 或部署 Vercel。

各自邮箱密码注册后直接进入，不需要确认邮件；石若瀚创建空间，张潋镕用邀请码加入同一空间。最多两人。初始仅设置石若瀚 / 张潋镕和 2026-04-20，照片、留言、愿望、礼物为空。

预览：http://127.0.0.1:5173/ ，最终请求实际返回 HTTP 200，服务保持运行。此地址仅在当前电脑使用，尚不是异地手机可访问的公网网站。

## 实际测试结果

| 检查 | 实际结果 |
| --- | --- |
| 安装 | npm 本地 Supabase CLI 2.120.0 安装成功，安装时审计 0 漏洞；锁文件已更新 |
| lint | npm.cmd run lint 通过，无错误 |
| build | npm.cmd run build 通过；CSS 49.96 kB、JS 689.23 kB（gzip 208.53 kB）；有大于 500 kB 的分包体积提示，不是构建失败 |
| 本地浏览器回归 | npm.cmd run test:e2e：21 passed，0 failed，35.4 秒。13 项内存演示、8 项云端 HTTP/WebSocket 模拟，独立于真实云测试 |
| 本地数据库权限 | npm.cmd run test:db：8 passed（1 父测试、7 子测试）；使用 PGlite，不冒充托管服务测试 |
| 真实直接注册 | 公开注册接口在 Chrome 实际创建三个临时账号，直接返回会话，无需邮件确认 |
| 真实登录与邀请 | 两个独立浏览器会话登录，一人创建、另一人加入；我/对方映射正确；两人上限生效 |
| 留言 | 真实发布、另一个会话自动出现、刷新后保留，Realtime 连接成功 |
| 照片 | 真实私有文件上传、刷新后签名地址加载大图、另一个账号可见；图片实际加载成功而非占位图 |
| 愿望 | 新增、编辑、完成、刷新保留、删除及双会话同步通过 |
| 礼物 | 新增、编辑、刷新保留、删除通过 |
| 个人资料 | 昵称修改、刷新保留、另一个账号同步及身份映射通过 |
| 页面与尺寸 | 真实云端六页 × 375/390/430/768/1024/1440px，直接访问和刷新通过，无横向溢出；本地回归另覆盖导航、长文本、弹窗滚动、Tailwind 样式与 Framer Motion |
| 退出与控制台 | 退出后刷新仍需登录；最终真实运行 browserErrors=[]、connectionWarnings=[] |
| 真实 RLS | 匿名用户被拒绝读取六表；第三个空间无法读取另一空间六表数据、不能新增冒名留言、不能修改/删除另一空间愿望和礼物 |
| 私有照片权限 | 未登录、第三个空间下载被拒绝；公开照片 URL 无法读取；成员签名地址可用 |
| 云端最终结构 | 只读 SQL 确认六张业务表全部启用 RLS，六表加入 Realtime，照片桶私有，迁移版本已登记 |
| 测试数据清理 | 临时照片通过 Storage API 删除；REST 清理空间时连接重置，随后通过官方 CLI 仅清理本次 UUID + run marker 对应测试数据。最终临时账号、空间、照片、留言、愿望、礼物与文件对象均为 0 |
| Git | 原 main 仓库保留；无已跟踪文件或正式提交。node_modules、dist、.env.local、CLI 凭据、关联缓存和临时测试文件实际通过 git check-ignore 验证 |

## 连接问题与实际替代流程

1. 按要求实际执行过 db push --dry-run --skip-vault，但 PostgreSQL 直连连接终止，未通过，不将其标为成功。之后通过官方 CLI db query --linked（Management API）执行完整迁移事务并 ROLLBACK，检查没有遗留结构，再执行同一事务的 COMMIT，同时登记标准 Supabase 迁移历史。未执行 db reset、删除项目或清空已有用户记录。
2. 本机 Node 代理对部分 Supabase 请求出现 ECONNRESET。真实注册及普通用户权限请求改用 Chrome 网络路径；管理密钥只留在 Node 测试进程，不传给网页。最终十组功能检查全部通过。
3. 最后一次真实脚本因 REST 清理失败退出 1，而不是零退出；随后精确限定本次测试账号的 CLI 清理成功，并执行 supabase/checks/acceptance.sql 确认无测试残留。原始 failure 保留在机器报告，cleanupRecovery 记录后续修复，不能将原始脚本说成零失败退出。
4. 最终 config diff 的 update=0；九项未声明的远端默认值保留。邮箱确认关闭、本地回调和最短 8 位密码与项目配置一致。

机器记录：[cloud-live-results.json](cloud-live-results.json)。真实登录页截图：[cloud-live-login-390.png](qa/cloud-live-login-390.png)。历史本地阶段记录：[cloud-validation.md](cloud-validation.md)。

## 主要新增和调整文件

- supabase/migrations/202610100001_private_space.sql、supabase/config.toml、supabase/checks/：数据表、双人成员、邀请、RLS、私有照片与最终检查。
- scripts/supabase.mjs、supabase-login.cmd、supabase-env.mjs、prepare-cloud-migration.mjs：官方登录、固定工作区、自动写入公开配置及迁移预演文件。
- src/services/ 与 src/hooks/：认证、远程数据仓库、同步及保存状态；src/pages/LoginPage.tsx、OnboardingPage.tsx 和账号/邀请组件。
- scripts/test-cloud-live.mjs、tests/：真实服务、受控模拟、界面和 SQL 权限测试；README.md 与 docs/supabase-setup.md：使用说明。
- .gitignore、package.json、package-lock.json：私密配置排除、CLI 与测试依赖。真实 .env.local 仅在本机，未输出密钥。

## 当前边界

没有测试邮件投递：当前按用户选择不需要确认邮件，也没有配置 SMTP。找回密码、头像上传、公网部署和真实隐藏购买状态均未实现。本次完成后保留预览，等待用户检查，不再增加功能。
