import { t as e } from "./parse-B6ioEZoO.js";
// src/lib/merge.ts
var t = /* @__PURE__ */ new Set([
	"duration",
	"delay",
	"ease",
	"stagger",
	"repeat",
	"repeatDelay",
	"yoyo",
	"immediateRender"
]), n = /* @__PURE__ */ new Set([
	"at",
	"timeline",
	"config",
	"from-to"
]), r = /* @__PURE__ */ new Set(/* @__PURE__ */ "x.y.z.xPercent.yPercent.scale.scaleX.scaleY.rotation.rotationX.rotationY.rotationZ.skew.skewX.skewY.transform.transformOrigin.transformPerspective.perspective.svgOrigin.autoAlpha.alpha.opacity.duration.delay.ease.stagger.repeat.repeatDelay.yoyo.yoyoEase.immediateRender.overwrite.lazy.paused.reversed.runBackwards.startAt.keyframes.data.id.snap.modifiers.callbackScope.onComplete.onUpdate.onStart.onRepeat.onReverseComplete".split("."));
function i(e, t) {
	if (e.startsWith("--") || r.has(e)) return !0;
	if (t) try {
		return e in t.documentElement.style;
	} catch {
		return !1;
	}
	return !1;
}
function a(e, t, r, a) {
	let o = {};
	for (let [s, c] of Object.entries(e)) n.has(s) ? a.warn("W011", t, `保留键 "${s}" 不能写在补间变量里，已剔除`, r) : (i(s, t.ownerDocument) || a.warn("W005", t, `未知的补间变量 "${s}"`, r), o[s] = c);
	return o;
}
var o = /^[+\-*/]=/;
function s(e, t, n, r, i) {
	for (let a of Object.keys(t)) {
		let s = t[a];
		a in e && typeof s == "string" && o.test(s) && i.warn("W004", n, `"${a}" 在 from 与 to 中同时存在，且 to 是相对值 ${JSON.stringify(s)}；fromTo 会以 from 的值为基线，建议只写其中一侧`, r);
	}
}
function c(e, n, r, i, o) {
	let c = a({ ...e }, r, i, o), l = a({ ...n }, r, i, o);
	for (let e of t) e in c && (e in l || (l[e] = c[e]), delete c[e]);
	return s(c, l, r, i, o), {
		method: "fromTo",
		vars: l,
		fromVars: c
	};
}
var l = (t) => e(t) && Object.keys(t).length > 0;
function u(t, n, r) {
	let i = t.from?.value, o = t.to?.value, s = t["from-to"]?.value;
	if (s !== void 0) {
		if (!Array.isArray(s) || s.length !== 2 || !e(s[0]) || !e(s[1])) return n.warn("W003", r, "from-to 必须是 [fromVars, toVars] 两个对象", "from-to"), [];
		if (i !== void 0 || o !== void 0) {
			let e = [i === void 0 ? "" : "from", o === void 0 ? "" : "to"].filter(Boolean).join(" 和 ");
			n.warn("W002", r, `同时存在 from-to，已忽略 ${e}`, "from-to");
		}
		return [c(s[0], s[1], r, "from-to", n)];
	}
	return l(i) && l(o) ? [c(i, o, r, "from+to", n)] : l(i) ? [{
		method: "from",
		vars: a({ ...i }, r, "from", n)
	}] : l(o) ? [{
		method: "to",
		vars: a({ ...o }, r, "to", n)
	}] : [];
}
function d(t, n, r, i, o, s) {
	return r === void 0 ? l(t) && l(n) ? [c(t, n, i, o, s)] : l(t) ? [{
		method: "from",
		vars: a({ ...t }, i, o, s)
	}] : l(n) ? [{
		method: "to",
		vars: a({ ...n }, i, o, s)
	}] : [] : !Array.isArray(r) || r.length !== 2 || !e(r[0]) || !e(r[1]) ? (s.warn("W003", i, "from-to 必须是 [fromVars, toVars] 两个对象", o), []) : ((t !== void 0 || n !== void 0) && s.warn("W002", i, "同时存在 from-to，已忽略 from/to", o), [c(r[0], r[1], i, o, s)]);
}
export { d as n, u as t };
