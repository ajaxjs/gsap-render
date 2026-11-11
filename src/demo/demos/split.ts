import type { Demo } from './types'

export const splitDemo: Demo = {
  id: 'split',
  title: 'SplitText 适配器',
  description: '文本拆成行与字符后，用同一套属性驱动；核心不认识 SplitText。',
  tags: ['split', 'chars', 'lines'],
  files: {
    html: `<div id="stage" timeline config="{paused:true}">
  <p class="eyebrow" from="{opacity:0}">SPLITTEXT ADAPTER</p>

  <h1 class="title"
      split="lines chars"
      from="{opacity:0, y:-20}"
      split-chars-from="{x:120, opacity:0, stagger:0.016}">
    Declarative text animation
  </h1>

  <p class="copy"
     split="lines"
     split-lines-from="{y:18, opacity:0}"
     split-lines-to="{y:0, opacity:1, stagger:0.08}">
    文本先被拆成行与字符，再由同一套 from / to 驱动。切窗口改变换行时，autoSplit 会重新分割并重建动画。
  </p>
</div>`,
    css: `#stage { min-height:100vh; display:flex; flex-direction:column; justify-content:center; gap:24px; padding:56px 64px; max-width:960px; margin:0 auto; }
.eyebrow { margin:0; font:600 11px/1 ui-monospace,monospace; letter-spacing:0.3em; color:#88ce02; }
.title { margin:0; font-size:64px; line-height:1.04; letter-spacing:-0.04em; }
.copy { margin:0; max-width:640px; color:#9aa4b2; line-height:1.8; }`,
    js: `const gs = new GsapRender('#stage', { debug: true })
await gs.ready
gs.play()`,
  },
}
