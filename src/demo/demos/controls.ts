import type { Demo } from './types'

export const controlsDemo: Demo = {
  id: 'controls',
  title: '播放控制',
  description: 'config="{paused:true}" 后手动控制：play / pause / restart / progress。',
  tags: ['paused', 'playback'],
  files: {
    html: `<div id="stage" timeline config="{paused:true}">
  <p class="hint">paused:true —— 点击下面的 play 开始</p>

  <div class="orb" from-to="[{scale:0.25, opacity:0}, {scale:1, opacity:1, duration:1.4, ease:'elastic.out(1,0.55)'}]"></div>

  <div class="panel">
    <button data-act="play">play</button>
    <button data-act="pause">pause</button>
    <button data-act="restart">restart</button>
    <button data-act="seek">seek 50%</button>
  </div>
</div>`,
    css: `#stage { min-height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:30px; }
.hint { margin:0; font:11px ui-monospace,monospace; color:#64748b; letter-spacing:0.08em; }
.orb { width:180px; height:180px; border-radius:50%; background:radial-gradient(circle at 30% 25%, #d7ff6b, #88ce02 55%, #3f6b00); box-shadow:0 0 80px rgba(136,206,2,0.35); }
.panel { display:flex; flex-wrap:wrap; gap:8px; justify-content:center; }
.panel button { padding:8px 14px; border-radius:8px; border:1px solid #2a3646; background:#141b24; color:#cfd7e3; font:12px ui-monospace,monospace; cursor:pointer; }
.panel button:hover { border-color:#88ce02; color:#88ce02; }`,
    js: `const gs = new GsapRender('#stage', { debug: true })
const act = (name) => document.querySelector('[data-act="' + name + '"]')
act('play').addEventListener('click', () => gs.play())
act('pause').addEventListener('click', () => gs.pause())
act('restart').addEventListener('click', () => gs.restart())
act('seek').addEventListener('click', () => gs.progress(0.5))`,
  },
}
