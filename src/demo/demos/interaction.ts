import type { Demo } from './types'

export const interactionDemo: Demo = {
  id: 'interaction',
  title: '交互',
  description: 'hover / press 是可逆状态，click 是一次性；show/hide 通过 *-fire 委托触发。',
  tags: ['hover', 'press', 'click', 'fire'],
  files: {
    html: `<div id="stage">
  <header class="hero">
    <p class="eyebrow">INTERACTIONS</p>
    <h1>hover · press · click</h1>
    <p class="muted">状态可逆，点击可回弹；下面演示委托与 show/hide。</p>
  </header>

  <div class="cards">
    <button class="card"
            hover="{scale:1.06, boxShadow:'0 18px 50px rgba(0,0,0,.55)'}"
            press="{scale:0.97}"
            click="[{scale:1.09,duration:0.1},{scale:1,duration:0.28,ease:'back.out(2)'}]">
      Card A
    </button>
    <button class="card" hover="{rotate:3, y:-6}" press="{rotate:0, y:0}">Card B</button>
  </div>

  <div class="row">
    <button class="btn" click-fire="['#dialog','show']">打开对话框</button>
    <button class="btn" click-fire="['#dialog','toggle']">toggle</button>
  </div>

  <div id="dialog" class="dialog hidden"
       show="{display:'flex', scale:1, opacity:1}"
       hide="{scale:0.9, opacity:0}">
    <div class="dialog-body">
      <p>show / hide 由 click-fire 触发</p>
      <button class="btn" click-fire="['#dialog','hide']">关闭</button>
    </div>
  </div>

  <div class="path" to="[{x:140},{x:140,y:70},{x:0,y:70},{x:0,y:0}]"></div>
</div>`,
    css: `#stage { min-height:100vh; display:flex; flex-direction:column; gap:24px; padding:40px 48px; }
.eyebrow { margin:0; font:600 11px/1 ui-monospace,monospace; letter-spacing:0.3em; color:#88ce02; }
h1 { margin:10px 0 6px; font-size:40px; letter-spacing:-0.03em; }
.muted { margin:0; color:#9aa4b2; font-size:14px; }
.cards { display:flex; gap:16px; }
.card { width:180px; height:110px; border-radius:16px; border:1px solid #263140; background:linear-gradient(160deg,#1a2431,#0e1319); color:#e7e9ee; font:13px ui-monospace,monospace; cursor:pointer; }
.row { display:flex; gap:10px; }
.btn { padding:9px 16px; border-radius:9px; border:1px solid #2a3646; background:#141b24; color:#cfd7e3; font:12px ui-monospace,monospace; cursor:pointer; }
.btn:hover { border-color:#88ce02; }
.dialog { position:fixed; inset:0; align-items:center; justify-content:center; background:rgba(4,7,10,.55); }
.dialog.hidden { display:none; }
.dialog-body { display:flex; flex-direction:column; gap:14px; align-items:center; padding:28px 32px; border-radius:16px; border:1px solid #2a3646; background:#111820; color:#dfe6ef; }
.path { width:56px; height:56px; border-radius:12px; background:#88ce02; margin-top:8px; }`,
    js: `const gs = new GsapRender('#stage')`,
  },
}
