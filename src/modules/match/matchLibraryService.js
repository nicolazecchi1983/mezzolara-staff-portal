import { calendarEventToMatch, normalizeMatchRecord } from './matchLibraryModel.js'
import { createMatchLibraryRepository } from './matchLibraryRepository.js'

export function createMatchLibraryService({ storage = window.localStorage } = {}) {
  const repository = createMatchLibraryRepository(storage)
  return {
    list(calendarEvents = [], season = '') {
      const stored = repository.list().map(normalizeMatchRecord)
      const calendarMatches = calendarEvents
        .filter((event) => event.type === 'match')
        .map((event) => calendarEventToMatch(event, season))
      const storedIds = new Set(stored.map((item) => item.id))
      return [...stored, ...calendarMatches.filter((item) => !storedIds.has(item.id))]
        .sort((a, b) => `${b.date}T${b.time || '00:00'}`.localeCompare(`${a.date}T${a.time || '00:00'}`))
    },
    create(input) {
      const record = normalizeMatchRecord(input)
      repository.save(record)
      return record
    },
    remove(id) {
      repository.remove(id)
    },
  }
}
