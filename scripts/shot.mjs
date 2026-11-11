/**
 * 用 CDP 打开页面、等真实时间、截图并收集控制台错误。
 * 用法: node scripts/shot.mjs <url> <out.png> [waitMs]
 */
import { spawn } from 'node:child_process'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const [url, out, waitArg, evalExpr] = process.argv.slice(2)
if (!url || !out) {
  console.error('usage: node scripts/shot.mjs <url> <out.png> [waitMs]')
  process.exit(1)
}
const waitMs = Number(waitArg ?? 3500)
const port = 9333
const profile = mkdtempSync(join(tmpdir(), 'gsr-shot-'))

const chrome = spawn(
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--no-first-run',
    '--no-default-browser-check',
    `--window-size=1440,1000`,
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    'about:blank',
  ],
  { stdio: 'ignore' },
)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function getWsUrl() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/list`)
      const list = await res.json()
      const page = list.find((t) => t.type === 'page')
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl
    } catch {
      /* not ready */
    }
    await sleep(200)
  }
  throw new Error('chrome devtools not ready')
}

const wsUrl = await getWsUrl()
const ws = new WebSocket(wsUrl)
await new Promise((resolve, reject) => {
  ws.addEventListener('open', resolve, { once: true })
  ws.addEventListener('error', reject, { once: true })
})

let seq = 0
const pending = new Map()
const logs = []
ws.addEventListener('message', (event) => {
  const msg = JSON.parse(event.data)
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg)
    pending.delete(msg.id)
    return
  }
  if (msg.method === 'Runtime.consoleAPICalled') {
    const text = msg.params.args.map((a) => a.value ?? a.description ?? a.type).join(' ')
    logs.push(`[${msg.params.type}] ${text}`)
  }
  if (msg.method === 'Runtime.exceptionThrown') {
    const d = msg.params.exceptionDetails
    logs.push(`[exception] ${d.exception?.description ?? d.text}`)
  }
})

const send = (method, params = {}) =>
  new Promise((resolve) => {
    const id = ++seq
    pending.set(id, resolve)
    ws.send(JSON.stringify({ id, method, params }))
  })

await send('Page.enable')
await send('Runtime.enable')
await send('Page.navigate', { url })
await sleep(waitMs)

if (evalExpr) {
  const result = await send('Runtime.evaluate', { expression: evalExpr, returnByValue: true, awaitPromise: true })
  console.log('--- eval ---')
  console.log(JSON.stringify(result.result?.result?.value ?? result.result, null, 2))
  await sleep(700)
}

const shot = await send('Page.captureScreenshot', { format: 'png' })
writeFileSync(out, Buffer.from(shot.result.data, 'base64'))

console.log(`saved ${out}`)
if (logs.length) {
  console.log('--- console ---')
  for (const line of logs) console.log(line)
} else {
  console.log('console: (empty)')
}

ws.close()
chrome.kill()
try {
  rmSync(profile, { recursive: true, force: true })
} catch {
  /* ignore */
}
process.exit(0)
