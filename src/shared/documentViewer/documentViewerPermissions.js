import { ACCESS_CAPABILITIES, requireCapability } from '../../core/permissions.js'

export function requirePublishedDocumentView() {
  return requireCapability(
    ACCESS_CAPABILITIES.TRAINING_SHEET_VIEW_PUBLISHED,
    'Non hai i permessi per consultare questo documento.',
  )
}
