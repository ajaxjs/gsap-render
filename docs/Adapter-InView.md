# Adapter: InView

> 状态：**已实现**（`src/lib/plugins/in-view.ts`）。遵循 `docs/v1-spec.md` 的适配器约定。

---

## 1. 一句话

`in-view` 是 `scroll` 的轻量版：**零依赖**（浏览器原生 IntersectionObserver），只回答“进入 / 离开视口时播不播”，`from` / `to` / `timeline` 仍然回答“动什么”。

```html
<section in-view="{once:true, rootMargin:'0px 0px -12% 0px'}" timeline>
  <h2 from="{opacity:0, y:40}">Section</h2>
  <div class="card" from="{opacity:0, y:60}" at="<0.1"></div>
</section>
```

---

## 2. 依赖与注册

- **不依赖任何 GSAP 插件**，也不需要 `gsap.registerPlugin`。
- 只需要：

```js
import { InViewRender } from './src/lib/in-view'
GsapRender.register(InViewRender)
```

- 和 `scroll` 二选一即可：需要 `scrub` / `pin` / 进度时用 `scroll`，只想“进视口播一次”时用 `in-view`，可以省掉约 40KB 的 ScrollTrigger。

| | `in-view` | `scroll` |
| --- | --- | --- |
| 依赖 | 无（IntersectionObserver） | ScrollTrigger |
| 驱动 | 进入 / 离开事件 | 滚动进度 |
| 能力 | 播一次、离开反向 | scrub / pin / snap / progress |
| 适合 | 入场、长列表渐入 | 视差、钉住、滚动叙事 |

---

## 3. 认领的属性

| 属性（归一化） | 值 | 作用 |
| --- | --- | --- |
| `in-view` | object | 触发配置；空值等价 `{}` |

`in-view` 只描述时机，动画仍然写在 `from` / `to` / `from-to` / `timeline` 上，和 `scroll` 完全一致。

---

## 4. 值格式与默认值

| 键 | 默认 | 说明 |
| --- | --- | --- |
| `rootMargin` | `'0px'` | IO 原生，收缩 / 扩张 root 触发区域 |
| `threshold` | `0` | IO 原生，数字或数字数组 |
| `root` | 视口 | 选择器，在渲染器 root 内解析；必须是该元素的祖先 |
| `once` | `true` | 只播一次，播完 `unobserve` |
| `reverse` | `false` | 离开视口时反向播放（`once: true` 时忽略） |

- 未知键 → **W304** 警告并忽略。
- 值必须可序列化；函数一律拒绝。
- `rootMargin` 的百分比是相对 **root** 的尺寸，不是元素。

---

## 5. 行为

### 5.1 时机

1. 核心构建完子树后调用 `mount`，适配器包一层 **paused** 的 timeline（`add(node, 0)`），并 `observe(el)`。
2. 元素进入（或初始化时已在视口内）→ `play()`。
3. `once` 命中后立即 `unobserve`，IO 回调不再打扰它。
4. 元素离开且 `reverse: true` → `reverse()`。

### 5.2 同元素语义

- 元素自身的 `from` / `to` 是这棵子树的第一个 step，`timeline` / `at` / `stagger` 规则完全不变。
- `in-view` + `split-*` 可以共存：分割在子树内正常发生。
- 触发节点不参与父时间轴，`at` 无效（**W301**）。

### 5.3 `once` / `reverse` 组合

| once | reverse | 行为 |
| --- | --- | --- |
| `true`（默认） | 任意 | 进视口播一次，之后不再观察 |
| `false` | `true` | 进视口播放，离开反向，可反复 |
| `false` | `false` | 每次进入都 `restart()` 重播 |

### 5.4 首屏元素

元素在初始化时已经在视口里，IO 会在 `observe` 后立刻回调一次（通常下一帧），动画正常播放。`from` 的起始态在构建时就已生效，所以不会出现“先看到最终态再跳回起点”。

### 5.5 IO 回调特性

- 回调是**异步批量**的，比滚动事件晚约一帧；快速掠过时可能只触发一次，这是 IO 的正常行为。
- 一个 `rootMargin` / `threshold` 组合共享一个 observer（实例级缓存），不是每个元素一个。

---

## 6. 核心机制

复用 `scroll` 那套 `owns` + `mount`，核心不需要认识 InView：

- `owns: ['in-view']`
- `mount(ctx)`：包装 paused timeline + 注册 observer，返回 `true`
- 环境没有 `IntersectionObserver` → **W305** 并直接 `play()`，绝不让内容停在 `opacity: 0`

### 与 `scroll` 同时写

两个适配器都 `owns` 同一批元素时，用插件的 `priority` 决定：

- `scroll` 的 `priority` 为 `10`，`in-view` 默认 `0`
- 同一元素命中多个 → **W017** 警告，选优先级高的（即 `scroll` 胜出）

---

## 7. 警告（W3xx 段）

| 码 | 场景 | 行为 |
| --- | --- | --- |
| W301 | `in-view` 与 `at` 并存 | 忽略 `at` |
| W302 | `in-view` 嵌套在另一个接管节点里 | 内层独立触发 |
| W303 | `in-view` 与 `timeline="{paused:true}"` 并存 | `paused` 失效 |
| W304 | 未知配置键 / 非法值 / root 选择器找不到 | 忽略该项 |
| W305 | 环境不支持 IntersectionObserver | 直接播放 |
| W306 | `in-view` 写在 root 上 | 忽略并提示放到内容容器上 |

`W017`（多适配器冲突）由核心发出，见 `v1-spec.md`。

---

## 8. 生命周期

| 时机 | 动作 |
| --- | --- |
| `mount` | 创建 paused timeline、注册 observer |
| `destroy()` | `disconnect()` 所有 observer、清空 entries；timeline 交给 `ctx.revert()` |
| `refresh()` | 核心重建时自然重新 observe，适配器不需要额外刷新 |
| 字体 | 不需要等字体（除非同时用了 SplitText） |
| SSR | 适配器不会被实例化 |

---

## 9. 限制

- 没有进度、`scrub`、`pin`、`snap` —— 需要这些就用 `scroll`。
- 不区分 `enterBack` / `leaveBack` 方向；需要方向级控制用 `scroll` 的 `toggleActions`。
- `root` 必须是触发元素的祖先，否则 IO 不会触发（W304 只能检查选择器是否存在）。
- 元素被移出 DOM 后不再触发；v1 不做 MutationObserver 自动重扫。
- 库必须运行在元素所在的 document 里（iframe 场景见 `Adapter-ScrollTrigger.md` 的说明）。

---

## 10. 示例

```html
<div id="stage">
  <section class="panel" in-view from="{opacity:0, y:40}">
    <h2>进入视口播一次</h2>
  </section>

  <section class="panel" in-view="{once:false, reverse:true}" from="{opacity:0, x:-60}">
    <h2>离开时反向</h2>
  </section>

  <section class="panel" in-view="{rootMargin:'0px 0px -20% 0px'}" timeline>
    <h2 from="{opacity:0, y:20}">序列</h2>
    <div class="grid" timeline="{stagger:0.08}">
      <div class="card" from="{opacity:0, y:40}">01</div>
      <div class="card" from="{opacity:0, y:40}">02</div>
    </div>
  </section>
</div>
```

---

## 11. 验收

1. 滚到某段时元素可见；继续滚动内容保持最终态。
2. `once:false + reverse:true` 的段落滚回去能回到初始态。
3. `once:true` 的段落滚回来不重播。
4. `rootMargin` 改大 / 改小，触发时机随之变化。
5. `destroy()` 后滚动不再触发任何动画。
6. 删除 `window.IntersectionObserver` 后页面内容直接可见（W305）。
7. 与 `scroll` 同时写时只有 `scroll` 生效并给出 W017。

---

## 12. 拍板记录

1. `once` 默认 `true`。
2. 离开反向用 `reverse: true`，不兼容 `toggleActions`。
3. `rootMargin` 默认 `'0px'`（原生）。
4. 冲突处理用 `priority` + W017。
