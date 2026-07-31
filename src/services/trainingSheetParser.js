const MONTHS = {
  gennaio: 0, febbraio: 1, marzo: 2, aprile: 3, maggio: 4, giugno: 5,
  luglio: 6, agosto: 7, settembre: 8, ottobre: 9, novembre: 10, dicembre: 11,
}

function clean(value = '') {
  return String(value).replace(/\s+/g, ' ').trim()
}

function normalize(value = '') {
  return clean(value).toLocaleLowerCase('it-IT')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function titleCase(value = '') {
  return clean(value).replace(/\b\w/g, letter => letter.toUpperCase())
}

function parseDate(text) {
  const value = normalize(text)
  const match = value.match(/(?:oggi\s+)?(\d{1,2})\s+(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)(?:\s+(\d{4}))?/)
  if (!match) return null
  const now = new Date()
  const year = Number(match[3] || now.getFullYear())
  const date = new Date(year, MONTHS[match[2]], Number(match[1]))
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10)
}

function parseTime(text) {
  let value = normalize(text)
  const hourWords = { una: 1, due: 2, tre: 3, quattro: 4, cinque: 5, sei: 6, sette: 7, otto: 8, nove: 9, dieci: 10, undici: 11, dodici: 12, tredici: 13, quattordici: 14, quindici: 15, sedici: 16, diciassette: 17, diciotto: 18, diciannove: 19, venti: 20 }
  Object.entries(hourWords).forEach(([word, number]) => { value = value.replace(new RegExp(`alle\\s+${word}(\\d{2})?`, 'g'), (_, minutes = '') => `alle ${number}${minutes ? `:${minutes}` : ''}`) })
  const match = value.match(/(?:alle|ore)\s+(\d{1,2})(?:[:.]?(\d{2}))?/) || value.match(/\b(\d{1,2})[:.](\d{2})\b/)
  if (!match) return null
  let hour = Number(match[1])
  const minute = Number(match[2] || 0)
  const original = normalize(text)
  const spokenHour = /alle\s+(una|due|tre|quattro|cinque|sei|sette)(?:\d{2})?/.test(original)
  if (spokenHour && hour <= 7 && !original.includes('mattina')) hour += 12
  if (hour > 23 || minute > 59) return null
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function parseLocation(text) {
  const match = clean(text).match(/(?:siamo|campo|a)\s+(?:al\s+|alla\s+)?([A-ZÀ-ÖØ-Ý][\wÀ-ÿ' -]{2,35}?)(?=\s+(?:e\s+ci\s+alleniamo|ci\s+alleniamo|alle|ore|,|\.|$))/i)
  return match ? titleCase(match[1].replace(/^a\s+/i, '')) : null
}

function parseNames(text, marker, stopMarkers) {
  const value = clean(text)
  const escapedStops = stopMarkers.map(item => item.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
  const regex = new RegExp(`${marker}[,\\s]+(.+?)(?=${escapedStops ? `(?:${escapedStops})` : '$'}|\\.|$)`, 'i')
  const match = value.match(regex)
  if (!match) return []
  return match[1]
    .replace(/\be\b/gi, ',')
    .split(',')
    .map(clean)
    .filter(Boolean)
    .map(titleCase)
}

function getNumber(text, label) {
  const match = normalize(text).match(new RegExp(`${label}\\s*(?:e|:)?\\s*(\\d)`))
  return match ? Number(match[1]) : null
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

export function parseTrainingSheetNarration(rawText) {
  const text = clean(rawText)
  const lower = normalize(text)

  const injured = parseNames(text, 'assenti per infortunio', ['saranno assenti per altri motivi', 'assenti per altri motivi', 'la seduta'])
  const absent = parseNames(text, '(?:saranno )?assenti per altri motivi', ['la seduta', 'si inizia', 'inizia'])

  const activationDuration = durationFrom(text, /attivazione[^.]{0,80}?durata\s+di\s+(\d{1,3})/) ||
    durationFrom(text, /attivazione[^.]{0,80}?(\d{1,3})(?:\s*[-–]\s*\d{1,3})?\s*minut/)

  const rotationDuration = durationFrom(text, /(?:due momenti|momenti)\s+da\s+(\d{1,3})\s+minut/) ||
    durationFrom(text, /(?:forza|tecnico)[^.]{0,100}?(\d{1,3})\s+minut/)

  const numberWords = { uno: 1, un: 1, due: 2, tre: 3, quattro: 4, cinque: 5 }
  const wordMatchTimes = lower.match(/(uno|un|due|tre|quattro|cinque)\s+tempi\s+da\s+(\d{1,3})\s+minut/)
  const matchTimes = lower.match(/(\d+)\s+tempi\s+da\s+(\d{1,3})\s+minut/) || lower.match(/(\d+)\s*[x×]\s*(\d{1,3})/) || (wordMatchTimes ? [wordMatchTimes[0], String(numberWords[wordMatchTimes[1]]), wordMatchTimes[2]] : null)
  const matchDuration = matchTimes ? Number(matchTimes[1]) * Number(matchTimes[2]) : null

  const exerciseDurations = [...lower.matchAll(/(?:dura|durata)\s+(?:di\s+)?(\d{1,3})\s+minut/g)].map(match => Number(match[1]))
  const technicalExerciseDuration = exerciseDurations.find(value => value === 10) || 10

  const secondFormat = lower.includes('5v4+1j') || lower.includes('5 v 4 + 1 j')
    ? '5v4 + 1 jolly v1'
    : lower.includes('5 contro 4')
      ? '5v4 + 1 jolly v1'
      : 'Da confermare'

  const intensity = getNumber(text, 'intensita')
  const volume = getNumber(text, 'volume')
  const focus = lower.includes('focus') && lower.includes('forza') ? 'Forza' : lower.includes('forza') ? 'Forza' : null
  const goalkeepersOnlyMatch = lower.includes('portieri solo nelle partite') || lower.includes('portieri solo nella partita')

  const phases = []
  if (activationDuration || lower.includes('attivazione')) {
    phases.push(phase(
      'Attivazione + core',
      activationDuration,
      'Attivazione e lavoro di core gestiti dal preparatore.',
      ['Attivazione', 'Core'],
      false,
    ))
  }

  if (rotationDuration || lower.includes('diviso in due gruppi')) {
    phases.push(phase(
      'Forza / tecnico-tattico a gruppi alternati',
      rotationDuration ? rotationDuration * 2 : null,
      'Due gruppi lavorano in alternanza: uno svolge forza, l’altro il blocco tecnico-tattico; al termine avviene il cambio.',
      ['Forza', 'Tecnico-tattico', 'Costruzione 3+2', 'Transizioni'],
      false,
      {
        exercises: [
          { title: '4v4 + 3 jolly', duration_minutes: technicalExerciseDuration },
          { title: secondFormat, duration_minutes: technicalExerciseDuration },
          { title: 'Recupero e cambio', duration_minutes: rotationDuration ? Math.max(rotationDuration - technicalExerciseDuration * 2, 0) : null },
        ],
      },
    ))
  }

  if (matchDuration || lower.includes('partita a tutto campo')) {
    phases.push(phase(
      'Partita a tutto campo',
      matchDuration,
      matchTimes ? `${matchTimes[1]} tempi da ${matchTimes[2]} minuti. Modulazione dei sistemi di gioco e osservazione delle caratteristiche dei giocatori.` : 'Partita a tutto campo con modulazione dei sistemi di gioco.',
      ['Partita', 'Sistemi di gioco', 'Trasferimento dei principi'],
      goalkeepersOnlyMatch || true,
      {
        coaching_points: 'Sviluppare nella partita i contenuti allenati nei giorni precedenti.',
      },
    ))
  }

  const totalDuration = phases.reduce((sum, item) => sum + (Number(item.duration_minutes) || 0), 0)
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
    objective: 'Consolidare la costruzione 3+2 e le transizioni, trasferendo nella partita i contenuti allenati nei giorni precedenti e osservando i giocatori in differenti sistemi di gioco.',
    principles: ['Costruzione 3+2', 'Transizioni', 'Applicazione dei principi allenati'],
    total_duration_minutes: totalDuration || null,
  }

  const requiredChecks = [
    ['date', 'Data allenamento'], ['time', 'Orario'], ['location', 'Campo'],
    ['focus_physical', 'Focus fisico'], ['intensity', 'Intensità'], ['volume', 'Volume'],
  ]
  requiredChecks.forEach(([key, label]) => { if (data[key] === null || data[key] === '') missing.push(label) })
  if (!phases.length) missing.push('Fasi della seduta')
  phases.forEach((item, index) => {
    if (!item.duration_minutes) missing.push(`Durata fase ${index + 1}`)
    item.exercises?.forEach((exercise) => {
      if (exercise.title === 'Da confermare') missing.push('Formato seconda esercitazione')
    })
  })

  return {
    source_text: text,
    status: missing.length ? 'da_completare' : 'pronta',
    missing_fields: [...new Set(missing)],
    data,
  }
}
