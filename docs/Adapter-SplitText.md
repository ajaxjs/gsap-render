# Adapter: SplitText

> 依赖 GSAP 3.13+ 的 `SplitText`（已随 GSAP 免费）。
> 适用规范：`docs/v1-spec.md` §5。

---

## 1. 依赖与注册

```js
import { gsap } from 'gsap'
import { SplitText } from 'gsap/SplitText'
gsap.registerPlugin(SplitText)

import { GsapRender } from 'gsap-render'
import { SplitTextRender } from 'gsap-render/split-text'

// 二选一
GsapRender.register(SplitTextRender)                        // 全局默认
const gs = new GsapRender('#wrap', { plugins: [SplitTextRender] }) // 实例级
```

- 适配器内部会自动 `gsap.registerPlugin(SplitText)`，只需要 `GsapRender.register(SplitTextRender)`。
- 同一实例可与其他适配器共存；`attrs` 冲突时先注册者优先（**W012**）。

---

## 2. 认领的属性

| 属性 | 值 | 作用 |
| --- | --- | --- |
| `split` | `"lines words chars"` | 启用分割的类型，空格或逗号分隔；空值 = 官方默认三种 |
| `split-options` | object | 透传给 SplitText 的选项（`mask` / `deepSlice` / `aria` / `tag` …） |
| `split-lines-from` / `-to` | object | 行动画 |
| `split-words-from` / `-to` | object | 词动画 |
| `split-chars-from` / `-to` | object | 字符动画 |
| `split-{lines\|words\|chars}-from-to` | `[from, to]` | 合并写法，规则同元素级 `from-to` |

`from` / `to` 的优先级、时序键归属、相对值检查、JSON-lite 约束，与元素级完全一致（spec §2.5 / §2.6 / §4）。

---

## 3. 值格式与默认值

```html
<h1 split="lines chars"
    split-options="{mask:'lines', deepSlice:true}"
    split-chars-from="{x:150, opacity:0, stagger:0.02}">…</h1>
```

**默认值**

| 选项 | 默认 | 说明 |
| --- | --- | --- |
| `type` | `"lines words chars"` | 与 SplitText 官方默认一致 |
| `aria` | `"auto"` | 容器 `aria-label` + 片段 `aria-hidden` |
| `deepSlice` | `true` | 允许 `<strong>` 等跨行内联元素 |
| `autoSplit` | `true` | 窗口变化/字体加载后自动重分割 |
| `smartWrap` | 仅当只分割 chars 时 `true` | 避免字符分割导致单词断行 |

**保留键**：`split-options` 里不允许写 `type`（用 `split`）、`autoSplit`、`onSplit`、`onRevert`（适配器接管），出现则 **W103** 并剔除。

---

## 4. 行为

### 4.1 时机

1. 核心扫描到 `split` 或任一 `split-*` 属性，登记为"需要异步初始化"。
2. `await document.fonts.ready`（字体没加载完就分割，行数一定是错的）。
3. 适配器 `resolve()`：对元素执行一次 `new SplitText(el, opts)`。
4. 逐 phase 追加补间；`@chars` / `@words` / `@lines` 在此时才可解析。
5. 移除 `data-gsap-pending`；`ready` resolve；按 `config.paused` 决定播放。

### 4.2 顺序

- 同一元素只分割一次，多个 phase 共用同一份结果。
- step 内顺序：元素自身 `fromTo` → `split-lines` → `split-words` → `split-chars`，全部并行（位置 0）。
- `split-chars-from` 没写 `split` 时自动补 `chars` 类型（**W102**）；写了 `split-lines` 但只声明 `chars` 同理。

### 4.3 层级

`lines` > `words` > `chars`。分割成三种时，chars 嵌在 words 里、words 嵌在 lines 里；动画 `@chars` 只影响字符本身，不会带动整行。

### 4.4 与元素自身动画的关系

```html
<h1 from="{opacity:0, y:-40}" split="lines chars" split-chars-from="{x:150, opacity:0, stagger:0.02}">
```

元素整体淡入上移 + 字符依次滑入，同一个 step 内并行，互不冲突（目标不同：元素 vs 字符）。

---

## 5. 生命周期

| 阶段 | 动作 |
| --- | --- |
| `resolve` | `SplitText.create(el, opts)`，记录 `WeakMap<Element, SplitText>` |
| 尺寸/字体变化 | `autoSplit` 触发 `onSplit` → 防重入地调用核心 `refresh()`，按 `progress` 比例回填 |
| `refresh()` | 先 `kill()` + `revert()` 旧实例，再重新分割重建 |
| `destroy()` | 对每个实例 `kill()` → `revert()`，移除 `data-gsap-pending`，清 `WeakMap` |

**顺序很关键**：`revert()` 必须在 `gsap.context().revert()` 之前，否则被替换的字符节点会留在页面上。

---

## 6. 专属警告

| 码 | 场景 | 行为 |
| --- | --- | --- |
| W101 | `split` 里的类型非法（如 `"line"`） | 忽略该类型 + 警告 |
| W102 | `split-*` 缺少对应 `split` 声明 | 自动补该类型 + 提示 |
| W103 | `split-options` 写了保留键 | 剔除 + 警告 |
| W104 | 分割后目标为空（如空文本、元素不可见） | 跳过该 phase + 警告 |

---

## 7. 已知限制

- **复制/选中**：chars 分割会把文本拆成大量 `<span>`，用户拖动选择时体验变差；正文类内容优先 `split="lines"`。
- **`::first-line`**、`text-overflow: ellipsis`、部分依赖原始文本节点的 CSS 会失效。
- **块级子元素**会被跳过（SplitText 只处理行内内容），跨块的复杂排版效果不保证。
- **性能**：一屏几万个字符分割会有明显布局开销；分割是同步强制重排，批量分割时建议分帧或用 `split="lines"`。
- **FOUC**：分割发生在 JS 里，首帧可能看到未分割文本。用官方 CSS 钩子：

  ```css
  [data-gsap-split][data-gsap-pending] { visibility: hidden; }
  ```

  适配器在 `resolve` 开始时打 `data-gsap-split` + `data-gsap-pending`，分割完成后移除 `data-gsap-pending`。
- **`display:none` 元素**：无法测量行高，分割结果不可靠；请延后到可见时再初始化。

---

## 8. 示例

```html
<section id="hero" config="{paused:true, defaults:{duration:0.8, ease:'power2.out'}}">
  <h1 class="title"
      from="{opacity:0, y:-40}"
      split="lines chars"
      split-options="{aria:'auto'}"
      split-chars-from="{x:150, opacity:0, stagger:0.02}">
    This is a Title for the Page
  </h1>

  <p class="lead"
     split="lines"
     split-lines-from="{y:24, opacity:0, stagger:0.08}"
     split-lines-to="{y:0, opacity:1}">
     Long paragraph that should reveal line by line.
  </p>
</section>
```

```js
const gs = new GsapRender('#hero')
await gs.ready
gs.play()
```
