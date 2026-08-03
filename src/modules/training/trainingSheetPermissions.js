import { ACCESS_CAPABILITIES, can, requireCapability } from '../../core/permissions.js'

export function requireTrainingSheetPublishPermission() {
  return requireCapability(
    ACCESS_CAPABILITIES.TRAINING_SHEET_PUBLISH,
    'Non hai i permessi per pubblicare o aggiornare una Training Sheet.',
  )
}

export function canPublishTrainingSheet() {
  return can(ACCESS_CAPABILITIES.TRAINING_SHEET_PUBLISH)
}
