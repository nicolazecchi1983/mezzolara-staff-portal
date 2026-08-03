export function normalizeTrainingSheetData(input = {}) {
  const progressive = Math.max(1, Number(input.progressive || 1))
  return {
    ...input,
    progressive,
    date: String(input.date || ''),
    time: String(input.time || ''),
    location: String(input.location || '').trim(),
    present: Math.max(0, Number(input.present || 0)),
    phases: Array.isArray(input.phases) ? input.phases : [],
    pillars: Array.isArray(input.pillars) ? input.pillars : [],
  }
}

export function validateTrainingSheetForPublish(data) {
  const missing = []
  if (!data.date) missing.push('data')
  if (!data.time) missing.push('orario')
  if (!data.location) missing.push('campo')
  if (missing.length) {
    throw new Error(`Completa ${missing.join(', ')} prima di creare il PDF.`)
  }
}

export function buildTrainingSheetFileName(data) {
  const progressive = String(Number(data.progressive || 1)).padStart(3, '0')
  const [year = '', month = '', day = ''] = String(data.date || '').split('-')
  return `ALL_${progressive} - ${day}${month}${year}.pdf`
}

export function sanitizePathSegment(value, fallback = 'unknown') {
  const normalized = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return normalized || fallback
}

export function buildTrainingSheetStoragePath({ teamId, season, date, fileName }) {
  if (!teamId) throw new Error('Squadra non disponibile: impossibile pubblicare la Training Sheet.')
  const version = new Date().toISOString().replace(/[:.]/g, '-')
  return [
    teamId,
    sanitizePathSegment(season, 'stagione'),
    sanitizePathSegment(date, 'senza-data'),
    `${version}-${fileName}`,
  ].join('/')
}

export function buildTrainingSheetEventPayload({ data, filePath, squadTotal }) {
  return {
    title: 'Allenamento',
    event_type: 'training',
    start_at: new Date(`${data.date}T${data.time}:00`).toISOString(),
    location: data.location || null,
    match_day: data.match_day || null,
    present_count: Number(data.present) || 0,
    squad_total: Number(squadTotal) || 0,
    training_sheet_path: filePath,
    notes: JSON.stringify({
      type: 'training_sheet_editor',
      version: 2,
      data,
    }),
  }
}
