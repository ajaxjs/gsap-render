import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { GsapRender } from '@/lib'
import { InViewRender } from '@/lib/in-view'
import { ScrollTriggerRender } from '@/lib/scroll-trigger'
import { SplitTextRender } from '@/lib/split-text'

gsap.registerPlugin(ScrollTrigger, SplitText)
GsapRender.register(SplitTextRender)
GsapRender.register(ScrollTriggerRender)
GsapRender.register(InViewRender)

const MOUNT_ID = 'mount'

/** 记录本次运行创建的实例，重新运行前统一销毁，避免旧补间继续跑 */
const instances = new Set<GsapRender>()

class TrackedGsapRender extends GsapRender {
  constructor(target: string | Element, options?: ConstructorParameters<typeof GsapRender>[1]) {
    super(target, options)
    instances.add(this)
  }
}

const BASE_CSS = `
*, *::before, *::after { box-sizing: border-box; }
html { color-scheme: dark; }
body {
  margin: 0;
  min-height: 100vh;
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  background: #0b0d10;
  color: #e7e9ee;
}
.__err-box {
  position: fixed; inset: auto 0 0 0; margin: 0; padding: 12px 16px;
  background: #2b0f12; color: #ffb4b4; border-top: 1px solid #5b1d24;
  font: 12px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace;
  white-space: pre-wrap; max-height: 50vh; overflow: auto; z-index: 999;
}
`

interface Payload {
  html: string
  css: string
  js: string
}

function showError(error: unknown): void {
  let box = document.querySelector<HTMLPreElement>('.__err-box')
  if (!box) {
    box = document.createElement('pre')
    box.className = '__err-box'
    document.body.appendChild(box)
  }
  const value = error as { stack?: string; message?: string }
  box.textContent = String(value?.stack || value?.message || error)
}

function reset(): void {
  for (const instance of instances) {
    try {
      instance.destroy()
    } catch {
      /* ignore */
    }
  }
  instances.clear()

  document.querySelectorAll('style[data-demo]').forEach((node) => node.remove())
  document.querySelectorAll('.__err-box').forEach((node) => node.remove())
  const mount = document.getElementById(MOUNT_ID)
  if (mount) mount.innerHTML = ''
  window.scrollTo(0, 0)
}

function run(payload: Payload): void {
  reset()

  const style = document.createElement('style')
  style.dataset.demo = '1'
  style.textContent = BASE_CSS + payload.css
  document.head.appendChild(style)

  const mount = document.getElementById(MOUNT_ID)
  if (mount) mount.innerHTML = payload.html

  Object.assign(window, {
    gsap,
    ScrollTrigger,
    SplitText,
    GsapRender: TrackedGsapRender,
    SplitTextRender,
    ScrollTriggerRender,
    InViewRender,
  })

  try {
    const factory = new Function('"use strict"; return (async () => {\n' + payload.js + '\n})()')
    const result = factory() as Promise<unknown>
    result?.catch?.(showError)
  } catch (error) {
    showError(error)
  }
}

window.addEventListener('error', (event) => showError(event.error || event.message))

window.addEventListener('message', (event) => {
  if (event.origin !== window.location.origin) return
  const data = event.data as { type?: string; payload?: Payload }
  if (data?.type === 'demo:ping') {
    window.parent.postMessage({ type: 'demo:ready' }, window.location.origin)
    return
  }
  if (data?.type !== 'demo:run' || !data.payload) return
  run(data.payload)
})

window.parent.postMessage({ type: 'demo:ready' }, window.location.origin)
