import { gsap } from '../gsap'
import * as ScrollTriggerModule from 'gsap/ScrollTrigger'
import { isPlainObject } from '../parse'
import type { MountContext, PluginImpl, RenderPlugin } from '../types'

/**
 * UMD 场景下 window.ScrollTrigger 是类本身，而 ESM 下是模块命名空间，
 * 这里做一次兼容解析，避免读到 undefined。
 */
const ScrollTrigger = ((ScrollTriggerModule as unknown as { default?: unknown }).default ??
  (ScrollTriggerModule as unknown as { ScrollTrigger?: unknown }).ScrollTrigger ??
  ScrollTriggerModule) as { refresh(): void }

const KNOWN_KEYS = new Set([
  'trigger',
  'scroller',
  'start',
  'end',
  'scrub',
  'pin',
  'pinSpacing',
  'snap',
  'toggleActions',
  'once',
  'markers',
  'horizontal',
  'invalidateOnRefresh',
  'anticipatePin',
  'fastScrollEnd',
])

function checkPin(ctx: MountContext): void {
  const win = ctx.el.ownerDocument.defaultView
  if (!win) return
  if (win.getComputedStyle(ctx.el).position === 'fixed') {
    ctx.warn('W207', 'pin 的元素是 position:fixed，钉住位置可能异常', 'pin')
    return
  }
  let parent = ctx.el.parentElement
  while (parent) {
    if (win.getComputedStyle(parent).transform !== 'none') {
      ctx.warn('W207', 'pin 元素的祖先带 transform，pin 位置可能异常', 'pin')
      break
    }
    parent = parent.parentElement
  }
}

function normalize(ctx: MountContext): ScrollTrigger.Vars | null {
  const raw = ctx.attrs.scroll
  if (!isPlainObject(raw)) {
    ctx.warn('W205', 'scroll 必须是对象，已跳过', 'scroll')
    return null
  }

  const cfg: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(raw)) {
    if (!KNOWN_KEYS.has(key)) {
      ctx.warn('W205', `未知的 ScrollTrigger 配置 "${key}"，已忽略`, 'scroll')
      continue
    }
    cfg[key] = value
  }

  if (cfg.trigger === undefined) {
    cfg.trigger = ctx.el
  } else if (typeof cfg.trigger === 'string') {
    if (cfg.trigger === 'self') {
      cfg.trigger = ctx.el
    } else {
      const found = ctx.root.querySelector(cfg.trigger)
      if (found) cfg.trigger = found
      else {
        ctx.warn('W205', `trigger 选择器找不到元素 "${cfg.trigger}"，回退到自身`, 'scroll')
        cfg.trigger = ctx.el
      }
    }
  }

  if (cfg.scrub !== undefined && typeof cfg.scrub !== 'boolean' && typeof cfg.scrub !== 'number') {
    ctx.warn('W205', 'scrub 只能是 true/false 或数字，已忽略', 'scroll')
    delete cfg.scrub
  }
  if (cfg.scrub && cfg.toggleActions) {
    ctx.warn('W203', 'scrub 模式下 toggleActions 不生效，已忽略', 'scroll')
    delete cfg.toggleActions
  }
  if (cfg.snap !== undefined && typeof cfg.snap !== 'number' && !Array.isArray(cfg.snap)) {
    ctx.warn('W205', 'snap 只能是数字或数组，已忽略', 'scroll')
    delete cfg.snap
  }
  for (const flag of ['pin', 'pinSpacing', 'once', 'horizontal', 'invalidateOnRefresh', 'fastScrollEnd']) {
    if (cfg[flag] !== undefined && typeof cfg[flag] !== 'boolean') {
      ctx.warn('W205', `${flag} 必须是布尔值，已忽略`, 'scroll')
      delete cfg[flag]
    }
  }
  if (cfg.markers === undefined) cfg.markers = ctx.debug

  // 元素在 iframe / 自定义滚动容器里时，默认 scroller 必须是元素自己的 window，
  // 否则 ScrollTrigger 会去监听外层 window，进度永远停在 0。
  if (cfg.scroller === undefined) {
    const win = ctx.el.ownerDocument.defaultView
    if (win) cfg.scroller = win
  } else if (typeof cfg.scroller === 'string' && cfg.scroller !== 'window') {
    const found = ctx.root.querySelector(cfg.scroller)
    if (found) cfg.scroller = found
    else {
      ctx.warn('W205', `scroller 选择器找不到元素 "${cfg.scroller}"，回退到默认 window`, 'scroll')
      delete cfg.scroller
    }
  }

  if (cfg.pin) checkPin(ctx)
  return cfg as ScrollTrigger.Vars
}

/**
 * ScrollTrigger 适配器：
 *   gsap.registerPlugin(ScrollTrigger) 由适配器自动完成
 *   GsapRender.register(ScrollTriggerRender)
 *
 * scroll 只描述“什么时候播”，from / to / timeline 继续描述“动什么”。
 */
export const ScrollTriggerRender: RenderPlugin = {
  id: 'scroll-trigger',
  attrs: ['scroll'],
  owns: ['scroll'],
  priority: 10,
  requires: ['ScrollTrigger'],
  create(): PluginImpl {
    gsap.registerPlugin(ScrollTrigger)
    const triggers: ScrollTrigger[] = []
    let queued = false
    let fontsHooked = false

    const scheduleRefresh = (): void => {
      if (queued) return
      queued = true
      const raf =
        typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function'
          ? window.requestAnimationFrame.bind(window)
          : (cb: FrameRequestCallback) => setTimeout(() => cb(0), 16)
      raf(() => {
        queued = false
        ScrollTrigger.refresh()
      })
    }

    const hookFonts = (): void => {
      if (fontsHooked) return
      fontsHooked = true
      const fonts = typeof document !== 'undefined' ? document.fonts : undefined
      if (!fonts?.ready) return
      fonts.ready.then(() => scheduleRefresh()).catch(() => undefined)
    }

    return {
      resolve(ctx): void {
        if (ctx.el === ctx.root && ctx.attrs.scroll !== undefined) {
          ctx.warn('W208', '根元素不支持 scroll，请把 scroll 放到内部内容容器上', 'scroll')
        }
      },

      mount(ctx): boolean {
        const cfg = normalize(ctx)
        if (!cfg) return false

        if (ctx.nested) ctx.warn('W202', 'scroll 嵌套在另一个 scroll 内部，内层独立触发', 'scroll')
        if ('at' in ctx.attrs) ctx.warn('W201', 'scroll 节点不参与父时间轴，at 已忽略', 'at')
        if (ctx.node.paused()) {
          ctx.warn('W204', 'scroll 节点不接受 paused，已由滚动接管', 'scroll')
          ctx.node.paused(false)
        }

        const tl = gsap.timeline({ scrollTrigger: cfg })
        tl.add(ctx.node, 0)
        if (tl.scrollTrigger) triggers.push(tl.scrollTrigger)
        if (ctx.el.id) ctx.timelines[ctx.el.id] = tl

        hookFonts()
        scheduleRefresh()
        return true
      },

      refresh(): void {
        scheduleRefresh()
      },

      layout(): void {
        scheduleRefresh()
      },

      destroy(): void {
        for (const trigger of triggers) trigger.kill()
        triggers.length = 0
        scheduleRefresh()
      },
    }
  },
}

export default ScrollTriggerRender
