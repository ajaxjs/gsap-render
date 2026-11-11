import { a as e, t } from "./chunks/parse-B6ioEZoO.js";
// src/lib/plugins/in-view.ts
var n = /* @__PURE__ */ new Set([
	"rootMargin",
	"threshold",
	"root",
	"once",
	"reverse"
]);
function r(e) {
	let r = e.attrs["in-view"];
	if (!t(r)) return e.warn("W304", "in-view 必须是对象，已跳过", "in-view"), null;
	let i = {
		rootMargin: "0px",
		threshold: 0,
		root: null,
		once: !0,
		reverse: !1
	};
	for (let [t, a] of Object.entries(r)) if (!n.has(t)) e.warn("W304", `未知的 in-view 配置 "${t}"，已忽略`, "in-view");
	else switch (t) {
		case "rootMargin":
			typeof a == "string" ? i.rootMargin = a : e.warn("W304", "rootMargin 必须是字符串，已忽略", "in-view");
			break;
		case "threshold":
			typeof a == "number" || Array.isArray(a) && a.every((e) => typeof e == "number") ? i.threshold = a : e.warn("W304", "threshold 必须是数字或数字数组，已忽略", "in-view");
			break;
		case "root":
			if (typeof a == "string") {
				let t = e.root.querySelector(a);
				t && t.contains(e.el) ? i.root = t : t ? e.warn("W304", `root "${a}" 不是触发元素的祖先，回退视口`, "in-view") : e.warn("W304", `root 选择器找不到元素 "${a}"，回退视口`, "in-view");
			} else e.warn("W304", "root 必须是选择器字符串，已忽略", "in-view");
			break;
		case "once":
			typeof a == "boolean" ? i.once = a : e.warn("W304", "once 必须是布尔值，已忽略", "in-view");
			break;
		case "reverse": typeof a == "boolean" ? i.reverse = a : e.warn("W304", "reverse 必须是布尔值，已忽略", "in-view");
	}
	return i;
}
var i = {
	id: "in-view",
	attrs: ["in-view"],
	owns: ["in-view"],
	create() {
		let t = /* @__PURE__ */ new Map(), n = /* @__PURE__ */ new Map(), i = /* @__PURE__ */ new WeakMap(), a = 0, o = (e) => {
			if (!e) return 0;
			let t = i.get(e);
			return t || (t = ++a, i.set(e, t)), t;
		}, s = (e) => {
			let r = `${o(e.root)}|${e.rootMargin}|${JSON.stringify(e.threshold)}`, i = t.get(r);
			if (i) return i;
			let a = new IntersectionObserver((e) => {
				for (let t of e) {
					let e = t.target, r = n.get(e);
					r && (t.isIntersecting ? (r.played = !0, r.once ? (r.timeline.play(), a.unobserve(e), n.delete(e)) : r.reverse ? r.timeline.play() : r.timeline.restart()) : !r.once && r.reverse && r.played && r.timeline.reverse());
				}
			}, {
				root: e.root,
				rootMargin: e.rootMargin,
				threshold: e.threshold
			});
			return t.set(r, a), a;
		};
		return {
			resolve(e) {
				e.el === e.root && e.attrs["in-view"] !== void 0 && e.warn("W306", "根元素不支持 in-view，请放到内部内容容器上", "in-view");
			},
			mount(t) {
				let i = r(t);
				if (!i) return !1;
				"at" in t.attrs && t.warn("W301", "in-view 节点不参与父时间轴，at 已忽略", "at"), t.nested && t.warn("W302", "in-view 嵌套在另一个接管节点内部，内层独立触发", "in-view"), t.node.paused() && (t.warn("W303", "节点的 paused 失效，由 in-view 接管播放", "in-view"), t.node.paused(!1));
				let a = e.timeline({ paused: !0 });
				return a.add(t.node, 0), t.el.id && (t.timelines[t.el.id] = a), typeof IntersectionObserver > "u" ? (t.warn("W305", "环境不支持 IntersectionObserver，直接播放", "in-view"), a.play(), !0) : (n.set(t.el, {
					timeline: a,
					once: i.once,
					reverse: i.reverse,
					played: !1
				}), s(i).observe(t.el), !0);
			},
			destroy() {
				for (let e of t.values()) e.disconnect();
				t.clear(), n.clear();
			}
		};
	}
};
export { i as InViewRender, i as default };
