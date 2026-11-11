# Adapter: ScrollTrigger

> 状态：**已实现**（`src/lib/plugins/scroll-trigger.ts`）。遵循 `docs/v1-spec.md` 的适配器约定。
> 目标：只增加一个属性 `scroll`，其余全部复用既有语义。

**注册方式**：适配器内部会自动 `gsap.registerPlugin(ScrollTrigger)`，不需要用户手动注册；只需要 `GsapRender.register(ScrollTriggerRender)`。

---

## 1. 一句话

**`scroll` 只回答“动画什么时候播”，`from` / `to` / `timeline` 继续回答“动什么”。**
配置键全部沿用 ScrollTrigger 原生名，不发明近义词。

---

## 2. 心智模型

现有模型只有两类节点：**时间轴节点**（master 的一段）和 **step**（元素自身的并行补间组）。

新增第三类，且只加一条规则：

> 带 `scroll` 的元素是**触发节点**：它和它的子树不进入父时间轴，改由滚动进度（或进入事件）驱动。

| 属性 | 谁驱动 | 作用 |
| --- | --- | --- |
| `timeline` | 时间轴播放头 | 让子 step 串行 |
| `scroll` | 滚动位置 / 进入事件 | 让这棵子树挂上 ScrollTrigger |

推论（写进文档，避免用户猜）：

1. 触发节点不占父时间轴的时间，`at` 对它无效（**W201**）。
2. 触发节点内部仍然遵守老规则：有 `timeline` 就串行，没有就并行，`stagger` 糖照常。
3. 元素自身的 `from` / `to` 仍然作用在元素自己身上，是这条子树时间轴的第一个 step。
4. `scroll` 与 `split-*` 可以共存：分割在子树里正常发生。

---

## 3. 属性

只有一个：`scroll`（前缀版 `data-gsap-scroll`），值是 ST 配置对象。

```html
<!-- 元素自身入场 -->
<div class="card" scroll="{start:'top 85%'}" from="{opacity:0, y:40}"></div>

<!-- 区块序列，跟着滚动走 -->
<section scroll="{start:'top 80%', end:'bottom 20%', scrub:true}" timeline="{stagger:0.08}">
  <h2 from="{opacity:0, y:40}">Section</h2>
  <div class="card" from="{opacity:0, y:60}"></div>
  <div class="card" from="{opacity:0, y:60}"></div>
</section>

<!-- pin + scrub -->
<section scroll="{pin:true, scrub:1, start:'top top', end:'+=120%'}" timeline>
  <h2 from="{opacity:0}">Pinned</h2>
  <p from="{opacity:0, y:30}" at="<0.2">…</p>
</section>
```

### 配置表

| 键 | 默认 | 说明 |
| --- | --- | --- |
| `trigger` | `'self'` | `'self'` 或 root 作用域内的选择器字符串 |
| `start` | `'top bottom'` | ST 原生写法 |
| `end` | `'bottom top'` | `"+=100%"` 这类相对值可用 |
| `scrub` | `false` | `true` 或数字（平滑追赶秒数） |
| `pin` | `false` | 固定 `trigger` 元素 |
| `pinSpacing` | `true` | 仅 `pin` 时生效 |
| `snap` | — | 数字或数字数组（函数不允许） |
| `toggleActions` | `'play none none none'` | 非 scrub 时生效 |
| `once` | `false` | 只触发一次 |
| `markers` | 跟随 `debug` | 调试辅助线：在页面上画出 start / end 位置和标签，仅开发时用 |
| `horizontal` | `false` | P2，先透传不测 |

- 未知键 → **W205** 警告并忽略（防 `strat` 这类拼写错误静默失效）。
- 值必须是可序列化数据；函数型配置（`onEnter` / `onUpdate` / `onRefresh` / `snap: fn`）一律拒绝。

---

## 4. 四种用法（也是文档里的四个例子）

| 用法 | 写法 | 驱动 |
| --- | --- | --- |
| 元素入场 | `scroll="{start:'top 85%'}" from="…"` | 进入时播放，`toggleActions` 控制离开 |
| 区块序列 | `scroll="{scrub:true}" timeline` + 子元素 | 滚动进度 = 时间轴进度 |
| 固定分区 | `scroll="{pin:true, scrub:1}" timeline` | 钉住 + 进度驱动 |
| 整页 | 在 root 下包一层：`<main scroll="{scrub:0.6}">…</main>` | 这层容器挂 ST |

**根元素上不写 `scroll`**：root 就是 master，没有“父时间轴”可摘。允许它会让 `config.paused` 失效、实例的 `play()` / `seek()` 和滚动进度打架、`refresh()` 不能再回填进度，而且 `pin` 根节点没有实际意义。需要整页滚动驱动时，在 root 下包一层带 `scroll` 的容器即可；root 上写了 → **W208** 警告并忽略。

---

## 5. 核心只改一处：插件可以“接管”节点

现在的 `buildElement` 一定会把节点 `add` 到父时间轴。ScrollTrigger 节点不能进父时间轴，所以插件契约加两个可选字段：

```ts
interface RenderPlugin {
  /** 出现这些属性时，节点由适配器接管，不进父时间轴 */
  owns?: string[]
  /** 节点建好后调用；返回 false 表示放弃接管，核心退回默认行为 */
  mount?(ctx: MountContext): boolean | void
}

interface MountContext {
  el: Element
  root: Element
  node: gsap.core.Animation      // 已经建好的子树（tween 或 timeline）
  attrs: Record<string, unknown>
  nested: boolean
  debug: boolean
  timelines: Record<string, gsap.core.Timeline>
  warn(code: string, message: string, attr?: string): void
}
```

构建流程变成：

```
buildElement(el)
  ├─ 建 node（自身补间 + 子 step，逻辑完全不变）
  ├─ 有插件 owns 这个元素？
  │    ├─ 是 → 不进父时间轴 → 调 mount(node) → 返回 false 则回退普通挂载
  │    └─ 否 → 和现在一样 add 到父时间轴
```

为什么 `mount` 要能返回 `false`：适配器可以选择不接管（配置解析失败、依赖不可用），核心回退成普通时间轴动画，至少页面还是对的。

### 适配器内部

```ts
mount({ node, attrs }) {
  const cfg = normalize(attrs.scroll)
  if (!cfg) return false
  const tl = gsap.timeline({ scrollTrigger: cfg })
  tl.add(node, 0)                                 // tween 无法事后补 vars，包一层最省事
  return true
}
```

这一步同时把 `in-view` 的机制也准备好了——它只需要同一个 `owns` + `mount`。

---

## 6. 生命周期

| 时机 | 动作 |
| --- | --- |
| 构建 | `mount` 创建 ST；存进实例级 Map |
| 字体就绪 | `document.fonts.ready` 后 `ScrollTrigger.refresh()`（行高变化） |
| `refresh()` | 核心重建 → 适配器 kill 旧 ST → 重建 → `ScrollTrigger.refresh()` |
| SplitText 重分割 | 触发 `resplit` → 核心 `refresh()` → ST 重新计算 |
| `destroy()` | **先 kill 所有 ST**（移除 markers / pinSpacing），再 `ctx.revert()` |
| `debug` | `markers` 未显式写时跟随 `debug` |

### scroller

默认使用**元素自己所在文档的 window**（`el.ownerDocument.defaultView`）。普通页面里等价于全局 window；元素在 iframe 或自定义滚动容器里时，必须让 ScrollTrigger 监听正确的滚动源，否则进度会永远停在 0。

配置里的 `scroller` 支持字符串选择器（在 root 内查找），找不到时回退默认并给 W205。

> 实测：如果库跑在父窗口、元素在 iframe 里，ScrollTrigger 的 pin 与 scrub 都不生效。演示站因此改成「预览 iframe 加载 `/play.html`，库在 iframe 自己的 document 里运行」。

`gs.timelines[id]` 里存放的是**包过的那层** timeline，方便 JS 侧拿进度。

---

## 7. 警告（W2xx 段）

| 码 | 场景 | 行为 |
| --- | --- | --- |
| W201 | `scroll` 与 `at` 并存 | 忽略 `at`（触发节点不参与父时间轴） |
| W202 | `scroll` 嵌套 `scroll` | 内层独立触发，外层时间轴跳过它 |
| W203 | `scrub` 与 `toggleActions` 并存 | `toggleActions` 失效（ST 本身如此） |
| W204 | `scroll` 与 `timeline="{paused:true}"` 并存 | `paused` 失效，由滚动接管 |
| W205 | 未知 ST 配置键 / 非法值 | 忽略该键，照常挂载 |
| W207 | `pin` 的元素带 `position: fixed` / 祖先有 transform | 提示 pin 可能异常 |
| W208 | `scroll` 写在 root 上 | 忽略并提示放到内容容器上 |

---

## 8. 不做的（v1）

- 函数型回调（`onEnter` / `onUpdate` / `onToggle` / `onRefresh`）——v1.1 用字符串事件名 + `CustomEvent`，和 core 的事件方案一起做。
- `containerAnimation`、`ScrollSmoother` 联动、横向滚动。
- 一个元素多个 trigger。
- 同一 trigger 复用给多个元素（`scrub` 场景下语义会打架）。

---

## 9. 演示与验收

已实现 `/demo/scroll`（`fullPreview` 默认展开预览），四段内容：普通入场、scrub 序列、pin + scrub、卡片 stagger。

演示站配合改了两处：

1. **展开预览 / 收起预览** 按钮——445px 高的 iframe 里滚不动，滚动类 demo 默认展开。
2. **预览运行时**：iframe 改为加载 `/play.html`，库在 iframe 自己的 document 里运行。跨文档时 ScrollTrigger 的 pin / scrub 会失效（scroller 是父窗口），这一点已实测确认。

验收清单（本地已验）：

1. `gs.timelines` 里能看到 scroll 节点；master 时长不包含它们。
2. `pin` 后 DOM 出现 `.pin-spacer`；`destroy()` 后消失。
3. `refresh()` 后位置正确、不重复注册 ST。
4. 改窗口尺寸后触发点重算。
5. `debug: true` 时 markers 出现，`debug: false` 时不出现。
6. 嵌套 scroll 会给 W202，但仍各自独立触发。
7. 滚动到 pin 区间时 `pinTop` 为 0，scrub 进度与 `getComputedStyle` 的 transform/opacity 同步。

---

## 10. 拍板记录

1. 属性名：`scroll`。
2. `markers` 默认跟随 `debug`。
3. `pin` / `snap` 进 v1。
4. 未知键：警告后继续。
5. root 上不写 `scroll`（W208），整页驱动用内容容器包裹。
