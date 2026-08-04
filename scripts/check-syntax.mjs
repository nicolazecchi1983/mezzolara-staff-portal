import { readdir } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { extname, join } from 'node:path'

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...await walk(path))
    else if (extname(path) === '.js' || extname(path) === '.mjs') files.push(path)
  }
  return files
}

const files = [...await walk('src'), ...await walk('scripts')]
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' })
  if (result.status !== 0) process.exit(result.status ?? 1)
}
console.log(`SYNTAX CHECK: OK (${files.length} file verificati)`)
