import { a as e, i as t, n, r, t as i } from "./chunks/parse-B6ioEZoO.js";
import { t as a } from "./chunks/merge-DAsbGjX2.js";
// src/lib/build.ts
var o = (e) => Array.from(e.children);
function s(e) {
	let t = {};
	for (let [n, r] of Object.entries(e)) t[n] = r.value;
	return t;
}
function c(e, t, n) {
	let r = [];
	for (let i of n.plugins) {
		if (!i.plugin.attrs.some((e) => e in t)) continue;
		let a = {
			el: e,
			root: n.root,
			attrs: s(t),
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
function l(e, t, n) {
	let r = n.plugins.filter((e) => e.plugin.owns?.some((e) => e in t));
	if (!r.length) return null;
	if (r.length === 1) return r[0];
	r.sort((e, t) => (t.plugin.priority ?? 0) - (e.plugin.priority ?? 0));
	let i = r[0], a = r.map((e) => e.plugin.id).join("、");
	return n.warn.warn("W017", e, `多个接管型适配器命中（${a}），使用 ${i.plugin.id}`, i.plugin.owns?.[0]), i;
}
function u(e, t, n, r, i, a) {
	let o = e.impl.mount;
	if (!o) return !1;
	try {
		return o({
			el: n,
			root: a.root,
			node: t,
			attrs: s(r),
			nested: i,
			debug: a.warn.enabled,
			timelines: a.timelines,
			warn: (e, t, r) => a.warn.warn(e, n, t, r)
		}) !== !1;
	} catch (t) {
		return a.warn.warn("W016", n, `适配器 ${e.plugin.id} 接管失败：${t.message}`, e.plugin.id), !1;
	}
}
function d(e, t, n) {
	return t === "self" ? [e] : t.startsWith("@") ? n.symbols.get(e)?.[t.slice(1)] ?? [] : Array.from(e.querySelectorAll(t));
}
function f(t, n, r, i, a) {
	let o = Array.isArray(t) ? t : [t];
	if (!o.length || !o[0]) return null;
	let s = {
		...a,
		...r
	};
	return n === "fromTo" ? e.fromTo(o.length === 1 ? o[0] : o, i ?? {}, s) : n === "from" ? e.from(o, s) : e.to(o, s);
}
function p(e, t, n) {
	return f(e, t.method, t.vars, t.fromVars, n.defaults);
}
function m(e, t, n) {
	let r = d(e, t.target, n);
	if (!r.length) return null;
	if (t.method === "fromTo") {
		let e = t.vars;
		return f(r, "fromTo", e[1], e[0], n.defaults);
	}
	return f(r, t.method, t.vars, void 0, n.defaults);
}
function h(e) {
	let t = e.timeline?.value, n = i(t) ? { ...t } : {};
	return delete n.stagger, n;
}
function g(e, t) {
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
function _(e, t, n, r, i) {
	let a = i.scan.attrs.get(e)?.at?.value;
	return t ? a === void 0 ? n === 0 ? 0 : r == null ? ">" : `<${r}` : a : a === void 0 ? 0 : typeof a == "number" ? a : (i.warn.warn("W006", e, `并行容器不支持相对位置 ${JSON.stringify(a)}，已忽略`, "at"), 0);
}
function v(e) {
	return !/^[<>=+\-.\d]/.test(e);
}
function y(e, t, n, r, i) {
	let a = n;
	if (typeof a == "string" && v(a)) {
		let t = e.labels;
		a in t || (i.warn.warn("W010", r, `at 引用了不存在的 label "${a}"，回退到末尾`, "at"), a = ">");
	}
	e.add(t, a), r.id && e.addLabel(r.id, t.startTime());
}
function b(e, t, n, r, i) {
	let a = n ? g(r, t.length) : null, o = 0;
	for (let r of t) {
		let t = x(r, i);
		t && (t.detached || (y(e, t.node, _(r, n, o, a, i), r, i), o++));
	}
	return o;
}
function x(t, n) {
	let r = n.scan.attrs.get(t), i = o(t);
	if (!r) {
		if (!i.length) return null;
		let t = e.timeline();
		return b(t, i, !1, void 0, n) ? {
			node: t,
			detached: !1
		} : null;
	}
	let s = l(t, r, n), d = s ? n.ownedDepth > 0 : !1;
	s && n.ownedDepth++;
	let f = n.scan.broken.has(t), g = f ? [] : a(r, n.warn, t), _ = f ? [] : c(t, r, n), v = "timeline" in r, y = g.length + _.length, x = null;
	if (!v && i.length === 0 && y === 1) x = g.length ? p(t, g[0], n) : m(t, _[0], n);
	else if (v || i.length > 0 || y > 1) {
		let a = e.timeline(h(r));
		for (let e of g) {
			let r = p(t, e, n);
			r && a.add(r, 0);
		}
		for (let e of _) {
			let r = m(t, e, n);
			r && a.add(r, 0);
		}
		b(a, i, v, r, n), t.id && (n.timelines[t.id] = a), x = a;
	}
	return s && n.ownedDepth--, x ? s && u(s, x, t, r, d, n) ? {
		node: x,
		detached: !0
	} : {
		node: x,
		detached: !1
	} : null;
}
function S(t, n, r) {
	let i = e.timeline({ ...r }), s = n.scan.attrs.get(t);
	if (s) {
		if (!n.scan.broken.has(t)) {
			for (let e of a(s, n.warn, t)) {
				let r = p(t, e, n);
				r && i.add(r, 0);
			}
			for (let e of c(t, s, n)) {
				let r = m(t, e, n);
				r && i.add(r, 0);
			}
		}
		t.id && (n.timelines[t.id] = i);
	}
	let l = !!s && "timeline" in s;
	return b(i, o(t), l, s, n), i;
}
// src/lib/registry.ts
var C = /* @__PURE__ */ new Set([
	"from",
	"to",
	"from-to",
	"timeline",
	"config",
	"at"
]), w = /* @__PURE__ */ new Map();
function T(e) {
	if (!e?.id) throw Error("[gsap-render] E002 适配器缺少 id");
	for (let t of e.attrs) if (C.has(t)) throw Error(`[gsap-render] E002 "${t}" 是保留属性，不能被适配器 ${e.id} 认领`);
	w.set(e.id, e);
}
function E() {
	return Array.from(w.values());
}
function D(e) {
	return e.create ? e.create() : {
		resolve: (t) => e.resolve?.(t),
		destroy: () => e.destroy?.()
	};
}
// src/lib/scan.ts
function O(e, t) {
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
				u.ok ? (e === "from" || e === "to" || e === "timeline" || e === "config") && !i(u.value) ? (s.add(c), t.warn.warn("W001", c, `${e} 必须是对象`, e)) : a.value = u.value : (s.add(c), t.warn.warn("W001", c, `${n(a.raw, u.error.index)}：${u.error.message}`, e));
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
function k(e) {
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
var A = class {
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
		let a = `[gsap-render] ${e}${t ? ` ${k(t)}` : ""}${r ? ` [${r}]` : ""} ${n}`;
		this.options.onWarn ? this.options.onWarn(a) : console.warn(a);
	}
}, j = /* @__PURE__ */ new WeakMap(), M = [
	"from",
	"to",
	"from-to",
	"timeline",
	"config",
	"at"
], N = class {
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
	constructor(t, n = {}) {
		if (this.options = n, typeof window > "u") {
			this.root = t, this.warn = new A({ debug: !1 }), this.id = "ssr", this.plugins = [], this.ctx = e.context(() => {}), this.scanResult = {
				order: [],
				attrs: /* @__PURE__ */ new WeakMap(),
				broken: /* @__PURE__ */ new WeakSet()
			}, this.timeline = e.timeline({ paused: !0 }), this.ready = Promise.resolve(this);
			return;
		}
		let r = typeof t == "string" ? document.querySelector(t) : t;
		if (!r) throw Error(`[gsap-render] 找不到根元素：${String(t)}`);
		let i = j.get(r);
		if (i) return i.warn.warn("W008", r, "该根元素已有实例，返回已有实例"), i;
		this.root = r, this.id = `gsr-${Math.random().toString(36).slice(2, 9)}`, this.warn = new A({
			debug: !!n.debug,
			onWarn: n.onWarn
		});
		let a = /* @__PURE__ */ new Map();
		for (let e of E()) a.set(e.id, e);
		for (let e of n.plugins ?? []) a.set(e.id, e);
		this.plugins = Array.from(a.values()).map((e) => ({
			plugin: e,
			impl: D(e)
		})), this.scanResult = this.runScan(), this.ctx = e.context(() => {}), j.set(r, this), r.addEventListener("gsap-render:resplit", this.handleResplit), this.ready = this.init();
	}
	static register(e) {
		T(e);
	}
	static configure(e) {
		e.gsap && t(e.gsap);
	}
	static get(e) {
		return j.get(e);
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
		return j.delete(this.root), this;
	}
	runScan() {
		let e = new Set(M), t = /* @__PURE__ */ new Set();
		for (let n of this.plugins) {
			for (let t of n.plugin.attrs) e.add(t);
			for (let e of n.plugin.raw ?? []) t.add(e);
		}
		return O(this.root, {
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
			this.timeline = S(this.root, r, n), this.built = !0;
			for (let [e, t] of this.pendingEvents) this.timeline.eventCallback(e, t);
			this.pendingEvents = [], e != null && this.timeline.progress(e), (this.pendingPlay || !t.paused && !this.suppressAutoPlay) && this.timeline.play();
			for (let e of this.plugins) try {
				e.impl.refresh?.();
			} catch {}
		}), this;
	}
	teardown() {
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
export { N as GsapRender, N as default, a as mergeAttrs, r as parseValue };
