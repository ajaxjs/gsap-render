import { gsap as importedGsap } from 'gsap'

type GsapInstance = typeof importedGsap

let override: GsapInstance | null = null

/** 显式指定 GSAP 实例（iframe / 多副本 / 延迟加载时用） */
export function configureGsap(instance: GsapInstance | null): void {
  override = instance
}

/**
 * 解析当前生效的 GSAP：
 *   显式注入 → 模块导入（bundled / external）→ 全局 window.gsap
 * UMD 构建里 `gsap` 被 external 成 `window.gsap`，所以这里同时覆盖了 CDN 场景。
 */
export function getGsap(): GsapInstance {
  const instance =
    override ??
    importedGsap ??
    (globalThis as unknown as { gsap?: GsapInstance }).gsap
  if (!instance) {
    throw new Error(
      '[gsap-render] 没有找到 GSAP。请先用 <script> 引入 gsap，或调用 GsapRender.configure({ gsap })',
    )
  }
  return instance
}

/** 延迟绑定的 gsap 代理，调用时才解析实例 */
export const gsap = new Proxy({} as GsapInstance, {
  get(_target, prop, receiver) {
    const instance = getGsap()
    const value = Reflect.get(instance as object, prop, receiver)
    return typeof value === 'function' ? value.bind(instance) : value
  },
})
