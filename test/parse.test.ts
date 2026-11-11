import { describe, expect, it } from 'vitest'
import { parseValue } from '../src/lib/parse'

describe('parseValue', () => {
  it('解析无引号键、单引号、尾逗号', () => {
    const result = parseValue(`{opacity:0, y:-48, ease:'power2.out',}`)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value).toEqual({ opacity: 0, y: -48, ease: 'power2.out' })
    }
  })

  it('解析 from-to 的两项数组', () => {
    const result = parseValue(`[{x:-180, opacity:0}, {x:0, opacity:1}]`)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(Array.isArray(result.value)).toBe(true)
      expect((result.value as unknown[]).length).toBe(2)
    }
  })

  it('空字符串等价于空对象', () => {
    const result = parseValue('   ')
    expect(result).toEqual({ ok: true, value: {} })
  })

  it('语法错误返回下标', () => {
    const result = parseValue(`{opacity: 1, y:100 duration: 1}`)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.index).toBeGreaterThan(0)
      expect(result.error.message).toContain('期望')
    }
  })

  it('拒绝危险键名', () => {
    expect(parseValue('{__proto__: {a:1}}').ok).toBe(false)
    expect(parseValue(`{'constructor': 1}`).ok).toBe(false)
  })

  it('拒绝函数与表达式', () => {
    expect(parseValue('{onComplete: () => {}}').ok).toBe(false)
    expect(parseValue('{x: window.innerWidth}').ok).toBe(false)
  })

  it('数字必须是有限值', () => {
    expect(parseValue('{x: NaN}').ok).toBe(false)
  })
})
