import type { gsap } from 'gsap'

export type TweenMethod = 'from' | 'to' | 'fromTo'

export type TargetSpec = 'self' | '@lines' | '@words' | '@chars' | (string & {})

export type Vars = Record<string, any>

export interface ResolveContext {
  el: Element
  /** 渲染器的根元素，用于判断“根上不能写触发属性”、以及作用域选择器 */
  root: Element
  /** 归一化后的属性值（已解析） */
  attrs: Record<string, unknown>
  /** 追加一条补间；插件在 resolve 期间调用 */
  add(target: TargetSpec, method: TweenMethod, vars: Vars | [Vars, Vars]): void
  /** 插件登记自己产出的元素集合，例如 { chars, words, lines } */
  symbols: WeakMap<Element, Record<string, Element[]>>
  /** 输出警告（受 debug / 全局开关控制） */
  warn(code: string, message: string, attr?: string): void
}

export interface MountContext {
  el: Element
  root: Element
  /** 已经构建好的子树（tween 或 timeline） */
  node: gsap.core.Animation
  attrs: Record<string, unknown>
  /** 是否嵌套在另一个被接管的节点内部 */
  nested: boolean
  debug: boolean
  timelines: Record<string, gsap.core.Timeline>
  warn(code: string, message: string, attr?: string): void
}

export interface PluginImpl {
  resolve(ctx: ResolveContext): void
  /** 接管节点播放；返回 false 表示放弃，核心退回默认挂载 */
  mount?(ctx: MountContext): boolean | void
  /** 核心重建完成后调用（刷新 ScrollTrigger 等） */
  refresh?(): void
  destroy?(): void
}

export interface RenderPlugin {
  id: string
  /** 认领的归一化属性名 */
  attrs: string[]
  /** 值按原始字符串处理、不做 JSON 解析的属性 */
  raw?: string[]
  /** 依赖的 GSAP 插件名（元信息，核心用它判断是否需要等字体） */
  requires?: string[]
  /** 出现这些属性时，节点不进入父时间轴，交给适配器接管 */
  owns?: string[]
  /** 多个适配器争抢同一元素时，优先级高者胜出（默认 0） */
  priority?: number
  /** 可选：为每个实例创建独立状态 */
  create?(): PluginImpl
  resolve?(ctx: ResolveContext): void
  mount?(ctx: MountContext): boolean | void
  refresh?(): void
  destroy?(): void
}

export interface Options {
  /** 默认 'data-gsap-' */
  prefix?: string
  plugins?: RenderPlugin[]
  /** 默认 false；为 true 或 window.__GSAP_RENDER_DEBUG__ 为真时输出警告 */
  debug?: boolean
  onWarn?: (message: string) => void
}

export interface ParsedConfig {
  paused: boolean
  defaults: Vars
  repeat?: number
  yoyo?: boolean
}
