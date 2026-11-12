# 交互（主类内建）

> 状态：**已实现**（`src/lib/interactions.ts`，由 `GsapRender` 直接驱动，不是适配器）。
> 覆盖：`hover` / `press` / `click` / `show` / `hide` / `hover-fire` / `press-fire` / `click-fire`。

---

## 1. 定位

交互是**主类能力**，不需要 `GsapRender.register(...)`，也不依赖任何 GSAP 插件。

- 适配器只留给依赖外部 GSAP 插件的东西（SplitText / ScrollTrigger / InView）。
- 交互层是**叠加**的：不加 `owns`，不把节点从父时间轴摘出去，`play()` / `pause()` 不影响交互。

---

## 2. 属性总表

| 属性 | 类型 | 作用 |
| --- | --- | --- |
| `hover` | object \| array | 悬停期间的状态 |
| `press` | object \| array | 按下期间的状态 |
| `click` | object \| array | 点击时播放一次 |
| `show` | object \| array | 显示状态（只被 `*-fire` 调用） |
| `hide` | object \| array | 隐藏状态（只被 `*-fire` 调用） |
| `hover-fire` | `[目标, 进入动作, 离开动作?]` | 悬停时触发目标 |
| `press-fire` | `[目标, 按下动作, 松开动作?]` | 按下时触发目标 |
| `click-fire` | `[目标, 动作]` 或 `[[目标, 动作], …]` | 点击时触发目标 |

---

## 3. 数组语义

任何“目标状态”属性都接受对象或对象数组：

```html
<div to="[{x:100},{x:100,y:100},{x:0,y:100},{x:0,y:0}]"></div>
<div hover="[{scale:1.05},{scale:1.1}]"></div>
```

- 数组 = **顺序播放**，内部是一条 timeline，步骤之间 `>`。
- 整串算一个 step：后续兄弟元素等它播完。
- 只有“到达某状态”的属性支持数组；`from`、`from-to` 只接受对象。
- 非法数组（空、含非对象）→ **W505**，忽略该属性。
- `from` / `from-to` 与数组同时出现 → **W507**，忽略该属性。

---

## 4. `hover` / `press`：状态，不是事件

```html
<div class="box" hover="{scale:1.1}" press="{scale:0.95}"></div>
```

- 悬停 → 播放 `hover` timeline；离开 → 反向播放回起点。
- 按下 → 播放 `press`；松开 → 反向。
- **状态互斥**：`press > hover > idle`。按下时先反向 hover 再播放 press；松开时先反向 press，若仍悬停再播放 hover。
- 数组状态同样用正向 / 反向播放，因此天然可逆。

事件：

- `hover` 用 `pointerover` / `pointerout`（委托在 root 上）；`pointerType === 'touch'` 时跳过，避免触屏“粘住”。
- `press` 用 `pointerdown` + window 上的 `pointerup` / `pointercancel`，只响应主键（`button === 0`）。
- window `blur`、`visibilitychange`、`pointercancel` 都会重置按下状态。

---

## 5. `click`：瞬时覆盖

```html
<div click="{scale:1.1, ease:'bounce.out'}"></div>
<div click="[{scale:1.1,duration:.12},{scale:1,duration:.3,ease:'bounce.out'}]"></div>
```

- 用原生 `click` 事件（`<button>` 上键盘 Enter/Space 自带）。
- 播放一次后**停在终点**；要回弹就写数组。
- 点击动画期间覆盖 hover/press 的同名属性；播完回到当前状态（必要时重新应用状态 timeline）。

---

## 6. `show` / `hide`

```html
<div id="dialog1" class="hidden" show="{scale:1}" hide="{scale:0}">
  <button click-fire="['#dialog1','hide']">关闭</button>
</div>
```

- `show` / `hide` **只是声明**，初始化时不执行，也不进主时间轴。
- `show` 触发：
  1. 仍在隐藏状态时，先把 `hide` 的最终值 `set` 上去（避免首帧闪）；
  2. 恢复 `display`（默认 `block`，可用特殊键覆盖：`show="{display:'flex', scale:1}"`）；
  3. 播放 `show` timeline。
- `hide` 触发：播放 `hide` timeline，完成后设置 `display:none`。
- 状态按元素记录，`toggle` 根据当前状态二选一。
- `display` 键被适配器拦截，不传给 GSAP。

---

## 7. `-fire` 委托

```html
<button click-fire="['#dialog1','show']">打开</button>
<button click-fire="['#dialog1',{scale:1,duration:.4}]">用参数打开</button>
<button hover-fire="['#tip','show','hide']">悬停提示</button>
<button click-fire="[['#a','hide'],['#b','show']]">切换</button>
```

- **目标**：root 作用域内选择器；找不到再查 `document`；支持 `self`。匹配多个则全部执行。
- **动作**：
  - `show` / `hide` / `toggle`：执行目标声明的状态；
  - `to` / `from` / `from-to`：重放目标声明的对应动画（独立副本，不动主时间轴）；
  - 对象：即时 `to` 补间。
- **第三参**：`hover-fire` / `press-fire` 的离开 / 松开动作。
- 多动作：值的第一项是数组时，按动作列表逐个执行。

---

## 8. 与主时间轴、适配器的关系

- 交互 timeline 独立创建，不进 master；`play()` / `pause()` 不影响。
- 同一元素既写 `from`/`to` 又写交互属性 → **W501**（可能互相覆盖）。
- `show` / `hide` 改变布局后：
  - `ScrollTrigger` 需要 `refresh()`；
  - 隐藏元素里的 `SplitText` 分割结果不可靠，需要重新分割。
  - 核心在动画完成后调用插件的 `layout()` 钩子；ScrollTrigger 适配器据此刷新，SplitText 场景触发一次 `refresh()`。

---

## 9. 性能与生命周期

- 事件监听是 **root 级委托**（`pointerover` / `pointerout` / `pointerdown` / `click` + window `pointerup`），不按元素挂。
- 交互 timeline **懒创建**，第一次交互时才建。
- 状态存 `WeakMap`，`destroy()` 时解绑监听、kill timeline、还原内联样式。
- 元素被移出 DOM 后不再响应；v1 不做 MutationObserver 清理。

---

## 10. 警告（W5xx 段）

| 码 | 场景 | 行为 |
| --- | --- | --- |
| W501 | 交互属性与元素自身 `from`/`to` 动同一属性 | 警告，照常执行 |
| W502 | 元素 `pointer-events:none` / `display:none` | 警告该交互可能永不触发 |
| W503 | `-fire` 目标选择器找不到元素 | 忽略该次触发 |
| W504 | fire 了 `show`/`hide`，目标没声明对应属性 | 忽略该次触发 |
| W505 | 数组为空或含非对象 | 忽略该属性 |
| W506 | `show` 时无法确定 `display`，回退 `block` | 警告 |
| W507 | `from`/`from-to` 与数组混用 | 忽略该属性 |
| W508 | 交互元素残留 CSS `transition` | 警告可能双重动画 |
| W509 | 隐藏元素内使用 `split-*` | 提示显示后会自动重新分割 |

---

## 11. 示例

```html
<div id="stage">
  <button class="card" hover="{scale:1.05, boxShadow:'0 12px 40px rgba(0,0,0,.5)'}"
          press="{scale:0.97}"
          click="[{scale:1.08,duration:.1},{scale:1,duration:.3}]">
    Card
  </button>

  <button click-fire="['#dialog','show']">Open</button>

  <div id="dialog" class="hidden" show="{display:'flex', scale:1, opacity:1}" hide="{scale:0.9, opacity:0}">
    <button click-fire="['#dialog','hide']">Close</button>
  </div>

  <div class="path" to="[{x:120},{x:120,y:80},{x:0,y:80},{x:0,y:0}]"></div>
</div>
```

---

## 12. 验收

1. hover 进入 / 离开可逆；数组状态也能反向。
2. press 覆盖 hover；松开回到 hover。
3. click 播完回到当前状态；数组能回弹。
4. `show` 能顶掉 `display:none`，首帧不闪。
5. `toggle` 状态正确；连续点击不叠加。
6. 多目标、多动作、`hover-fire` 第三参生效。
7. `destroy()` 后不再响应，且内联样式已还原。
8. 触屏点按不产生“粘住”的 hover。
9. `pointer-events:none` 给出 W502。

---

## 13. 拍板记录

1. 数组扩展到 `hover` / `press` / `click`。
2. `click` 播完停在终点，回弹用数组。
3. `-fire` 支持重放 `to` / `from` / `from-to`。
4. `hover-fire` / `press-fire` 支持第三参离开动作。
5. `show` 的 `display` 用特殊键，默认 `block`。
6. 多目标全部执行。
