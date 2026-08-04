import assert from 'node:assert/strict'
import { createMatchCalendarService } from '../src/modules/match/matchCalendarService.js'

const baseMatch = {
  date: '2026-08-04',
  time: '15:30',
  competition: 'Campionato',
  opponent: 'Test FC',
  venue: 'Casa',
  location: 'Stadio Test',
  result_home: '2',
  result_away: '1',
}

{
  const calls = []
  const service = createMatchCalendarService({
    createEvent: async (payload) => { calls.push(['create', payload]); return { id: 'new-event-id' } },
    updateEvent: async () => { throw new Error('update non atteso') },
    reloadEvents: async () => { calls.push(['reload']) },
  })
  const result = await service.publish({ matchData: baseMatch, activeMatch: null, calendarEvents: [] })
  assert.equal(result.created, true)
  assert.equal(result.eventId, 'new-event-id')
  assert.equal(calls[0][0], 'create')
  assert.equal(calls[0][1].event_type, 'match')
  const notes = JSON.parse(calls[0][1].notes)
  assert.equal(notes.type, 'match_event')
  assert.equal(notes.report_status, 'completed')
  assert.equal(notes.opponent, 'Test FC')
}

{
  const calls = []
  const service = createMatchCalendarService({
    createEvent: async () => { throw new Error('create non atteso') },
    updateEvent: async (id, payload) => { calls.push(['update', id, payload]); return { id } },
    reloadEvents: async () => {},
  })
  const result = await service.publish({
    matchData: baseMatch,
    activeMatch: { id: 'calendar-event-id', opponent: 'Test FC', date: '2026-08-04' },
    calendarEvents: [{ id: 'calendar-event-id', type: 'match', opponent: 'Test FC', startAt: '2026-08-04T13:30:00.000Z' }],
  })
  assert.equal(result.created, false)
  assert.equal(calls[0][0], 'update')
  assert.equal(calls[0][1], 'calendar-event-id')
}

console.log('MATCH CALENDAR CHECK: OK (creazione e aggiornamento verificati)')
