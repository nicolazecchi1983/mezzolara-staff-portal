const registry = new Map()

export function registerDocumentType(definition) {
  if (!definition?.type || typeof definition.type !== 'string') {
    throw new TypeError('Il tipo documento è obbligatorio')
  }
  if (registry.has(definition.type)) {
    throw new Error(`Tipo documento già registrato: ${definition.type}`)
  }
  const normalized = Object.freeze({
    version: 1,
    printable: true,
    ...definition,
  })
  registry.set(normalized.type, normalized)
  return normalized
}

export function getDocumentType(type) {
  return registry.get(type) || null
}

export function listDocumentTypes() {
  return [...registry.values()]
}

export function createDocumentMetadata({ id, type, title, status = 'draft', version = 1, createdAt, updatedAt } = {}) {
  if (!getDocumentType(type)) throw new Error(`Tipo documento non registrato: ${type}`)
  const now = new Date().toISOString()
  return Object.freeze({
    id: id || globalThis.crypto?.randomUUID?.() || `${type}-${Date.now()}`,
    type,
    title: String(title || 'Documento').trim(),
    status,
    version: Number(version) || 1,
    createdAt: createdAt || now,
    updatedAt: updatedAt || now,
  })
}
