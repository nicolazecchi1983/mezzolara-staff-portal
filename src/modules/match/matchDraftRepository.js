const DEFAULT_STORAGE_KEY = 'nz-match-sheet-editor-v2'
const LEGACY_STORAGE_KEYS = ['nz-match-sheet-editor-v1']

export function createMatchDraftRepository(storage = window.localStorage, storageKey = DEFAULT_STORAGE_KEY) {
  return {
    load() {
      const keys = [storageKey, ...LEGACY_STORAGE_KEYS]
      for (const key of keys) {
        try {
          const parsed = JSON.parse(storage.getItem(key) || 'null')
          if (parsed && typeof parsed === 'object') return parsed
        } catch (error) {
          console.warn(`Bozza Match Sheet non leggibile (${key}):`, error)
        }
      }
      return null
    },
    save(payload) {
      storage.setItem(storageKey, JSON.stringify(payload))
      LEGACY_STORAGE_KEYS.forEach((key) => storage.removeItem(key))
    },
    clear() {
      storage.removeItem(storageKey)
      LEGACY_STORAGE_KEYS.forEach((key) => storage.removeItem(key))
    },
  }
}
