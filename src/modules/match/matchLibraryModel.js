export const MATCH_LIBRARY_SCHEMA_VERSION = 1

export function normalizeMatchRecord(input = {}) {
  const now = new Date().toISOString()
  return {
    id: String(input.id || globalThis.crypto?.randomUUID?.() || `match-${Date.now()}`),
    source: input.source === 'calendar' ? 'calendar' : 'library',
    season: String(input.season || '').trim(),
    competition: String(input.competition || 'Campionato').trim(),
    matchDay: input.matchDay === '' || input.matchDay == null ? null : Number(input.matchDay),
    date: String(input.date || '').slice(0, 10),
    time: String(input.time || '').slice(0, 5),
    venue: String(input.venue || '').trim(),
    homeAway: input.homeAway === 'away' ? 'away' : 'home',
    opponent: String(input.opponent || 'Da definire').trim(),
    goalsFor: input.goalsFor === '' || input.goalsFor == null ? null : Number(input.goalsFor),
    goalsAgainst: input.goalsAgainst === '' || input.goalsAgainst == null ? null : Number(input.goalsAgainst),
    status: ['scheduled', 'played', 'cancelled'].includes(input.status) ? input.status : 'scheduled',
    notes: String(input.notes || '').trim(),
    documentStatus: String(input.documentStatus || 'Da compilare'),
    createdAt: input.createdAt || now,
    updatedAt: now,
    _schemaVersion: MATCH_LIBRARY_SCHEMA_VERSION,
  }
}

export function calendarEventToMatch(event, season = '') {
  return normalizeMatchRecord({
    id: event.id,
    source: 'calendar',
    season,
    competition: event.matchType === 'friendly' ? 'Amichevole' : event.matchType === 'cup' ? 'Coppa' : 'Campionato',
    matchDay: event.matchDay,
    date: event.startAt,
    time: event.time,
    venue: event.place,
    opponent: event.opponent || 'Da definire',
    status: new Date(event.startAt) < new Date() ? 'played' : 'scheduled',
    documentStatus: event.matchReportStatus === 'completed' ? 'Report salvato' : 'Match Sheet disponibile',
  })
}

export function getMatchOutcome(match) {
  if (match.goalsFor == null || match.goalsAgainst == null) return 'pending'
  if (match.goalsFor > match.goalsAgainst) return 'win'
  if (match.goalsFor < match.goalsAgainst) return 'loss'
  return 'draw'
}
