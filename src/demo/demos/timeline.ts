import type { Demo } from './types'

export const timelineDemo: Demo = {
  id: 'timeline',
  title: '时间轴与嵌套',
  description: '父元素带 timeline 时子元素串行；嵌套时间轴可以有自己的 repeat。',
  tags: ['timeline', 'at', 'nesting'],
  files: {
    html: `<div id="stage" timeline config="{defaults:{duration:0.7, ease:'power2.out'}}">
  <section class="scene" timeline>
    <span class="tag">scene 01</span>
    <h2 from="{opacity:0, x:-70}">串行从这里开始</h2>
    <p from="{opacity:0, x:70}" at="<0.1">父元素有 timeline，子元素按 DOM 顺序依次追加。</p>
  </section>

  <section class="scene" timeline="{repeat:1}">
    <span class="tag">scene 02</span>
    <h2 from="{opacity:0, y:36}">嵌套 + 局部重复</h2>
    <p from="{opacity:0, y:36}" at="<0.1">这个子时间轴会播放两遍（repeat:1）。</p>
  </section>
</div>`,
    css: `#stage { min-height:100vh; display:flex; flex-direction:column; justify-content:center; gap:28px; padding:56px 40px; }
.scene { padding:28px 30px; border-radius:18px; border:1px solid #232d3a; background:linear-gradient(150deg,#141b24,#0d1117); }
.tag { font:600 10px/1 ui-monospace,monospace; letter-spacing:0.22em; color:#88ce02; text-transform:uppercase; }
.scene h2 { margin:12px 0 8px; font-size:26px; letter-spacing:-0.02em; }
.scene p { margin:0; color:#93a0b0; font-size:14px; }`,
    js: `const gs = new GsapRender('#stage')
gs.play()`,
  },
}
