# GSAP 声明式渲染器 —— 设计评审

> 评审对象：`useGsapRender('#anim-wrap')` + `from/to/timeline/split-*/in-view` 属性协议
> 结论：方向正确，但当前协议里有 4 个会在真实项目里"翻车"的结构性问题，需要在写第一行代码前定死。

---

## 0. 一句话结论

思路（声明式 + vars 直通 GSAP）是对的，**但协议目前缺三样东西：一个明确的"顺序/并行"模型、一个 from 的渲染时机契约、一个"时间驱动 vs 事件驱动"的双图划分**。另外属性值本身不是 JSON，命名分隔符会和宿主框架打架。

---

## 1. 值得保留的设计

| 设计 | 价值 |
| --- | --- |
| 一个元素 = 一个动画单元，读 HTML 就能看懂动效 | 可维护性、交接成本低 |
| 属性值直接是 GSAP vars | 学习成本≈0，文档可以复用 GSAP 官方文档 |
| `timeline` 可嵌套 | 天然的组合/复用能力 |
| 纯数据、无函数 | 可 SSR、可序列化、可由非前端配置、可做 Schema 校验 |
| 自动 `querySelectorAll` 扫描 | 零侵入接入存量页面 |

**建议把设计原则 2 再收敛一句**：*只发明 GSAP 没有的概念*（顺序、触发、分割），其余一切透传。这条原则能挡住未来 80% 的 API 膨胀。

---

## 2. P0：写代码前必须解决

### 2.1 属性值其实不是 JSON（原则自相矛盾）

示例里 `from="{ opacity: 0, y: -100 }"` 是 **JS 对象字面量**，不是 JSON：键没引号。而原则 1 说"只会有 JSON 值"。二选一：

| 方案 | 优点 | 代价 |
| --- | --- | --- |
| A. 严格 JSON + 单引号属性：`from='{"opacity":0}'` | `JSON.parse` 零成本、IDE/Schema 可校验、无解析器 bug | 写法啰嗦，用户会一直写错；`"` 与 `'` 的嵌套规则要教 |
| B. JSON5 子集：允许无引号键、单引号、尾逗号、注释 | 和示例一致，DX 最好 | 需要自研 ~150 行解析器 + 精准报错；必须禁用函数/求值 |
| C. 自定义微型语法 `opacity:0;y:-100` | 最短 | 偏离"贴近原生 API"，颜色/嵌套对象会崩 |

**建议 B**，并把原则 1 改写成："属性值只能是**可序列化数据**（无函数、无求值），解析器不认识的一律拒绝"。实现要点：

- 手写递归下降或字符扫描，**绝不 `eval` / `new Function`**
- 报错要带 `元素选择器 + 属性名 + 偏移量`，例如 `#anim-wrap .box2 [data-gsap-to] 第 1 行第 24 列：期望 ',' 但得到标识符 'duration'`
- 防原型污染：拒绝 `__proto__` / `constructor` / `prototype` 键
- 可选 `strict: true` 时走原生 `JSON.parse`

> 你的示例 `to="{ opacity: 1, y:100 duration: 1 }"` 少个逗号——这就是解析器必须有友好报错的证据。

### 2.2 `split-lines:from` 的冒号分隔符

三个具体问题：

1. **CSS/选择器**：`[split-lines:from]` 在 `querySelectorAll` / CSS 里是非法选择器（`:` 被当伪类），必须转义成 `[split-lines\:from]`。用户写样式、写调试选择器都会踩。
2. **宿主框架**：`:` 是 Vue 的 `v-bind` 简写、Svelte 的 `on:/bind:/use:`、Alpine 的 `x-on:`。JSX 里 `a:b` 会按"命名空间属性"（`xlink:href` 那种）解析，工具链行为不一致。属性名在 HTML 里大小写不敏感，别指望 camelCase。
3. **命名空间语义错位**：`:` 表达的是"命名空间"，而你要表达的是"**阶段/子目标**"（这个元素自身 / 它的 chars / 它的 in-view 分支）。

建议：**前缀 + 连字符**，前缀可配置（默认 `data-gsap-`，允许缩成 `a-`）：

```html
<div data-gsap-from='{"opacity":0}'
     data-gsap-split="lines chars"
     data-gsap-split-chars-from='{"x":150,"opacity":0,"stagger":0.02}'
     data-gsap-in-view='{"rootMargin":"0px 0px -150px 0px","once":true}'>
```

`data-` 前缀还白送三件事：React/Svelte/Vue 都会原样透传、HTML 校验器不报错、和业务属性不会撞名。

### 2.3 `from` 的时机：FOUC 与"永远隐形"

这是最容易出线上事故的一条：

- `gsap.from()` 默认 `immediateRender: true`，**创建时立刻**把元素渲染成起点。所以 tween 必须在 `init` 阶段创建（`paused` 的 timeline 里），而不是 `play()` 时创建。否则首帧先按 CSS 正常渲染，再跳到 `opacity:0`，闪一下。
- 反过来的坑更大：如果 tween 建好了但用户**忘了调 `play()`**，元素永远停在 `opacity:0`。要么默认 `autoplay: true`（和 GSAP 一致），要么在 dev 模式检测"初始化后 N 秒仍未播放且元素不可见"并警告。
- `to` 的起始值是在**首次渲染**时读取的（不是创建时）。所以 `to` 和 `from` 混用、或依赖 CSS 初始值时，要明确"读的是哪一刻的样式"。
- **`from` + `to` 必须合并成 `fromTo`**，不要生成两条独立 tween：两条 tween 会互相 overwrite、`immediateRender` 叠加、revert 时残留起点样式。规则：同元素同时有 `from` 和 `to` → 合成一条 `fromTo(from, to)`，`to` 的 vars 覆盖 `from`。
- CSS 侧：动画元素上不要留 `transition: all`，GSAP 每帧写内联样式会和 transition 打架；dev 模式可以检测 `getComputedStyle(el).transitionDuration !== '0s'` 并警告。
- `overwrite` 建议默认 `"auto"`（GSAP 默认是 `false`，重叠补间会互相拉扯）。

### 2.4 `timeline` 的顺序模型不完整（最核心的问题）

"按 DOM 先后顺序播放"只定义了最外层，没定义：

1. **兄弟元素之间**是串行还是并行？
2. **同一元素上的多个动画**（自身 `from`、`split-chars:from`、`in-view:from`）是什么关系？
3. 带 `timeline` 的元素，**它自己的 `from`** 属于父时间轴还是它自己的时间轴？
4. 怎么表达"并行/偏移"？

用你的例子推演一遍：`box3` 下 `sub-box1`、`sub-box2` 都写了 `duration: 1`，按"DOM 顺序串行"规则，**sub-box2 会在 sub-box1 结束后才开始**，整体 2 秒。如果你的本意是"两个同时从两边飞入"，当前协议表达不出来——这是必须补的洞。

建议的确定性模型（**step 模型**）：

| 概念 | 规则 |
| --- | --- |
| step | 一个元素自己的一组补间（`fromTo` + 所有 `split-*`）＝ 一个 step，组内**并行** |
| 顺序 | step 按 DOM 前序遍历顺序**串行**追加到当前时间轴末尾 |
| `timeline` 元素 | 新建子 timeline；**自身补间放在该 timeline 的 0**；子元素 step 依次追加；整个子 timeline 作为一个 step 插入父级 |
| 位置覆盖 | `data-gsap-at` 接受**原生 GSAP position 参数**：`"0"`、`"<"`、`">-0.3"`、`"+=0.5"`、`"label"`；默认 `">"`（末尾） |
| 标签 | `data-gsap-id="intro"`，可被 `at` 引用，也可 `anim.timelines.intro` 访问 |

于是"两个 sub-box 同时"就写成：

```html
<div class="sub-box1" data-gsap-from='{"scale":0.1,"x":300,"duration":1}'></div>
<div class="sub-box2" data-gsap-from='{"scale":0.1,"x":-300,"duration":1}' data-gsap-at="<"></div>
```

`"<"` 直接复用 GSAP 的位置参数语义，完全符合"贴近原生 API"。

**另外**：`timeline="{}"` 应该允许带配置（`paused`、`repeat`、`yoyo`、`defaults`），空对象和无值等价；根元素的 `config` 只做全局默认值，不要和 `timeline` 配置混在一起。

**默认值级联**：`config.defaults` → 最近祖先 `timeline.defaults` → 属性里的 vars。三级都写清楚，否则 `duration` 从哪来会成为玄学。

### 2.5 同一元素上多组动画的合成规则缺失

`title` 同时有 `from`、`split-lines`、`split-chars:from`；`box` 可能同时有 `from` 和 `in-view:from`。需要一张**冲突矩阵**：

| 组合 | 规则 |
| --- | --- |
| `from` + `to` | 合成 `fromTo` |
| `from` + `split-*` | 并行（target 不同：元素 vs 字符） |
| 两个 `from`（如 `from` + `in-view:from`） | **报错**（dev），或 in-view 独占该元素 |
| `in-view` + `timeline` 同元素 | **报错**（一个在时间图、一个在事件图） |
| `to` + `to` 同属性 | 允许，后者按 `at` 覆盖（文档说明 overwrite 语义） |
| `split-chars:from` 但没声明 chars 分割 | 自动启用 + dev 警告 |

### 2.6 `in-view` 不能塞进主时间轴

这是架构级判断：`play()` 驱动的是**时间**，`in-view` 由**滚动事件**驱动，两者不可能共用一条 GSAP timeline 的播放头。所以运行时必须是**两张图**：

- **时间图**：一条 master timeline（`play/pause/seek/progress/repeat` 作用于它）
- **触发图**：N 个 trigger，每个持有一条 **paused 的 GSAP timeline**，由 IntersectionObserver / ScrollTrigger 在 enter/leave 时 `play()/reverse()/reset()`

`play()` 只作用于时间图；trigger 在 init 时就被 arm（armed ≠ playing）。要提供 `arm()/disarm()`，并明确"元素已经在视口内时，`play()` 是否立即触发"。

嵌套在 `timeline` 里的 `in-view` 元素必须**从时间图摘出去**，否则会同时被两条驱动源控制——dev 模式要警告。

---

## 3. P1：重要但可以第二阶段

### 3.1 IntersectionObserver 够不够？

| 能力 | IO | ScrollTrigger |
| --- | --- | --- |
| 进入/离开/再次进入 | ✅（自己算 `isIntersecting` + 方向） | ✅ |
| `once` / reset | ✅（自己做） | ✅ |
| 滚动进度 `progress` / `scrub` | ❌ | ✅ |
| pin / snap / markers / `refresh()` | ❌ | ✅ |
| 精确的 start/end 锚点 | 近似（rootMargin） | ✅ |
| 体积 | 0 | ~40KB |
| 快速滚动/程序化跳转 | 可能丢帧、晚 1 帧 | 逐帧同步 |

结论：**默认 IO 是对的**，但你的用户一定会要视差（`scrub`）。既然 GSAP 3.13 起全部插件免费，建议现在就把 `Trigger` 抽象成接口（`arm/disarm/kill/refresh`），默认实现 `ObserverTrigger`，可切换 `ScrollTriggerTrigger`。这样以后加 `scrub/pin` 不用改协议。

性能：**全局共享一个 IO 实例**，用 `WeakMap<Element, Config>` 分发，不要每个元素 new 一个。

### 3.2 `offsetTop / offsetBottom` 的语义有问题

- IO 的 `rootMargin` 是**内缩视口**。向下滚动时元素从底部进入，只有 **bottom 内缩**会推迟触发；**top 内缩对"进入"几乎无效**（只影响向上回滚时的退出）。所以 `offsetTop: 150` 在首次进入时基本不干活，用户会以为没生效。
- 命名还容易和 DOM 的 `offsetTop` 属性混淆。
- 建议：直接透传 `rootMargin: "0px 0px -150px 0px"`（原生概念、零翻译），同时给 ScrollTrigger 适配器留 `start/end: "top 85%"` 这两个更通用的字段。你的 `offsetTop/offsetBottom` 最多保留为糖。

### 3.3 SplitText 的六个坑

GSAP 3.13 起 SplitText 免费，且新增了 `autoSplit` / `onSplit` / `deepSlice` / `mask` / `aria`（见 [3.13 release](https://gsap.com/blog/3-13/)）。

1. **必须用 `autoSplit: true` + `onSplit`**：断点换行、字体加载、窗口 resize 都会导致行数变化，手动重分割很容易漏。`onSplit` 里重建补间，SplitText 会保留播放进度。
2. **字体时机**：字体没加载完就分割，行数是错的。`autoSplit` 已监听字体加载，但仍建议首帧前 `await document.fonts.ready`。
3. **可访问性**：`aria: "auto"` 会给容器加 `aria-label`、给片段加 `aria-hidden`，**默认打开**；chars 分割会破坏复制/选中，非必要不大面积用 chars。
4. **DOM 破坏性**：分割会改写子节点，影响 `::first-line`、`text-overflow`、部分 CSS 选择器；必须在 `destroy()` 时 `split.revert()`。
5. **FOUC**：分割在 JS 里发生，可能先看到未分割的一帧再"消失"。给个官方 CSS 钩子：`[data-gsap-pending]{visibility:hidden}`，init 完成后移除；或 `data-gsap-split` 出现即 `opacity:0` + `data-gsap-ready` 恢复。
6. **stagger 别自己发明**：`stagger: 0.02` / `stagger: {each:0.02, from:"center"}` 是原生 GSAP，直接透传即可，不用在 `split-*` 上另造字段。

### 3.4 生命周期与清理

- **幂等**：`WeakMap<Element, Renderer>`，重复调用返回同一实例（热更新/重复 mount 场景必需）。
- `destroy()` 必须做四件事：`split.revert()` → `gsap.context.revert()`（还原内联样式，避免元素永远 `opacity:0`）→ `io.disconnect()` → `st.kill()`。
- **用 `gsap.context()` 包住整个构建过程**，`ctx.revert()` 能自动清理补间和内联样式，省一半清理代码。
- `refresh()`：动态插入 DOM、字体加载、断点变化后重新扫描与重分割。
- **SSR**：`typeof window === 'undefined'` 时返回 no-op 实例，不能抛错。
- `prefers-reduced-motion`：默认 `respect`，直接把终态 `gsap.set()` 上去（不是不播——否则 `from` 元素永远不可见）。

### 3.5 回调：JSON 里不能有函数，但事件必须有

原则 1 禁函数，所以回调走**字符串事件名**：

```html
<div data-gsap-to='{"opacity":1,"onComplete":"anim:box-done"}'></div>
```

运行时 `el.dispatchEvent(new CustomEvent('anim:box-done', {detail:{el, timeline}}))`；`onUpdate` 这类每帧事件建议禁用或降频，避免属性里出现奇怪东西。同时提供 JS 侧 `anim.on('complete', fn)` 作为正经用法。

### 3.6 vars 白名单

不是所有 GSAP vars 都能从 JSON 来：

| 类别 | 处理 |
| --- | --- |
| `duration/delay/ease/stagger/repeat/yoyo/repeatDelay` | 直接透传 |
| `ease` 字符串 | 校验 `gsap.parseEase()`，非法值报错（GSAP 会静默退化成默认值） |
| `onComplete/onStart/onUpdate/onRepeat` | 转成事件名 |
| `stagger` 函数、`snap` 函数、`motionPath` 回调 | **拒绝**，dev 报错 |
| `scrollTrigger: {...}` 对象 | 对外不暴露；由 `in-view` + `scroll` 模式生成 |
| 未知属性（拼错 `duraton`） | dev 警告（GSAP 会把它当 CSS 属性静默写入，最难查） |

### 3.7 其他值得加的小项

- `data-gsap-target=".item"`：把动画作用到**子元素集合**（原生 `gsap.from(".item", {...})` 的能力），列表 stagger 刚需，且仍然纯数据。
- `data-gsap-id="intro"`：标签/调试/JS 访问。
- `debug: true`：打印解析后的时间轴树（`console.table` 或 `GSDevTools`），排查顺序问题神器。
- 文档里写明：数值 = px，带单位用字符串（`"100%"`、`"2rem"`）。

---

## 4. 修订后的协议草案

### 4.1 属性总表

| 属性 | 值 | 说明 |
| --- | --- | --- |
| `data-gsap-config` | JSON | 作用域配置，向下继承（`defaults/autoplay/reducedMotion/strict/debug/trigger`） |
| `data-gsap-timeline` | JSON 或空 | 本元素开启子时间轴 + 配置（`paused/repeat/yoyo/defaults`） |
| `data-gsap-at` | position | 插入位置，默认末尾；`"<"` 表示与上一 step 同时 |
| `data-gsap-id` | string | 标签，供 `at` 引用与 JS 访问 |
| `data-gsap-target` | selector | 动画作用到子元素集合（P1） |
| `data-gsap-from` / `data-gsap-to` | JSON | 补间；两者共存时合成 `fromTo` |
| `data-gsap-in-view` | JSON | 触发配置：`rootMargin/threshold/once/onEnter/onLeave` |
| `data-gsap-in-view-from` / `-to` | JSON | 进场补间；共存时合成 `fromTo` |
| `data-gsap-split` | `"lines words chars"` | 启用分割类型 |
| `data-gsap-split-options` | JSON | 透传 SplitText 选项（`mask/deepSlice/aria`，`autoSplit` 强制 true） |
| `data-gsap-split-{lines\|words\|chars}-from` / `-to` | JSON | 分割体动画 |

> 想更短可以配 `prefix: "a"` → `a-from`。但默认带 `data-`，兼容性最好。

### 4.2 原示例改写

```html
<div id="anim-wrap"
     data-gsap-config='{"defaults":{"duration":0.6,"ease":"power2.out"},"autoplay":false}'>

  <h1 class="title"
      data-gsap-from='{"opacity":0,"y":-100}'
      data-gsap-split="lines chars"
      data-gsap-split-chars-from='{"x":150,"opacity":0,"stagger":0.02}'>
    This is a Title for the Page.
  </h1>

  <div class="box1" data-gsap-from='{"opacity":0}' data-gsap-to='{"opacity":0.5,"duration":1}'></div>

  <div class="box2" data-gsap-to='{"opacity":1,"y":100,"duration":1}'></div>

  <div class="box3" data-gsap-from='{"y":-100}' data-gsap-timeline='{"id":"box3"}'>
    <div class="sub-box1" data-gsap-from='{"scale":0.1,"x":300,"duration":1}'></div>
    <div class="sub-box2" data-gsap-from='{"scale":0.1,"x":-300,"duration":1}' data-gsap-at="<"></div>
  </div>

  <div data-gsap-in-view='{"rootMargin":"0px 0px -150px 0px","once":true}'
       data-gsap-in-view-from='{"opacity":0,"y":-100}'
       data-gsap-in-view-to='{"opacity":1,"y":0}'></div>
</div>
```

```js
const anim = createGsapRender('#anim-wrap')   // 核心，框架无关
anim.play()                                   // 只驱动时间图
await anim.finished
```

### 4.3 JS API

```ts
interface Renderer {
  play(at?: number): this
  pause(): this
  restart(): this
  seek(time: number): this
  progress(v: number): this
  readonly finished: Promise<void>
  refresh(): void              // 重新扫描 + SplitText 重分割 + 触发器 refresh
  destroy(): void              // revert 全部
  readonly timelines: Record<string, gsap.core.Timeline>
  get(el: Element): gsap.core.Timeline | undefined
  on(evt: 'start' | 'complete' | 'enter' | 'leave', fn: (e) => void): () => void
}

createGsapRender(target: string | Element, options?: RenderOptions): Renderer
```

`useGsapRender` 只做 Vue 包装（`onMounted/onUnmounted`）；Svelte 用 `use:gsapRender` action；React 用 `useEffect`。核心零框架依赖。

### 4.4 配置合并优先级

```
config.defaults  <  祖先 timeline.defaults  <  元素自身 vars
```

`from` 与 `to` 共存时：`{...from, ...to}` 作为 `fromTo` 的终点 vars，`from` 只取起点属性。

---

## 5. 架构建议

```
DOM attributes
   │  parse（JSON5-lite / JSON，纯函数，无 DOM 依赖）
   ▼
IR（纯 JSON：steps / timeline 树 / triggers）
   │  resolve（阶段顺序、at、冲突检测、默认值级联）
   ▼
Runtime（gsap timeline / SplitText / IO / ScrollTrigger）
```

IR 示例：

```json
{
  "timeline": {
    "vars": { "paused": true, "defaults": { "duration": 0.6 } },
    "children": [
      { "kind": "tween", "el": "#anim-wrap h1", "method": "from", "vars": { "opacity": 0, "y": -100 }, "at": ">" },
      { "kind": "tween", "el": "#anim-wrap h1", "target": "@chars", "method": "from", "vars": { "x": 150, "stagger": 0.02 }, "at": "<" },
      { "kind": "timeline", "el": "#anim-wrap .box3", "at": ">", "children": [] }
    ]
  },
  "triggers": [
    { "el": "…", "config": { "rootMargin": "0px 0px -150px 0px", "once": true },
      "timeline": { "children": [] } }
  ]
}
```

好处：

- **可在 Node/jsdom 里单测** `parse + resolve`，根本不碰 GSAP 和布局（SplitText 依赖 `getClientRects`，jsdom 里跑不了，必须拆开）
- 可做 Schema 校验、可做 debug tree dump、可换执行后端（Web Animations API / motion one）
- 插件注册表：`registerEffect('in-view', handler)`，未来 `hover`、`scroll-scrub`、`click` 都是同一套机制，核心不用改

测试策略：resolver 用 vitest 单测（纯数据进/纯数据出）；运行时用 Playwright，`anim.seek(0.5)` 后截图做确定性视觉回归。

---

## 6. 优先级路线

| 阶段 | 内容 |
| --- | --- |
| P0 | 属性协议定稿（分隔符/前缀/JSON5-lite）、step 顺序模型 + `at`、`fromTo` 合并、init/play 分离、`destroy/refresh`、IO 触发器 |
| P1 | SplitText（autoSplit + aria + revert）、事件回调、`target` 选择器、dev 警告与 debug tree、reduced-motion |
| P2 | ScrollTrigger 适配器（scrub/pin/progress）、`hover/click` 触发器、MutationObserver 自动 refresh、GSDevTools 集成、Vue/Svelte/React 包装 |

---

## 7. 需要你拍板的 6 件事

1. **属性值**：JSON5-lite（推荐）还是严格 JSON？
2. **兄弟元素默认**：串行（可预测）还是并行（更像"同时入场"）？
3. **属性命名**：`data-gsap-*` 还是允许缩短前缀？
4. **默认 autoplay**：`true`（防"忘记 play 导致元素不可见"）还是 `false`（完全手动）？
5. **in-view 实现**：只做 IO，还是一开始就留 ScrollTrigger 适配层？
6. **是否需要单属性复杂写法** `data-gsap='{"from":{...},"split":{...}}'`（复杂场景更省心，但双协议维护成本）？
