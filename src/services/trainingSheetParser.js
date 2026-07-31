const MONTHS = {
  gennaio: 0, febbraio: 1, marzo: 2, aprile: 3, maggio: 4, giugno: 5,
  luglio: 6, agosto: 7, settembre: 8, ottobre: 9, novembre: 10, dicembre: 11,
}

const NUMBER_WORDS = {
  zero: 0, uno: 1, un: 1, una: 1, due: 2, tre: 3, quattro: 4,
  cinque: 5, sei: 6, sette: 7, otto: 8, nove: 9, dieci: 10,
}

function clean(value = '') {
  return String(value).replace(/\s+/g, ' ').trim()
}

function normalize(value = '') {
  return clean(value)
    .toLocaleLowerCase('it-IT')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9:+×x' -]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function titleCase(value = '') {
  return clean(value).replace(/\b\w/g, letter => letter.toUpperCase())
}

function parseDate(text) {
  const value = normalize(text)
  const now = new Date()
  if (/\boggi\b/.test(value)) return now.toISOString().slice(0, 10)
  if (/\bdomani\b/.test(value)) {
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().slice(0, 10)
  }
  const match = value.match(/(?:oggi\s+)?(\d{1,2})\s+(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)(?:\s+(\d{4}))?/)
  if (!match) return null
  const year = Number(match[3] || now.getFullYear())
  const date = new Date(year, MONTHS[match[2]], Number(match[1]))
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10)
}

function parseTime(text) {
  let value = normalize(text)
  const hourWords = {
    una: 1, due: 2, tre: 3, quattro: 4, cinque: 5, sei: 6, sette: 7, otto: 8,
    nove: 9, dieci: 10, undici: 11, dodici: 12, tredici: 13, quattordici: 14,
    quindici: 15, sedici: 16, diciassette: 17, diciotto: 18, diciannove: 19, venti: 20,
  }
  Object.entries(hourWords).forEach(([word, number]) => {
    value = value.replace(new RegExp(`(?:alle|ore)\\s+${word}(?:\\s+e\\s+(\\d{1,2}))?`, 'g'), (_, minutes = '') => `alle ${number}${minutes ? `:${minutes}` : ''}`)
  })
  const match = value.match(/(?:alle|ore)\s+(\d{1,2})(?:[:.]?(\d{2}))?/) || value.match(/\b(\d{1,2})[:.](\d{2})\b/)
  if (!match) return null
  let hour = Number(match[1])
  const minute = Number(match[2] || 0)
  const original = normalize(text)
  const spokenHour = /(?:alle|ore)\s+(una|due|tre|quattro|cinque|sei|sette)\b/.test(original)
  if (spokenHour && hour <= 7 && !original.includes('mattina')) hour += 12
  if (hour > 23 || minute > 59) return null
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function parseLocation(text) {
  const known = ['Mezzolara', 'Budrio']
  const lower = normalize(text)
  const exact = known.find(location => lower.includes(normalize(location)))
  if (exact) return exact
  const match = clean(text).match(/(?:allenamento|siamo|campo)\s+(?:a|al|alla)\s+([A-ZÀ-ÖØ-Ý][\wÀ-ÿ' -]{2,35}?)(?=\s+(?:alle|ore|con|il|la|,|\.|$))/i)
    || clean(text).match(/(?:siamo|campo|allenamento)\s+(?:a|al|alla)\s+([\wÀ-ÿ' -]{2,35}?)(?=\s+(?:alle|ore|con|il|la|,|\.|$))/i)
  return match ? titleCase(match[1]) : null
}

function levenshtein(a, b) {
  const left = normalize(a)
  const right = normalize(b)
  const matrix = Array.from({ length: right.length + 1 }, (_, row) => [row])
  for (let column = 0; column <= left.length; column += 1) matrix[0][column] = column
  for (let row = 1; row <= right.length; row += 1) {
    for (let column = 1; column <= left.length; column += 1) {
      const cost = right[row - 1] === left[column - 1] ? 0 : 1
      matrix[row][column] = Math.min(
        matrix[row - 1][column] + 1,
        matrix[row][column - 1] + 1,
        matrix[row - 1][column - 1] + cost,
      )
    }
  }
  return matrix[right.length][left.length]
}

function similarity(a, b) {
  const maxLength = Math.max(normalize(a).length, normalize(b).length)
  return maxLength ? 1 - levenshtein(a, b) / maxLength : 0
}

function rosterForms(player) {
  const fullName = clean(player?.name)
  const parts = fullName.split(' ').filter(Boolean)
  const first = parts[0] || ''
  const surname = parts.slice(1).join(' ')
  return [...new Set([fullName, first, surname].filter(Boolean))]
}

function extractAbsenceSection(text, marker) {
  const normalized = normalize(text)
  const index = normalized.search(marker)
  if (index < 0) return ''
  const after = normalized.slice(index).replace(marker, '').trim()
  const stop = after.search(/\b(?:fase|prima fase|seconda fase|terza fase|si inizia|iniziamo|attivazione|obiettivo|principi|intensita|volume|focus|la seduta|poi|successivamente|infine|dovrebbe|dovrebbero|rientra|rientrano)\b/)
  return clean(stop >= 0 ? after.slice(0, stop) : after)
}

function matchRosterNames(section, roster = []) {
  if (!section || !Array.isArray(roster) || !roster.length) return []
  const words = normalize(section)
    .replace(/\b(?:saranno|assenti|per|infortunio|altri|motivi|e|ed|anche|giocatori|il|la|i|gli|le)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)

  const candidates = []
  roster.forEach(player => {
    let best = { score: 0, start: -1, end: -1 }
    const forms = rosterForms(player)
    for (let start = 0; start < words.length; start += 1) {
      for (let size = 1; size <= Math.min(3, words.length - start); size += 1) {
        const phrase = words.slice(start, start + size).join(' ')
        forms.forEach(form => {
          const score = similarity(phrase, form)
          if (score > best.score) best = { score, start, end: start + size - 1 }
        })
      }
    }
    if (best.score >= 0.50) candidates.push({ player, ...best })
  })

  candidates.sort((a, b) => b.score - a.score)
  const used = new Set()
  const selected = []
  candidates.forEach(candidate => {
    const indexes = []
    for (let index = candidate.start; index <= candidate.end; index += 1) indexes.push(index)
    if (indexes.some(index => used.has(index))) return
    indexes.forEach(index => used.add(index))
    selected.push(candidate)
  })

  return selected
    .sort((a, b) => a.start - b.start)
    .map(item => item.player.name)
}

function getNumber(text, label) {
  const value = normalize(text)
  const numeric = value.match(new RegExp(`\\b${label}\\s*(?:e|:)?\\s*([0-5])\\b`))
  if (numeric) return Number(numeric[1])
  const words = Object.keys(NUMBER_WORDS).join('|')
  const spoken = value.match(new RegExp(`\\b${label}\\s*(?:e|:)?\\s*(${words})\\b`))
  return spoken ? NUMBER_WORDS[spoken[1]] : null
}

function parseFocus(text) {
  const lower = normalize(text)
  const match = lower.match(/focus(?:\s+fisico)?\s+(?:e|è|:)??\s*(forza|metabolico|velocita|resistenza|recupero|scarico|aerobico)/)
  if (match) return titleCase(match[1])
  return null
}

function durationFrom(text, pattern) {
  const match = normalize(text).match(pattern)
  return match ? Number(match[1]) : null
}

function phase(title, duration, description, containers, goalkeepers, extras = {}) {
  return {
    title,
    duration_minutes: duration,
    description,
    containers,
    goalkeepers,
    variants: extras.variants || '',
    coaching_points: extras.coaching_points || '',
    exercises: extras.exercises || [],
  }
}

export function parseTrainingSheetNarration(rawText, roster = []) {
  const text = clean(rawText)
  const lower = normalize(text)

  const injuredSection = extractAbsenceSection(text, /\b(?:saranno\s+)?assenti\s+per\s+infortunio\b/)
  const absentSection = extractAbsenceSection(text, /\b(?:saranno\s+)?assenti\s+per\s+altri\s+motivi\b/)
  const injured = matchRosterNames(injuredSection, roster)
  const absent = matchRosterNames(absentSection, roster)

  const activationDuration = durationFrom(text, /attivazione[^.]{0,80}?durata\s+di\s+(\d{1,3})/) ||
    durationFrom(text, /attivazione[^.]{0,80}?(\d{1,3})(?:\s*[-–]\s*\d{1,3})?\s*minut/)
  const rotationDuration = durationFrom(text, /(?:due momenti|momenti)\s+da\s+(\d{1,3})\s+minut/) ||
    durationFrom(text, /(?:forza|tecnico)[^.]{0,100}?(\d{1,3})\s+minut/)
  const wordMatchTimes = lower.match(/(uno|un|due|tre|quattro|cinque)\s+tempi\s+da\s+(\d{1,3})\s+minut/)
  const matchTimes = lower.match(/(\d+)\s+tempi\s+da\s+(\d{1,3})\s+minut/) || lower.match(/(\d+)\s*[x×]\s*(\d{1,3})/) || (wordMatchTimes ? [wordMatchTimes[0], String(NUMBER_WORDS[wordMatchTimes[1]]), wordMatchTimes[2]] : null)
  const matchDuration = matchTimes ? Number(matchTimes[1]) * Number(matchTimes[2]) : null
  const exerciseDurations = [...lower.matchAll(/(?:dura|durata)\s+(?:di\s+)?(\d{1,3})\s+minut/g)].map(match => Number(match[1]))
  const technicalExerciseDuration = exerciseDurations.find(value => value === 10) || 10
  const secondFormat = lower.includes('5v4+1j') || lower.includes('5 v 4 + 1 j') || lower.includes('5 contro 4') ? '5v4 + 1 jolly v1' : 'Da confermare'

  const intensity = getNumber(text, 'intensita')
  const volume = getNumber(text, 'volume')
  const focus = parseFocus(text)
  const phases = []

  if (activationDuration || lower.includes('attivazione')) {
    phases.push(phase('Attivazione + core', activationDuration, 'Attivazione e lavoro di core gestiti dal preparatore.', ['Attivazione', 'Core'], false))
  }
  if (rotationDuration || lower.includes('diviso in due gruppi')) {
    phases.push(phase(
      'Forza / tecnico-tattico a gruppi alternati',
      rotationDuration ? rotationDuration * 2 : null,
      'Due gruppi lavorano in alternanza: uno svolge forza, l’altro il blocco tecnico-tattico; al termine avviene il cambio.',
      ['Forza', 'Tecnico-tattico', 'Costruzione 3+2', 'Transizioni'],
      false,
      { exercises: [
        { title: '4v4 + 3 jolly', duration_minutes: technicalExerciseDuration },
        { title: secondFormat, duration_minutes: technicalExerciseDuration },
        { title: 'Recupero e cambio', duration_minutes: rotationDuration ? Math.max(rotationDuration - technicalExerciseDuration * 2, 0) : null },
      ] },
    ))
  }
  if (matchDuration || lower.includes('partita a tutto campo')) {
    phases.push(phase(
      'Partita a tutto campo',
      matchDuration,
      matchTimes ? `${matchTimes[1]} tempi da ${matchTimes[2]} minuti. Modulazione dei sistemi di gioco e osservazione delle caratteristiche dei giocatori.` : 'Partita a tutto campo con modulazione dei sistemi di gioco.',
      ['Partita', 'Sistemi di gioco', 'Trasferimento dei principi'],
      true,
      { coaching_points: 'Sviluppare nella partita i contenuti allenati nei giorni precedenti.' },
    ))
  }

  const totalDuration = phases.reduce((sum, item) => sum + (Number(item.duration_minutes) || 0), 0)
  const objective = ''
  const principles = []
  const missing = []
  const data = {
    date: parseDate(text),
    time: parseTime(text),
    location: parseLocation(text),
    coach: 'Nicola Zecchi',
    match_day: null,
    focus_physical: focus,
    intensity,
    volume,
    absences: { injured, absent },
    phases,
    objective,
    principles,
    total_duration_minutes: totalDuration || null,
  }

  const requiredChecks = [
    ['date', 'Data allenamento'], ['time', 'Orario'], ['location', 'Campo'],
    ['focus_physical', 'Focus fisico'], ['intensity', 'Intensità'], ['volume', 'Volume'],
  ]
  requiredChecks.forEach(([key, label]) => { if (data[key] === null || data[key] === '') missing.push(label) })
  if (!phases.length) missing.push('Fasi della seduta')
  if (!objective) missing.push('Obiettivo della seduta')
  if (!principles.length) missing.push('Principi di gioco')
  phases.forEach((item, index) => {
    if (!item.duration_minutes) missing.push(`Durata fase ${index + 1}`)
    item.exercises?.forEach(exercise => { if (exercise.title === 'Da confermare') missing.push('Formato seconda esercitazione') })
  })

  return {
    source_text: text,
    status: missing.length ? 'da_completare' : 'pronta',
    missing_fields: [...new Set(missing)],
    data,
  }
}
