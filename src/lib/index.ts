import { gsap } from './gsap'
import { buildTree, type BuildContext, type PluginRuntime } from './build'
import { configureGsap } from './gsap'
import { isPlainObject } from './parse'
import { instantiate, registerPlugin, registeredPlugins } from './registry'
import { scan, type ScanResult } from './scan'
import { Warmer } from './warn'
import type { Options, ParsedConfig, RenderPlugin } from './types'

export * from './types'
export { parseValue } from './parse'
export { mergeAttrs } from './merge'

const instances = new WeakMap<Element, GsapRender>()

const RESERVED = ['from', 'to', 'from-to', 'timeline', 'config', 'at']

export class GsapRender {
  readonly root!: Element
  readonly timelines: Record<string, gsap.core.Timeline> = {}
  ready!: Promise<this>
  timeline!: gsap.core.Timeline

  private readonly options: Options
  private readonly warn!: Warmer
  private readonly id!: string
  private readonly plugins!: PluginRuntime[]
  private ctx!: gsap.Context
  private scanResult!: ScanResult
  private built = false
  private destroyed = false
  private pendingPlay = false
  private suppressAutoPlay = false
  private refreshing = false
  private pendingEvents: Array<[string, (...args: any[]) => void]> = []

  constructor(target: string | Element, options: Options = {}) {
    this.options = options

    if (typeof window === 'undefined') {
      this.root = target as Element
      this.warn = new Warmer({ debug: false })
      this.id = 'ssr'
      this.plugins = []
      this.ctx = gsap.context(() => {})
      this.scanResult = { order: [], attrs: new WeakMap(), broken: new WeakSet() }
      this.timeline = gsap.timeline({ paused: true })
      this.ready = Promise.resolve(this)
      return
    }

    const root = typeof target === 'string' ? document.querySelector(target) : target
    if (!root) throw new Error(`[gsap-render] 找不到根元素：${String(target)}`)

    const prev = instances.get(root)
    if (prev) {
      prev.warn.warn('W008', root, '该根元素已有实例，返回已有实例')
      return prev
    }

    this.root = root
    this.id = `gsr-${Math.random().toString(36).slice(2, 9)}`
    this.warn = new Warmer({ debug: !!options.debug, onWarn: options.onWarn })

    const pluginMap = new Map<string, RenderPlugin>()
    for (const plugin of registeredPlugins()) pluginMap.set(plugin.id, plugin)
    for (const plugin of options.plugins ?? []) pluginMap.set(plugin.id, plugin)
    this.plugins = Array.from(pluginMap.values()).map((plugin) => ({
      plugin,
      impl: instantiate(plugin),
    }))

    this.scanResult = this.runScan()
    this.ctx = gsap.context(() => {})
    instances.set(root, this)

    root.addEventListener('gsap-render:resplit', this.handleResplit)
    this.ready = this.init()
  }

  static register(plugin: RenderPlugin): void {
    registerPlugin(plugin)
  }

  /** 显式指定 GSAP 实例（iframe / 多副本 / 延迟加载时用） */
  static configure(options: { gsap?: typeof import('gsap').gsap }): void {
    if (options.gsap) configureGsap(options.gsap)
  }

  static get(root: Element): GsapRender | undefined {
    return instances.get(root)
  }

  play(): this {
    if (this.destroyed) return this
    this.suppressAutoPlay = false
    if (!this.built) {
      this.pendingPlay = true
      return this
    }
    this.timeline.play()
    return this
  }

  pause(): this {
    this.suppressAutoPlay = true
    this.pendingPlay = false
    if (this.built) this.timeline.pause()
    return this
  }

  resume(): this {
    return this.play()
  }

  restart(): this {
    if (this.built) this.timeline.restart()
    return this
  }

  seek(time: number): this {
    if (this.built) this.timeline.seek(time)
    return this
  }

  progress(value: number): this {
    if (this.built) this.timeline.progress(value)
    return this
  }

  on(event: 'start' | 'update' | 'complete' | 'repeat' | string, fn: (...args: any[]) => void): () => void {
    if (this.built) this.timeline.eventCallback(event as never, fn as never)
    else this.pendingEvents.push([event, fn])
    return () => {
      this.pendingEvents = this.pendingEvents.filter(([, handler]) => handler !== fn)
      if (this.built) this.timeline.eventCallback(event as never, null as never)
    }
  }

  refresh(): this {
    if (this.destroyed) return this
    const progress = this.built ? this.timeline.progress() : 0
    this.teardown()
    this.scanResult = this.runScan()
    this.ready = this.init(progress)
    return this
  }

  destroy(): this {
    if (this.destroyed) return this
    this.destroyed = true
    this.root.removeEventListener('gsap-render:resplit', this.handleResplit)
    this.teardown()
    for (const el of this.scanResult.order) {
      if (el.getAttribute('data-gsap-owned') === this.id) el.removeAttribute('data-gsap-owned')
    }
    instances.delete(this.root)
    return this
  }

  private runScan(): ScanResult {
    const known = new Set(RESERVED)
    const raw = new Set<string>()
    for (const runtime of this.plugins) {
      for (const attr of runtime.plugin.attrs) known.add(attr)
      for (const attr of runtime.plugin.raw ?? []) raw.add(attr)
    }
    return scan(this.root, {
      root: this.root,
      prefix: this.options.prefix ?? 'data-gsap-',
      known,
      rawAttrs: raw,
      warn: this.warn,
      ownerId: this.id,
    })
  }

  private readConfig(): ParsedConfig {
    const raw = this.scanResult.attrs.get(this.root)?.config?.value
    const config: ParsedConfig = { paused: false, defaults: {} }
    if (!isPlainObject(raw)) return config
    if (typeof raw.paused === 'boolean') config.paused = raw.paused
    if (isPlainObject(raw.defaults)) config.defaults = { ...raw.defaults }
    if (typeof raw.repeat === 'number') config.repeat = raw.repeat
    if (typeof raw.yoyo === 'boolean') config.yoyo = raw.yoyo
    return config
  }

  private needsFonts(): boolean {
    if (!this.plugins.some((runtime) => runtime.plugin.requires?.includes('SplitText'))) return false
    for (const el of this.scanResult.order) {
      const attrs = this.scanResult.attrs.get(el)
      if (!attrs) continue
      if ('split' in attrs) return true
      if (Object.keys(attrs).some((key) => key.startsWith('split-'))) return true
    }
    return false
  }

  private async init(restoreProgress?: number): Promise<this> {
    if (this.needsFonts()) {
      const fonts = this.root.ownerDocument.fonts
      if (fonts?.ready) {
        try {
          await fonts.ready
        } catch {
          /* 字体加载失败就按当前状态分割 */
        }
      }
    }
    if (this.destroyed) return this

    this.ctx.add(() => {
      const config = this.readConfig()
      const masterVars: Record<string, unknown> = { paused: true }
      if (config.repeat !== undefined) masterVars.repeat = config.repeat
      if (config.yoyo !== undefined) masterVars.yoyo = config.yoyo

      const context: BuildContext = {
        root: this.root,
        scan: this.scanResult,
        warn: this.warn,
        plugins: this.plugins,
        defaults: config.defaults,
        timelines: this.timelines,
        symbols: new WeakMap(),
        ownedDepth: 0,
      }

      this.timeline = buildTree(this.root, context, masterVars)
      this.built = true

      for (const [event, handler] of this.pendingEvents) {
        this.timeline.eventCallback(event as never, handler as never)
      }
      this.pendingEvents = []

      if (restoreProgress != null) this.timeline.progress(restoreProgress)
      if (this.pendingPlay || (!config.paused && !this.suppressAutoPlay)) this.timeline.play()

      for (const runtime of this.plugins) {
        try {
          runtime.impl.refresh?.()
        } catch {
          /* 适配器刷新失败不影响主流程 */
        }
      }
    })

    return this
  }

  private teardown(): void {
    for (const runtime of this.plugins) {
      try {
        runtime.impl.destroy?.()
      } catch {
        /* 适配器清理失败不应打断整体销毁 */
      }
    }
    try {
      this.ctx.revert()
    } catch {
      /* ignore */
    }
    this.ctx = gsap.context(() => {})
    for (const key of Object.keys(this.timelines)) delete this.timelines[key]
    this.built = false
  }

  private handleResplit = (): void => {
    if (this.refreshing || this.destroyed) return
    this.refreshing = true
    const run = (): void => {
      this.refresh()
      this.ready.then(
        () => { this.refreshing = false },
        () => { this.refreshing = false },
      )
    }
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(run)
    else run()
  }
}

export default GsapRender
