import { test, expect, type Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

const routes = [
  { path: '/', heading: '有你，日常也值得收藏。', nav: '首页' },
  { path: '/photos', heading: '我们的回忆', nav: '照片' },
  { path: '/letters', heading: '想对你说', nav: '留言' },
  { path: '/wishes', heading: '我们的愿望清单', nav: '愿望' },
  { path: '/gifts', heading: '心愿礼物', nav: '愿望' },
  { path: '/profile', heading: '关于我们', nav: '我的' }
]
let browserErrors: string[]

test.beforeEach(async ({ page }) => {
  browserErrors = []
  page.on('pageerror', error => browserErrors.push(`JS: ${error.message}`))
  page.on('console', message => { if (message.type() === 'error') browserErrors.push(`Console: ${message.text()}`) })
  await page.emulateMedia({ reducedMotion: 'reduce' })
})

test.afterEach(() => { expect(browserErrors, 'No uncaught JavaScript or console errors').toEqual([]) })

async function navigate(page: Page, label: string) {
  const navigation = page.viewportSize()!.width < 768 ? page.getByRole('navigation', { name: '手机导航' }) : page.getByRole('navigation', { name: '主导航' })
  await navigation.getByRole('link', { name: label, exact: true }).click()
}

async function assertNoOverflow(page: Page) {
  const metrics = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth }))
  expect(metrics.document, JSON.stringify(metrics)).toBeLessThanOrEqual(metrics.viewport)
  expect(metrics.body, JSON.stringify(metrics)).toBeLessThanOrEqual(metrics.viewport)
}

test('starts with user-provided couple details and no invented records', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.couple-names')).toHaveText('石若瀚张潋镕')
  await expect(page.locator('.since-date')).toHaveText('SINCE 2026.04.20')
  const days = await page.evaluate(() => {
    const now = new Date()
    return Math.floor((Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - Date.UTC(2026, 3, 20)) / 86_400_000)
  })
  await expect(page.getByTestId('day-count')).toHaveText(`${days.toLocaleString()}天`)
  await expect(page.locator('.hero-photo img')).toHaveCount(0)
  await expect(page.locator('.daily-quote')).toHaveCount(0)
  await expect(page.getByText('还没有写下今天的话')).toBeVisible()
  await expect(page.locator('.recent-photos')).toHaveCount(0)
  await expect(page.locator('.home-letter-content')).toHaveCount(0)
  await expect(page.locator('.home-progress strong')).toHaveText('0 / 0')
  for (const [path, card] of [['/photos', '.photo-card'], ['/letters', '.letter-card'], ['/wishes', '.wish-card'], ['/gifts', '.gift-card']]) {
    await page.goto(path)
    await expect(page.locator(card)).toHaveCount(0)
    await page.reload()
    await expect(page.locator(card)).toHaveCount(0)
  }
  await page.getByRole('button', { name: /张潋镕的愿望/ }).click()
  await expect(page.locator('.gift-card')).toHaveCount(0)
  await navigate(page, '我的')
  for (const count of await page.locator('.profile-stat-grid strong').all()) await expect(count).toHaveText('0')
  await expect(page.getByText('2026年4月20日')).toBeVisible()
})

test('a cleared start date shows an unset state and can be restored by refresh', async ({ page }) => {
  await page.goto('/profile')
  await page.getByRole('button', { name: '编辑我们的信息' }).click()
  await page.getByLabel('恋爱开始日期').fill('')
  await page.getByRole('button', { name: '保存演示信息' }).click()
  await expect(page.getByText('尚未设置', { exact: true })).toBeVisible()
  await navigate(page, '首页')
  await expect(page.getByTestId('day-count')).toHaveText('尚未设置')
  await expect(page.getByRole('link', { name: '设置恋爱开始日期' })).toBeVisible()
  await page.reload()
  await expect(page.locator('.since-date')).toHaveText('SINCE 2026.04.20')
})

test('all six pages open via navigation and support direct refresh', async ({ page }) => {
  await page.goto('/')
  for (const route of routes) {
    if (route.path === '/gifts') await page.getByRole('navigation', { name: '愿望类型' }).getByRole('link', { name: '想要的礼物' }).click()
    else await navigate(page, route.nav)
    await expect(page).toHaveURL(new RegExp(`${route.path === '/' ? '/$' : `${route.path}$`}`))
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(route.heading)
    const response = await page.reload()
    expect(response?.status()).toBe(200)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(route.heading)
  }
  await page.goto('/this-page-does-not-exist')
  await expect(page.getByText('这条小路，还没有故事')).toBeVisible()
  await page.getByRole('link', { name: '回到首页' }).click()
  await expect(page).toHaveURL(/\/$/)
})

test('all six widths × all six pages: styles, photos, navigation, and no overflow', async ({ page }) => {
  mkdirSync(resolve('docs/qa'), { recursive: true })
  for (const width of [375, 390, 430, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: width < 768 ? 844 : 1000 })
    for (const route of routes) {
      await page.goto(route.path)
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(route.heading)
      await assertNoOverflow(page)
      const nav = page.locator(width < 768 ? '.mobile-nav' : '.desktop-nav')
      await expect(nav).toBeVisible()
      await expect(nav.getByRole('link', { name: route.nav, exact: true })).toHaveClass(/active/)
      if (width < 768) {
        const metrics = await nav.boundingBox()
        expect(metrics!.y + metrics!.height).toBeLessThanOrEqual(844)
        await page.evaluate(() => scrollTo(0, document.body.scrollHeight))
        const main = await page.locator('main').boundingBox()
        expect(main!.y + main!.height).toBeLessThanOrEqual(metrics!.y)
        await page.evaluate(() => scrollTo(0, 0))
      }
      if (route.path === '/photos') {
        await expect(page.locator('.photo-card')).toHaveCount(0)
        await expect(page.getByText('这里，等一个值得收藏的瞬间')).toBeVisible()
      }
      if (route.path === '/') {
        expect(await page.locator('.together-card').evaluate(element => getComputedStyle(element).borderRadius)).toBe(width < 768 ? '18px' : '22px')
        expect(await page.locator('.together-card').evaluate(element => getComputedStyle(element).display)).toBe('grid')
        expect(await page.locator('.skip-link').evaluate(element => getComputedStyle(element).position)).toBe('fixed')
        const columns = await page.locator('.quick-links').evaluate(element => getComputedStyle(element).gridTemplateColumns.split(' ').length)
        expect(columns).toBe(width < 768 ? 2 : 4)
      }
      if (route.path === '/letters') {
        // This is an actual generated Tailwind utility, separate from app CSS.
        await expect(page.locator('.sort-control .sr-only')).toHaveCSS('position', 'absolute')
        await expect(page.locator('.sort-control .sr-only')).toHaveCSS('width', '1px')
      }
      await page.evaluate(async () => {
        await Promise.all(Array.from(document.images).map(image => {
          image.loading = 'eager'
          return image.decode().catch(() => undefined)
        }))
      })
      const brokenImages = await page.evaluate(() => Array.from(document.images).filter(image => image.naturalWidth === 0).map(image => image.src))
      expect(brokenImages).toEqual([])
      if (width === 390 || (width === 1440 && route.path === '/')) {
        await page.screenshot({ path: `docs/qa/${route.path === '/' ? 'home' : route.path.slice(1)}-${width}.png`, fullPage: true })
      }
    }
  }
})

test('mobile photo upload, preview, arrows, cancellation and session ownership of blob URLs', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.addInitScript(() => {
    const revoke = URL.revokeObjectURL.bind(URL)
    const testWindow = window as typeof window & { revokedUrls: string[] }
    testWindow.revokedUrls = []
    URL.revokeObjectURL = url => { testWindow.revokedUrls.push(url); revoke(url) }
  })
  await page.goto('/photos')
  await page.getByRole('button', { name: '上传照片', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText(/不会上传到云端/)).toBeVisible()
  await dialog.getByLabel('选择本地图片').setInputFiles(resolve('tests/fixtures/coffee.jpg'))
  await expect(dialog.getByAltText('待上传图片 1')).toBeVisible()
  const abandonedUrl = await dialog.getByAltText('待上传图片 1').getAttribute('src')
  await dialog.getByRole('button', { name: '取消', exact: true }).click()
  await expect.poll(() => page.evaluate(() => (window as typeof window & { revokedUrls: string[] }).revokedUrls)).toContain(abandonedUrl)
  await page.getByRole('button', { name: '上传照片', exact: true }).click()
  await dialog.getByLabel('选择本地图片').setInputFiles([resolve('tests/fixtures/flowers.jpg'), resolve('tests/fixtures/coffee.jpg')])
  await dialog.getByLabel('图片 1 描述').fill('自动验收 · 今天的小花')
  await dialog.getByLabel('图片 2 描述').fill('第二张测试照片')
  const uploadedUrl = await dialog.getByAltText('待上传图片 1').getAttribute('src')
  await dialog.getByRole('button', { name: /加入本次演示/ }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  for (const width of [375, 390, 430, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 844 })
    await assertNoOverflow(page)
    await expect.poll(() => page.locator('.photo-masonry').evaluate(element => getComputedStyle(element).columnCount)).toBe(width < 768 ? '2' : width < 1200 ? '3' : '4')
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.getByRole('button', { name: '查看照片：自动验收 · 今天的小花' })).toBeVisible()
  await page.getByRole('button', { name: '查看照片：自动验收 · 今天的小花' }).click()
  await expect(page.getByRole('dialog').getByText('自动验收 · 今天的小花', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '下一张照片' }).click()
  await expect(page.locator('.lightbox-caption > p')).not.toHaveText('自动验收 · 今天的小花')
  await page.getByRole('button', { name: '上一张照片' }).click()
  await expect(page.locator('.lightbox-caption > p')).toHaveText('自动验收 · 今天的小花')
  await page.keyboard.press('ArrowRight')
  await expect(page.locator('.lightbox-caption > p')).not.toHaveText('自动验收 · 今天的小花')
  await page.keyboard.press('ArrowLeft')
  await expect(page.locator('.lightbox-caption > p')).toHaveText('自动验收 · 今天的小花')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await navigate(page, '首页')
  await expect(page.locator('.recent-photos').getByText('自动验收 · 今天的小花')).toBeVisible()
  await navigate(page, '照片')
  await expect(page.getByRole('button', { name: '查看照片：自动验收 · 今天的小花' })).toBeVisible()
  expect(await page.evaluate(() => (window as typeof window & { revokedUrls: string[] }).revokedUrls)).not.toContain(uploadedUrl)
  await page.reload()
  await expect(page.getByRole('button', { name: '查看照片：自动验收 · 今天的小花' })).toHaveCount(0)
  await expect(page.locator('.photo-card')).toHaveCount(0)
  await expect(page.getByText('尚未保存到云端，所有改动仅在本次打开中有效，刷新后会恢复为空白空间。')).toBeVisible()
})

test('letters publish, chronological order, reading dialog, and home synchronization', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 844 })
  await page.goto('/letters')
  await page.getByRole('button', { name: '写一条留言' }).click()
  await page.getByLabel('想说的话').fill('较早的测试留言')
  await page.getByRole('button', { name: '发布到演示空间' }).click()
  await page.getByRole('button', { name: '写一条留言' }).click()
  await expect(page.getByRole('button', { name: '发布到演示空间' })).toBeDisabled()
  await page.getByLabel('想说的话').fill('自动验收留言：想和你慢慢过每一天。')
  await page.getByRole('button', { name: '发布到演示空间' }).click()
  await expect(page.locator('.letter-card').first()).toContainText('自动验收留言')
  await page.getByLabel('留言排序').selectOption('oldest')
  await expect(page.locator('.letter-card').last()).toContainText('自动验收留言')
  await page.locator('.letter-card').last().getByRole('button', { name: '慢慢读' }).click()
  await expect(page.getByRole('dialog').locator('.typed-letter')).toHaveText('自动验收留言：想和你慢慢过每一天。')
  await page.getByRole('button', { name: '关闭弹窗' }).click()
  await navigate(page, '首页')
  await expect(page.locator('.home-letter-content')).toContainText('自动验收留言')
  await expect(page.locator('.daily-quote')).toHaveText('自动验收留言：想和你慢慢过每一天。')
  await navigate(page, '留言')
  await expect(page.locator('.letter-card')).toHaveCount(2)
  await page.reload()
  await expect(page.locator('.letter-card')).toHaveCount(0)
  await expect(page.getByText(/自动验收留言/)).toHaveCount(0)
})

test('wishes create, edit, all three states, completion details, home progress, delete and empty state', async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 844 })
  await page.goto('/photos?upload=1')
  await page.getByLabel('选择本地图片').setInputFiles(resolve('tests/fixtures/coffee.jpg'))
  await page.getByLabel('图片 1 描述').fill('完成照片')
  await page.getByRole('button', { name: /加入本次演示/ }).click()
  await navigate(page, '愿望')
  await page.getByRole('button', { name: '添加愿望', exact: true }).click()
  await page.getByLabel('愿望标题').fill('自动验收愿望')
  await page.getByLabel('关于这个愿望').fill('这是一段愿望描述')
  await page.getByRole('button', { name: '加入愿望清单' }).click()
  const card = page.locator('.wish-card').filter({ has: page.getByRole('heading', { name: '自动验收愿望', exact: true }) })
  await expect(card).toContainText('这是一段愿望描述')
  await card.getByLabel('修改愿望状态：自动验收愿望').selectOption('planned')
  await expect(card).toHaveClass(/wish-planned/)
  await card.getByRole('button', { name: '编辑愿望：自动验收愿望', exact: true }).click()
  await page.getByLabel('愿望标题').fill('自动验收愿望已编辑')
  await page.getByLabel('关于这个愿望').fill('描述也已经更新')
  await page.getByRole('button', { name: '保存本次修改' }).click()
  const edited = page.locator('.wish-card').filter({ has: page.getByRole('heading', { name: '自动验收愿望已编辑', exact: true }) })
  await expect(edited).toContainText('描述也已经更新')
  await edited.getByLabel('修改愿望状态：自动验收愿望已编辑').selectOption('done')
  await expect(edited).toHaveClass(/wish-done/)
  await edited.getByRole('button', { name: '记录完成瞬间' }).click()
  await page.getByLabel('完成日期').fill('2026-10-01')
  await page.getByLabel('关联一张回忆').selectOption({ label: '完成照片' })
  await page.getByRole('button', { name: '保存完成纪念' }).click()
  await expect(edited).toContainText('10月1日')
  await expect(edited.getByAltText('愿望完成照片')).toBeVisible()
  await navigate(page, '首页')
  await expect(page.locator('.home-progress strong')).toHaveText('1 / 1')
  await navigate(page, '愿望')
  await edited.getByLabel('修改愿望状态：自动验收愿望已编辑').selectOption('todo')
  await expect(edited).toHaveClass(/wish-todo/)
  await expect(edited.locator('.wish-completion-row')).toHaveCount(0)
  await page.getByRole('button', { name: '删除愿望：自动验收愿望已编辑', exact: true }).click()
  await page.getByRole('button', { name: '再想想' }).click()
  await expect(page.getByRole('heading', { name: '自动验收愿望已编辑' })).toBeVisible()
  await page.getByRole('button', { name: '删除愿望：自动验收愿望已编辑', exact: true }).click()
  await page.getByRole('button', { name: '确认删除' }).click()
  await expect(page.getByRole('heading', { name: '自动验收愿望已编辑' })).toHaveCount(0)
  // A real empty list exercises the empty-state UI without adding a reset feature.
  while (await page.getByRole('button', { name: /^删除愿望：/ }).count()) {
    await page.getByRole('button', { name: /^删除愿望：/ }).first().click()
    await page.getByRole('button', { name: '确认删除' }).click()
  }
  await expect(page.getByText('给未来的我们，留一个期待')).toBeVisible()
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')
  await page.reload()
  await expect(page.locator('.wish-card')).toHaveCount(0)
})

test('gifts create, edit owner/price/link/priority, filter, delete, and surprise notice', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/wishes')
  await page.getByRole('navigation', { name: '愿望类型' }).getByRole('link', { name: '想要的礼物' }).click()
  await page.getByRole('button', { name: '添加礼物' }).click()
  await page.getByLabel('礼物名称').fill('自动验收礼物')
  await page.getByLabel('参考价格（元）').fill('199.5')
  await page.getByLabel('心动程度').selectOption('high')
  await page.getByLabel('商品链接').fill('https://example.com/gift')
  await page.getByLabel('图片链接').fill('http://127.0.0.1:5173/images/gift-placeholder.svg')
  await page.getByLabel('想告诉对方的话').fill('这是我们记录的礼物备注')
  await page.getByRole('button', { name: '加入礼物心愿' }).click()
  const card = page.locator('.gift-card').filter({ has: page.getByRole('heading', { name: '自动验收礼物', exact: true }) })
  await expect(card).toContainText('199.5')
  await expect(card).toContainText('特别想要')
  await expect(card.getByAltText('自动验收礼物')).toHaveAttribute('src', 'http://127.0.0.1:5173/images/gift-placeholder.svg')
  await expect(card.getByRole('link', { name: '看看礼物' })).toHaveAttribute('href', 'https://example.com/gift')
  await card.getByRole('button', { name: '编辑礼物：自动验收礼物', exact: true }).click()
  await page.getByLabel('礼物名称').fill('自动验收礼物已编辑')
  await page.getByRole('dialog').getByRole('button', { name: '张潋镕', exact: true }).click()
  await page.getByLabel('心动程度').selectOption('low')
  await page.getByRole('button', { name: '保存本次修改' }).click()
  await expect(page.getByRole('heading', { name: '自动验收礼物已编辑' })).toHaveCount(0)
  await page.getByRole('button', { name: /张潋镕的愿望/ }).click()
  await expect(page.getByRole('heading', { name: '自动验收礼物已编辑' })).toBeVisible()
  await expect(page.locator('.gift-card').filter({ hasText: '自动验收礼物已编辑' })).toContainText('随缘就好')
  await page.getByRole('button', { name: '删除礼物：自动验收礼物已编辑' }).click()
  await page.getByRole('button', { name: '确认删除' }).click()
  await expect(page.getByRole('heading', { name: '自动验收礼物已编辑' })).toHaveCount(0)
  await page.getByRole('button', { name: '惊喜模式 · 敬请期待' }).click()
  await expect(page.getByRole('dialog')).toContainText('没有隐藏购买状态或秘密记录')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  while (await page.getByRole('button', { name: /^删除礼物：/ }).count()) {
    await page.getByRole('button', { name: /^删除礼物：/ }).first().click()
    await page.getByRole('button', { name: '确认删除' }).click()
  }
  await expect(page.getByText('把喜欢的东西，悄悄记下来')).toBeVisible()
  await page.getByRole('button', { name: '添加礼物', exact: true }).click()
  await page.getByLabel('礼物名称').fill('刷新后应消失的礼物')
  await page.getByRole('button', { name: '加入礼物心愿' }).click()
  await navigate(page, '我的')
  await expect(page.locator('.profile-stat-grid > div').last().locator('strong')).toHaveText('1')
  await page.reload()
  await expect(page.locator('.profile-stat-grid > div').last().locator('strong')).toHaveText('0')
})

test('profile edits synchronize names and day count across pages, then reset on refresh', async ({ page }) => {
  await page.goto('/profile')
  await page.getByRole('button', { name: '编辑我们的信息' }).click()
  await page.getByLabel('我的昵称').fill('测试石若瀚')
  await page.getByLabel('对方的昵称').fill('测试女友')
  await page.getByLabel('恋爱开始日期').fill('2026-10-01')
  await page.getByRole('button', { name: '保存演示信息' }).click()
  await expect(page.locator('.profile-main-card h2')).toContainText('测试石若瀚')
  await navigate(page, '首页')
  await expect(page.locator('.couple-names')).toHaveText('测试石若瀚测试女友')
  const expectedDays = await page.evaluate(() => {
    const now = new Date()
    return Math.max(0, Math.floor((Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - Date.UTC(2026, 9, 1)) / 86_400_000))
  })
  await expect(page.getByTestId('day-count')).toHaveText(`${expectedDays.toLocaleString()}天`)
  await navigate(page, '照片')
  await expect(page.getByRole('button', { name: '测试石若瀚的镜头' })).toBeVisible()
  await navigate(page, '留言')
  await expect(page.getByRole('button', { name: '测试女友写的' })).toBeVisible()
  await navigate(page, '愿望')
  await page.getByRole('button', { name: '添加愿望', exact: true }).click()
  await expect(page.getByRole('dialog').getByRole('button', { name: '测试石若瀚', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '关闭弹窗' }).click()
  await page.getByRole('navigation', { name: '愿望类型' }).getByRole('link', { name: '想要的礼物' }).click()
  await expect(page.getByRole('button', { name: /测试女友的愿望/ })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('button', { name: /张潋镕的愿望/ })).toBeVisible()
  await navigate(page, '我的')
  await expect(page.locator('.profile-main-card h2')).toHaveText('石若瀚&张潋镕')
  await page.getByRole('button', { name: '编辑我们的信息' }).click()
  await expect(page.getByLabel('恋爱开始日期')).toHaveValue('2026-04-20')
  await page.getByRole('button', { name: '关闭弹窗' }).click()
  await expect(page.getByText('当前是演示模式')).toBeVisible()
})

test('long names and text fit mobile, modals scroll and keyboard focus stays inside', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 })
  await page.goto('/profile')
  await page.getByRole('button', { name: '编辑我们的信息' }).click()
  await page.getByLabel('我的昵称').fill('石若瀚'.repeat(10))
  await page.getByLabel('对方的昵称').fill('女孩'.repeat(10))
  await page.getByRole('button', { name: '保存演示信息' }).click()
  for (const route of routes) { await navigate(page, route.nav); if (route.path === '/gifts') await page.getByRole('navigation', { name: '愿望类型' }).getByRole('link', { name: '想要的礼物' }).click(); await assertNoOverflow(page) }
  await navigate(page, '愿望')
  await page.getByRole('button', { name: '添加愿望', exact: true }).click()
  await page.getByLabel('愿望标题').fill('a'.repeat(60))
  await page.getByLabel('关于这个愿望').fill('b'.repeat(500))
  await page.getByRole('button', { name: '加入愿望清单' }).click()
  await assertNoOverflow(page)
  await page.getByRole('button', { name: `编辑愿望：${'a'.repeat(60)}`, exact: true }).click()
  await page.getByRole('button', { name: '保存本次修改' }).focus()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: '关闭弹窗' })).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(page.getByRole('button', { name: '保存本次修改' })).toBeFocused()
  await expect(page.locator('#root')).toHaveAttribute('inert', '')
  await assertNoOverflow(page)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.locator('#root')).not.toHaveAttribute('inert')
  await navigate(page, '愿望')
  await page.getByRole('navigation', { name: '愿望类型' }).getByRole('link', { name: '想要的礼物' }).click()
  await page.getByRole('button', { name: '添加礼物' }).click()
  const sizes = await page.locator('.modal-content').evaluate(element => ({ content: element.scrollHeight, viewport: element.clientHeight }))
  expect(sizes.content).toBeGreaterThan(sizes.viewport)
  const horizontal = await page.locator('.modal-content').evaluate(element => ({ content: element.scrollWidth, viewport: element.clientWidth }))
  expect(horizontal.content).toBeLessThanOrEqual(horizontal.viewport)
  await page.getByLabel('礼物名称').fill('超长文字礼物名称'.repeat(6))
  await page.getByLabel('想告诉对方的话').fill('这个备注很长'.repeat(80))
  await page.getByRole('button', { name: '加入礼物心愿' }).click()
  await assertNoOverflow(page)
})

test('Framer Motion reveal and adapted typewriter work with normal motion enabled', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/')
  await expect(page.locator('.together-card')).toHaveCSS('opacity', '1')
  const transform = await page.locator('.together-card').evaluate(element => getComputedStyle(element).transform)
  expect(transform).toBe('none')
  await navigate(page, '留言')
  await page.getByRole('button', { name: '写一条留言' }).click()
  await page.getByLabel('想说的话').fill('动画验收文字')
  await page.getByRole('button', { name: '发布到演示空间' }).click()
  await page.locator('.letter-card').first().getByRole('button', { name: '慢慢读' }).click()
  const fullText = await page.getByRole('dialog').locator('.sr-only').textContent()
  await expect.poll(async () => (await page.locator('.typed-letter').textContent())?.length ?? 0).toBeGreaterThan(0)
  await expect(page.locator('.typed-letter')).toHaveText(fullText!, { timeout: 15_000 })
  await page.keyboard.press('Escape')
})

test('photo input validation, removing and replacing previews release object URLs', async ({ page }) => {
  await page.addInitScript(() => {
    const revoke = URL.revokeObjectURL.bind(URL)
    const testWindow = window as typeof window & { revokedUrls: string[] }
    testWindow.revokedUrls = []
    URL.revokeObjectURL = url => { testWindow.revokedUrls.push(url); revoke(url) }
  })
  await page.goto('/photos?upload=1')
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('选择本地图片').setInputFiles({ name: 'not-a-photo.txt', mimeType: 'text/plain', buffer: Buffer.from('invalid upload') })
  await expect(dialog.getByRole('alert')).toContainText('请选择小于 12 MB')
  await expect(dialog.getByRole('button', { name: /加入本次演示/ })).toBeDisabled()
  await dialog.getByLabel('选择本地图片').setInputFiles(resolve('tests/fixtures/coffee.jpg'))
  const first = await dialog.getByAltText('待上传图片 1').getAttribute('src')
  await dialog.getByLabel('选择本地图片').setInputFiles(resolve('tests/fixtures/flowers.jpg'))
  const second = await dialog.getByAltText('待上传图片 1').getAttribute('src')
  expect(await page.evaluate(() => (window as typeof window & { revokedUrls: string[] }).revokedUrls)).toContain(first)
  await dialog.getByRole('button', { name: '移除图片 1' }).click()
  expect(await page.evaluate(() => (window as typeof window & { revokedUrls: string[] }).revokedUrls)).toContain(second)
  await expect(dialog.getByRole('button', { name: /加入本次演示/ })).toBeDisabled()
  await page.mouse.click(2, 2)
  await expect(dialog).toHaveCount(0)
})

test('four- and five-digit relationship counters fit their card at every target width', async ({ page }) => {
  for (const startDate of ['2010-05-20', '1900-01-01']) {
    await page.goto('/profile')
    await page.getByRole('button', { name: '编辑我们的信息' }).click()
    await page.getByLabel('恋爱开始日期').fill(startDate)
    await page.getByRole('button', { name: '保存演示信息' }).click()
    for (const width of [375, 390, 430, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 844 })
      await navigate(page, '首页')
      const metrics = await page.getByTestId('day-count').evaluate(element => {
        const range = document.createRange()
        range.selectNodeContents(element)
        return { textRight: range.getBoundingClientRect().right, contentRight: element.closest('.together-content')!.getBoundingClientRect().right }
      })
      expect(Math.ceil(metrics.textRight), `${startDate} at ${width}px`).toBeLessThanOrEqual(Math.ceil(metrics.contentRight))
      await assertNoOverflow(page)
    }
  }
})
