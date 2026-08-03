import { collectMatchFormData, getMatchDraftPayload } from './matchModel.js'
import { createMatchDraftRepository } from './matchDraftRepository.js'

export function createMatchDraftService({ storage = window.localStorage } = {}) {
  const repository = createMatchDraftRepository(storage)
  return {
    collect(form) {
      return collectMatchFormData(form)
    },
    save(form) {
      const payload = collectMatchFormData(form)
      repository.save(payload)
      return payload
    },
    load() {
      return getMatchDraftPayload(repository.load())
    },
    clear() {
      repository.clear()
    },
  }
}
