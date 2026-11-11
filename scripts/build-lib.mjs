/**
 * 库构建：输出带外置 GSAP 的 ESM 与 UMD 产物（dist-lib/）。
 * - ESM：给打包器用，`gsap` 保持 external
 * - UMD：给 CDN <script> 用，`gsap` 映射到 window.gsap
 */
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { build } from 'vite'

const root = fileURLToPath(new URL('..', import.meta.url))
const alias = { '@': resolve(root, 'src') }
const external = [/^gsap(\/|$)/]
const globals = {
  gsap: 'gsap',
  'gsap/SplitText': 'SplitText',
  'gsap/ScrollTrigger': 'ScrollTrigger',
}

const shared = {
  configFile: false,
  root,
  resolve: { alias },
  logLevel: 'warn',
}

await build({
  ...shared,
  build: {
    outDir: 'dist-lib',
    emptyOutDir: true,
    minify: true,
    lib: {
      entry: {
        'gsap-render': resolve(root, 'src/lib/index.ts'),
        'split-text': resolve(root, 'src/lib/split-text.ts'),
        'scroll-trigger': resolve(root, 'src/lib/scroll-trigger.ts'),
        'in-view': resolve(root, 'src/lib/in-view.ts'),
      },
      formats: ['es'],
    },
    rollupOptions: {
      external,
      output: {
        entryFileNames: '[name].es.js',
        chunkFileNames: 'chunks/[name]-[hash].js',
      },
    },
  },
})

await build({
  ...shared,
  build: {
    outDir: 'dist-lib',
    emptyOutDir: false,
    minify: true,
    lib: {
      entry: resolve(root, 'src/lib/umd.ts'),
      name: 'GsapRenderKit',
      formats: ['umd'],
      fileName: () => 'gsap-render.umd.js',
    },
    rollupOptions: {
      external,
      output: {
        globals,
        exports: 'named',
        entryFileNames: 'gsap-render.umd.js',
      },
    },
  },
})

console.log('[build:lib] dist-lib ready')
