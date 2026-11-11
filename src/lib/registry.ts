import type { PluginImpl, RenderPlugin } from './types'

export const RESERVED_ATTRS = new Set(['from', 'to', 'from-to', 'timeline', 'config', 'at'])

const registry = new Map<string, RenderPlugin>()

/**
 * 注册全局适配器；重复 id 后者覆盖。
 * requires 只作为元信息（核心用它判断是否需要等字体）：GSAP 不会把 SplitText 这类插件
 * 暴露到 gsap.plugins 上，无法在这里做运行时校验。
 */
export function registerPlugin(plugin: RenderPlugin): void {
  if (!plugin?.id) throw new Error('[gsap-render] E002 适配器缺少 id')
  for (const attr of plugin.attrs) {
    if (RESERVED_ATTRS.has(attr)) {
      throw new Error(`[gsap-render] E002 "${attr}" 是保留属性，不能被适配器 ${plugin.id} 认领`)
    }
  }
  registry.set(plugin.id, plugin)
}

export function registeredPlugins(): RenderPlugin[] {
  return Array.from(registry.values())
}

export function instantiate(plugin: RenderPlugin): PluginImpl {
  if (plugin.create) return plugin.create()
  return {
    resolve: (ctx) => plugin.resolve?.(ctx),
    destroy: () => plugin.destroy?.(),
  }
}
