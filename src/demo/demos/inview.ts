import type { Demo } from './types'

export const inViewDemo: Demo = {
  id: 'in-view',
  title: 'InView 入场',
  description: '零依赖的 IntersectionObserver 入场：进入播一次，离开可选反向。',
  tags: ['in-view', 'observer'],
  fullPreview: true,
  files: {
    html: `<div id="stage">
  <section class="hero">
    <p class="eyebrow">INTERSECTION OBSERVER</p>
    <h1>in-view</h1>
    <p class="muted">零依赖入场：进入视口播一次，离开可选反向。</p>
    <p class="hint">在预览区域里滚动鼠标滚轮</p>
  </section>

  <section class="panel" in-view from="{opacity:0, y:40}">
    <span class="tag">01 · once</span>
    <h2>进入视口播一次</h2>
    <p>默认 once:true，播完就 unobserve，滚回来不会重播。</p>
  </section>

  <section class="panel" in-view="{once:false, reverse:true}" from="{opacity:0, x:-60}">
    <span class="tag">02 · reverse</span>
    <h2>离开时反向</h2>
    <p>once:false + reverse:true：滚回去会回到起点。</p>
  </section>

  <section class="panel" in-view="{rootMargin:'0px 0px -20% 0px'}" timeline>
    <span class="tag">03 · timeline</span>
    <h2 from="{opacity:0, y:20}">子树照常串行</h2>
    <div class="grid" timeline="{stagger:0.08}">
      <div class="card" from="{opacity:0, y:40}">01</div>
      <div class="card" from="{opacity:0, y:40}">02</div>
      <div class="card" from="{opacity:0, y:40}">03</div>
      <div class="card" from="{opacity:0, y:40}">04</div>
      <div class="card" from="{opacity:0, y:40}">05</div>
      <div class="card" from="{opacity:0, y:40}">06</div>
    </div>
  </section>

  <section class="outro"><p>end</p></section>
</div>`,
    css: `#stage { color:#e7e9ee; }
section { min-height:100vh; display:flex; flex-direction:column; justify-content:center; padding:56px 64px; }
.hero { align-items:flex-start; gap:14px; }
.eyebrow { margin:0; font:600 11px/1 ui-monospace,monospace; letter-spacing:0.3em; color:#88ce02; }
.hero h1 { margin:0; font-size:56px; letter-spacing:-0.04em; }
.muted { margin:0; color:#9aa4b2; }
.hint { margin:18px 0 0; font:11px ui-monospace,monospace; color:#64748b; }
.tag { font:600 10px/1 ui-monospace,monospace; letter-spacing:0.2em; color:#88ce02; text-transform:uppercase; }
h2 { margin:14px 0 10px; font-size:32px; letter-spacing:-0.02em; }
.panel p { margin:0; color:#9aa4b2; }
.grid { display:grid; grid-template-columns:repeat(3, 140px); gap:14px; margin-top:24px; }
.card { height:88px; display:grid; place-items:center; border-radius:14px; border:1px solid #263140; background:linear-gradient(160deg,#182230,#0e1319); color:#88ce02; font:13px ui-monospace,monospace; }
.outro { align-items:center; min-height:60vh; color:#64748b; font:11px ui-monospace,monospace; letter-spacing:0.3em; }`,
    js: `const gs = new GsapRender('#stage')`,
  },
}
