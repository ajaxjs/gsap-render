import type { Demo } from './types'

export const prefixDemo: Demo = {
  id: 'prefix',
  title: '双前缀与警告',
  description: 'data-gsap-* 与裸属性都支持；同时存在时前缀优先，并输出 W009 警告。',
  tags: ['prefix', 'debug'],
  files: {
    html: `<div id="stage" timeline config="{defaults:{duration:0.7, ease:'power2.out'}}">
  <h1 class="title" data-gsap-from="{opacity:0, y:-30}">前缀写法</h1>

  <p class="lead" data-gsap-from="{opacity:0}" data-gsap-to="{opacity:1}" at="<0.15">
    data-gsap-* 与裸属性等价，同时存在时以 data-gsap-* 为准。
  </p>

  <div class="chip" from="{opacity:0, x:-40}" data-gsap-from="{opacity:1, x:0}">
    同时写了 from 和 data-gsap-from
  </div>

  <p class="hint">打开控制台可以看到 W009 警告（debug 已开启）。</p>
</div>`,
    css: `#stage { min-height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:20px; padding:48px; text-align:center; }
.title { margin:0; font-size:44px; letter-spacing:-0.03em; }
.lead { margin:0; max-width:520px; color:#9aa4b2; }
.chip { padding:10px 18px; border-radius:999px; border:1px solid #88ce02; color:#88ce02; font:12px ui-monospace,monospace; }
.hint { margin:12px 0 0; font:11px ui-monospace,monospace; color:#64748b; }`,
    js: `const gs = new GsapRender('#stage', { debug: true })
gs.play()`,
  },
}
