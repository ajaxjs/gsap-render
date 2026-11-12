import { gsap } from './gsap'
import { mergeAttrs, toSteps } from './merge'
import { isPlainObject } from './parse'
import type { ScanResult } from './scan'
import type { Vars } from './types'
import type { Warmer } from './warn'

export const INTERACTION_ATTRS = [
  'hover',
  'press',
  'click',
  'show',
  'hide',
  'hover-fire',
  'press-fire',
  'click-fire',
] as const

const MARKERS = {
  hover: 'data-gsap-hover',
  press: 'data-gsap-press',
  click: 'data-gsap-click',
  clickFire: 'data-gsap-click-fire',
} as const

type InteractionState = 'idle' | 'hover' | 'press'

interface FireAction {
  target: string
  action: string | Vars
  leave?: string | Vars
}

interface InteractionRecord {
  el: Element
  hover?: Vars[]
  press?: Vars[]
  click?: Vars[]
  show?: Vars[]
  hide?: Vars[]
  showDisplay?: string
  hoverTl?: gsap.core.Timeline
  pressTl?: gsap.core.Timeline
  clickTl?: gsap.core.Timeline
  showTl?: gsap.core.Timeline
  hideTl?: gsap.core.Timeline
  state: InteractionState
  hovered: boolean
  hidden: boolean
  inlineDisplay: string
  fires: {
    hover?: FireAction[]
    press?: FireAction[]
    click?: FireAction[]
  }
  props: Set<string>
}

function parseSteps(value: unknown, warn: Warmer, el: Element, attr: string): Vars[] | undefined {
  if (value === undefined) return undefined
  if (isPlainObject(value)) return [value as Vars]
  const steps = toSteps(value)
  if (!steps) {
    warn.warn('W505', el, `${attr} 必须是对象或非空对象数组，已忽略`, attr)
    return undefined
  }
  return steps
}

function parseFire(value: unknown, warn: Warmer, el: Element, attr: string): FireAction[] | undefined {
  if (value === undefined) return undefined
  if (!Array.isArray(value) || value.length < 2) {
    warn.warn('W505', el, `${attr} 必须是 [目标, 动作] 形式，已忽略`, attr)
    return undefined
  }
  const list = Array.isArray(value[0]) ? value : [value]
  const actions: FireAction[] = []
  for (const item of list) {
    if (!Array.isArray(item) || item.length < 2) {
      warn.warn('W505', el, `${attr} 的动作格式非法，已忽略`, attr)
      continue
    }
    const [target, action, leave] = item
    if (typeof target !== 'string' || (typeof action !== 'string' && !isPlainObject(action))) {
      warn.warn('W505', el, `${attr} 的 [目标, 动作] 非法，已忽略`, attr)
      continue
    }
    actions.push({
      target,
      action: action as string | Vars,
      leave: typeof leave === 'string' || isPlainObject(leave) ? (leave as string | Vars) : undefined,
    })
  }
  return actions.length ? actions : undefined
}

export class InteractionController {
  private records = new Map<Element, InteractionRecord>()
  private marked: Array<{ el: Element; attr: string }> = []
  private pressed: InteractionRecord | null = null
  private bound = false

  constructor(
    private readonly root: Element,
    private readonly scan: ScanResult,
    private readonly warn: Warmer,
    private readonly defaults: Vars,
    private readonly onLayout: () => void,
  ) {}

  init(): void {
    for (const el of this.scan.order) {
      const attrs = this.scan.attrs.get(el)
      if (!attrs) continue
      if (!INTERACTION_ATTRS.some((attr) => attr in attrs)) continue
      this.register(el, attrs)
    }
    if (this.records.size) this.bind()
  }

  destroy(): void {
    if (this.bound) {
      this.root.removeEventListener('pointerover', this.handleOver as EventListener)
      this.root.removeEventListener('pointerout', this.handleOut as EventListener)
      this.root.removeEventListener('pointerdown', this.handleDown as EventListener)
      this.root.removeEventListener('click', this.handleClick as EventListener)
      window.removeEventListener('pointerup', this.handleUp)
      window.removeEventListener('pointercancel', this.handleUp)
      window.removeEventListener('blur', this.handleBlur)
      document.removeEventListener('visibilitychange', this.handleBlur)
      this.bound = false
    }

    for (const record of this.records.values()) {
      for (const tl of [record.hoverTl, record.pressTl, record.clickTl, record.showTl, record.hideTl]) {
        tl?.kill()
      }
      gsap.killTweensOf(record.el)
      if (record.props.size) {
        gsap.set(record.el, { clearProps: Array.from(record.props).join(',') })
      }
    }
    this.records.clear()

    for (const { el, attr } of this.marked) el.removeAttribute(attr)
    this.marked = []
    this.pressed = null
  }

  // ---------------------------------------------------------------- register

  private register(el: Element, attrs: Record<string, { value: unknown }>): void {
    const element = el as HTMLElement
    const win = el.ownerDocument.defaultView
    const display = win?.getComputedStyle(el).display
    const record: InteractionRecord = {
      el,
      state: 'idle',
      hovered: false,
      hidden: display === 'none',
      inlineDisplay: element.style.display || '',
      fires: {},
      props: new Set(),
    }

    record.hover = parseSteps(attrs.hover?.value, this.warn, el, 'hover')
    record.press = parseSteps(attrs.press?.value, this.warn, el, 'press')
    record.click = parseSteps(attrs.click?.value, this.warn, el, 'click')
    record.show = parseSteps(attrs.show?.value, this.warn, el, 'show')
    record.hide = parseSteps(attrs.hide?.value, this.warn, el, 'hide')

    const showConfig = isPlainObject(attrs.show?.value) ? (attrs.show?.value as Vars) : undefined
    if (showConfig && typeof showConfig.display === 'string') {
      record.showDisplay = showConfig.display
      for (const step of record.show ?? []) delete step.display
    }

    record.fires.hover = parseFire(attrs['hover-fire']?.value, this.warn, el, 'hover-fire')
    record.fires.press = parseFire(attrs['press-fire']?.value, this.warn, el, 'press-fire')
    record.fires.click = parseFire(attrs['click-fire']?.value, this.warn, el, 'click-fire')

    for (const steps of [record.hover, record.press, record.click, record.show, record.hide]) {
      for (const step of steps ?? []) {
        for (const key of Object.keys(step)) record.props.add(key)
      }
    }

    this.checkConflicts(el, attrs, record)

    if (record.hover || record.fires.hover?.length) this.mark(el, MARKERS.hover)
    if (record.press || record.fires.press?.length) this.mark(el, MARKERS.press)
    if (record.click) this.mark(el, MARKERS.click)
    if (record.fires.click?.length) this.mark(el, MARKERS.clickFire)

    this.records.set(el, record)
  }

  private mark(el: Element, attr: string): void {
    el.setAttribute(attr, '')
    this.marked.push({ el, attr })
  }

  private checkConflicts(
    el: Element,
    attrs: Record<string, { value: unknown }>,
    record: InteractionRecord,
  ): void {
    const own = new Set<string>()
    for (const value of [attrs.from?.value, attrs.to?.value]) {
      if (isPlainObject(value)) for (const key of Object.keys(value)) own.add(key)
      if (Array.isArray(value)) {
        for (const step of value) if (isPlainObject(step)) for (const key of Object.keys(step)) own.add(key)
      }
    }
    const overlap = Array.from(record.props).filter((prop) => own.has(prop))
    if (overlap.length) {
      this.warn.warn('W501', el, `交互与 from/to 同时动画 ${overlap.join('、')}，可能互相覆盖`, 'hover')
    }

    const win = el.ownerDocument.defaultView
    if (win) {
      const style = win.getComputedStyle(el)
      if (style.pointerEvents === 'none') {
        this.warn.warn('W502', el, 'pointer-events:none，交互不会触发', 'hover')
      }
      if (style.transitionDuration !== '0s') {
        this.warn.warn('W508', el, '元素有 CSS transition，可能与 GSAP 双重动画', 'hover')
      }
    }
  }

  // ------------------------------------------------------------------ events

  private bind(): void {
    this.bound = true
    this.root.addEventListener('pointerover', this.handleOver as EventListener)
    this.root.addEventListener('pointerout', this.handleOut as EventListener)
    this.root.addEventListener('pointerdown', this.handleDown as EventListener)
    this.root.addEventListener('click', this.handleClick as EventListener)
    window.addEventListener('pointerup', this.handleUp)
    window.addEventListener('pointercancel', this.handleUp)
    window.addEventListener('blur', this.handleBlur)
    document.addEventListener('visibilitychange', this.handleBlur)
  }

  private findByTarget(target: EventTarget | null, attr: string): Element | null {
    if (!(target instanceof Element)) return null
    const el = target.closest(`[${attr}]`)
    return el && this.root.contains(el) ? el : null
  }

  private handleOver = (event: PointerEvent): void => {
    if (event.pointerType === 'touch') return
    const el = this.findByTarget(event.target, MARKERS.hover)
    if (!el) return
    const record = this.records.get(el)
    if (!record) return
    if (event.relatedTarget instanceof Node && el.contains(event.relatedTarget)) return
    record.hovered = true
    if (record.hover && record.state !== 'press') this.setState(record, 'hover')
    this.runFire(el, record.fires.hover)
  }

  private handleOut = (event: PointerEvent): void => {
    const el = this.findByTarget(event.target, MARKERS.hover)
    if (!el) return
    const record = this.records.get(el)
    if (!record) return
    if (event.relatedTarget instanceof Node && el.contains(event.relatedTarget)) return
    record.hovered = false
    if (record.state === 'hover') this.setState(record, 'idle')
    this.runFire(el, record.fires.hover, 'leave')
  }

  private handleDown = (event: PointerEvent): void => {
    if (event.button !== 0) return
    const el = this.findByTarget(event.target, MARKERS.press)
    if (!el) return
    const record = this.records.get(el)
    if (!record) return
    this.pressed = record
    if (record.press) this.setState(record, 'press')
    this.runFire(el, record.fires.press)
  }

  private handleUp = (): void => {
    const record = this.pressed
    this.pressed = null
    if (!record) return
    if (record.press) this.setState(record, record.hovered ? 'hover' : 'idle')
    this.runFire(record.el, record.fires.press, 'leave')
  }

  private handleBlur = (): void => {
    this.handleUp()
  }

  private handleClick = (event: MouseEvent): void => {
    const clickEl = this.findByTarget(event.target, MARKERS.click)
    if (clickEl) {
      const record = this.records.get(clickEl)
      if (record?.click) this.playClick(record)
    }

    const fireEl = this.findByTarget(event.target, MARKERS.clickFire)
    if (fireEl) {
      const record = this.records.get(fireEl)
      this.runFire(fireEl, record?.fires.click)
    }
  }

  // ----------------------------------------------------------------- states

  private setState(record: InteractionRecord, next: InteractionState): void {
    if (record.state === next) return
    const prev = record.state
    record.state = next

    if (prev === 'press') record.pressTl?.reverse()
    if (prev === 'hover') record.hoverTl?.reverse()

    if (next === 'press' && record.press) {
      record.pressTl ??= this.makeTimeline(record.el, record.press, undefined, { duration: 0.1 })
      record.pressTl.play()
    }
    if (next === 'hover' && record.hover) {
      record.hoverTl ??= this.makeTimeline(record.el, record.hover, undefined, { duration: 0.1 })
      record.hoverTl.play()
    }
  }

  private playClick(record: InteractionRecord): void {
    if (!record.click) return
    record.clickTl ??= this.makeTimeline(record.el, record.click, () => this.restoreState(record))
    record.clickTl.restart()
  }

  private restoreState(record: InteractionRecord): void {
    const tl = record.state === 'press' ? record.pressTl : record.state === 'hover' ? record.hoverTl : undefined
    if (!tl) return
    if (tl.progress() === 1) {
      tl.progress(0)
      tl.progress(1)
    } else {
      tl.play()
    }
  }

  private makeTimeline(
    el: Element,
    steps: Vars[],
    onComplete?: () => void,
    baseVars: Vars = {},
  ): gsap.core.Timeline {
    const tl = gsap.timeline({ paused: true, onComplete })
    for (const step of steps) tl.to(el, { ...this.defaults, ...baseVars, ...step })
    return tl
  }

  // ------------------------------------------------------------------- fire

  private runFire(trigger: Element, actions: FireAction[] | undefined, phase: 'enter' | 'leave' = 'enter'): void {
    if (!actions?.length) return
    for (const item of actions) {
      const payload = phase === 'enter' ? item.action : item.leave
      if (payload === undefined) continue
      this.runAction(trigger, item.target, payload)
    }
  }

  private runAction(trigger: Element, target: string, action: string | Vars): void {
    const targets = this.resolveTargets(target, trigger)
    if (!targets.length) {
      this.warn.warn('W503', trigger, `-fire 找不到目标 "${target}"`, target)
      return
    }
    for (const el of targets) this.applyAction(el, action)
  }

  private resolveTargets(selector: string, trigger: Element): Element[] {
    if (selector === 'self') return [trigger]
    const scoped = Array.from(this.root.querySelectorAll(selector))
    if (scoped.length) return scoped
    const doc = trigger.ownerDocument
    return Array.from(doc.querySelectorAll(selector))
  }

  private applyAction(el: Element, action: string | Vars): void {
    if (isPlainObject(action)) {
      gsap.to(el, { ...this.defaults, ...(action as Vars) })
      return
    }
    if (action === 'show') return this.show(el)
    if (action === 'hide') return this.hide(el)
    if (action === 'toggle') return this.toggle(el)
    if (action === 'to' || action === 'from' || action === 'from-to') return this.replay(el, action)
    this.warn.warn('W504', el, `未知的交互动作 ${JSON.stringify(action)}`)
  }

  private replay(el: Element, action: 'to' | 'from' | 'from-to'): void {
    const attrs = this.scan.attrs.get(el)
    if (!attrs) {
      this.warn.warn('W504', el, `目标没有可重放的 ${action} 动画`, action)
      return
    }
    const want = action === 'from-to' ? 'fromTo' : action
    const spec = mergeAttrs(attrs, this.warn, el).find((item) => item.method === want)
    if (!spec) {
      this.warn.warn('W504', el, `目标没有声明 ${action}`, action)
      return
    }
    if (spec.steps?.length) {
      const tl = gsap.timeline()
      for (const step of spec.steps) tl.to(el, { ...this.defaults, ...step })
      return
    }
    const vars = { ...this.defaults, ...spec.vars }
    if (spec.method === 'fromTo') gsap.fromTo(el, spec.fromVars ?? {}, vars)
    else if (spec.method === 'from') gsap.from(el, vars)
    else gsap.to(el, vars)
  }

  // ------------------------------------------------------------ show / hide

  private show(el: Element): void {
    const record = this.records.get(el)
    if (!record?.show) {
      this.warn.warn('W504', el, '目标没有声明 show，无法显示', 'show')
      return
    }

    if (record.hide) {
      const hiddenStep = record.hide[record.hide.length - 1] as Vars
      gsap.set(el, { ...this.defaults, ...hiddenStep })
    }

    const element = el as HTMLElement
    const win = el.ownerDocument.defaultView
    const display = record.showDisplay ?? (record.inlineDisplay || 'block')
    if (win?.getComputedStyle(el).display === 'none') element.style.display = display
    record.hidden = false
    record.showTl ??= this.makeTimeline(el, record.show, () => this.onLayout())
    record.showTl.restart()
    this.onLayout()
  }

  private hide(el: Element): void {
    const record = this.records.get(el)
    if (!record?.hide) {
      this.warn.warn('W504', el, '目标没有声明 hide，无法隐藏', 'hide')
      return
    }
    if (record.hidden) return
    record.inlineDisplay = (el as HTMLElement).style.display || record.inlineDisplay
    record.hidden = true
    record.hideTl ??= this.makeTimeline(el, record.hide, () => {
      ;(el as HTMLElement).style.display = 'none'
      this.onLayout()
    })
    record.hideTl.restart()
  }

  private toggle(el: Element): void {
    const record = this.records.get(el)
    if (!record) return
    if (record.hidden) this.show(el)
    else this.hide(el)
  }
}
