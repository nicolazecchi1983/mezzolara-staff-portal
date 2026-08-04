import fs from 'node:fs'

const app = fs.readFileSync(new URL('../src/components/app.js', import.meta.url), 'utf8')
const view = fs.readFileSync(new URL('../src/modules/match/ui/matchWorkspaceView.js', import.meta.url), 'utf8')
const access = fs.readFileSync(new URL('../src/core/accessControl.js', import.meta.url), 'utf8')

const checks = [
  ['Match Library apre il workspace', app.includes('data-open-match-workspace') && app.includes("setView('match-workspace'" )],
  ['Workspace registrato nel router', app.includes("'match-workspace': matchWorkspaceView")],
  ['Workspace usa un match ID attivo', view.includes("staff-active-match") && view.includes('data-match-id')],
  ['Sezioni principali presenti', ['Convocazioni', 'Match Sheet', 'Analisi gara', 'Allegati', 'Statistiche'].every((label) => view.includes(label))],
  ['Permesso workspace collegato alla Match Library', access.includes("'match-workspace': ACCESS_CAPABILITIES.MATCH_LIBRARY_VIEW")],
  ['Sidebar raggruppa Training e Match', app.includes("label: 'Training'") && app.includes("label: 'Match'")],
  ['Convocazioni disponibili nel workspace', app.includes('function callupsView()') && view.includes("['callups', 'Convocazioni'")],
  ['Sidebar Match mostra solo Match Library', app.includes("items: [\n      ['match-library', 'Match Library', 'match-library'],\n    ]") && !app.includes("['match-sheet', 'Match Sheet', 'match-sheet']")],
  ['Convocazioni e Analisi non sono nella sidebar', !app.includes("['callups', 'Convocazioni', 'squad']") && !app.includes("['analysis', 'Analisi gara', 'analysis']")],
]

let failed = 0
for (const [label, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`)
  if (!ok) failed += 1
}
if (failed) process.exit(1)
console.log(`\nMatch workspace contract: ${checks.length}/${checks.length} controlli superati.`)
