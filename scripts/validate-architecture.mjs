import { readdir, readFile, stat } from 'node:fs/promises'
import { extname, join, relative, sep } from 'node:path'

const root = process.cwd()
const srcRoot = join(root, 'src')
const violations = []

const forbiddenPaths = [
  'src/components/.js',
  'src/counter.js',
  'src/services/accessControl.js',
  'src/app/accessControl.js',
  'src/assets/javascript.svg',
  'src/assets/vite.svg',
]

const allowedSupabaseImports = new Set([
  'src/supabase.js',
  'src/services/auth.js',
  'src/services/staffAdmin.js',
  'src/services/teamProfile.js',
  'src/core/storage/teamStorage.js',
  'src/modules/calendar/calendarService.js',
  'src/modules/staff/staffService.js',
  // Debito tecnico noto: da estrarre progressivamente dalla UI.
  'src/components/app.js',
  // Bootstrap applicativo: verifica configurazione e sessione.
  'src/main.js',
])

async function exists(path) {
  try {
    await stat(join(root, path))
    return true
  } catch {
    return false
  }
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const fullPath = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...await walk(fullPath))
    else files.push(fullPath)
  }
  return files
}

for (const path of forbiddenPaths) {
  if (await exists(path)) violations.push(`File obsoleto presente: ${path}`)
}

const sourceFiles = (await walk(srcRoot)).filter((file) => extname(file) === '.js')
for (const file of sourceFiles) {
  const normalized = relative(root, file).split(sep).join('/')
  const source = await readFile(file, 'utf8')

  if (source.includes('supabase.js') && !allowedSupabaseImports.has(normalized)) {
    violations.push(`Accesso Supabase fuori dai confini approvati: ${normalized}`)
  }

  if (normalized.startsWith('src/shared/') && /from ['"]\.\.\/\.\.\/modules\//.test(source)) {
    violations.push(`Shared non può dipendere dai moduli: ${normalized}`)
  }

  if (normalized.startsWith('src/core/') && /from ['"]\.\.\/modules\//.test(source)) {
    violations.push(`Core non può dipendere dai moduli: ${normalized}`)
  }
}

if (violations.length) {
  console.error('\nARCHITECTURE CHECK: FAILED\n')
  for (const violation of violations) console.error(`- ${violation}`)
  process.exit(1)
}

console.log(`ARCHITECTURE CHECK: OK (${sourceFiles.length} file JavaScript verificati)`)
