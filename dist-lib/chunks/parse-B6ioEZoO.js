import { gsap as e } from "gsap";
// src/lib/gsap.ts
var t = null;
function n(e) {
	t = e;
}
function r() {
	let n = t ?? e ?? globalThis.gsap;
	if (!n) throw Error("[gsap-render] 没有找到 GSAP。请先用 <script> 引入 gsap，或调用 GsapRender.configure({ gsap })");
	return n;
}
var i = new Proxy({}, { get(e, t, n) {
	let i = r(), a = Reflect.get(i, t, n);
	return typeof a == "function" ? a.bind(i) : a;
} }), a = /* @__PURE__ */ new Set([
	"__proto__",
	"constructor",
	"prototype"
]), o = class extends Error {
	index;
	constructor(e, t) {
		super(e), this.index = t;
	}
}, s = (e) => e !== void 0 && e >= "0" && e <= "9";
function c(e) {
	let t = e;
	if (!t.trim()) return {
		ok: !0,
		value: {}
	};
	let n = 0, r = (e) => {
		throw new o(e, n);
	}, i = () => t[n], c = () => {
		for (; n < t.length && /\s/.test(t[n]);) n++;
	};
	function l() {
		let e = t[n];
		n++;
		let i = "";
		for (; n < t.length;) {
			let a = t[n];
			if (a === e) return n++, i;
			if (a === "\\") {
				n++;
				let e = t[n];
				switch (e) {
					case "n":
						i += "\n";
						break;
					case "t":
						i += "	";
						break;
					case "r":
						i += "\r";
						break;
					case "b":
						i += "\b";
						break;
					case "f":
						i += "\f";
						break;
					case "u": {
						let e = t.slice(n + 1, n + 5);
						if (!/^[0-9a-fA-F]{4}$/.test(e)) return r("非法的 \\u 转义");
						i += String.fromCharCode(parseInt(e, 16)), n += 4;
						break;
					}
					case void 0: return r("字符串未闭合");
					default: i += e;
				}
				n++;
			} else {
				if (a === "\n") return r("字符串未闭合");
				i += a, n++;
			}
		}
		return r("字符串未闭合");
	}
	function u() {
		let e = n;
		if (i() === "-" && n++, !s(i())) return r("非法的数字");
		for (; s(i());) n++;
		if (i() === ".") {
			if (n++, !s(i())) return r("小数点后缺少数字");
			for (; s(i());) n++;
		}
		if (i() === "e" || i() === "E") {
			if (n++, (i() === "+" || i() === "-") && n++, !s(i())) return r("指数部分缺少数字");
			for (; s(i());) n++;
		}
		let a = Number(t.slice(e, n));
		return Number.isFinite(a) ? a : r("数字超出范围");
	}
	function d() {
		let e = /^[A-Za-z_$][A-Za-z0-9_$-]*/.exec(t.slice(n));
		return e ? (n += e[0].length, e[0]) : r(`期望属性名，得到 ${JSON.stringify(i() ?? "EOF")}`);
	}
	function f() {
		n++;
		let e = {};
		if (c(), i() === "}") return n++, e;
		for (;;) {
			c();
			let t = i() === "\"" || i() === "'" ? l() : d();
			if (a.has(t)) return r(`不允许的键名 "${t}"`);
			if (c(), i() !== ":") return r(`期望 ":"，得到 ${JSON.stringify(i() ?? "EOF")}`);
			if (n++, e[t] = m(), c(), i() === ",") {
				if (n++, c(), i() === "}") return n++, e;
			} else return i() === "}" ? (n++, e) : r(`期望 "," 或 "}"，得到 ${JSON.stringify(i() ?? "EOF")}`);
		}
	}
	function p() {
		n++;
		let e = [];
		if (c(), i() === "]") return n++, e;
		for (;;) if (e.push(m()), c(), i() === ",") {
			if (n++, c(), i() === "]") return n++, e;
		} else return i() === "]" ? (n++, e) : r(`期望 "," 或 "]"，得到 ${JSON.stringify(i() ?? "EOF")}`);
	}
	function m() {
		c();
		let e = i();
		return e === void 0 ? r("期望一个值，但已到结尾") : e === "{" ? f() : e === "[" ? p() : e === "\"" || e === "'" ? l() : e === "-" || s(e) ? u() : t.startsWith("true", n) ? (n += 4, !0) : t.startsWith("false", n) ? (n += 5, !1) : t.startsWith("null", n) ? (n += 4, null) : r(`无法识别的值 ${JSON.stringify(e)}（不允许函数或表达式）`);
	}
	try {
		let e = m();
		return c(), n < t.length ? {
			ok: !1,
			error: {
				message: `多余的内容 ${JSON.stringify(t.slice(n, n + 12))}`,
				index: n
			}
		} : {
			ok: !0,
			value: e
		};
	} catch (e) {
		if (e instanceof o) return {
			ok: !1,
			error: {
				message: e.message,
				index: e.index
			}
		};
		throw e;
	}
}
function l(e, t) {
	let n = e.slice(0, t);
	return `${n.split("\n").length} 行 ${t - n.lastIndexOf("\n")} 列`;
}
function u(e) {
	return typeof e == "object" && !!e && !Array.isArray(e);
}
export { i as a, n as i, l as n, c as r, u as t };
