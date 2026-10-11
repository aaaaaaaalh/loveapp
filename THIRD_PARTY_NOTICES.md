# 第三方来源与授权

## Timeless Love Anniversary App

- 项目：<https://github.com/Navaneeth223/timeless-love-anniversary-app>
- 参考提交：`474d8720761b87d9502ac8e319e602a5db5a4a71`
- 原作者版权声明：`Copyright (c) 2026 Navaneeth.k.v`
- 授权：MIT。完整原始许可保持在根目录 [`LICENSE`](LICENSE)，原版权与许可全文均未删改。

改编映射：

| 原文件 | 本项目 | 改编内容 |
| --- | --- | --- |
| `tailwind.config.js` | `tailwind.config.ts` | 保留 rosewater、peach 的柔和色值，扩展暖白与玫瑰主题，升级 Tailwind 4 |
| `src/pages/Anniversary.jsx` 的 `shimmerVariants` | `src/utils/motion.ts`、`src/components/Reveal.tsx` | 渐入动画的 opacity / y 结构，缩短位移并尊重减少动画偏好 |
| 同文件的 `useTimeTogether` | `src/hooks/useTimeTogether.ts`、`src/hooks/useNow.ts`、`src/utils/date.ts` | 定时更新时间的思路，改为本地日历天数并清理计时器 |
| `src/hooks/useTypewriter.js` | `src/hooks/useTypewriter.ts`、`src/components/LetterReader.tsx` | 字符递增与定时器清理，增加 TypeScript、按情书重新挂载及减少动画支持 |

没有复制参考项目 `.git`、整套 Creator / Anniversary 页面、原上传账户、URL 内嵌分享逻辑或示例人物配置。

## 测试专用摄影图片

来自 [Unsplash](https://unsplash.com)，按 [Unsplash License](https://unsplash.com/license) 使用。仅供 Playwright 在隔离浏览器会话中测试本地图片上传，不作为网站初始内容，也不进入生产构建，不代表真实情侣的个人照片。

| 本地文件 | 原始图片 URL |
| --- | --- |
| `tests/fixtures/flowers.jpg` | <https://images.unsplash.com/photo-1490750967868-88aa4486c946> |
| `tests/fixtures/coffee.jpg` | <https://images.unsplash.com/photo-1442512595331-e89e73853f31> |

`scripts/fetch-assets.mjs` 记录下载地址和尺寸，可在项目根目录重新获取测试图片与参考项目许可证。重下资源需要网络；网站正常运行不需要这些摄影素材。

头像、礼物占位插画与 favicon 为本项目的 SVG 图形。图标来自 npm 依赖 `lucide-react`（ISC）；其他依赖的许可随各自 npm 包提供，精确版本见锁文件。
