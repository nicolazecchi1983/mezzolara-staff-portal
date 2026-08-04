import {
  ACCESS_CAPABILITIES,
  ACCESS_ROLES,
  canAccessSectionForRole,
  canForRole,
  filterMenuForRole,
  firstAccessibleSection,
  getAccessPolicy,
  normalizeAccessRole,
} from './accessControl.js'

let activeRole = ACCESS_ROLES.READ_ONLY

export { ACCESS_CAPABILITIES, ACCESS_ROLES }

export function setAccessRole(role) {
  activeRole = normalizeAccessRole(role)
  if (typeof document !== 'undefined') {
    document.body.dataset.accessRole = activeRole
  }
  return activeRole
}

export function getAccessRole() {
  return activeRole
}

export function can(capability) {
  return canForRole(activeRole, capability)
}

export function canAccessSection(sectionKey) {
  return canAccessSectionForRole(activeRole, sectionKey)
}

export function filterAccessibleMenu(menu) {
  return filterMenuForRole(menu, activeRole)
}

export function getFirstAccessibleSection(menu, preferred = 'dashboard') {
  return firstAccessibleSection(menu, activeRole, preferred)
}

export function getCurrentAccessPolicy() {
  return getAccessPolicy(activeRole)
}

export function requireCapability(capability, message = 'Operazione non autorizzata.') {
  if (can(capability)) return true
  const error = new Error(message)
  error.name = 'AccessDeniedError'
  error.code = 'ACCESS_DENIED'
  error.capability = capability
  throw error
}
