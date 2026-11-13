# gsap-render

**Demo:** https://ajaxjs.github.io/gsap-render/

用 HTML 属性声明 GSAP 动画的渲染器。框架无关，属性值永远是纯数据。

```html
<div id="stage" timeline config="{paused:true, defaults:{duration:0.8}}">
  <h1 from="{opacity:0, y:-40}">Hello, GSAP Render</h1>
  <div class="card" from="{opacity:0}" to="{opacity:1}"></div>
</div>
```

```js
const gs = new GsapRender('#stage')
gs.play()
```

---

## 仓库结构

```
src/lib/           核心库（无 Vue 依赖）
  index.ts         GsapRender 类
  parse.ts         JSON-lite 解析
  scan.ts          遍历 + 双前缀归一化
  merge.ts         from / to / from-to 合并
  build.ts         step 树 → GSAP timeline
  registry.ts      适配器注册
  plugins/         SplitText / ScrollTrigger 适配器
src/demo/          Vue 3 + shadcn-vue 演示站（带代码编辑器）
src/play/          预览 iframe 的独立入口（库在这里跑）
dist-lib/          库产物：ESM + UMD（GSAP 外置），CDN 直接引用
docs/              规范与适配器文档
test/              纯函数单测（vitest）
scripts/shot.mjs   CDP 截图脚本（验证用）
```

## 开发

```bash
npm install
npm run dev        # http://localhost:5173
npm run test       # 解析 / 合并单测
npm run build      # vue-tsc + vite build（演示站）
npm run build:lib  # ESM + UMD（dist-lib/，GSAP 外置）
```

演示站每个页面都有 HTML / CSS / JS 三个编辑器标签，改完点「运行」或按 `Ctrl/⌘ + Enter` 重新渲染 iframe。

## 安装与使用

GSAP 是 peer 依赖（`>=3.13`），**一个页面只能有一份**。三种方式任选其一。

### 0. 单文件完整版（最省事）

```html
<script src="https://cdn.jsdelivr.net/gh/ajaxjs/gsap-render@v0.3.0/dist-lib/gsap-pack.umd.js"></script>
<script>
  const gs = new GsapRender('#stage')
  gs.play()
</script>
```

`gsap-pack.umd.js` 内置 GSAP、ScrollTrigger、SplitText 和三个适配器，并且已经自动 `registerPlugin` / `register`，全局名就是 `GsapRender`。约 156 KB（gzip ≈ 55 KB），适合直接 `<script>` 引用或本地自托管。

### 1. 打包器（npm / GitHub）

```bash
npm i gsap
npm i github:ajaxjs/gsap-render
```

```js
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { GsapRender } from 'gsap-render'
import { ScrollTriggerRender } from 'gsap-render/scroll-trigger'

gsap.registerPlugin(ScrollTrigger)
GsapRender.register(ScrollTriggerRender) // 之后所有实例都支持 scroll

const gs = new GsapRender('#stage', { debug: true })
await gs.ready
gs.play()
```

子路径导出：`gsap-render/split-text`、`gsap-render/scroll-trigger`、`gsap-render/in-view`。

### 2. CDN `<script>`（UMD）

```html
<!-- 1. GSAP 核心 -->
<script src="https://cdn.jsdelivr.net/npm/gsap@3.15.1/dist/gsap.min.js"></script>
<!-- 2. 用到的插件（顺序在核心之后） -->
<script src="https://cdn.jsdelivr.net/npm/gsap@3.15.1/dist/ScrollTrigger.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.15.1/dist/SplitText.min.js"></script>
<!-- 3. 渲染器 -->
<script src="https://cdn.jsdelivr.net/gh/ajaxjs/gsap-render@v0.3.0/dist-lib/gsap-render.umd.js"></script>

<div id="stage" timeline>
  <h1 from="{opacity:0, y:-40}">Hello</h1>
</div>

<script>
  const { GsapRender, ScrollTriggerRender, SplitTextRender } = GsapRenderKit
  GsapRender.register(ScrollTriggerRender)
  GsapRender.register(SplitTextRender)

  new GsapRender('#stage')
</script>
```

UMD 构建不会打包 GSAP，运行时直接读 `window.gsap` / `window.SplitText` / `window.ScrollTrigger`。

### 3. CDN ESM + import map

```html
<script type="importmap">
  {
    "imports": {
      "gsap": "https://cdn.jsdelivr.net/npm/gsap@3.15.1/index.js",
      "gsap/": "https://cdn.jsdelivr.net/npm/gsap@3.15.1/"
    }
  }
</script>

<script type="module">
  import { GsapRender } from 'https://cdn.jsdelivr.net/gh/ajaxjs/gsap-render@v0.3.0/dist-lib/gsap-render.es.js'
  import { ScrollTriggerRender } from 'https://cdn.jsdelivr.net/gh/ajaxjs/gsap-render@v0.3.0/dist-lib/scroll-trigger.es.js'

  const gs = new GsapRender('#stage')
</script>
```

import map 保证库里的 `import 'gsap'` 和页面用的是同一份实例。

> **显式指定实例**：页面里有多份 GSAP、或元素在 iframe 里时，用 `GsapRender.configure({ gsap: window.gsap })` 覆盖。

### 属性

| 属性 | 值 | 说明 |
| --- | --- | --- |
| `from` / `to` | object | 起始 / 结束值；同时存在自动合成 `fromTo` |
| `from-to` | `[from, to]` | 合并写法，存在时忽略 `from` / `to` 并警告 |
| `timeline` | object / 空 | 本元素变成「序列容器」，子元素串行 |
| `config` | object | 仅根元素：`paused` / `defaults` / `repeat` |
| `at` | number / string | 插入位置，支持 GSAP 位置参数 `"<"` `">"` `"<0.08"` |
| `scroll` | object | ScrollTrigger：`start` / `end` / `scrub` / `pin` / `snap` / `toggleActions` |
| `in-view` | object | IntersectionObserver 入场：`once` / `reverse` / `rootMargin` / `threshold` |
| `hover` / `press` / `click` | object \| array | 交互层：悬停 / 按下 / 点击（数组 = 顺序播放） |
| `show` / `hide` | object \| array | 显示 / 隐藏状态，只被 `*-fire` 调用 |
| `hover-fire` / `press-fire` / `click-fire` | `[目标, 动作]` | 委托触发其它元素 |
| `split` / `split-*` | — | SplitText 适配器认领，见文档 |

裸属性与 `data-gsap-*` 都支持，同时存在时前缀优先。

### 时间轴模型

- 一个元素 = 一个 step；step 内（元素自身补间 + 适配器补间）并行。
- 父元素没有 `timeline` → 子 step 并行（默认）。
- 父元素有 `timeline` → 子 step 按 DOM 顺序串行，`at` 可覆盖。
- `timeline="{stagger:0.06}"` 让子 step 以 `"<0.06"` 阶梯追加。

#### ScrollTrigger

```html
<section
  scroll="{scrub:true, pin:true, start:'top top', end:'+=120%'}"
  timeline
>
  <h2 from="{opacity:0, y:40}">Section</h2>
  <p from="{opacity:0}" at="<0.2">滚动进度 = 时间轴进度</p>
</section>
```

```js
import { ScrollTriggerRender } from './src/lib/scroll-trigger'
GsapRender.register(ScrollTriggerRender)
```

`scroll` 只描述“动画什么时候播”，`from` / `to` / `timeline` 继续描述“动什么”。带 `scroll` 的节点不进入父时间轴（`at` 失效），内部仍然遵守并行 / 串行规则。配置键沿用 ScrollTrigger 原生名：`start` / `end` / `scrub` / `pin` / `snap` / `toggleActions` / `markers`。

### InView

```html
<section in-view="{once:true, rootMargin:'0px 0px -12% 0px'}" timeline>
  <h2 from="{opacity:0, y:40}">Section</h2>
</section>
```

```js
import { InViewRender } from './src/lib/in-view'
GsapRender.register(InViewRender)
```

零依赖（IntersectionObserver）。`once` 默认 `true`，`reverse: true` 时离开视口反向播放；需要 `scrub` / `pin` 时改用 `scroll`。

### 交互

```html
<button hover="{scale:1.05}" press="{scale:0.97}"
        click="[{scale:1.1,duration:0.12},{scale:1,duration:0.3}]">Card</button>

<button click-fire="['#dialog','show']">Open</button>
<div id="dialog" class="hidden" show="{display:'flex',scale:1}" hide="{scale:0.9,opacity:0}"></div>
```

`hover` / `press` 是可逆状态（默认 100ms），`click` 是一次性；`*-fire` 可以重放目标的 `to` / `from` / `from-to`，或同时触发多个目标。详见 [docs/Interactions.md](docs/Interactions.md)。

## 警告

默认静默。`debug: true` 或 `window.__GSAP_RENDER_DEBUG__ = true` 时输出 `W001`–`W016` 警告；线上排查时可以临时打开再 `gs.refresh()`。

## 文档

- [v1 规范](docs/v1-spec.md)：属性协议、时间轴模型、类 API、警告码
- [交互层](docs/Interactions.md)：`hover` / `press` / `click` / `show` / `hide` / `*-fire`
- [SplitText 适配器](docs/Adapter-SplitText.md)：依赖、属性、生命周期、限制
- [ScrollTrigger 适配器](docs/Adapter-ScrollTrigger.md)：`scroll` 配置、接管机制、pin / scrub
- [InView 适配器](docs/Adapter-InView.md)：`in-view` 的 `once` / `reverse`、IO 行为

## 状态

v1 已实现：`from` / `to` / `from-to` / `timeline` / `at` / `config` / `stagger` / 适配器注册 / SplitText / ScrollTrigger / InView / `ready` / `refresh` / `destroy` / 警告体系。

未做（接口预留）：MutationObserver 自动重扫、`prefers-reduced-motion` 降级、W012 / W015 两个次要警告。

## 发布 Demo

```bash
npm run deploy          # build:pages + 推送到 gh-pages 分支
```

`build:pages` 会以 `/gsap-render/` 为 base 构建，并生成 `404.html`（SPA 深链接回退）与 `.nojekyll`。

网络无法直连 `git push` 时，可以用 API 版本：

```bash
node scripts/publish-api.mjs        # 发布 main
node scripts/publish-api.mjs pages  # 发布 dist 到 gh-pages
```
