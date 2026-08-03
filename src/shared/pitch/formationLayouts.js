export const COMMON_FORMATIONS = Object.freeze([
  '2-3-5','3-1-4-2','3-2-3-2','3-2-4-1','3-3-1-3','3-3-3-1','3-4-1-2',
  '3-4-2-1','3-4-3','3-5-1-1','3-5-2','3-6-1','4-1-2-1-2','4-1-2-3',
  '4-2-3-1','4-2-4','4-3-1-2','4-3-2-1','4-3-3','4-3-3 (falso 9)',
  '4-3-3 mediano','4-3-3 offensivo','4-4-1-1','4-4-2','4-4-2 rombo',
  '4-5-1','4-6-0','5-2-1-2','5-2-3','5-3-2','5-3-2 quinti','5-4-1',
  '5-4-1 difensivo','WM 3-2-2-3','Personalizzato',
])

export const FORMATION_LAYOUTS = Object.freeze({
  '4-4-2': [[50,90],[15,72],[38,72],[62,72],[85,72],[15,48],[38,48],[62,48],[85,48],[38,22],[62,22]],
  '4-3-3': [[50,90],[15,72],[38,72],[62,72],[85,72],[25,50],[50,50],[75,50],[15,22],[50,18],[85,22]],
  '4-2-3-1': [[50,90],[15,72],[38,72],[62,72],[85,72],[35,56],[65,56],[18,36],[50,34],[82,36],[50,16]],
  '4-3-1-2': [[50,90],[15,72],[38,72],[62,72],[85,72],[24,52],[50,55],[76,52],[50,34],[36,17],[64,17]],
  '4-1-4-1': [[50,90],[15,72],[38,72],[62,72],[85,72],[50,58],[15,40],[38,40],[62,40],[85,40],[50,17]],
  '3-5-2': [[50,90],[24,70],[50,73],[76,70],[12,48],[32,50],[50,56],[68,50],[88,48],[36,18],[64,18]],
  '3-4-1-2': [[50,90],[24,70],[50,73],[76,70],[15,48],[38,51],[62,51],[85,48],[50,33],[36,16],[64,16]],
  '3-4-2-1': [[50,90],[24,70],[50,73],[76,70],[15,49],[38,52],[62,52],[85,49],[32,31],[68,31],[50,14]],
  '3-4-3': [[50,90],[24,70],[50,73],[76,70],[15,48],[38,52],[62,52],[85,48],[16,20],[50,15],[84,20]],
  '5-3-2': [[50,90],[10,68],[30,72],[50,74],[70,72],[90,68],[25,49],[50,53],[75,49],[36,18],[64,18]],
  '5-4-1': [[50,90],[10,68],[30,72],[50,74],[70,72],[90,68],[15,44],[38,48],[62,48],[85,44],[50,16]],
  '4-4-1-1': [[50,90],[15,72],[38,72],[62,72],[85,72],[15,48],[38,48],[62,48],[85,48],[50,30],[50,14]],
  '4-4-2 rombo': [[50,90],[15,72],[38,72],[62,72],[85,72],[50,59],[25,46],[75,46],[50,32],[36,15],[64,15]],
  '4-3-3 mediano': [[50,90],[15,72],[38,72],[62,72],[85,72],[50,58],[28,44],[72,44],[15,20],[50,15],[85,20]],
  '4-3-3 offensivo': [[50,90],[15,72],[38,72],[62,72],[85,72],[25,50],[50,44],[75,50],[15,18],[50,12],[85,18]],
  '4-3-3 (falso 9)': [[50,90],[15,72],[38,72],[62,72],[85,72],[25,51],[50,55],[75,51],[17,20],[50,30],[83,20]],
  '3-5-2 quinti': [[50,90],[24,70],[50,73],[76,70],[8,45],[32,52],[50,58],[68,52],[92,45],[36,17],[64,17]],
  '5-4-1 difensivo': [[50,90],[10,72],[30,75],[50,77],[70,75],[90,72],[15,52],[38,54],[62,54],[85,52],[50,23]],
  'WM 3-2-2-3': [[50,90],[24,70],[50,73],[76,70],[35,55],[65,55],[35,38],[65,38],[15,18],[50,14],[85,18]],
})

export function normalizeFormationName(value) {
  return String(value || '').trim().replace(/\s+/g, ' ')
}

export function parseFormationLines(value) {
  const normalized = normalizeFormationName(value)
    .replace(/^WM\s*/i, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/\b(mediano|offensivo|difensivo|quinti|rombo|wide|attacking|diamond|wingbacks|false\s*9|falso\s*9)\b/gi, '')
    .trim()
  const match = normalized.match(/\d+(?:-\d+)+/)
  if (!match) return null
  const lines = match[0].split('-').map(Number)
  if (!lines.length || lines.some((n) => !Number.isInteger(n) || n < 0 || n > 6)) return null
  if (lines.reduce((sum, current) => sum + current, 0) !== 10) return null
  return lines
}

function buildLayoutFromLines(lines) {
  const result = [[50, 90]]
  const activeLines = lines.filter((count) => count > 0)
  if (!activeLines.length) return null
  const yBottom = 71
  const yTop = 17
  let activeIndex = 0
  lines.forEach((count) => {
    if (count <= 0) return
    const y = activeLines.length === 1
      ? 44
      : yBottom - ((yBottom - yTop) * activeIndex / (activeLines.length - 1))
    for (let index = 0; index < count; index += 1) {
      result.push([100 * (index + 1) / (count + 1), y])
    }
    activeIndex += 1
  })
  return result.length === 11 ? result : null
}

export function getCustomFormationLayout(value) {
  const lines = parseFormationLines(value)
  return lines ? buildLayoutFromLines(lines) : null
}

export function getFormationLayout(formation, fallback = '4-4-2') {
  const normalized = normalizeFormationName(formation)
  const explicit = FORMATION_LAYOUTS[normalized]
  if (explicit) return explicit.map(([x, y]) => [x, y])
  const generated = getCustomFormationLayout(normalized)
  if (generated) return generated
  const fallbackLayout = FORMATION_LAYOUTS[fallback] || FORMATION_LAYOUTS['4-4-2']
  return fallbackLayout.map(([x, y]) => [x, y])
}
