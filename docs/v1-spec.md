# gsap-render v1 规范

> 状态：实现前定稿。三轮评审 + 6 项拍板 + `from-to` + 待定项决议的汇总。
> 核心目标：HTML 里声明动画，类负责解析成 GSAP 时间轴；值永远是可序列化数据。

## 0. 文档索引

| 文档 | 内容 |
| --- | --- |
| `docs/v1-spec.md` | 核心协议、时间轴模型、类 API、警告码（本文） |
| `docs/Adapter-SplitText.md` | SplitText 适配器 |
| `docs/Adapter-<Name>.md` | 后续每个适配器一份，固定小节见 §5.4 |

---

## 1. 范围

**v1 做**

- 元素级 `from` / `to` / `from-to`，自动合成 `fromTo`
- `timeline` 序列容器（并行 / 串行两种排布）+ `stagger` 糖
- `at` 位置参数、元素 `id` 作为 label
- `config` 根配置（`paused` / `defaults` / `repeat`）
- 插件适配器 + SplitText 适配器 + ScrollTrigger 适配器（`scroll`）+ InView 适配器（`in-view`）
- `destroy` / `refresh` / `ready` / `on()` / 警告体系

**v1 不做**（接口预留）

- MutationObserver 自动重扫
- DOM 属性里的字符串事件名（`onComplete: "evt:name"`），v1.1
- `hover` / `click` 触发
- Shadow DOM 穿透
- `prefers-reduced-motion` 降级（用 `gsap.matchMedia()`，v1.1）

---

## 2. 属性协议

### 2.1 前缀与归一化

- 同时支持裸属性与 `data-gsap-` 前缀。
- **带前缀优先**：两者同时存在时用前缀版，忽略裸属性并警告 **W009**。
- 归一化后内部只认一套 key，插件也按归一化名匹配。
- 属性名大小写不敏感（HTML 规则），值大小写敏感。

### 2.2 属性表

| 属性（归一化） | 值 | 作用 |
| --- | --- | --- |
| `from` | object | 起始值 |
| `to` | object | 结束值 |
| `from-to` | `[fromVars, toVars]` | 合并写法，等价官方 `fromTo(target, a, b)` |
| `timeline` | object 或空 | 本元素开序列容器 + 局部 vars（`paused` / `repeat` / `yoyo` / `stagger`） |
| `config` | object | 仅根元素有效：master 的 `paused` / `defaults` / `repeat`；非根出现 → **W014** 忽略 |
| `at` | string \| number | 父容器中的插入位置，默认 `">"`（串行）/ `0`（并行） |
| `split` / `split-*` | — | SplitText 适配器认领，见 `Adapter-SplitText.md` |

label 直接取元素 `el.id`，不额外定义属性；`at` 可写 `at="intro"`。
保留字（插件不得认领）：`from` `to` `from-to` `timeline` `config` `at`。

### 2.3 值格式（JSON-lite）

- 允许：无引号键、单/双引号、尾逗号、嵌套对象/数组。
- 禁止：函数、`new`、模板字符串、`__proto__` / `constructor` / `prototype` 键。
- 数字 = px；带单位写字符串：`"100%"`、`"2rem"`、`"-170_short"`。
- 只接受有限数字；`NaN` / `Infinity` 视为非法 → W001。
- 属性名必须 camelCase（`backgroundColor`、`rotationX`）。
- HTML 里用单引号包属性、内部用双引号，避免转义地狱：`from='{"x":100}'`。
- 属性值由浏览器解码实体后再交给解析器，`&quot;` 不需要额外处理。

### 2.4 空值与缺省

| 写法 | 等价 |
| --- | --- |
| `timeline` / `timeline=""` | `{}` |
| `config` / `config=""` | `{}` |
| `from=""` / `to=""` | `{}`（等于没写） |
| `from-to=""` | 非法，W003 |
| `split` / `split=""` | SplitText 官方默认 `lines words chars` |

### 2.5 `from` / `to` / `from-to` 优先级

```
from-to  >  from + to  >  单边 from 或 to
```

1. 有 `from-to`：忽略同元素的 `from` / `to`，**W002**（说明忽略了哪个）。
2. 无 `from-to`，`from` 与 `to` 都在：内部合成 `fromTo`，作者无感知。
3. 只有一边：原样生成 `from()` / `to()`。
4. `from-to` 结构非法（不是恰好两项的普通对象数组）：**W003**，跳过该元素自身的补间，子元素照常。

```html
<div class="box" from="{opacity:0, y:-100}" to="{opacity:1, y:0, duration:1}"></div>
<div class="box" from-to="[{opacity:0, y:-100}, {opacity:1, y:0, duration:1}]"></div>
<div class="box" from-to="[{opacity:0}, {opacity:1}]" from="{x:100}"></div> <!-- W002 -->
```

### 2.6 时序键归属

`duration` / `delay` / `ease` / `stagger` / `repeat` / `repeatDelay` / `yoyo` / `immediateRender` 一律归 **toVars**：

- `from-to` 第一项里的时序键提升到第二项（dev 提示）。
- 分开写时 `from` 里的时序键同样归 `to`，冲突以 `to` 为准。
- 渲染器保留键（`at` / `timeline` / `config`）出现在补间 vars 里 → **W011** 并剔除（`id` 是 GSAP 自己的合法变量，不拦）。

---

## 3. 动画模型

### 3.1 元素 = 一个 step

元素自身的补间（`fromTo` + 适配器追加的 `@chars` 等）**并行**，构成一个 step。
step 内顺序固定：先元素自身补间，再适配器补间（保证 `from` 的起始态先落地）。

### 3.2 并行 / 串行

| 父元素 | 子 step 排布 |
| --- | --- |
| 无 `timeline` | 并行，全部从 0 开始 |
| 有 `timeline` | 串行，按 DOM 前序 `">"` 追加，可用 `at` 覆盖 |

`timeline` 元素自身的补间固定在该节点 0 位置，子 step 在其后。

### 3.3 `at`

| 容器 | 默认 | 可用值 |
| --- | --- | --- |
| 并行 | `0` | 数字 = 延后秒数；相对写法（`"<"` / `">"`）→ **W006**，忽略 `at` |
| 串行 | `">"` | `"0"` `"<"` `"<0.08"` `">-0.3"` `"+=0.5"` label |

- label 在添加时即时解析，**只支持后向引用**（引用尚未添加的 label 无效）。
- 每个子节点加入父节点后，把 `el.id` 注册成父节点上的 label（`addLabel(id, startTime())`），后续兄弟才能用 `at="intro"`。
- `at` 引用不存在的 label → **W010**，回退 `">"`。
- 根元素写 `at` 无意义 → **W010**，忽略。
- 同一容器内 id 重复 → 后者覆盖 label，**W015**。

### 3.4 `timeline` 的 `stagger` 糖

```html
<div timeline="{stagger:0.08}">  <!-- 子 step 依次以 "<0.08" 追加 -->
```

- `stagger: N` 或 `{each: N}` → 位置 `"<N"`。
- `{amount: A}` → 构建期按子 step 数换算成 `each = A / (n - 1)`（`n < 2` 时按 0）。
- 子元素自己的 `at` 优先于 stagger。
- `stagger` 不传给 `gsap.timeline()`，构建时剔除。

### 3.5 构建（伪代码）

```js
function build(el) {
  const seq = el.hasAttribute('timeline')
  const node = gsap.timeline(timelineVars(el))
  for (const tw of buildTweens(el)) node.add(tw, 0)      // 失败 → [] + W001

  const kids = elementChildren(el).map(build).filter(Boolean)
  const each = resolveStagger(el)                        // number | null
  kids.forEach((child, i) => {
    const pos = child.at ?? (seq
      ? (i === 0 ? 0 : each != null ? `<${each}` : '>')
      : 0)
    node.add(child, pos)
    if (child.label) node.addLabel(child.label, child.startTime())
  })
  return node
}
```

- 只有一个补间、无子节点、**且本元素没有 `timeline`**：不建 wrapper，直接返回该 tween（父级照样 `add` 和注册 label）。
- 有 `timeline` 就必须有 timeline 节点，否则 `paused`/`repeat` 和后续子 step 无处挂载。
- 根元素：master 用 `config` 建；根有 `timeline` 时其子 step 串行。
- 扫描范围：root 自身 + 所有后代（前序遍历 `querySelectorAll('*')` 一次）。
- **没有任何属性、但内部有带动画后代的容器元素必须继续向下遍历**，否则包一层 `<div class="row">` 就会把里面的动画整段丢掉。
- 构建时给被认领元素打 `data-gsap-owned`（值 = 实例 id，标记名固定不随 `prefix` 变），扫描时跳过**其他实例**的标记（防嵌套实例重复动画，**W013**）；`destroy()` 移除。

---

## 4. `fromTo` 合成规则

1. `from` + `to` → `gsap.fromTo(el, fromVars, toVars)`，绝不生成两条 tween。
2. `from-to` → `gsap.fromTo(el, arr[0], arr[1])`。
3. `fromVars` 只保留起始属性值，时序键全部进 `toVars`。
4. `immediateRender` 默认 `true`：构造即落起始态，防 FOUC。
5. **相对值检查 W004**：同一属性两边都有、`to` 侧是 `"+=N"` / `"-=N"` / `"*=N"` / `"/=N"` → 警告。
6. 解析失败或结构非法 → 该元素自身补间整体跳过（连 `from` 都不套用），保持 CSS 原样可见；子元素继续。
7. 相对值只在补间初始化时解析一次，之后固定；`from` 侧相对值以补间开始前的值作基线。

---

## 5. 插件适配器

### 5.1 契约

```ts
interface RenderPlugin {
  id: string
  attrs: string[]                 // 认领的归一化属性名
  requires?: string[]             // 依赖的 gsap 插件名（元信息）
  owns?: string[]                 // 出现这些属性时，节点由适配器接管播放
  priority?: number               // 多个适配器争抢同一元素时高者胜出（默认 0）
  resolve(ctx: ResolveContext): void
  mount?(ctx: MountContext): boolean | void  // 返回 false 表示放弃接管
  refresh?(): void
  destroy?(): void
}

type TargetSpec = 'self' | '@chars' | '@words' | '@lines' | string  // string 为元素内选择器

interface MountContext {
  el: Element
  root: Element
  node: gsap.core.Animation
  attrs: Record<string, unknown>
  nested: boolean
  debug: boolean
  timelines: Record<string, gsap.core.Timeline>
  warn(code: string, message: string, attr?: string): void
}
```

**接管语义**：`owns` 命中的元素，核心照常构建它的子树，但不把节点挂到父时间轴，而是交给 `mount`；`mount` 返回 `false` 时核心回退成普通挂载。这样 `scroll`（滚动进度）和 `in-view`（进入事件）都能挂进来，核心不需要认识具体插件。

同一元素命中多个 `owns` 时按 `priority` 取最高，并给 **W017**（`scroll` 的 `priority` 为 10，`in-view` 为 0）。

### 5.2 注册

```js
GsapRender.register(SplitTextRender)                     // 全局默认
new GsapRender('#wrap', { plugins: [SplitTextRender] }) // 实例级，覆盖同 id
```

- `id` 重复 → 后者覆盖 + 警告；`attrs` 冲突 → 先注册者优先 + 警告。
- `requires` 只作元信息（核心用它判断是否需要等字体）：GSAP 不会把 SplitText 这类插件挂到 `gsap.plugins`，注册时无法校验，依赖由适配器自己保证（`E001` 留给适配器自检）。
- `attrs` 与保留字冲突 → **E002** 抛错。

### 5.3 内置适配器

| 适配器 | 文档 |
| --- | --- |
| SplitText | `docs/Adapter-SplitText.md` |
| ScrollTrigger | `docs/Adapter-ScrollTrigger.md` |
| InView | `docs/Adapter-InView.md` |

### 5.4 适配器文档约定

每个 `docs/Adapter-<Name>.md` 固定包含：

1. 依赖与注册
2. 认领的属性表
3. 值格式与默认值
4. 行为（时机、顺序、与元素自身补间的关系）
5. 生命周期（`resolve` / `destroy` / 重建）
6. 专属警告码（W1xx 段）
7. 已知限制
8. 完整示例

---

## 6. 类 API

```ts
class GsapRender {
  constructor(target: string | Element, options?: Options)

  readonly root: Element
  readonly timeline: gsap.core.Timeline
  readonly timelines: Record<string, gsap.core.Timeline>
  readonly ready: Promise<this>

  play(): this
  pause(): this
  resume(): this
  restart(): this
  seek(time: number): this
  progress(value: number): this
  refresh(): this
  destroy(): this
  on(event: 'start' | 'update' | 'complete' | 'repeat', fn: (self) => void): () => void

  static register(plugin: RenderPlugin): void
  static get(root: Element): GsapRender | undefined
}

interface Options {
  prefix?: string                    // 默认 'data-gsap-'；只换"带前缀"那种写法，裸属性始终支持
  plugins?: RenderPlugin[]
  debug?: boolean                    // 默认 false；true 或 window.__GSAP_RENDER_DEBUG__ 为真时输出 W 警告
  onWarn?: (msg: string) => void     // debug 为 true 时接管警告输出（如上报 Sentry）
}
```

---

## 7. 警告与错误

### 7.1 警告（不阻断）

| 码 | 场景 | 行为 |
| --- | --- | --- |
| W001 | 属性值解析失败 | 警告 + 跳过该元素自身补间 |
| W002 | `from-to` 与 `from`/`to` 并存 | 忽略 `from`/`to` |
| W003 | `from-to` 结构非法 | 跳过该元素自身补间 |
| W004 | `from` 与 `to` 同属性且 `to` 为相对值 | 照常执行 |
| W005 | 未知 GSAP 变量 / 无法解析的 `ease` | 照常执行 |
| W006 | 并行容器里用相对 `at` | 忽略 `at` |
| W008 | 同一 root 重复实例化 | 复用旧实例 |
| W009 | 裸属性与 `data-gsap-*` 并存 | 用前缀版 |
| W010 | `at` 引用未知 label / 根元素写了 `at` | 回退末尾 / 忽略 |
| W011 | 保留键出现在补间 vars | 剔除 |
| W012 | 适配器 `attrs` 与其他适配器冲突 | 先注册者优先 |
| W013 | 元素已被其他实例认领 | 跳过 |
| W014 | `config` 出现在非根元素 | 忽略该属性 |
| W015 | 同一容器内 id 重复 | 后者覆盖 label |
| W016 | 适配器 `resolve` 抛错 | 警告 + 跳过该适配器的补间 |
| W017 | 多个接管型适配器命中同一元素 | 取 `priority` 最高者 |

### 7.2 错误（抛错）

| 码 | 场景 |
| --- | --- |
| E001 | 适配器自检失败（如依赖的 GSAP 插件确实不可用） |
| E002 | 适配器认领保留字 / 缺少 id |

### 7.3 格式

```
[gsap-render] W0xx <元素路径> [<属性>] <说明>
```

### 7.3 开关与格式

有效开关在**每次警告时实时求值**，不只在构造时读一次：

```js
const canWarn = instance.debug === true || !!globalThis.__GSAP_RENDER_DEBUG__
```

- `instance.debug` 来自构造参数；全局开关可运行时切换。
- 关闭时在入口直接 `return`，不拼字符串、不算元素路径。
- 线上临时排查：

  ```js
  window.__GSAP_RENDER_DEBUG__ = true
  gs.refresh()        // 重放构建期警告（构建早已完成，警告不会自动补发）
  ```

- 被跳过的警告**不进入去重缓存**，所以开关打开后 `refresh()` 能重新看到。
- 同一元素同一码只报一次（仅统计真正输出过的）。
- 格式：

  ```
  [gsap-render] W0xx <元素路径> [<属性>] <说明>
  ```

- 致命错误不受开关影响，始终抛 `new Error('[gsap-render] E001 …')`。

---

## 8. 生命周期

### 8.1 构建与播放

1. 构造时同步创建空 master（`paused: true`）、扫描、解析、归一化。
2. 有异步适配器 → `await document.fonts.ready` → 分割 → 建树填充 master → `ready` resolve；没有则同步建树，`ready` 立即 resolve。
3. `ready` 后按 `config.paused` 决定是否 `play()`；默认（未写 `paused`）自动播放。
4. `ready` 之前调用 `play()`：只记录意图，`ready` 后自动执行（不会丢、也不会提前跑）。

> 关键：先建后播，避免 SplitText 还没分割、动画已经跑完。
> 注意：`paused: true` 时 `from` 的起始态在构建时就已经生效——忘了 `play()`，元素会一直停在起始态（通常是不可见）。

### 8.2 `refresh()`

- 重新扫描 + 重建整棵树；重建前记录 master 的 `progress()`，重建后回填（clamp 0–1）。
- `document.fonts.ready` 后自动触发一次（仅当存在 SplitText 适配器）。
- 不默认开 ResizeObserver：换行变化交给 SplitText 的 `autoSplit`。

### 8.3 `destroy()`

顺序固定：适配器 `destroy()`（`split.revert()`）→ `gsap.context().revert()` → 移除 `data-gsap-owned` → 清 `WeakMap`。可重复调用。

### 8.4 SSR

`typeof window === 'undefined'` → 空实例：方法返回 `this`，`ready` 立即 resolve，不访问 DOM。

---

## 9. 默认值与合并顺序

```
GSAP 默认（duration 0.5 / ease power1.out）
  < config.defaults
  < 元素自身 vars
```

渲染器**显式合并**每个补间的 vars，不依赖 GSAP 的 `defaults` 继承（`inherit`）——嵌套 timeline 的继承规则容易出意外。
v1 不支持子树级 defaults（`timeline="{defaults:{…}}"` 只作用于该 timeline 自身，不会下发给子元素），需要时写进各自元素或全局 `config`。

---

## 10. 边界与已知限制

- **Shadow DOM**：`querySelectorAll` 不穿透 shadow root，v1 不支持；需要时手动传入根。
- **嵌套实例**：靠 `data-gsap-owned` 防重复，后创建的内层实例会因元素已被认领而空转（W013）。
- **SVG**：按 `Element` 处理，GSAP 自身的 SVG 规则生效；`x/y` 与 `cx/cy` 不要混用。
- **`display:none` 元素**：仍会建树，但测量类插件（SplitText 行高）结果不可靠，dev 建议延后初始化。
- **同属性多条 tween 重叠**：默认 `overwrite: false`（GSAP 默认），重叠时按渲染顺序后者覆盖；需要时在 vars 里显式写 `overwrite: "auto"`。
- **CSS `transition`**：动画元素上残留 `transition` 会与 GSAP 每帧写内联样式打架，dev 检测并提示。

---

## 11. 目录与测试

```
src/
  index.ts              GsapRender
  core/scan.ts          遍历 + 属性归一化（双前缀 + 冲突检测）
  core/parse.ts         JSON-lite
  core/merge.ts         from/to/from-to 合并 + 相对值检查
  core/build.ts         step 树 → gsap timeline + label
  core/registry.ts      插件注册
  core/warn.ts          警告码、去重、onWarn
  plugins/split-text.ts
  types.ts
demo/index.html
test/                   parse / merge / build 纯函数单测
docs/
```

- `parse` / `merge` / `build` 不依赖真实渲染，jsdom 可测。
- 视觉回归用 Playwright：`gs.seek(0.5)` 后截图对比。

---

## 12. 决策记录

| # | 决策 |
| --- | --- |
| 1 | 属性值用 JSON-lite；解析失败警告并跳过该元素动画 |
| 2 | 兄弟默认并行；父元素有 `timeline` 时串行 + `at` |
| 3 | 裸属性与 `data-gsap-*` 都支持，前缀优先 |
| 4 | 不设 `autoplay`，用 GSAP 原生 `paused` |
| 5 | `in-view` v1 不做 |
| 6 | 不做单属性复杂写法 |
| 7 | 增加 `from-to`（数组两项），与 `from`/`to` 并存时前者优先并警告 |
| 8 | `split-*-from-to` 与 `from-to` 对齐 |
| 9 | `timeline` 支持 `stagger` 糖（`number` / `{each}` / `{amount}`） |
| 10 | 事件：v1 只做 JS 侧 `on()`；DOM 字符串事件名留 v1.1 |
| 11 | 自动刷新只做 `document.fonts.ready` 一次；不默认开 ResizeObserver |
| 12 | `debug` 门控警告（默认 false），去掉 `silent`；错误 E001/E002 不受影响 |
| 13 | 增加 `window.__GSAP_RENDER_DEBUG__` 全局逃生开关，与 `debug` 取并集 |
