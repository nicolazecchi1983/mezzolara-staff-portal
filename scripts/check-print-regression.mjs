import { readFile } from 'node:fs/promises'

const [printHtml, css] = await Promise.all([
  readFile(new URL('../public/print.html', import.meta.url), 'utf8'),
  readFile(new URL('../src/style.css', import.meta.url), 'utf8'),
])

const checks = [
  [printHtml.includes('document.documentElement.className = printClass'), 'print.html assegna la classe di stampa a <html>'],
  [printHtml.includes('document.body.className = printClass'), 'print.html assegna la classe di stampa a <body>'],
  [/body\.match-print-body\s+#printRoot\s*,\s*body\.match-print-body\s+#printRoot\s+\*/s.test(css), 'il Match Report forza visibile il contenuto di #printRoot'],
  [/html\.match-print-body[\s\S]*?height:\s*auto\s*!important/s.test(css), 'la pagina Match Report annulla l’altezza A4 rigida'],
  [/body\.match-print-body\s+#printRoot[\s\S]*?overflow:\s*visible\s*!important/s.test(css), 'il Match Report non viene tagliato'],
]

const failed = checks.filter(([ok]) => !ok)
for (const [ok, label] of checks) console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`)
if (failed.length) process.exit(1)
console.log(`\nPrint regression contract: ${checks.length}/${checks.length} controlli superati.`)
