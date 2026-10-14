# 照片代传与姓名展示

2026-10-13。用户确认上线后，数据库迁移已正式应用，前端提交 376d06e 已发布。GitHub Actions 38424382956 的 lint、数据库测试、build、deploy 全部成功。

## 行为与权限

上传照片时可选择当前情侣空间中自己或对方的名字，卡片、姓名筛选和双方账号按所选成员展示，刷新后保持。对方必须已经加入当前空间；旧照片仍显示原作者。留言和愿望的作者规则未改变。

新增 photos.display_author_id 只负责展示，原 author_id 继续记录实际上传账号，Storage 文件路径仍使用实际上传者 UUID。复合外键 (space_id, display_author_id) 限制所选成员来自同一空间。原照片插入 RLS 仍要求 author_id=auth.uid()，未放宽匿名访问、文件读取、上传和清理权限。

## 实际验证

- lint、Pages 生产构建通过，仍有既有的大包体积提示。
- 数据库测试 10 项通过，覆盖代传、伪造实际上传人被拒绝、跨空间展示作者被拒绝和文件路径约束。
- 最终浏览器回归 23 项通过：选择伴侣姓名、刷新保留、双方账号显示一致、姓名筛选及原有功能。首轮有瀑布流断言超时与 Chrome Target crashed；未修改原布局，完整重跑通过。新增测试曾有 TypeScript unknown 类型错误，补齐查询结果类型后构建通过。
- 官方 CLI db query --linked 执行事务迁移并 ROLLBACK 预演成功；复查 display_author_id 不存在，确认未留下正式变更。
- 首轮真实公网测试已通过代传姓名、双方展示、刷新恢复、实际上传人和路径核对，以及原有业务与权限检查。但控制台捕获到一次 Realtime WebSocket ERR_CONNECTION_TIMED_OUT，最终脚本退出 1，不能标记整轮通过；临时数据清理成功。随后不改变应用或放宽断言，重新执行相同测试。
- 重跑于 2026-10-13 15:49 UTC 完成，13 组公网检查全部通过，脚本退出码 0，failure=null、browserErrors=[]、connectionWarnings=[]。照片代传、双方姓名展示、刷新恢复、实际上传者保留及私有权限均经真实 Supabase 验证。测试专属临时账号、空间和照片已清理，未清空用户数据。结果见 [public-live-results.json](public-live-results.json)。

## 发布

已应用 202610130001_photo_attribution.sql 并登记迁移历史，复查 migration_applied=true、display_author_ready=true。迁移只增加可空展示字段、外键和该字段的插入权限，不删除或覆盖旧照片。旧版本客户端省略新字段仍可工作。
