/**
 * GitHub Pages 构建：
 *   1. 以 /<repo>/ 作为 base
 *   2. 生成 404.html（SPA 深链接回退）
 *   3. 加 .nojekyll（避免 Pages 的 Jekyll 处理）
 */
import { copyFileSync, writeFileSync } from 'node:fs'
import { build } from 'vite'

const repo = process.env.PAGES_REPO || 'gsap-render'
process.env.VITE_BASE = `/${repo}/`

await build()

copyFileSync('dist/index.html', 'dist/404.html')
writeFileSync('dist/.nojekyll', '')
console.log(`[build:pages] done, base=/${repo}/`)
