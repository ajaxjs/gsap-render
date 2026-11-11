import { describe, expect, it } from 'vitest'
import { mergeAttrs } from '../src/lib/merge'
import type { AttrMap } from '../src/lib/scan'
import { Warmer } from '../src/lib/warn'

function attrs(values: Record<string, unknown>): AttrMap {
  const map: AttrMap = {}
  for (const [key, value] of Object.entries(values)) {
    map[key] = { raw: '', value, prefixed: false }
  }
  return map
}

function setup() {
  const messages: string[] = []
  const warn = new Warmer({ debug: true, onWarn: (message) => messages.push(message) })
  const el = document.createElement('div')
  return { warn, messages, el }
}

describe('mergeAttrs', () => {
  it('from + to 合成 fromTo，时序键归第二位', () => {
    const { warn, el } = setup()
    const [spec] = mergeAttrs(attrs({ from: { opacity: 0, duration: 2 }, to: { opacity: 1 } }), warn, el)
    expect(spec.method).toBe('fromTo')
    expect(spec.fromVars).toEqual({ opacity: 0 })
    expect(spec.vars).toEqual({ opacity: 1, duration: 2 })
  })

  it('只有 from 时生成 from', () => {
    const { warn, el } = setup()
    const [spec] = mergeAttrs(attrs({ from: { opacity: 0 } }), warn, el)
    expect(spec.method).toBe('from')
    expect(spec.vars).toEqual({ opacity: 0 })
  })

  it('from-to 优先，并警告 from/to 被忽略', () => {
    const { warn, el, messages } = setup()
    const [spec] = mergeAttrs(
      attrs({
        'from-to': [{ opacity: 0 }, { opacity: 1 }],
        from: { x: 100 },
        to: { x: 0 },
      }),
      warn,
      el,
    )
    expect(spec.fromVars).toEqual({ opacity: 0 })
    expect(spec.vars).toEqual({ opacity: 1 })
    expect(messages.some((m) => m.includes('W002'))).toBe(true)
  })

  it('from-to 结构非法时返回空并警告 W003', () => {
    const { warn, el, messages } = setup()
    expect(mergeAttrs(attrs({ 'from-to': [{ opacity: 0 }] }), warn, el)).toEqual([])
    expect(messages.some((m) => m.includes('W003'))).toBe(true)
  })

  it('同属性相对值给出 W004', () => {
    const { warn, el, messages } = setup()
    mergeAttrs(attrs({ from: { x: 0 }, to: { x: '+=100' } }), warn, el)
    expect(messages.some((m) => m.includes('W004'))).toBe(true)
  })

  it('保留键被剔除并警告 W011', () => {
    const { warn, el, messages } = setup()
    const [spec] = mergeAttrs(attrs({ to: { opacity: 1, timeline: true } }), warn, el)
    expect(spec.vars).toEqual({ opacity: 1 })
    expect(messages.some((m) => m.includes('W011'))).toBe(true)
  })

  it('空对象视为没写', () => {
    const { warn, el } = setup()
    expect(mergeAttrs(attrs({ from: {}, to: {} }), warn, el)).toEqual([])
  })
})
