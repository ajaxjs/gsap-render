import { a as e, t } from "./chunks/parse-B6ioEZoO.js";
import { n } from "./chunks/merge-CMI9kl--.js";
import { SplitText as r } from "gsap/SplitText";
// src/lib/plugins/split-text.ts
var i = [
	"lines",
	"words",
	"chars"
], a = ["split", "split-options"];
for (let e of i) a.push(`split-${e}-from`, `split-${e}-to`, `split-${e}-from-to`);
var o = [
	"type",
	"autoSplit",
	"onSplit",
	"onRevert"
], s = {
	id: "split-text",
	attrs: a,
	raw: ["split"],
	requires: ["SplitText"],
	create() {
		e.registerPlugin(r);
		let a = /* @__PURE__ */ new Map();
		return {
			resolve(e) {
				let s = e.el, c = { warn: (t, n, r, i) => e.warn(t, r, i) }, l = (typeof e.attrs.split == "string" ? e.attrs.split : "").split(/[\s,]+/).filter(Boolean), u = /* @__PURE__ */ new Set();
				for (let t of l) i.includes(t) ? u.add(t) : e.warn("W101", `未知的分割类型 "${t}"，可用 lines / words / chars`, "split");
				let d = [];
				for (let t of i) {
					let r = e.attrs[`split-${t}-from`], i = e.attrs[`split-${t}-to`], a = e.attrs[`split-${t}-from-to`];
					(r !== void 0 || i !== void 0 || a !== void 0) && (l.includes(t) || e.warn("W102", `检测到 split-${t}-*，自动启用 ${t} 分割`, `split-${t}`), u.add(t), d.push({
						type: t,
						specs: n(r, i, a, s, `split-${t}`, c)
					}));
				}
				if (!u.size) {
					if (!("split" in e.attrs)) return;
					u.add("lines"), u.add("words"), u.add("chars");
				}
				let f = t(e.attrs["split-options"]) ? { ...e.attrs["split-options"] } : {};
				for (let t of o) t in f && (e.warn("W103", `split-options 里不允许写 "${t}"，已忽略`, "split-options"), delete f[t]);
				let p = i.filter((e) => u.has(e)), m = {
					aria: "auto",
					deepSlice: !0,
					autoSplit: !0,
					...f,
					type: p.join(",")
				};
				p.length === 1 && p[0] === "chars" && !("smartWrap" in f) && (m.smartWrap = !0), s.setAttribute("data-gsap-split", ""), s.setAttribute("data-gsap-pending", "");
				let h, g = !0;
				try {
					h = r.create(s, {
						...m,
						onSplit: () => {
							g ? g = !1 : s.dispatchEvent(new CustomEvent("gsap-render:resplit", { bubbles: !0 }));
						}
					});
				} catch (t) {
					e.warn("W104", `SplitText 初始化失败：${t.message}`, "split"), s.removeAttribute("data-gsap-pending");
					return;
				}
				a.set(s, h), e.symbols.set(s, {
					lines: h.lines,
					words: h.words,
					chars: h.chars
				});
				for (let t of d) if (!(t.type === "lines" ? h.lines : t.type === "words" ? h.words : h.chars).length) e.warn("W104", `没有分割出任何 ${t.type}，跳过该 phase`, `split-${t.type}`);
				else for (let n of t.specs) n.method === "fromTo" ? e.add(`@${t.type}`, "fromTo", [n.fromVars ?? {}, n.vars]) : e.add(`@${t.type}`, n.method, n.vars);
				typeof requestAnimationFrame == "function" ? requestAnimationFrame(() => s.removeAttribute("data-gsap-pending")) : s.removeAttribute("data-gsap-pending");
			},
			destroy() {
				for (let [e, t] of a) {
					try {
						t.kill?.();
					} catch {}
					try {
						t.revert();
					} catch {}
					e.removeAttribute("data-gsap-split"), e.removeAttribute("data-gsap-pending");
				}
				a.clear();
			}
		};
	}
};
export { s as SplitTextRender, s as default };
