import { a as e, t } from "./chunks/parse-B6ioEZoO.js";
import { n } from "./chunks/merge-CMI9kl--.js";
import * as r from "gsap/SplitText";
// src/lib/plugins/split-text.ts
var i = r.default ?? r.SplitText ?? r, a = [
	"lines",
	"words",
	"chars"
], o = ["split", "split-options"];
for (let e of a) o.push(`split-${e}-from`, `split-${e}-to`, `split-${e}-from-to`);
var s = [
	"type",
	"autoSplit",
	"onSplit",
	"onRevert"
], c = {
	id: "split-text",
	attrs: o,
	raw: ["split"],
	requires: ["SplitText"],
	create() {
		e.registerPlugin(i);
		let r = /* @__PURE__ */ new Map();
		return {
			resolve(e) {
				let o = e.el, c = { warn: (t, n, r, i) => e.warn(t, r, i) }, l = (typeof e.attrs.split == "string" ? e.attrs.split : "").split(/[\s,]+/).filter(Boolean), u = /* @__PURE__ */ new Set();
				for (let t of l) a.includes(t) ? u.add(t) : e.warn("W101", `未知的分割类型 "${t}"，可用 lines / words / chars`, "split");
				let d = [];
				for (let t of a) {
					let r = e.attrs[`split-${t}-from`], i = e.attrs[`split-${t}-to`], a = e.attrs[`split-${t}-from-to`];
					(r !== void 0 || i !== void 0 || a !== void 0) && (l.includes(t) || e.warn("W102", `检测到 split-${t}-*，自动启用 ${t} 分割`, `split-${t}`), u.add(t), d.push({
						type: t,
						specs: n(r, i, a, o, `split-${t}`, c)
					}));
				}
				if (!u.size) {
					if (!("split" in e.attrs)) return;
					u.add("lines"), u.add("words"), u.add("chars");
				}
				let f = t(e.attrs["split-options"]) ? { ...e.attrs["split-options"] } : {};
				for (let t of s) t in f && (e.warn("W103", `split-options 里不允许写 "${t}"，已忽略`, "split-options"), delete f[t]);
				let p = a.filter((e) => u.has(e)), m = {
					aria: "auto",
					deepSlice: !0,
					autoSplit: !0,
					...f,
					type: p.join(",")
				};
				p.length === 1 && p[0] === "chars" && !("smartWrap" in f) && (m.smartWrap = !0), o.setAttribute("data-gsap-split", ""), o.setAttribute("data-gsap-pending", "");
				let h, g = !0;
				try {
					h = i.create(o, {
						...m,
						onSplit: () => {
							g ? g = !1 : o.dispatchEvent(new CustomEvent("gsap-render:resplit", { bubbles: !0 }));
						}
					});
				} catch (t) {
					e.warn("W104", `SplitText 初始化失败：${t.message}`, "split"), o.removeAttribute("data-gsap-pending");
					return;
				}
				r.set(o, h), e.symbols.set(o, {
					lines: h.lines,
					words: h.words,
					chars: h.chars
				});
				for (let t of d) if (!(t.type === "lines" ? h.lines : t.type === "words" ? h.words : h.chars).length) e.warn("W104", `没有分割出任何 ${t.type}，跳过该 phase`, `split-${t.type}`);
				else for (let n of t.specs) n.method === "fromTo" ? e.add(`@${t.type}`, "fromTo", [n.fromVars ?? {}, n.vars]) : e.add(`@${t.type}`, n.method, n.vars);
				typeof requestAnimationFrame == "function" ? requestAnimationFrame(() => o.removeAttribute("data-gsap-pending")) : o.removeAttribute("data-gsap-pending");
			},
			destroy() {
				for (let [e, t] of r) {
					try {
						t.kill?.();
					} catch {}
					try {
						t.revert();
					} catch {}
					e.removeAttribute("data-gsap-split"), e.removeAttribute("data-gsap-pending");
				}
				r.clear();
			}
		};
	}
};
export { c as SplitTextRender, c as default };
