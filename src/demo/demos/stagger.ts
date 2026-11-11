import type { Demo } from './types'

const cells = Array.from({ length: 9 }, (_, index) => {
  const label = String(index + 1).padStart(2, '0')
  return `    <div class="item" from="{opacity:0, y:36}">${label}</div>`
}).join('\n')

export const staggerDemo: Demo = {
  id: 'stagger',
  title: 'Stagger 阶梯',
  description: 'timeline 上的 stagger 糖：子 step 自动按固定间隔追加，不用手写一堆 at。',
  tags: ['timeline', 'stagger'],
  files: {
    html: `<div id="stage" timeline="{stagger:0.06}" config="{defaults:{duration:0.6, ease:'power2.out'}}">
  <h2 class="title" from="{opacity:0, x:-24}">Stagger</h2>
${cells}
</div>`,
    css: `#stage { min-height:100vh; display:grid; grid-template-columns:repeat(3, 108px); grid-auto-rows:70px; gap:10px; align-content:center; justify-content:center; padding:24px; }
.title { grid-column:1 / -1; margin:0 0 6px; font-size:24px; letter-spacing:-0.02em; }
.item { display:grid; place-items:center; border-radius:12px; border:1px solid #263140; background:linear-gradient(160deg,#182230,#0e1319); color:#88ce02; font:12px ui-monospace,monospace; }`,
    js: `const gs = new GsapRender('#stage')
gs.play()`,
  },
}
