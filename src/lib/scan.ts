import { isPlainObject, lineCol, parseValue } from './parse'
import type { Warmer } from './warn'

export interface AttrEntry {
  raw: string
  value: unknown
  prefixed: boolean
}

export type AttrMap = Record<string, AttrEntry>

export interface ScanOptions {
  root: Element
  prefix: string
  known: Set<string>
  rawAttrs: Set<string>
  warn: Warmer
  ownerId: string
}

export interface ScanResult {
  order: Element[]
  attrs: WeakMap<Element, AttrMap>
  broken: WeakSet<Element>
}

/**
 * 一次前序遍历收集属性，归一化双前缀，解析值。
 * 其它实例已认领的元素直接跳过。
 */
export function scan(root: Element, o: ScanOptions): ScanResult {
  const order: Element[] = [root, ...Array.from(root.querySelectorAll('*'))]
  const attrs = new WeakMap<Element, AttrMap>()
  const broken = new WeakSet<Element>()

  for (const el of order) {
    const owner = el.getAttribute('data-gsap-owned')
    if (owner && owner !== o.ownerId) {
      o.warn.warn('W013', el, '已被其它 GsapRender 实例认领，跳过')
      continue
    }

    const map: AttrMap = {}
    for (const name of el.getAttributeNames()) {
      let key: string | null = null
      let prefixed = false
      if (o.prefix && name.startsWith(o.prefix)) {
        const stripped = name.slice(o.prefix.length)
        if (o.known.has(stripped)) {
          key = stripped
          prefixed = true
        }
      } else if (o.known.has(name)) {
        key = name
      }
      if (!key) continue

      const prev = map[key]
      if (prev) {
        if (prev.prefixed && !prefixed) continue
        if (!prev.prefixed && prefixed) {
          o.warn.warn('W009', el, `裸属性与 "${name}" 同时存在，使用前缀版本`, key)
        }
      }
      map[key] = { raw: el.getAttribute(name) ?? '', value: undefined, prefixed }
    }

    const keys = Object.keys(map)
    if (!keys.length) continue
    if (el !== root && 'config' in map) {
      o.warn.warn('W014', el, 'config 只在根元素生效，已忽略', 'config')
      delete map.config
    }

    for (const key of Object.keys(map)) {
      const entry = map[key] as AttrEntry
      const raw = entry.raw.trim()

      if (o.rawAttrs.has(key)) {
        entry.value = raw
        continue
      }

      if (key === 'at') {
        if (!raw) continue
        const parsed = parseValue(raw)
        entry.value =
          parsed.ok && (typeof parsed.value === 'number' || typeof parsed.value === 'string')
            ? parsed.value
            : raw // at="<" / at="intro"
        continue
      }

      if (!raw) {
        entry.value = {}
        continue
      }

      const parsed = parseValue(entry.raw)
      if (!parsed.ok) {
        broken.add(el)
        o.warn.warn('W001', el, `${lineCol(entry.raw, parsed.error.index)}：${parsed.error.message}`, key)
        continue
      }
      const mustBeObject = key === 'from' || key === 'timeline' || key === 'config'
      const objectValue = isPlainObject(parsed.value)
      const toArray = key === 'to' && Array.isArray(parsed.value)
      if ((mustBeObject || key === 'to') && !objectValue && !toArray) {
        broken.add(el)
        o.warn.warn('W001', el, `${key} 必须是对象${key === 'to' ? '或数组' : ''}`, key)
        continue
      }
      entry.value = parsed.value
    }

    el.setAttribute('data-gsap-owned', o.ownerId)
    attrs.set(el, map)
  }

  return { order, attrs, broken }
}

export function attrValue(attrs: AttrMap | undefined, key: string): unknown {
  return attrs?.[key]?.value
}
