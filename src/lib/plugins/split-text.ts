import { gsap } from 'gsap'
import { SplitText } from 'gsap/SplitText'
import { mergePhase } from '../merge'
import { isPlainObject } from '../parse'
import type { PluginImpl, RenderPlugin, ResolveContext } from '../types'
import type { Warmer } from '../warn'

const TYPES = ['lines', 'words', 'chars'] as const
type SplitType = (typeof TYPES)[number]

const splitAttrs: string[] = ['split', 'split-options']
for (const type of TYPES) {
  splitAttrs.push(`split-${type}-from`, `split-${type}-to`, `split-${type}-from-to`)
}

const RESERVED_OPTIONS = ['type', 'autoSplit', 'onSplit', 'onRevert']

/**
 * SplitText 适配器：文本分割 + 分割体动画。
 * 用法：
 *   gsap.registerPlugin(SplitText)
 *   GsapRender.register(SplitTextRender)
 */
export const SplitTextRender: RenderPlugin = {
  id: 'split-text',
  attrs: splitAttrs,
  raw: ['split'],
  requires: ['SplitText'],
  create(): PluginImpl {
    gsap.registerPlugin(SplitText)
    const instances = new Map<Element, SplitText>()

    return {
      resolve(ctx: ResolveContext): void {
        const el = ctx.el
        const warm = {
          warn: (code: string, _el: Element, message: string, attr?: string) => ctx.warn(code, message, attr),
        } as unknown as Warmer
        const declaredRaw = typeof ctx.attrs.split === 'string' ? ctx.attrs.split : ''
        const declared = declaredRaw.split(/[\s,]+/).filter(Boolean)
        const types = new Set<SplitType>()

        for (const token of declared) {
          if ((TYPES as readonly string[]).includes(token)) types.add(token as SplitType)
          else ctx.warn('W101', `未知的分割类型 "${token}"，可用 lines / words / chars`, 'split')
        }

        const phases: Array<{ type: SplitType; specs: ReturnType<typeof mergePhase> }> = []
        for (const type of TYPES) {
          const from = ctx.attrs[`split-${type}-from`]
          const to = ctx.attrs[`split-${type}-to`]
          const both = ctx.attrs[`split-${type}-from-to`]
          if (from === undefined && to === undefined && both === undefined) continue
          if (!declared.includes(type)) {
            ctx.warn('W102', `检测到 split-${type}-*，自动启用 ${type} 分割`, `split-${type}`)
          }
          types.add(type)
          phases.push({
            type,
            specs: mergePhase(from, to, both, el, `split-${type}`, warm),
          })
        }

        if (!types.size) {
          if (!('split' in ctx.attrs)) return
          types.add('lines')
          types.add('words')
          types.add('chars')
        }

        const options = isPlainObject(ctx.attrs['split-options']) ? { ...ctx.attrs['split-options'] } : {}
        for (const key of RESERVED_OPTIONS) {
          if (key in options) {
            ctx.warn('W103', `split-options 里不允许写 "${key}"，已忽略`, 'split-options')
            delete options[key]
          }
        }

        const typeList = TYPES.filter((type) => types.has(type))
        const vars: Record<string, unknown> = {
          aria: 'auto',
          deepSlice: true,
          autoSplit: true,
          ...options,
          type: typeList.join(','),
        }
        if (typeList.length === 1 && typeList[0] === 'chars' && !('smartWrap' in options)) {
          vars.smartWrap = true
        }

        el.setAttribute('data-gsap-split', '')
        el.setAttribute('data-gsap-pending', '')

        let split: SplitText
        let first = true
        try {
          split = SplitText.create(el, {
            ...vars,
            onSplit: () => {
              if (first) {
                first = false
                return
              }
              el.dispatchEvent(new CustomEvent('gsap-render:resplit', { bubbles: true }))
            },
          } as never)
        } catch (error) {
          ctx.warn('W104', `SplitText 初始化失败：${(error as Error).message}`, 'split')
          el.removeAttribute('data-gsap-pending')
          return
        }

        instances.set(el, split)
        ctx.symbols.set(el, {
          lines: split.lines,
          words: split.words,
          chars: split.chars,
        })

        for (const phase of phases) {
          const elements =
            phase.type === 'lines' ? split.lines : phase.type === 'words' ? split.words : split.chars
          if (!elements.length) {
            ctx.warn('W104', `没有分割出任何 ${phase.type}，跳过该 phase`, `split-${phase.type}`)
            continue
          }
          for (const spec of phase.specs) {
            if (spec.method === 'fromTo') ctx.add(`@${phase.type}`, 'fromTo', [spec.fromVars ?? {}, spec.vars])
            else ctx.add(`@${phase.type}`, spec.method, spec.vars)
          }
        }

        if (typeof requestAnimationFrame === 'function') {
          requestAnimationFrame(() => el.removeAttribute('data-gsap-pending'))
        } else {
          el.removeAttribute('data-gsap-pending')
        }
      },

      destroy(): void {
        for (const [el, split] of instances) {
          try {
            ;(split as unknown as { kill?: () => void }).kill?.()
          } catch {
            /* ignore */
          }
          try {
            split.revert()
          } catch {
            /* ignore */
          }
          el.removeAttribute('data-gsap-split')
          el.removeAttribute('data-gsap-pending')
        }
        instances.clear()
      },
    }
  },
}

export default SplitTextRender
