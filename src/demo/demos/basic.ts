import type { Demo } from './types'

export const basic: Demo = {
  id: 'basic',
  title: '基础补间',
  description: 'from / to / from-to 三种写法；from 和 to 分开写会自动合并成 fromTo。',
  tags: ['from', 'to', 'from-to'],
  files: {
    html: `<div id="stage" timeline config="{paused:true, defaults:{duration:0.8, ease:'power3.out'}}">
  <p class="eyebrow" from="{opacity:0, y:-12}">GSAP RENDER</p>
  <h1 class="title" from="{opacity:0, y:-48}">Hello, GSAP Render</h1>
  <p class="lead" from="{opacity:0, y:24}" at="<0.1">在 HTML 里声明动画，交给 GSAP 执行。</p>

  <div class="row" timeline="{stagger:0.08}">
    <div class="card" from="{opacity:0, scale:0.7}">from</div>
    <div class="card" from="{opacity:0, scale:0.7}">from</div>
    <div class="card" from="{opacity:0, scale:0.7}">from</div>
  </div>

  <div class="bar" from-to="[{x:-180, opacity:0}, {x:0, opacity:1}]">from-to</div>
</div>`,
    css: `#stage { min-height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:22px; padding:48px 24px; text-align:center; }
.eyebrow { margin:0; font:600 11px/1 ui-monospace,monospace; letter-spacing:0.3em; color:#88ce02; }
.title { margin:0; font-size:46px; letter-spacing:-0.03em; }
.lead { margin:0; color:#9aa4b2; }
.row { display:flex; gap:16px; margin-top:8px; }
.card { width:118px; height:84px; display:grid; place-items:center; border-radius:14px; border:1px solid #263140; background:linear-gradient(160deg,#1b2430,#11161d); color:#88ce02; font:12px ui-monospace,monospace; }
.bar { width:320px; height:46px; display:grid; place-items:center; border-radius:10px; background:#88ce02; color:#0b1206; font-weight:600; }`,
    js: `const gs = new GsapRender('#stage')
gs.play()`,
  },
}
