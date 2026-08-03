const STORAGE_KEY = 'staff-match-library-v1'

export function createMatchLibraryRepository(storage = window.localStorage) {
  const read = () => {
    try {
      const value = JSON.parse(storage.getItem(STORAGE_KEY) || '[]')
      return Array.isArray(value) ? value : []
    } catch (error) {
      console.warn('Match Library non leggibile:', error)
      return []
    }
  }

  const write = (records) => storage.setItem(STORAGE_KEY, JSON.stringify(records))

  return {
    list: read,
    save(record) {
      const records = read()
      const index = records.findIndex((item) => item.id === record.id)
      if (index >= 0) records[index] = record
      else records.push(record)
      write(records)
      return record
    },
    remove(id) {
      write(read().filter((item) => item.id !== id))
    },
  }
}
