import type { Demo } from './types'

export const scrollDemo: Demo = {
  id: 'scroll',
  title: 'ScrollTrigger',
  description: 'scroll 只描述“什么时候播”，from / to / timeline 继续描述“动什么”。',
  tags: ['scroll', 'scrub', 'pin'],
  fullPreview: true,
  files: {
    html: `<div id="stage">
  <section class="hero">
    <p class="eyebrow">SCROLLTRIGGER</p>
    <h1>Scroll to explore</h1>
    <p class="muted">向下滚动：入场 → scrub → pin → stagger</p>
    <p class="hint">在预览区域里滚动鼠标滚轮</p>
  </section>

  <section class="panel" scroll="{start:'top 80%'}" from="{opacity:0, y:40}">
    <span class="tag">01 · enter</span>
    <h2>进入视口播一次</h2>
    <p>没有 scrub 时由 toggleActions 控制，默认 play none none none。</p>
  </section>

  <section class="panel" scroll="{scrub:true, start:'top top', end:'+=90%'}" timeline>
    <span class="tag">02 · scrub</span>
    <h2 from="{opacity:0, y:-24}">滚动进度 = 时间轴进度</h2>
    <div class="bar"><i from="{scaleX:0}"></i></div>
    <p from="{opacity:0, y:20}" at="<0.2">滚多少，动画就走多少。</p>
  </section>

  <section class="pin" scroll="{pin:true, scrub:1, start:'top top', end:'+=150%'}" timeline>
    <span class="tag">03 · pin</span>
    <h2 from="{opacity:0, y:20}">Pinned section</h2>
    <div class="ring" from="{scale:0.2, rotation:-120, opacity:0}"></div>
  </section>

  <section class="panel" scroll="{scrub:true, start:'top 80%', end:'bottom 40%'}" timeline>
    <span class="tag">04 · stagger</span>
    <h2 from="{opacity:0, y:20}">跟着滚动出现的卡片</h2>
    <div class="grid" timeline="{stagger:0.06}">
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
.bar { margin:22px 0; height:6px; width:min(520px, 80%); border-radius:999px; background:#1b2430; overflow:hidden; }
.bar i { display:block; height:100%; width:100%; background:#88ce02; transform-origin:left center; }
.pin { align-items:center; text-align:center; }
.ring { width:200px; height:200px; margin-top:26px; border-radius:50%; border:2px solid #88ce02; box-shadow:0 0 60px rgba(136,206,2,0.3); }
.grid { display:grid; grid-template-columns:repeat(3, 140px); gap:14px; margin-top:24px; }
.card { height:88px; display:grid; place-items:center; border-radius:14px; border:1px solid #263140; background:linear-gradient(160deg,#182230,#0e1319); color:#88ce02; font:13px ui-monospace,monospace; }
.outro { align-items:center; min-height:60vh; color:#64748b; font:11px ui-monospace,monospace; letter-spacing:0.3em; }`,
    js: `// 把 debug 改成 true，可以看到 ScrollTrigger 的 start/end markers
const gs = new GsapRender('#stage')`,
  },
}
