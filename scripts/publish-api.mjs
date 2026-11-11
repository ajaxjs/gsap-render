/**
 * 通过 GitHub API 发布（绕开 git push 的网络问题）。
 * 用法：node scripts/publish-api.mjs
 * 依赖：本地已 commit 的 git 仓库、GCM 中保存的 github.com 凭据。
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const OWNER = process.env.GH_OWNER || 'ajaxjs'
const REPO = process.env.GH_REPO || 'gsap-render'

function getToken() {
  const out = execFileSync('git', ['credential', 'fill'], {
    input: 'protocol=https\nhost=github.com\n\n',
    encoding: 'utf8',
  })
  const match = /password=(.+)/.exec(out)
  if (!match) throw new Error('no github credential')
  return match[1].trim()
}

const TOKEN = getToken()

async function api(path, method = 'GET', body) {
  const res = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'gsap-render-publish',
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${text}`)
  return text ? JSON.parse(text) : {}
}

async function mapLimit(items, limit, fn) {
  const results = new Array(items.length)
  let cursor = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++
      results[index] = await fn(items[index], index)
    }
  })
  await Promise.all(workers)
  return results
}

async function ensureInitialCommit() {
  try {
    return (await api(`/repos/${OWNER}/${REPO}/git/ref/heads/main`)).object.sha
  } catch {
    const content = Buffer.from('init\n').toString('base64')
    await api(`/repos/${OWNER}/${REPO}/contents/.init`, 'PUT', { message: 'init', content })
    return (await api(`/repos/${OWNER}/${REPO}/git/ref/heads/main`)).object.sha
  }
}

async function publishBranch(branch, entries, message, parents) {
  const blobs = await mapLimit(entries, 6, async (entry) => {
    const content = readFileSync(join(process.cwd(), entry.file)).toString('base64')
    const blob = await api(`/repos/${OWNER}/${REPO}/git/blobs`, 'POST', { content, encoding: 'base64' })
    return { path: entry.path, mode: '100644', type: 'blob', sha: blob.sha }
  })

  const tree = await api(`/repos/${OWNER}/${REPO}/git/trees`, 'POST', { tree: blobs })
  const commit = await api(`/repos/${OWNER}/${REPO}/git/commits`, 'POST', {
    message,
    tree: tree.sha,
    parents: parents ?? [],
  })

  try {
    await api(`/repos/${OWNER}/${REPO}/git/refs`, 'POST', { ref: `refs/heads/${branch}`, sha: commit.sha })
    console.log(`[${branch}] created ${commit.sha.slice(0, 7)} (${entries.length} files)`)
  } catch (error) {
    if (!String(error.message).includes('422')) throw error
    await api(`/repos/${OWNER}/${REPO}/git/refs/heads/${branch}`, 'PATCH', { sha: commit.sha, force: true })
    console.log(`[${branch}] updated ${commit.sha.slice(0, 7)} (${entries.length} files)`)
  }
}

function walk(dir, base = dir) {
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(full, base))
    else out.push({ path: full.slice(base.length + 1).replaceAll('\\', '/'), file: full })
  }
  return out
}

const tracked = execFileSync('git', ['ls-files'], { encoding: 'utf8' })
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean)
  .map((path) => ({ path, file: path }))

const mode = process.argv[2] || 'main'

if (mode === 'pages') {
  const files = walk('dist')
  await publishBranch('gh-pages', files, 'deploy demo', [])
} else if (mode === 'tag') {
  const ref = await api(`/repos/${OWNER}/${REPO}/git/ref/heads/main`)
  try {
    await api(`/repos/${OWNER}/${REPO}/git/refs`, 'POST', { ref: 'refs/tags/v0.1.0', sha: ref.object.sha })
    console.log(`tag v0.1.0 -> ${ref.object.sha.slice(0, 7)}`)
  } catch (error) {
    if (!String(error.message).includes('422')) throw error
    console.log('tag v0.1.0 already exists')
  }
} else {
  const parent = await ensureInitialCommit()
  await publishBranch('main', tracked, 'feat: declarative GSAP renderer + Vue demo', [parent])
}
console.log('done')
