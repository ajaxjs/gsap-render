import { gsap } from 'gsap'
import { isPlainObject } from './parse'
import { mergeAttrs, type TweenSpec } from './merge'
import type { AttrMap, ScanResult } from './scan'
import type { PluginImpl, RenderPlugin, ResolveContext, TargetSpec, TweenMethod, Vars } from './types'
import type { Warmer } from './warn'

export interface PluginRuntime {
  plugin: RenderPlugin
  impl: PluginImpl
}

export interface BuildContext {
  root: Element
  scan: ScanResult
  warn: Warmer
  plugins: PluginRuntime[]
  defaults: Vars
  timelines: Record<string, gsap.core.Timeline>
  symbols: WeakMap<Element, Record<string, Element[]>>
  /** 当前是否在被接管的子树里构建（用于 W202 之类嵌套判断） */
  ownedDepth: number
}

interface PluginTween {
  target: TargetSpec
  method: TweenMethod
  vars: Vars | [Vars, Vars]
}

interface BuiltNode {
  node: gsap.core.Animation
  /** true = 已被适配器接管，调用方不要再挂到父时间轴 */
  detached: boolean
}

const childElements = (el: Element): Element[] => Array.from(el.children)

function toPlain(attrs: AttrMap): Record<string, unknown> {
  const plain: Record<string, unknown> = {}
  for (const [key, entry] of Object.entries(attrs)) plain[key] = entry.value
  return plain
}

function resolvePluginTweens(el: Element, attrs: AttrMap, ctx: BuildContext): PluginTween[] {
  const out: PluginTween[] = []
  for (const runtime of ctx.plugins) {
    if (!runtime.plugin.attrs.some((attr) => attr in attrs)) continue
    const context: ResolveContext = {
      el,
      root: ctx.root,
      attrs: toPlain(attrs),
      symbols: ctx.symbols,
      add: (target, method, vars) => out.push({ target, method, vars }),
      warn: (code, message, attr) => ctx.warn.warn(code, el, message, attr),
    }
    try {
      runtime.impl.resolve(context)
    } catch (error) {
      ctx.warn.warn('W016', el, `适配器 ${runtime.plugin.id} 执行失败：${(error as Error).message}`, runtime.plugin.id)
    }
  }
  return out
}

function findOwner(el: Element, attrs: AttrMap, ctx: BuildContext): PluginRuntime | null {
  const matches = ctx.plugins.filter((runtime) =>
    runtime.plugin.owns?.some((attr) => attr in attrs),
  )
  if (!matches.length) return null
  if (matches.length === 1) return matches[0] as PluginRuntime
  matches.sort((a, b) => (b.plugin.priority ?? 0) - (a.plugin.priority ?? 0))
  const winner = matches[0] as PluginRuntime
  const names = matches.map((runtime) => runtime.plugin.id).join('、')
  ctx.warn.warn('W017', el, `多个接管型适配器命中（${names}），使用 ${winner.plugin.id}`, winner.plugin.owns?.[0])
  return winner
}

function tryMount(owner: PluginRuntime, built: gsap.core.Animation, el: Element, attrs: AttrMap, nested: boolean, ctx: BuildContext): boolean {
  const mount = owner.impl.mount
  if (!mount) return false
  try {
    const handled = mount({
      el,
      root: ctx.root,
      node: built,
      attrs: toPlain(attrs),
      nested,
      debug: ctx.warn.enabled,
      timelines: ctx.timelines,
      warn: (code, message, attr) => ctx.warn.warn(code, el, message, attr),
    })
    return handled !== false
  } catch (error) {
    ctx.warn.warn('W016', el, `适配器 ${owner.plugin.id} 接管失败：${(error as Error).message}`, owner.plugin.id)
    return false
  }
}

function targetsFor(el: Element, spec: TargetSpec, ctx: BuildContext): Element[] {
  if (spec === 'self') return [el]
  if (spec.startsWith('@')) return ctx.symbols.get(el)?.[spec.slice(1)] ?? []
  return Array.from(el.querySelectorAll(spec))
}

function createTween(
  target: Element | Element[],
  method: TweenMethod,
  vars: Vars,
  fromVars: Vars | undefined,
  defaults: Vars,
): gsap.core.Tween | null {
  const list = Array.isArray(target) ? target : [target]
  if (!list.length || !list[0]) return null
  const toVars: Vars = { ...defaults, ...vars }
  if (method === 'fromTo') return gsap.fromTo(list.length === 1 ? list[0] : list, fromVars ?? {}, toVars)
  return method === 'from' ? gsap.from(list as any, toVars) : gsap.to(list as any, toVars)
}

function instantiateCore(el: Element, spec: TweenSpec, ctx: BuildContext): gsap.core.Tween | null {
  return createTween(el, spec.method, spec.vars, spec.fromVars, ctx.defaults)
}

function instantiatePlugin(el: Element, spec: PluginTween, ctx: BuildContext): gsap.core.Tween | null {
  const targets = targetsFor(el, spec.target, ctx)
  if (!targets.length) return null
  if (spec.method === 'fromTo') {
    const pair = spec.vars as [Vars, Vars]
    return createTween(targets, 'fromTo', pair[1], pair[0], ctx.defaults)
  }
  return createTween(targets, spec.method, spec.vars as Vars, undefined, ctx.defaults)
}

function timelineVars(attrs: AttrMap): Vars {
  const raw = attrs.timeline?.value
  const vars: Vars = isPlainObject(raw) ? { ...raw } : {}
  delete vars.stagger
  return vars
}

function staggerEach(attrs: AttrMap | undefined, count: number): number | null {
  const raw = attrs?.timeline?.value
  if (!isPlainObject(raw)) return null
  const stagger = raw.stagger
  if (typeof stagger === 'number') return stagger
  if (isPlainObject(stagger)) {
    if (typeof stagger.each === 'number') return stagger.each
    if (typeof stagger.amount === 'number') return count > 1 ? stagger.amount / (count - 1) : 0
  }
  return null
}

function positionFor(
  el: Element,
  seq: boolean,
  index: number,
  each: number | null,
  ctx: BuildContext,
): string | number {
  const at = ctx.scan.attrs.get(el)?.at?.value
  if (!seq) {
    if (at === undefined) return 0
    if (typeof at === 'number') return at
    ctx.warn.warn('W006', el, `并行容器不支持相对位置 ${JSON.stringify(at)}，已忽略`, 'at')
    return 0
  }
  if (at !== undefined) return at as string | number
  if (index === 0) return 0
  return each != null ? `<${each}` : '>'
}

function isLabelPosition(pos: string): boolean {
  return !/^[<>=+\-.\d]/.test(pos)
}

function addChild(
  parent: gsap.core.Timeline,
  node: gsap.core.Animation,
  pos: string | number,
  child: Element,
  ctx: BuildContext,
): void {
  let position: string | number = pos
  if (typeof position === 'string' && isLabelPosition(position)) {
    const labels = (parent as unknown as { labels: Record<string, number> }).labels
    if (!(position in labels)) {
      ctx.warn.warn('W010', child, `at 引用了不存在的 label "${position}"，回退到末尾`, 'at')
      position = '>'
    }
  }
  parent.add(node as never, position as never)
  if (child.id) parent.addLabel(child.id, node.startTime())
}

function buildChildrenInto(
  node: gsap.core.Timeline,
  kids: Element[],
  seq: boolean,
  attrs: AttrMap | undefined,
  ctx: BuildContext,
): number {
  const each = seq ? staggerEach(attrs, kids.length) : null
  let added = 0
  for (const child of kids) {
    const built = buildElement(child, ctx)
    if (!built) continue
    if (built.detached) {
      // 适配器接管了这棵子树，不占父时间轴
      continue
    }
    addChild(node, built.node, positionFor(child, seq, added, each, ctx), child, ctx)
    added++
  }
  return added
}

function buildElement(el: Element, ctx: BuildContext): BuiltNode | null {
  const attrs = ctx.scan.attrs.get(el)
  const kids = childElements(el)

  // 没有自身属性的容器，仍然要往下走：子元素可能带属性
  if (!attrs) {
    if (!kids.length) return null
    const node = gsap.timeline()
    const added = buildChildrenInto(node, kids, false, undefined, ctx)
    return added ? { node, detached: false } : null
  }

  const owner = findOwner(el, attrs, ctx)
  const nested = owner ? ctx.ownedDepth > 0 : false
  if (owner) ctx.ownedDepth++

  const skipOwn = ctx.scan.broken.has(el)
  const coreSpecs = skipOwn ? [] : mergeAttrs(attrs, ctx.warn, el)
  const pluginTweens = skipOwn ? [] : resolvePluginTweens(el, attrs, ctx)
  const seq = 'timeline' in attrs
  const total = coreSpecs.length + pluginTweens.length

  let node: gsap.core.Animation | null = null
  if (!seq && kids.length === 0 && total === 1) {
    node = coreSpecs.length
      ? instantiateCore(el, coreSpecs[0] as TweenSpec, ctx)
      : instantiatePlugin(el, pluginTweens[0] as PluginTween, ctx)
  } else if (seq || kids.length > 0 || total > 1) {
    const tl = gsap.timeline(timelineVars(attrs))
    for (const spec of coreSpecs) {
      const tween = instantiateCore(el, spec, ctx)
      if (tween) tl.add(tween, 0)
    }
    for (const spec of pluginTweens) {
      const tween = instantiatePlugin(el, spec, ctx)
      if (tween) tl.add(tween, 0)
    }
    buildChildrenInto(tl, kids, seq, attrs, ctx)
    if (el.id) ctx.timelines[el.id] = tl
    node = tl
  }

  if (owner) ctx.ownedDepth--
  if (!node) return null

  if (owner) {
    const handled = tryMount(owner, node, el, attrs, nested, ctx)
    if (handled) return { node, detached: true }
  }
  return { node, detached: false }
}

/** 构建整棵 step 树，root 自己是 master timeline */
export function buildTree(root: Element, ctx: BuildContext, masterVars: Vars): gsap.core.Timeline {
  const master = gsap.timeline({ ...masterVars })
  const attrs = ctx.scan.attrs.get(root)

  if (attrs) {
    const skipOwn = ctx.scan.broken.has(root)
    if (!skipOwn) {
      for (const spec of mergeAttrs(attrs, ctx.warn, root)) {
        const tween = instantiateCore(root, spec, ctx)
        if (tween) master.add(tween, 0)
      }
      for (const spec of resolvePluginTweens(root, attrs, ctx)) {
        const tween = instantiatePlugin(root, spec, ctx)
        if (tween) master.add(tween, 0)
      }
    }
    if (root.id) ctx.timelines[root.id] = master
  }

  const seq = !!attrs && 'timeline' in attrs
  const kids = childElements(root)
  buildChildrenInto(master, kids, seq, attrs, ctx)

  return master
}
