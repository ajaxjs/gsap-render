import type { Demo } from './types'

export const interactionDemo: Demo = {
  id: 'interaction',
  title: '交互',
  description: 'hover / press 是可逆状态（默认 100ms），click 一次性；支持重放与多动作委托。',
  tags: ['hover', 'press', 'click', 'fire'],
  files: {
    html: `<div id="stage">
  <header class="hero">
    <p class="eyebrow">INTERACTIONS</p>
    <h1>hover · press · click</h1>
    <p class="muted">状态可逆、点击可回弹；下方演示重放、多动作与 show/hide。</p>
  </header>

  <div class="cards">
    <button class="card" hover="{scale:1.06, boxShadow:'0 18px 50px rgba(0,0,0,.55)'}" press="{scale:0.97}">
      Card A
    </button>
    <button class="card" hover="{rotate:3, y:-6}" press="{rotate:0, y:0}">
      Card B
    </button>
    <button class="card" click="[{scale:1.15,duration:0.12},{scale:1,duration:0.34,ease:'back.out(2)'}]">
      Card C · click
    </button>
  </div>

  <div class="row">
    <button class="btn" click-fire="['#dialog','show']">打开对话框</button>
    <button class="btn" click-fire="['#dialog','toggle']">toggle</button>
    <button class="btn" click-fire="['.path','to']">再跑一次</button>
    <button class="btn" click-fire="[['.multi-a','to'],['.multi-b','to']]">同时触发两个</button>
  </div>

  <div class="multi">
    <div class="multi-a" to="[{x:80,duration:0.3},{x:0,duration:0.4}]">A</div>
    <div class="multi-b" to="[{y:-36,duration:0.3},{y:0,duration:0.4}]">B</div>
    <div class="path" to="[{x:140},{x:140,y:70},{x:0,y:70},{x:0,y:0}]"></div>
  </div>

  <div id="dialog" class="dialog hidden"
       show="{display:'flex', scale:1, opacity:1}"
       hide="{scale:0.9, opacity:0}">
    <div class="dialog-body">
      <p>show / hide 由 click-fire 触发</p>
      <button class="btn" click-fire="['#dialog','hide']">关闭</button>
    </div>
  </div>
</div>`,
    css: `#stage { min-height:100vh; display:flex; flex-direction:column; gap:18px; padding:28px 40px; }
.eyebrow { margin:0; font:600 11px/1 ui-monospace,monospace; letter-spacing:0.3em; color:#88ce02; }
h1 { margin:8px 0 4px; font-size:34px; letter-spacing:-0.03em; }
.muted { margin:0; color:#9aa4b2; font-size:13px; }
.cards { display:flex; gap:14px; }
.card { width:170px; height:96px; border-radius:16px; border:1px solid #263140; background:linear-gradient(160deg,#1a2431,#0e1319); color:#e7e9ee; font:12px ui-monospace,monospace; cursor:pointer; }
.row { display:flex; flex-wrap:wrap; gap:8px; }
.btn { padding:8px 14px; border-radius:9px; border:1px solid #2a3646; background:#141b24; color:#cfd7e3; font:12px ui-monospace,monospace; cursor:pointer; }
.btn:hover { border-color:#88ce02; }
.multi { display:flex; align-items:center; gap:14px; }
.multi-a, .multi-b { width:52px; height:52px; display:grid; place-items:center; border-radius:10px; background:#1b2430; border:1px solid #263140; color:#88ce02; font:12px ui-monospace,monospace; }
.path { width:52px; height:52px; border-radius:10px; background:#88ce02; }
.dialog { position:fixed; inset:0; align-items:center; justify-content:center; background:rgba(4,7,10,.55); }
.dialog.hidden { display:none; }
.dialog-body { display:flex; flex-direction:column; gap:14px; align-items:center; padding:26px 30px; border-radius:16px; border:1px solid #2a3646; background:#111820; color:#dfe6ef; }`,
    js: `const gs = new GsapRender('#stage')`,
  },
}
