import { a as e, t } from "./chunks/parse-B6ioEZoO.js";
import { ScrollTrigger as n } from "gsap/ScrollTrigger";
// src/lib/plugins/scroll-trigger.ts
var r = /* @__PURE__ */ new Set([
	"trigger",
	"scroller",
	"start",
	"end",
	"scrub",
	"pin",
	"pinSpacing",
	"snap",
	"toggleActions",
	"once",
	"markers",
	"horizontal",
	"invalidateOnRefresh",
	"anticipatePin",
	"fastScrollEnd"
]);
function i(e) {
	let t = e.el.ownerDocument.defaultView;
	if (!t) return;
	if (t.getComputedStyle(e.el).position === "fixed") {
		e.warn("W207", "pin 的元素是 position:fixed，钉住位置可能异常", "pin");
		return;
	}
	let n = e.el.parentElement;
	for (; n;) {
		if (t.getComputedStyle(n).transform !== "none") {
			e.warn("W207", "pin 元素的祖先带 transform，pin 位置可能异常", "pin");
			break;
		}
		n = n.parentElement;
	}
}
function a(e) {
	let n = e.attrs.scroll;
	if (!t(n)) return e.warn("W205", "scroll 必须是对象，已跳过", "scroll"), null;
	let a = {};
	for (let [t, i] of Object.entries(n)) r.has(t) ? a[t] = i : e.warn("W205", `未知的 ScrollTrigger 配置 "${t}"，已忽略`, "scroll");
	if (a.trigger === void 0) a.trigger = e.el;
	else if (typeof a.trigger == "string") {
		if (a.trigger === "self") a.trigger = e.el;
		else {
			let t = e.root.querySelector(a.trigger);
			t ? a.trigger = t : (e.warn("W205", `trigger 选择器找不到元素 "${a.trigger}"，回退到自身`, "scroll"), a.trigger = e.el);
		}
	}
	a.scrub !== void 0 && typeof a.scrub != "boolean" && typeof a.scrub != "number" && (e.warn("W205", "scrub 只能是 true/false 或数字，已忽略", "scroll"), delete a.scrub), a.scrub && a.toggleActions && (e.warn("W203", "scrub 模式下 toggleActions 不生效，已忽略", "scroll"), delete a.toggleActions), a.snap !== void 0 && typeof a.snap != "number" && !Array.isArray(a.snap) && (e.warn("W205", "snap 只能是数字或数组，已忽略", "scroll"), delete a.snap);
	for (let t of [
		"pin",
		"pinSpacing",
		"once",
		"horizontal",
		"invalidateOnRefresh",
		"fastScrollEnd"
	]) a[t] !== void 0 && typeof a[t] != "boolean" && (e.warn("W205", `${t} 必须是布尔值，已忽略`, "scroll"), delete a[t]);
	if (a.markers === void 0 && (a.markers = e.debug), a.scroller === void 0) {
		let t = e.el.ownerDocument.defaultView;
		t && (a.scroller = t);
	} else if (typeof a.scroller == "string" && a.scroller !== "window") {
		let t = e.root.querySelector(a.scroller);
		t ? a.scroller = t : (e.warn("W205", `scroller 选择器找不到元素 "${a.scroller}"，回退到默认 window`, "scroll"), delete a.scroller);
	}
	return a.pin && i(e), a;
}
var o = {
	id: "scroll-trigger",
	attrs: ["scroll"],
	owns: ["scroll"],
	priority: 10,
	requires: ["ScrollTrigger"],
	create() {
		e.registerPlugin(n);
		let t = [], r = !1, i = !1, o = () => {
			r || (r = !0, (typeof window < "u" && typeof window.requestAnimationFrame == "function" ? window.requestAnimationFrame.bind(window) : (e) => setTimeout(() => e(0), 16))(() => {
				r = !1, n.refresh();
			}));
		}, s = () => {
			if (i) return;
			i = !0;
			let e = typeof document < "u" ? document.fonts : void 0;
			e?.ready && e.ready.then(() => o()).catch(() => void 0);
		};
		return {
			resolve(e) {
				e.el === e.root && e.attrs.scroll !== void 0 && e.warn("W208", "根元素不支持 scroll，请把 scroll 放到内部内容容器上", "scroll");
			},
			mount(n) {
				let r = a(n);
				if (!r) return !1;
				n.nested && n.warn("W202", "scroll 嵌套在另一个 scroll 内部，内层独立触发", "scroll"), "at" in n.attrs && n.warn("W201", "scroll 节点不参与父时间轴，at 已忽略", "at"), n.node.paused() && (n.warn("W204", "scroll 节点不接受 paused，已由滚动接管", "scroll"), n.node.paused(!1));
				let i = e.timeline({ scrollTrigger: r });
				return i.add(n.node, 0), i.scrollTrigger && t.push(i.scrollTrigger), n.el.id && (n.timelines[n.el.id] = i), s(), o(), !0;
			},
			refresh() {
				o();
			},
			destroy() {
				for (let e of t) e.kill();
				t.length = 0, o();
			}
		};
	}
};
export { o as ScrollTriggerRender, o as default };
