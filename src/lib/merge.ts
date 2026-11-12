import { isPlainObject } from './parse'
import type { AttrMap } from './scan'
import type { TweenMethod, Vars } from './types'
import type { Warmer } from './warn'

export interface TweenSpec {
  method: TweenMethod
  vars: Vars
  fromVars?: Vars
  /** 数组写法：按顺序播放的步骤 */
  steps?: Vars[]
}

/** 时序键统一归 toVars（GSAP 的 fromTo 只从第二个参数读时序） */
export const TIMING_KEYS = new Set([
  'duration',
  'delay',
  'ease',
  'stagger',
  'repeat',
  'repeatDelay',
  'yoyo',
  'immediateRender',
])

/** 渲染器保留键，不能出现在补间变量里 */
const RESERVED_VARS = new Set(['at', 'timeline', 'config', 'from-to'])

const GSAP_VARS = new Set([
  'x', 'y', 'z', 'xPercent', 'yPercent', 'scale', 'scaleX', 'scaleY',
  'rotation', 'rotationX', 'rotationY', 'rotationZ', 'skew', 'skewX', 'skewY',
  'transform', 'transformOrigin', 'transformPerspective', 'perspective', 'svgOrigin',
  'autoAlpha', 'alpha', 'opacity',
  'duration', 'delay', 'ease', 'stagger', 'repeat', 'repeatDelay', 'yoyo', 'yoyoEase',
  'immediateRender', 'overwrite', 'lazy', 'paused', 'reversed', 'runBackwards',
  'startAt', 'keyframes', 'data', 'id', 'snap', 'modifiers', 'callbackScope',
  'onComplete', 'onUpdate', 'onStart', 'onRepeat', 'onReverseComplete',
])

function isKnownVar(key: string, doc?: Document): boolean {
  if (key.startsWith('--')) return true
  if (GSAP_VARS.has(key)) return true
  if (doc) {
    try {
      return key in (doc.documentElement.style as unknown as Record<string, unknown>)
    } catch {
      return false
    }
  }
  return false
}

function sanitize(vars: Vars, el: Element, attr: string, warn: Warmer): Vars {
  const out: Vars = {}
  for (const [key, value] of Object.entries(vars)) {
    if (RESERVED_VARS.has(key)) {
      warn.warn('W011', el, `保留键 "${key}" 不能写在补间变量里，已剔除`, attr)
      continue
    }
    if (!isKnownVar(key, el.ownerDocument)) {
      warn.warn('W005', el, `未知的补间变量 "${key}"`, attr)
    }
    out[key] = value
  }
  return out
}

const RELATIVE = /^[+\-*/]=/

function checkRelative(fromVars: Vars, toVars: Vars, el: Element, attr: string, warn: Warmer): void {
  for (const key of Object.keys(toVars)) {
    const value = toVars[key]
    if (key in fromVars && typeof value === 'string' && RELATIVE.test(value)) {
      warn.warn(
        'W004',
        el,
        `"${key}" 在 from 与 to 中同时存在，且 to 是相对值 ${JSON.stringify(value)}；` +
          `fromTo 会以 from 的值为基线，建议只写其中一侧`,
        attr,
      )
    }
  }
}

function mergeFromTo(
  fromRaw: Record<string, unknown>,
  toRaw: Record<string, unknown>,
  el: Element,
  attr: string,
  warn: Warmer,
): TweenSpec {
  const fromVars = sanitize({ ...fromRaw } as Vars, el, attr, warn)
  const toVars = sanitize({ ...toRaw } as Vars, el, attr, warn)

  for (const key of TIMING_KEYS) {
    if (key in fromVars) {
      if (!(key in toVars)) toVars[key] = fromVars[key]
      delete fromVars[key]
    }
  }
  checkRelative(fromVars, toVars, el, attr, warn)
  return { method: 'fromTo', vars: toVars, fromVars }
}

const isFilledObject = (value: unknown): value is Record<string, unknown> =>
  isPlainObject(value) && Object.keys(value).length > 0

/** 数组写法：非空、且每一项都是普通对象 */
export function toSteps(value: unknown): Vars[] | null {
  if (!Array.isArray(value) || value.length === 0) return null
  if (!value.every(isPlainObject)) return null
  return value as Vars[]
}

/** 元素级 from / to / from-to → 补间描述 */
export function mergeAttrs(attrs: AttrMap, warn: Warmer, el: Element): TweenSpec[] {
  let from = attrs.from?.value
  const to = attrs.to?.value
  const fromTo = attrs['from-to']?.value

  if (Array.isArray(from)) {
    warn.warn('W507', el, 'from 不支持数组写法，已忽略', 'from')
    from = undefined
  }

  if (Array.isArray(to)) {
    const steps = toSteps(to)
    if (!steps) {
      warn.warn('W505', el, 'to 数组必须是非空对象数组，已忽略', 'to')
      return []
    }
    if (isFilledObject(from)) {
      warn.warn('W507', el, 'to 使用数组时不能再写 from，from 已忽略', 'to')
    }
    const sanitized = steps.map((step) => sanitize({ ...step } as Vars, el, 'to', warn))
    return [{ method: 'to', vars: sanitized[0] as Vars, steps: sanitized }]
  }

  if (fromTo !== undefined) {
    if (!Array.isArray(fromTo) || fromTo.length !== 2 || !isPlainObject(fromTo[0]) || !isPlainObject(fromTo[1])) {
      warn.warn('W003', el, `from-to 必须是 [fromVars, toVars] 两个对象`, 'from-to')
      return []
    }
    if (from !== undefined || to !== undefined) {
      const ignored = [from !== undefined ? 'from' : '', to !== undefined ? 'to' : ''].filter(Boolean).join(' 和 ')
      warn.warn('W002', el, `同时存在 from-to，已忽略 ${ignored}`, 'from-to')
    }
    return [mergeFromTo(fromTo[0], fromTo[1], el, 'from-to', warn)]
  }

  if (isFilledObject(from) && isFilledObject(to)) {
    return [mergeFromTo(from, to, el, 'from+to', warn)]
  }
  if (isFilledObject(from)) {
    return [{ method: 'from', vars: sanitize({ ...from } as Vars, el, 'from', warn) }]
  }
  if (isFilledObject(to)) {
    return [{ method: 'to', vars: sanitize({ ...to } as Vars, el, 'to', warn) }]
  }
  return []
}

/** 适配器用：给单个 phase 做同样的合并 */
export function mergePhase(
  fromRaw: unknown,
  toRaw: unknown,
  fromToRaw: unknown,
  el: Element,
  attr: string,
  warn: Warmer,
): TweenSpec[] {
  if (fromToRaw !== undefined) {
    if (!Array.isArray(fromToRaw) || fromToRaw.length !== 2 || !isPlainObject(fromToRaw[0]) || !isPlainObject(fromToRaw[1])) {
      warn.warn('W003', el, `from-to 必须是 [fromVars, toVars] 两个对象`, attr)
      return []
    }
    if (fromRaw !== undefined || toRaw !== undefined) {
      warn.warn('W002', el, '同时存在 from-to，已忽略 from/to', attr)
    }
    return [mergeFromTo(fromToRaw[0], fromToRaw[1], el, attr, warn)]
  }
  if (isFilledObject(fromRaw) && isFilledObject(toRaw)) {
    return [mergeFromTo(fromRaw, toRaw, el, attr, warn)]
  }
  if (isFilledObject(fromRaw)) {
    return [{ method: 'from', vars: sanitize({ ...fromRaw } as Vars, el, attr, warn) }]
  }
  if (isFilledObject(toRaw)) {
    return [{ method: 'to', vars: sanitize({ ...toRaw } as Vars, el, attr, warn) }]
  }
  return []
}
