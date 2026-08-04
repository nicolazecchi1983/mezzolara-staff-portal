const MATCH_TYPE_BY_COMPETITION = {
  campionato: 'league',
  coppa: 'cup',
  amichevole: 'friendly',
}

function matchTypeFromCompetition(value = '') {
  return MATCH_TYPE_BY_COMPETITION[String(value).trim().toLocaleLowerCase('it-IT')] || 'friendly'
}

function parseHomeAway(value = '') {
  const normalized = String(value).trim().toLocaleLowerCase('it-IT')
  if (normalized === 'trasferta') return 'away'
  if (normalized === 'campo neutro') return 'neutral'
  return 'home'
}

function buildMatchTitle(opponent, matchType) {
  const prefix = matchType === 'league' ? 'Campionato' : matchType === 'cup' ? 'Coppa' : 'Amichevole'
  return `${prefix} vs ${String(opponent || 'Da definire').trim()}`
}

function createStartAt(date, time) {
  const safeDate = String(date || '').slice(0, 10)
  const safeTime = String(time || '15:30').slice(0, 5) || '15:30'
  if (!safeDate) throw new Error('Inserisci la data della partita prima di salvare il report.')
  const value = new Date(`${safeDate}T${safeTime}:00`)
  if (Number.isNaN(value.getTime())) throw new Error('Data o ora della partita non valida.')
  return value.toISOString()
}

export function createMatchCalendarService({ createEvent, updateEvent, reloadEvents }) {
  if (typeof createEvent !== 'function' || typeof updateEvent !== 'function') {
    throw new Error('Servizio Calendario non configurato.')
  }

  return {
    async publish({ matchData = {}, activeMatch = null, calendarEvents = [] } = {}) {
      const opponent = String(matchData.opponent || activeMatch?.opponent || 'Da definire').trim()
      const date = String(matchData.date || activeMatch?.date || '').slice(0, 10)
      const time = String(matchData.time || '15:30').slice(0, 5)
      const matchType = matchTypeFromCompetition(matchData.competition)
      const homeAway = parseHomeAway(matchData.venue)
      const activeId = activeMatch?.id ? String(activeMatch.id) : ''
      const existingEvent = calendarEvents.find((event) => String(event.id) === activeId)
        || calendarEvents.find((event) => {
          if (event.type !== 'match') return false
          const eventDate = String(event.startAt || '').slice(0, 10)
          return eventDate === date
            && String(event.opponent || '').trim().toLocaleLowerCase('it-IT') === opponent.toLocaleLowerCase('it-IT')
        })

      const reportPayload = {
        type: 'match_event',
        schema_version: 1,
        match_type: matchType,
        opponent,
        home_away: homeAway,
        report_status: 'completed',
        report_saved_at: new Date().toISOString(),
        match_report: matchData,
      }

      const eventPayload = {
        title: buildMatchTitle(opponent, matchType),
        event_type: 'match',
        start_at: createStartAt(date, time),
        location: String(matchData.location || '').trim() || null,
        match_day: null,
        present_count: null,
        squad_total: null,
        training_sheet_path: null,
        notes: JSON.stringify(reportPayload),
      }

      const result = existingEvent
        ? await updateEvent(existingEvent.id, eventPayload)
        : await createEvent(eventPayload)

      if (typeof reloadEvents === 'function') await reloadEvents()

      return {
        eventId: existingEvent?.id || result?.id || null,
        created: !existingEvent,
      }
    },
  }
}
