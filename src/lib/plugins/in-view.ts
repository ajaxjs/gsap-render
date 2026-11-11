import { gsap } from '../gsap'
import { isPlainObject } from '../parse'
import type { MountContext, PluginImpl, RenderPlugin } from '../types'

const KNOWN_KEYS = new Set(['rootMargin', 'threshold', 'root', 'once', 'reverse'])

interface InViewOptions {
  rootMargin: string
  threshold: number | number[]
  root: Element | null
  once: boolean
  reverse: boolean
}

interface Entry {
  timeline: gsap.core.Timeline
  once: boolean
  reverse: boolean
  played: boolean
}

function normalize(ctx: MountContext): InViewOptions | null {
  const raw = ctx.attrs['in-view']
  if (!isPlainObject(raw)) {
    ctx.warn('W304', 'in-view 必须是对象，已跳过', 'in-view')
    return null
  }

  const options: InViewOptions = {
    rootMargin: '0px',
    threshold: 0,
    root: null,
    once: true,
    reverse: false,
  }

  for (const [key, value] of Object.entries(raw)) {
    if (!KNOWN_KEYS.has(key)) {
      ctx.warn('W304', `未知的 in-view 配置 "${key}"，已忽略`, 'in-view')
      continue
    }
    switch (key) {
      case 'rootMargin':
        if (typeof value === 'string') options.rootMargin = value
        else ctx.warn('W304', 'rootMargin 必须是字符串，已忽略', 'in-view')
        break
      case 'threshold':
        if (typeof value === 'number') options.threshold = value
        else if (Array.isArray(value) && value.every((item) => typeof item === 'number')) {
          options.threshold = value as number[]
        } else ctx.warn('W304', 'threshold 必须是数字或数字数组，已忽略', 'in-view')
        break
      case 'root':
        if (typeof value === 'string') {
          const found = ctx.root.querySelector(value)
          if (found && found.contains(ctx.el)) options.root = found
          else if (found) ctx.warn('W304', `root "${value}" 不是触发元素的祖先，回退视口`, 'in-view')
          else ctx.warn('W304', `root 选择器找不到元素 "${value}"，回退视口`, 'in-view')
        } else ctx.warn('W304', 'root 必须是选择器字符串，已忽略', 'in-view')
        break
      case 'once':
        if (typeof value === 'boolean') options.once = value
        else ctx.warn('W304', 'once 必须是布尔值，已忽略', 'in-view')
        break
      case 'reverse':
        if (typeof value === 'boolean') options.reverse = value
        else ctx.warn('W304', 'reverse 必须是布尔值，已忽略', 'in-view')
        break
    }
  }

  return options
}

/**
 * InView 适配器：IntersectionObserver 驱动的入场动画，零依赖。
 *   GsapRender.register(InViewRender)
 *
 * in-view 只描述“什么时候播”，from / to / timeline 继续描述“动什么”。
 */
export const InViewRender: RenderPlugin = {
  id: 'in-view',
  attrs: ['in-view'],
  owns: ['in-view'],
  create(): PluginImpl {
    const groups = new Map<string, IntersectionObserver>()
    const entries = new Map<Element, Entry>()
    const rootIds = new WeakMap<Element, number>()
    let rootSeq = 0

    const idOf = (el: Element | null): number => {
      if (!el) return 0
      let id = rootIds.get(el)
      if (!id) {
        id = ++rootSeq
        rootIds.set(el, id)
      }
      return id
    }

    const getObserver = (options: InViewOptions): IntersectionObserver => {
      const key = `${idOf(options.root)}|${options.rootMargin}|${JSON.stringify(options.threshold)}`
      const existing = groups.get(key)
      if (existing) return existing

      const observer = new IntersectionObserver(
        (items) => {
          for (const item of items) {
            const target = item.target as Element
            const entry = entries.get(target)
            if (!entry) continue

            if (item.isIntersecting) {
              entry.played = true
              if (entry.once) {
                entry.timeline.play()
                observer.unobserve(target)
                entries.delete(target)
              } else if (entry.reverse) {
                entry.timeline.play()
              } else {
                entry.timeline.restart()
              }
            } else if (!entry.once && entry.reverse && entry.played) {
              entry.timeline.reverse()
            }
          }
        },
        {
          root: options.root,
          rootMargin: options.rootMargin,
          threshold: options.threshold,
        },
      )

      groups.set(key, observer)
      return observer
    }

    return {
      resolve(ctx): void {
        if (ctx.el === ctx.root && ctx.attrs['in-view'] !== undefined) {
          ctx.warn('W306', '根元素不支持 in-view，请放到内部内容容器上', 'in-view')
        }
      },

      mount(ctx): boolean {
        const options = normalize(ctx)
        if (!options) return false

        if ('at' in ctx.attrs) ctx.warn('W301', 'in-view 节点不参与父时间轴，at 已忽略', 'at')
        if (ctx.nested) ctx.warn('W302', 'in-view 嵌套在另一个接管节点内部，内层独立触发', 'in-view')
        if (ctx.node.paused()) {
          ctx.warn('W303', '节点的 paused 失效，由 in-view 接管播放', 'in-view')
          ctx.node.paused(false)
        }

        const timeline = gsap.timeline({ paused: true })
        timeline.add(ctx.node, 0)
        if (ctx.el.id) ctx.timelines[ctx.el.id] = timeline

        if (typeof IntersectionObserver === 'undefined') {
          ctx.warn('W305', '环境不支持 IntersectionObserver，直接播放', 'in-view')
          timeline.play()
          return true
        }

        entries.set(ctx.el, {
          timeline,
          once: options.once,
          reverse: options.reverse,
          played: false,
        })
        getObserver(options).observe(ctx.el)
        return true
      },

      destroy(): void {
        for (const observer of groups.values()) observer.disconnect()
        groups.clear()
        entries.clear()
      },
    }
  },
}

export default InViewRender
