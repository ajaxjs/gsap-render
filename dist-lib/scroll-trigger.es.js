import { a as e, t } from "./chunks/parse-B6ioEZoO.js";
import * as n from "gsap/ScrollTrigger";
// src/lib/plugins/scroll-trigger.ts
var r = n.default ?? n.ScrollTrigger ?? n, i = /* @__PURE__ */ new Set([
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
function a(e) {
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
function o(e) {
	let n = e.attrs.scroll;
	if (!t(n)) return e.warn("W205", "scroll 必须是对象，已跳过", "scroll"), null;
	let r = {};
	for (let [t, a] of Object.entries(n)) i.has(t) ? r[t] = a : e.warn("W205", `未知的 ScrollTrigger 配置 "${t}"，已忽略`, "scroll");
	if (r.trigger === void 0) r.trigger = e.el;
	else if (typeof r.trigger == "string") {
		if (r.trigger === "self") r.trigger = e.el;
		else {
			let t = e.root.querySelector(r.trigger);
			t ? r.trigger = t : (e.warn("W205", `trigger 选择器找不到元素 "${r.trigger}"，回退到自身`, "scroll"), r.trigger = e.el);
		}
	}
	r.scrub !== void 0 && typeof r.scrub != "boolean" && typeof r.scrub != "number" && (e.warn("W205", "scrub 只能是 true/false 或数字，已忽略", "scroll"), delete r.scrub), r.scrub && r.toggleActions && (e.warn("W203", "scrub 模式下 toggleActions 不生效，已忽略", "scroll"), delete r.toggleActions), r.snap !== void 0 && typeof r.snap != "number" && !Array.isArray(r.snap) && (e.warn("W205", "snap 只能是数字或数组，已忽略", "scroll"), delete r.snap);
	for (let t of [
		"pin",
		"pinSpacing",
		"once",
		"horizontal",
		"invalidateOnRefresh",
		"fastScrollEnd"
	]) r[t] !== void 0 && typeof r[t] != "boolean" && (e.warn("W205", `${t} 必须是布尔值，已忽略`, "scroll"), delete r[t]);
	if (r.markers === void 0 && (r.markers = e.debug), r.scroller === void 0) {
		let t = e.el.ownerDocument.defaultView;
		t && (r.scroller = t);
	} else if (typeof r.scroller == "string" && r.scroller !== "window") {
		let t = e.root.querySelector(r.scroller);
		t ? r.scroller = t : (e.warn("W205", `scroller 选择器找不到元素 "${r.scroller}"，回退到默认 window`, "scroll"), delete r.scroller);
	}
	return r.pin && a(e), r;
}
var s = {
	id: "scroll-trigger",
	attrs: ["scroll"],
	owns: ["scroll"],
	priority: 10,
	requires: ["ScrollTrigger"],
	create() {
		e.registerPlugin(r);
		let t = [], n = !1, i = !1, a = () => {
			n || (n = !0, (typeof window < "u" && typeof window.requestAnimationFrame == "function" ? window.requestAnimationFrame.bind(window) : (e) => setTimeout(() => e(0), 16))(() => {
				n = !1, r.refresh();
			}));
		}, s = () => {
			if (i) return;
			i = !0;
			let e = typeof document < "u" ? document.fonts : void 0;
			e?.ready && e.ready.then(() => a()).catch(() => void 0);
		};
		return {
			resolve(e) {
				e.el === e.root && e.attrs.scroll !== void 0 && e.warn("W208", "根元素不支持 scroll，请把 scroll 放到内部内容容器上", "scroll");
			},
			mount(n) {
				let r = o(n);
				if (!r) return !1;
				n.nested && n.warn("W202", "scroll 嵌套在另一个 scroll 内部，内层独立触发", "scroll"), "at" in n.attrs && n.warn("W201", "scroll 节点不参与父时间轴，at 已忽略", "at"), n.node.paused() && (n.warn("W204", "scroll 节点不接受 paused，已由滚动接管", "scroll"), n.node.paused(!1));
				let i = e.timeline({ scrollTrigger: r });
				return i.add(n.node, 0), i.scrollTrigger && t.push(i.scrollTrigger), n.el.id && (n.timelines[n.el.id] = i), s(), a(), !0;
			},
			refresh() {
				a();
			},
			layout() {
				a();
			},
			destroy() {
				for (let e of t) e.kill();
				t.length = 0, a();
			}
		};
	}
};
export { s as ScrollTriggerRender, s as default };
