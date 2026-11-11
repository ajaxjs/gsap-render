export interface WarnOptions {
  debug: boolean
  onWarn?: (message: string) => void
}

/** 生成简短、可读的元素路径，仅在真正输出警告时调用 */
export function pathOf(el: Element | null): string {
  if (!el) return ''
  const parts: string[] = []
  let cur: Element | null = el
  let depth = 0
  while (cur && depth < 4) {
    let name = cur.tagName.toLowerCase()
    if (cur.id) {
      parts.unshift(`${name}#${cur.id}`)
      break
    }
    const cls = cur.classList?.[0]
    if (cls) name += `.${cls}`
    parts.unshift(name)
    cur = cur.parentElement
    depth++
  }
  return parts.join(' > ')
}

export class Warmer {
  private seenEl = new WeakMap<Element, Set<string>>()
  private seenGlobal = new Set<string>()

  constructor(private options: WarnOptions) {}

  /** 每次求值，支持运行时打开 window.__GSAP_RENDER_DEBUG__ */
  get enabled(): boolean {
    return this.options.debug || !!(globalThis as any).__GSAP_RENDER_DEBUG__
  }

  warn(code: string, el: Element | null, message: string, attr?: string): void {
    if (!this.enabled) return
    const key = code + (attr ? `:${attr}` : '')
    if (el) {
      let set = this.seenEl.get(el)
      if (!set) {
        set = new Set()
        this.seenEl.set(el, set)
      }
      if (set.has(key)) return
      set.add(key)
    } else {
      if (this.seenGlobal.has(key)) return
      this.seenGlobal.add(key)
    }
    const where = el ? ` ${pathOf(el)}` : ''
    const label = attr ? ` [${attr}]` : ''
    const msg = `[gsap-render] ${code}${where}${label} ${message}`
    if (this.options.onWarn) this.options.onWarn(msg)
    else console.warn(msg)
  }
}
