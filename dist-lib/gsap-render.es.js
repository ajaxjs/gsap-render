import { a as e, i as t, n, r, t as i } from "./chunks/parse-B6ioEZoO.js";
import { r as a, t as o } from "./chunks/merge-CMI9kl--.js";
// src/lib/build.ts
var s = (e) => Array.from(e.children);
function c(e) {
	let t = {};
	for (let [n, r] of Object.entries(e)) t[n] = r.value;
	return t;
}
function l(e, t, n) {
	let r = [];
	for (let i of n.plugins) {
		if (!i.plugin.attrs.some((e) => e in t)) continue;
		let a = {
			el: e,
			root: n.root,
			attrs: c(t),
			symbols: n.symbols,
			add: (e, t, n) => r.push({
				target: e,
				method: t,
				vars: n
			}),
			warn: (t, r, i) => n.warn.warn(t, e, r, i)
		};
		try {
			i.impl.resolve(a);
		} catch (t) {
			n.warn.warn("W016", e, `适配器 ${i.plugin.id} 执行失败：${t.message}`, i.plugin.id);
		}
	}
	return r;
}
function u(e, t, n) {
	let r = n.plugins.filter((e) => e.plugin.owns?.some((e) => e in t));
	if (!r.length) return null;
	if (r.length === 1) return r[0];
	r.sort((e, t) => (t.plugin.priority ?? 0) - (e.plugin.priority ?? 0));
	let i = r[0], a = r.map((e) => e.plugin.id).join("、");
	return n.warn.warn("W017", e, `多个接管型适配器命中（${a}），使用 ${i.plugin.id}`, i.plugin.owns?.[0]), i;
}
function d(e, t, n, r, i, a) {
	let o = e.impl.mount;
	if (!o) return !1;
	try {
		return o({
			el: n,
			root: a.root,
			node: t,
			attrs: c(r),
			nested: i,
			debug: a.warn.enabled,
			timelines: a.timelines,
			warn: (e, t, r) => a.warn.warn(e, n, t, r)
		}) !== !1;
	} catch (t) {
		return a.warn.warn("W016", n, `适配器 ${e.plugin.id} 接管失败：${t.message}`, e.plugin.id), !1;
	}
}
function f(e, t, n) {
	return t === "self" ? [e] : t.startsWith("@") ? n.symbols.get(e)?.[t.slice(1)] ?? [] : Array.from(e.querySelectorAll(t));
}
function p(t, n, r, i, a) {
	let o = Array.isArray(t) ? t : [t];
	if (!o.length || !o[0]) return null;
	let s = {
		...a,
		...r
	};
	return n === "fromTo" ? e.fromTo(o.length === 1 ? o[0] : o, i ?? {}, s) : n === "from" ? e.from(o, s) : e.to(o, s);
}
function m(t, n, r) {
	if (n.steps?.length) {
		let i = e.timeline();
		for (let e of n.steps) i.to(t, {
			...r.defaults,
			...e
		});
		return i;
	}
	return p(t, n.method, n.vars, n.fromVars, r.defaults);
}
function h(e, t, n) {
	let r = f(e, t.target, n);
	if (!r.length) return null;
	if (t.method === "fromTo") {
		let e = t.vars;
		return p(r, "fromTo", e[1], e[0], n.defaults);
	}
	return p(r, t.method, t.vars, void 0, n.defaults);
}
function g(e) {
	let t = e.timeline?.value, n = i(t) ? { ...t } : {};
	return delete n.stagger, n;
}
function _(e, t) {
	let n = e?.timeline?.value;
	if (!i(n)) return null;
	let r = n.stagger;
	if (typeof r == "number") return r;
	if (i(r)) {
		if (typeof r.each == "number") return r.each;
		if (typeof r.amount == "number") return t > 1 ? r.amount / (t - 1) : 0;
	}
	return null;
}
function v(e, t, n, r, i) {
	let a = i.scan.attrs.get(e)?.at?.value;
	return t ? a === void 0 ? n === 0 ? 0 : r == null ? ">" : `<${r}` : a : a === void 0 ? 0 : typeof a == "number" ? a : (i.warn.warn("W006", e, `并行容器不支持相对位置 ${JSON.stringify(a)}，已忽略`, "at"), 0);
}
function y(e) {
	return !/^[<>=+\-.\d]/.test(e);
}
function b(e, t, n, r, i) {
	let a = n;
	if (typeof a == "string" && y(a)) {
		let t = e.labels;
		a in t || (i.warn.warn("W010", r, `at 引用了不存在的 label "${a}"，回退到末尾`, "at"), a = ">");
	}
	e.add(t, a), r.id && e.addLabel(r.id, t.startTime());
}
function x(e, t, n, r, i) {
	let a = n ? _(r, t.length) : null, o = 0;
	for (let r of t) {
		let t = S(r, i);
		t && (t.detached || (b(e, t.node, v(r, n, o, a, i), r, i), o++));
	}
	return o;
}
function S(t, n) {
	let r = n.scan.attrs.get(t), i = s(t);
	if (!r) {
		if (!i.length) return null;
		let t = e.timeline();
		return x(t, i, !1, void 0, n) ? {
			node: t,
			detached: !1
		} : null;
	}
	let a = u(t, r, n), c = a ? n.ownedDepth > 0 : !1;
	a && n.ownedDepth++;
	let f = n.scan.broken.has(t), p = f ? [] : o(r, n.warn, t), _ = f ? [] : l(t, r, n), v = "timeline" in r, y = p.length + _.length, b = null;
	if (!v && i.length === 0 && y === 1) b = p.length ? m(t, p[0], n) : h(t, _[0], n);
	else if (v || i.length > 0 || y > 1) {
		let a = e.timeline(g(r));
		for (let e of p) {
			let r = m(t, e, n);
			r && a.add(r, 0);
		}
		for (let e of _) {
			let r = h(t, e, n);
			r && a.add(r, 0);
		}
		x(a, i, v, r, n), t.id && (n.timelines[t.id] = a), b = a;
	}
	return a && n.ownedDepth--, b ? a && d(a, b, t, r, c, n) ? {
		node: b,
		detached: !0
	} : {
		node: b,
		detached: !1
	} : null;
}
function C(t, n, r) {
	let i = e.timeline({ ...r }), a = n.scan.attrs.get(t);
	if (a) {
		if (!n.scan.broken.has(t)) {
			for (let e of o(a, n.warn, t)) {
				let r = m(t, e, n);
				r && i.add(r, 0);
			}
			for (let e of l(t, a, n)) {
				let r = h(t, e, n);
				r && i.add(r, 0);
			}
		}
		t.id && (n.timelines[t.id] = i);
	}
	let c = !!a && "timeline" in a;
	return x(i, s(t), c, a, n), i;
}
// src/lib/interactions.ts
var w = [
	"hover",
	"press",
	"click",
	"show",
	"hide",
	"hover-fire",
	"press-fire",
	"click-fire"
], T = {
	hover: "data-gsap-hover",
	press: "data-gsap-press",
	click: "data-gsap-click",
	clickFire: "data-gsap-click-fire"
};
function E(e, t, n, r) {
	if (e === void 0) return;
	if (i(e)) return [e];
	let o = a(e);
	if (!o) t.warn("W505", n, `${r} 必须是对象或非空对象数组，已忽略`, r);
	else return o;
}
function D(e, t, n, r) {
	if (e === void 0) return;
	if (!Array.isArray(e) || e.length < 2) {
		t.warn("W505", n, `${r} 必须是 [目标, 动作] 形式，已忽略`, r);
		return;
	}
	let a = Array.isArray(e[0]) ? e : [e], o = [];
	for (let e of a) {
		if (!Array.isArray(e) || e.length < 2) {
			t.warn("W505", n, `${r} 的动作格式非法，已忽略`, r);
			continue;
		}
		let [a, s, c] = e;
		typeof a != "string" || typeof s != "string" && !i(s) ? t.warn("W505", n, `${r} 的 [目标, 动作] 非法，已忽略`, r) : o.push({
			target: a,
			action: s,
			leave: typeof c == "string" || i(c) ? c : void 0
		});
	}
	return o.length ? o : void 0;
}
var O = class {
	root;
	scan;
	warn;
	defaults;
	onLayout;
	records = /* @__PURE__ */ new Map();
	marked = [];
	pressed = null;
	bound = !1;
	constructor(e, t, n, r, i) {
		this.root = e, this.scan = t, this.warn = n, this.defaults = r, this.onLayout = i;
	}
	init() {
		for (let e of this.scan.order) {
			let t = this.scan.attrs.get(e);
			t && w.some((e) => e in t) && this.register(e, t);
		}
		this.records.size && this.bind();
	}
	destroy() {
		this.bound &&= (this.root.removeEventListener("pointerover", this.handleOver), this.root.removeEventListener("pointerout", this.handleOut), this.root.removeEventListener("pointerdown", this.handleDown), this.root.removeEventListener("click", this.handleClick), window.removeEventListener("pointerup", this.handleUp), window.removeEventListener("pointercancel", this.handleUp), window.removeEventListener("blur", this.handleBlur), document.removeEventListener("visibilitychange", this.handleBlur), !1);
		for (let t of this.records.values()) {
			for (let e of [
				t.hoverTl,
				t.pressTl,
				t.clickTl,
				t.showTl,
				t.hideTl
			]) e?.kill();
			e.killTweensOf(t.el), t.props.size && e.set(t.el, { clearProps: Array.from(t.props).join(",") });
		}
		this.records.clear();
		for (let { el: e, attr: t } of this.marked) e.removeAttribute(t);
		this.marked = [], this.pressed = null;
	}
	register(e, t) {
		let n = e, r = {
			el: e,
			state: "idle",
			hovered: !1,
			hidden: e.ownerDocument.defaultView?.getComputedStyle(e).display === "none",
			inlineDisplay: n.style.display || "",
			fires: {},
			props: /* @__PURE__ */ new Set()
		};
		r.hover = E(t.hover?.value, this.warn, e, "hover"), r.press = E(t.press?.value, this.warn, e, "press"), r.click = E(t.click?.value, this.warn, e, "click"), r.show = E(t.show?.value, this.warn, e, "show"), r.hide = E(t.hide?.value, this.warn, e, "hide");
		let a = i(t.show?.value) ? t.show?.value : void 0;
		if (a && typeof a.display == "string") {
			r.showDisplay = a.display;
			for (let e of r.show ?? []) delete e.display;
		}
		r.fires.hover = D(t["hover-fire"]?.value, this.warn, e, "hover-fire"), r.fires.press = D(t["press-fire"]?.value, this.warn, e, "press-fire"), r.fires.click = D(t["click-fire"]?.value, this.warn, e, "click-fire");
		for (let e of [
			r.hover,
			r.press,
			r.click,
			r.show,
			r.hide
		]) for (let t of e ?? []) for (let e of Object.keys(t)) r.props.add(e);
		this.checkConflicts(e, t, r), (r.hover || r.fires.hover?.length) && this.mark(e, T.hover), (r.press || r.fires.press?.length) && this.mark(e, T.press), r.click && this.mark(e, T.click), r.fires.click?.length && this.mark(e, T.clickFire), this.records.set(e, r);
	}
	mark(e, t) {
		e.setAttribute(t, ""), this.marked.push({
			el: e,
			attr: t
		});
	}
	checkConflicts(e, t, n) {
		let r = /* @__PURE__ */ new Set();
		for (let e of [t.from?.value, t.to?.value]) {
			if (i(e)) for (let t of Object.keys(e)) r.add(t);
			if (Array.isArray(e)) {
				for (let t of e) if (i(t)) for (let e of Object.keys(t)) r.add(e);
			}
		}
		let a = Array.from(n.props).filter((e) => r.has(e));
		a.length && this.warn.warn("W501", e, `交互与 from/to 同时动画 ${a.join("、")}，可能互相覆盖`, "hover");
		let o = e.ownerDocument.defaultView;
		if (o) {
			let t = o.getComputedStyle(e);
			t.pointerEvents === "none" && this.warn.warn("W502", e, "pointer-events:none，交互不会触发", "hover"), t.transitionDuration !== "0s" && this.warn.warn("W508", e, "元素有 CSS transition，可能与 GSAP 双重动画", "hover");
		}
	}
	bind() {
		this.bound = !0, this.root.addEventListener("pointerover", this.handleOver), this.root.addEventListener("pointerout", this.handleOut), this.root.addEventListener("pointerdown", this.handleDown), this.root.addEventListener("click", this.handleClick), window.addEventListener("pointerup", this.handleUp), window.addEventListener("pointercancel", this.handleUp), window.addEventListener("blur", this.handleBlur), document.addEventListener("visibilitychange", this.handleBlur);
	}
	findByTarget(e, t) {
		if (!(e instanceof Element)) return null;
		let n = e.closest(`[${t}]`);
		return n && this.root.contains(n) ? n : null;
	}
	handleOver = (e) => {
		if (e.pointerType === "touch") return;
		let t = this.findByTarget(e.target, T.hover);
		if (!t) return;
		let n = this.records.get(t);
		n && (e.relatedTarget instanceof Node && t.contains(e.relatedTarget) || (n.hovered = !0, n.hover && n.state !== "press" && this.setState(n, "hover"), this.runFire(t, n.fires.hover)));
	};
	handleOut = (e) => {
		let t = this.findByTarget(e.target, T.hover);
		if (!t) return;
		let n = this.records.get(t);
		n && (e.relatedTarget instanceof Node && t.contains(e.relatedTarget) || (n.hovered = !1, n.state === "hover" && this.setState(n, "idle"), this.runFire(t, n.fires.hover, "leave")));
	};
	handleDown = (e) => {
		if (e.button !== 0) return;
		let t = this.findByTarget(e.target, T.press);
		if (!t) return;
		let n = this.records.get(t);
		n && (this.pressed = n, n.press && this.setState(n, "press"), this.runFire(t, n.fires.press));
	};
	handleUp = () => {
		let e = this.pressed;
		this.pressed = null, e && (e.press && this.setState(e, e.hovered ? "hover" : "idle"), this.runFire(e.el, e.fires.press, "leave"));
	};
	handleBlur = () => {
		this.handleUp();
	};
	handleClick = (e) => {
		let t = this.findByTarget(e.target, T.click);
		if (t) {
			let e = this.records.get(t);
			e?.click && this.playClick(e);
		}
		let n = this.findByTarget(e.target, T.clickFire);
		if (n) {
			let e = this.records.get(n);
			this.runFire(n, e?.fires.click);
		}
	};
	setState(e, t) {
		if (e.state === t) return;
		let n = e.state;
		e.state = t, n === "press" && e.pressTl?.reverse(), n === "hover" && e.hoverTl?.reverse(), t === "press" && e.press && (e.pressTl ??= this.makeTimeline(e.el, e.press, void 0, { duration: .1 }), e.pressTl.play()), t === "hover" && e.hover && (e.hoverTl ??= this.makeTimeline(e.el, e.hover, void 0, { duration: .1 }), e.hoverTl.play());
	}
	playClick(e) {
		e.click && (e.clickTl ??= this.makeTimeline(e.el, e.click, () => this.restoreState(e)), e.clickTl.restart());
	}
	restoreState(e) {
		let t = e.state === "press" ? e.pressTl : e.state === "hover" ? e.hoverTl : void 0;
		t && (t.progress() === 1 ? (t.progress(0), t.progress(1)) : t.play());
	}
	makeTimeline(t, n, r, i = {}) {
		let a = e.timeline({
			paused: !0,
			onComplete: r
		});
		for (let e of n) a.to(t, {
			...this.defaults,
			...i,
			...e
		});
		return a;
	}
	runFire(e, t, n = "enter") {
		if (t?.length) for (let r of t) {
			let t = n === "enter" ? r.action : r.leave;
			t !== void 0 && this.runAction(e, r.target, t);
		}
	}
	runAction(e, t, n) {
		let r = this.resolveTargets(t, e);
		if (!r.length) this.warn.warn("W503", e, `-fire 找不到目标 "${t}"`, t);
		else for (let e of r) this.applyAction(e, n);
	}
	resolveTargets(e, t) {
		if (e === "self") return [t];
		let n = Array.from(this.root.querySelectorAll(e));
		if (n.length) return n;
		let r = t.ownerDocument;
		return Array.from(r.querySelectorAll(e));
	}
	applyAction(t, n) {
		if (i(n)) e.to(t, {
			...this.defaults,
			...n
		});
		else {
			if (n === "show") return this.show(t);
			if (n === "hide") return this.hide(t);
			if (n === "toggle") return this.toggle(t);
			if (n === "to" || n === "from" || n === "from-to") return this.replay(t, n);
			this.warn.warn("W504", t, `未知的交互动作 ${JSON.stringify(n)}`);
		}
	}
	replay(t, n) {
		let r = this.scan.attrs.get(t);
		if (!r) {
			this.warn.warn("W504", t, `目标没有可重放的 ${n} 动画`, n);
			return;
		}
		let i = n === "from-to" ? "fromTo" : n, a = o(r, this.warn, t).find((e) => e.method === i);
		if (!a) {
			this.warn.warn("W504", t, `目标没有声明 ${n}`, n);
			return;
		}
		if (a.steps?.length) {
			let n = e.timeline();
			for (let e of a.steps) n.to(t, {
				...this.defaults,
				...e
			});
			return;
		}
		let s = {
			...this.defaults,
			...a.vars
		};
		a.method === "fromTo" ? e.fromTo(t, a.fromVars ?? {}, s) : a.method === "from" ? e.from(t, s) : e.to(t, s);
	}
	show(t) {
		let n = this.records.get(t);
		if (!n?.show) {
			this.warn.warn("W504", t, "目标没有声明 show，无法显示", "show");
			return;
		}
		if (n.hide) {
			let r = n.hide[n.hide.length - 1];
			e.set(t, {
				...this.defaults,
				...r
			});
		}
		let r = t, i = t.ownerDocument.defaultView, a = n.showDisplay ?? (n.inlineDisplay || "block");
		i?.getComputedStyle(t).display === "none" && (r.style.display = a), n.hidden = !1, n.showTl ??= this.makeTimeline(t, n.show, () => this.onLayout()), n.showTl.restart(), this.onLayout();
	}
	hide(e) {
		let t = this.records.get(e);
		t?.hide ? t.hidden || (t.inlineDisplay = e.style.display || t.inlineDisplay, t.hidden = !0, t.hideTl ??= this.makeTimeline(e, t.hide, () => {
			e.style.display = "none", this.onLayout();
		}), t.hideTl.restart()) : this.warn.warn("W504", e, "目标没有声明 hide，无法隐藏", "hide");
	}
	toggle(e) {
		let t = this.records.get(e);
		t && (t.hidden ? this.show(e) : this.hide(e));
	}
}, k = /* @__PURE__ */ new Set([
	"from",
	"to",
	"from-to",
	"timeline",
	"config",
	"at",
	"hover",
	"press",
	"click",
	"show",
	"hide",
	"hover-fire",
	"press-fire",
	"click-fire"
]), A = /* @__PURE__ */ new Map();
function j(e) {
	if (!e?.id) throw Error("[gsap-render] E002 适配器缺少 id");
	for (let t of e.attrs) if (k.has(t)) throw Error(`[gsap-render] E002 "${t}" 是保留属性，不能被适配器 ${e.id} 认领`);
	A.set(e.id, e);
}
function M() {
	return Array.from(A.values());
}
function N(e) {
	return e.create ? e.create() : {
		resolve: (t) => e.resolve?.(t),
		refresh: () => e.refresh?.(),
		layout: () => e.layout?.(),
		destroy: () => e.destroy?.()
	};
}
// src/lib/scan.ts
function P(e, t) {
	let a = [e, ...Array.from(e.querySelectorAll("*"))], o = /* @__PURE__ */ new WeakMap(), s = /* @__PURE__ */ new WeakSet();
	for (let c of a) {
		let a = c.getAttribute("data-gsap-owned");
		if (a && a !== t.ownerId) {
			t.warn.warn("W013", c, "已被其它 GsapRender 实例认领，跳过");
			continue;
		}
		let l = {};
		for (let e of c.getAttributeNames()) {
			let n = null, r = !1;
			if (t.prefix && e.startsWith(t.prefix)) {
				let i = e.slice(t.prefix.length);
				t.known.has(i) && (n = i, r = !0);
			} else t.known.has(e) && (n = e);
			if (!n) continue;
			let i = l[n];
			if (i) {
				if (i.prefixed && !r) continue;
				!i.prefixed && r && t.warn.warn("W009", c, `裸属性与 "${e}" 同时存在，使用前缀版本`, n);
			}
			l[n] = {
				raw: c.getAttribute(e) ?? "",
				value: void 0,
				prefixed: r
			};
		}
		if (Object.keys(l).length) {
			c !== e && "config" in l && (t.warn.warn("W014", c, "config 只在根元素生效，已忽略", "config"), delete l.config);
			for (let e of Object.keys(l)) {
				let a = l[e], o = a.raw.trim();
				if (t.rawAttrs.has(e)) {
					a.value = o;
					continue;
				}
				if (e === "at") {
					if (!o) continue;
					let e = r(o);
					a.value = e.ok && (typeof e.value == "number" || typeof e.value == "string") ? e.value : o;
					continue;
				}
				if (!o) {
					a.value = {};
					continue;
				}
				let u = r(a.raw);
				if (!u.ok) {
					s.add(c), t.warn.warn("W001", c, `${n(a.raw, u.error.index)}：${u.error.message}`, e);
					continue;
				}
				let d = e === "from" || e === "timeline" || e === "config", f = i(u.value), p = e === "to" && Array.isArray(u.value);
				(d || e === "to") && !f && !p ? (s.add(c), t.warn.warn("W001", c, `${e} 必须是对象${e === "to" ? "或数组" : ""}`, e)) : a.value = u.value;
			}
			c.setAttribute("data-gsap-owned", t.ownerId), o.set(c, l);
		}
	}
	return {
		order: a,
		attrs: o,
		broken: s
	};
}
// src/lib/warn.ts
function F(e) {
	if (!e) return "";
	let t = [], n = e, r = 0;
	for (; n && r < 4;) {
		let e = n.tagName.toLowerCase();
		if (n.id) {
			t.unshift(`${e}#${n.id}`);
			break;
		}
		let i = n.classList?.[0];
		i && (e += `.${i}`), t.unshift(e), n = n.parentElement, r++;
	}
	return t.join(" > ");
}
var I = class {
	options;
	seenEl = /* @__PURE__ */ new WeakMap();
	seenGlobal = /* @__PURE__ */ new Set();
	constructor(e) {
		this.options = e;
	}
	get enabled() {
		return this.options.debug || !!globalThis.__GSAP_RENDER_DEBUG__;
	}
	warn(e, t, n, r) {
		if (!this.enabled) return;
		let i = e + (r ? `:${r}` : "");
		if (t) {
			let e = this.seenEl.get(t);
			if (e || (e = /* @__PURE__ */ new Set(), this.seenEl.set(t, e)), e.has(i)) return;
			e.add(i);
		} else {
			if (this.seenGlobal.has(i)) return;
			this.seenGlobal.add(i);
		}
		let a = `[gsap-render] ${e}${t ? ` ${F(t)}` : ""}${r ? ` [${r}]` : ""} ${n}`;
		this.options.onWarn ? this.options.onWarn(a) : console.warn(a);
	}
}, L = /* @__PURE__ */ new WeakMap(), R = [
	"from",
	"to",
	"from-to",
	"timeline",
	"config",
	"at",
	"hover",
	"press",
	"click",
	"show",
	"hide",
	"hover-fire",
	"press-fire",
	"click-fire"
], z = class {
	root;
	timelines = {};
	ready;
	timeline;
	options;
	warn;
	id;
	plugins;
	ctx;
	scanResult;
	built = !1;
	destroyed = !1;
	pendingPlay = !1;
	suppressAutoPlay = !1;
	refreshing = !1;
	pendingEvents = [];
	interactions = null;
	layoutTimer = 0;
	constructor(t, n = {}) {
		if (this.options = n, typeof window > "u") {
			this.root = t, this.warn = new I({ debug: !1 }), this.id = "ssr", this.plugins = [], this.ctx = e.context(() => {}), this.scanResult = {
				order: [],
				attrs: /* @__PURE__ */ new WeakMap(),
				broken: /* @__PURE__ */ new WeakSet()
			}, this.timeline = e.timeline({ paused: !0 }), this.ready = Promise.resolve(this);
			return;
		}
		let r = typeof t == "string" ? document.querySelector(t) : t;
		if (!r) throw Error(`[gsap-render] 找不到根元素：${String(t)}`);
		let i = L.get(r);
		if (i) return i.warn.warn("W008", r, "该根元素已有实例，返回已有实例"), i;
		this.root = r, this.id = `gsr-${Math.random().toString(36).slice(2, 9)}`, this.warn = new I({
			debug: !!n.debug,
			onWarn: n.onWarn
		});
		let a = /* @__PURE__ */ new Map();
		for (let e of M()) a.set(e.id, e);
		for (let e of n.plugins ?? []) a.set(e.id, e);
		this.plugins = Array.from(a.values()).map((e) => ({
			plugin: e,
			impl: N(e)
		})), this.scanResult = this.runScan(), this.ctx = e.context(() => {}), L.set(r, this), r.addEventListener("gsap-render:resplit", this.handleResplit), this.ready = this.init();
	}
	static register(e) {
		j(e);
	}
	static configure(e) {
		e.gsap && t(e.gsap);
	}
	static get(e) {
		return L.get(e);
	}
	play() {
		return this.destroyed ? this : (this.suppressAutoPlay = !1, this.built ? (this.timeline.play(), this) : (this.pendingPlay = !0, this));
	}
	pause() {
		return this.suppressAutoPlay = !0, this.pendingPlay = !1, this.built && this.timeline.pause(), this;
	}
	resume() {
		return this.play();
	}
	restart() {
		return this.built && this.timeline.restart(), this;
	}
	seek(e) {
		return this.built && this.timeline.seek(e), this;
	}
	progress(e) {
		return this.built && this.timeline.progress(e), this;
	}
	on(e, t) {
		return this.built ? this.timeline.eventCallback(e, t) : this.pendingEvents.push([e, t]), () => {
			this.pendingEvents = this.pendingEvents.filter(([, e]) => e !== t), this.built && this.timeline.eventCallback(e, null);
		};
	}
	refresh() {
		if (this.destroyed) return this;
		let e = this.built ? this.timeline.progress() : 0;
		return this.teardown(), this.scanResult = this.runScan(), this.ready = this.init(e), this;
	}
	destroy() {
		if (this.destroyed) return this;
		this.destroyed = !0, this.root.removeEventListener("gsap-render:resplit", this.handleResplit), this.teardown();
		for (let e of this.scanResult.order) e.getAttribute("data-gsap-owned") === this.id && e.removeAttribute("data-gsap-owned");
		return L.delete(this.root), this;
	}
	runScan() {
		let e = new Set(R), t = /* @__PURE__ */ new Set();
		for (let n of this.plugins) {
			for (let t of n.plugin.attrs) e.add(t);
			for (let e of n.plugin.raw ?? []) t.add(e);
		}
		return P(this.root, {
			root: this.root,
			prefix: this.options.prefix ?? "data-gsap-",
			known: e,
			rawAttrs: t,
			warn: this.warn,
			ownerId: this.id
		});
	}
	readConfig() {
		let e = this.scanResult.attrs.get(this.root)?.config?.value, t = {
			paused: !1,
			defaults: {}
		};
		return i(e) && (typeof e.paused == "boolean" && (t.paused = e.paused), i(e.defaults) && (t.defaults = { ...e.defaults }), typeof e.repeat == "number" && (t.repeat = e.repeat), typeof e.yoyo == "boolean" && (t.yoyo = e.yoyo)), t;
	}
	needsFonts() {
		if (!this.plugins.some((e) => e.plugin.requires?.includes("SplitText"))) return !1;
		for (let e of this.scanResult.order) {
			let t = this.scanResult.attrs.get(e);
			if (t && ("split" in t || Object.keys(t).some((e) => e.startsWith("split-")))) return !0;
		}
		return !1;
	}
	async init(e) {
		if (this.needsFonts()) {
			let e = this.root.ownerDocument.fonts;
			if (e?.ready) try {
				await e.ready;
			} catch {}
		}
		return this.destroyed || this.ctx.add(() => {
			let t = this.readConfig(), n = { paused: !0 };
			t.repeat !== void 0 && (n.repeat = t.repeat), t.yoyo !== void 0 && (n.yoyo = t.yoyo);
			let r = {
				root: this.root,
				scan: this.scanResult,
				warn: this.warn,
				plugins: this.plugins,
				defaults: t.defaults,
				timelines: this.timelines,
				symbols: /* @__PURE__ */ new WeakMap(),
				ownedDepth: 0
			};
			this.timeline = C(this.root, r, n), this.built = !0;
			for (let [e, t] of this.pendingEvents) this.timeline.eventCallback(e, t);
			this.pendingEvents = [], e != null && this.timeline.progress(e), (this.pendingPlay || !t.paused && !this.suppressAutoPlay) && this.timeline.play();
			for (let e of this.plugins) try {
				e.impl.refresh?.();
			} catch {}
			this.interactions?.destroy(), this.interactions = new O(this.root, this.scanResult, this.warn, t.defaults, this.scheduleLayout), this.interactions.init();
		}), this;
	}
	teardown() {
		this.layoutTimer &&= (window.clearTimeout(this.layoutTimer), 0), this.interactions?.destroy(), this.interactions = null;
		for (let e of this.plugins) try {
			e.impl.destroy?.();
		} catch {}
		try {
			this.ctx.revert();
		} catch {}
		this.ctx = e.context(() => {});
		for (let e of Object.keys(this.timelines)) delete this.timelines[e];
		this.built = !1;
	}
	hasSplit() {
		for (let e of this.scanResult.order) {
			let t = this.scanResult.attrs.get(e);
			if (t && ("split" in t || Object.keys(t).some((e) => e.startsWith("split-")))) return !0;
		}
		return !1;
	}
	scheduleLayout = () => {
		typeof window > "u" || this.destroyed || (this.layoutTimer && window.clearTimeout(this.layoutTimer), this.layoutTimer = window.setTimeout(() => {
			if (this.layoutTimer = 0, !this.destroyed) {
				for (let e of this.plugins) try {
					e.impl.layout?.();
				} catch {}
				this.hasSplit() && this.refresh();
			}
		}, 80));
	};
	handleResplit = () => {
		if (this.refreshing || this.destroyed) return;
		this.refreshing = !0;
		let e = () => {
			this.refresh(), this.ready.then(() => {
				this.refreshing = !1;
			}, () => {
				this.refreshing = !1;
			});
		};
		typeof requestAnimationFrame == "function" ? requestAnimationFrame(e) : e();
	};
};
export { z as GsapRender, z as default, o as mergeAttrs, r as parseValue };
