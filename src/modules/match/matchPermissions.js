import { ACCESS_CAPABILITIES, can } from '../../core/permissions.js'

export const canViewMatchSheet = () => can(ACCESS_CAPABILITIES.MATCH_SHEET_VIEW)
export const canEditMatchSheet = () => can(ACCESS_CAPABILITIES.MATCH_SHEET_EDIT)
export const canPublishMatchSheet = () => can(ACCESS_CAPABILITIES.MATCH_SHEET_PUBLISH)
