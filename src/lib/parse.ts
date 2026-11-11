export interface ParseFailure {
  message: string
  index: number
}

export type ParseResult<T = unknown> =
  | { ok: true; value: T }
  | { ok: false; error: ParseFailure }

const BANNED_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

class ParseError extends Error {
  constructor(message: string, readonly index: number) {
    super(message)
  }
}

const isDigit = (ch: string | undefined): boolean => ch !== undefined && ch >= '0' && ch <= '9'

/**
 * JSON-lite 解析器：允许无引号键、单引号、尾逗号；拒绝函数与求值。
 * 语法错误返回 index，用于拼出「第 X 行第 Y 列」。
 */
export function parseValue(input: string): ParseResult {
  const src = input
  if (!src.trim()) return { ok: true, value: {} }
  let i = 0

  const fail = (message: string): never => {
    throw new ParseError(message, i)
  }

  const peek = (): string | undefined => src[i]

  const skipWs = (): void => {
    while (i < src.length && /\s/.test(src[i] as string)) i++
  }

  function parseString(): string {
    const quote = src[i]
    i++
    let out = ''
    while (i < src.length) {
      const ch = src[i]
      if (ch === quote) {
        i++
        return out
      }
      if (ch === '\\') {
        i++
        const esc = src[i]
        switch (esc) {
          case 'n': out += '\n'; break
          case 't': out += '\t'; break
          case 'r': out += '\r'; break
          case 'b': out += '\b'; break
          case 'f': out += '\f'; break
          case 'u': {
            const hex = src.slice(i + 1, i + 5)
            if (!/^[0-9a-fA-F]{4}$/.test(hex)) return fail('非法的 \\u 转义')
            out += String.fromCharCode(parseInt(hex, 16))
            i += 4
            break
          }
          case undefined: return fail('字符串未闭合')
          default: out += esc
        }
        i++
        continue
      }
      if (ch === '\n') return fail('字符串未闭合')
      out += ch
      i++
    }
    return fail('字符串未闭合')
  }

  function parseNumber(): number {
    const start = i
    if (peek() === '-') i++
    if (!isDigit(peek())) return fail('非法的数字')
    while (isDigit(peek())) i++
    if (peek() === '.') {
      i++
      if (!isDigit(peek())) return fail('小数点后缺少数字')
      while (isDigit(peek())) i++
    }
    if (peek() === 'e' || peek() === 'E') {
      i++
      if (peek() === '+' || peek() === '-') i++
      if (!isDigit(peek())) return fail('指数部分缺少数字')
      while (isDigit(peek())) i++
    }
    const value = Number(src.slice(start, i))
    if (!Number.isFinite(value)) return fail('数字超出范围')
    return value
  }

  function parseKey(): string {
    const m = /^[A-Za-z_$][A-Za-z0-9_$-]*/.exec(src.slice(i))
    if (!m) return fail(`期望属性名，得到 ${JSON.stringify(peek() ?? 'EOF')}`)
    i += m[0].length
    return m[0]
  }

  function parseObject(): Record<string, unknown> {
    i++
    const obj: Record<string, unknown> = {}
    skipWs()
    if (peek() === '}') {
      i++
      return obj
    }
    while (true) {
      skipWs()
      const key = peek() === '"' || peek() === "'" ? parseString() : parseKey()
      if (BANNED_KEYS.has(key)) return fail(`不允许的键名 "${key}"`)
      skipWs()
      if (peek() !== ':') return fail(`期望 ":"，得到 ${JSON.stringify(peek() ?? 'EOF')}`)
      i++
      obj[key] = parseAny()
      skipWs()
      if (peek() === ',') {
        i++
        skipWs()
        if (peek() === '}') {
          i++
          return obj
        }
        continue
      }
      if (peek() === '}') {
        i++
        return obj
      }
      return fail(`期望 "," 或 "}"，得到 ${JSON.stringify(peek() ?? 'EOF')}`)
    }
  }

  function parseArray(): unknown[] {
    i++
    const arr: unknown[] = []
    skipWs()
    if (peek() === ']') {
      i++
      return arr
    }
    while (true) {
      arr.push(parseAny())
      skipWs()
      if (peek() === ',') {
        i++
        skipWs()
        if (peek() === ']') {
          i++
          return arr
        }
        continue
      }
      if (peek() === ']') {
        i++
        return arr
      }
      return fail(`期望 "," 或 "]"，得到 ${JSON.stringify(peek() ?? 'EOF')}`)
    }
  }

  function parseAny(): unknown {
    skipWs()
    const ch = peek()
    if (ch === undefined) return fail('期望一个值，但已到结尾')
    if (ch === '{') return parseObject()
    if (ch === '[') return parseArray()
    if (ch === '"' || ch === "'") return parseString()
    if (ch === '-' || isDigit(ch)) return parseNumber()
    if (src.startsWith('true', i)) { i += 4; return true }
    if (src.startsWith('false', i)) { i += 5; return false }
    if (src.startsWith('null', i)) { i += 4; return null }
    return fail(`无法识别的值 ${JSON.stringify(ch)}（不允许函数或表达式）`)
  }

  try {
    const value = parseAny()
    skipWs()
    if (i < src.length) {
      return { ok: false, error: { message: `多余的内容 ${JSON.stringify(src.slice(i, i + 12))}`, index: i } }
    }
    return { ok: true, value }
  } catch (error) {
    if (error instanceof ParseError) {
      return { ok: false, error: { message: error.message, index: error.index } }
    }
    throw error
  }
}

/** 把字符下标换算成 1 起始的 行:列 */
export function lineCol(input: string, index: number): string {
  const before = input.slice(0, index)
  const line = before.split('\n').length
  const col = index - before.lastIndexOf('\n')
  return `${line} 行 ${col} 列`
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
