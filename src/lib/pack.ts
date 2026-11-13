/**
 * 完整版单文件包：
 *   gsap + ScrollTrigger + SplitText + GsapRender + 全部内建适配器
 *   内置注册，引用后直接 new GsapRender(...)
 *
 * 构建为 dist-lib/gsap-pack.umd.js，全局名 GsapRender。
 */
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { GsapRender } from './index'
import { InViewRender } from './in-view'
import { ScrollTriggerRender } from './scroll-trigger'
import { SplitTextRender } from './split-text'

gsap.registerPlugin(ScrollTrigger, SplitText)

GsapRender.register(SplitTextRender)
GsapRender.register(ScrollTriggerRender)
GsapRender.register(InViewRender)

export default GsapRender
