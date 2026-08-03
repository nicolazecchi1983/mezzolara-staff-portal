import { ACCESS_CAPABILITIES, can, getAccessRole } from './permissions.js'

const MUTATION_LABEL_PATTERN = /^(salva|crea|nuov|aggiung|elimina|rimuovi|reset|azzera|pubblica|modifica|importa|conferma|aggiorna|carica|genera)/i

export function accessDeniedMessage() {
  return can(ACCESS_CAPABILITIES.SPORT_MUTATE)
    ? 'Non hai i permessi necessari per questa operazione.'
    : 'Account in sola lettura: le modifiche non sono consentite.'
}

export function showAccessNotice(message = accessDeniedMessage()) {
  let notice = document.querySelector('[data-access-notice]')
  if (!notice) {
    notice = document.createElement('div')
    notice.dataset.accessNotice = 'true'
    notice.className = 'access-notice'
    notice.setAttribute('role', 'status')
    document.body.appendChild(notice)
  }

  notice.textContent = message
  notice.classList.add('is-visible')
  clearTimeout(showAccessNotice.timeoutId)
  showAccessNotice.timeoutId = setTimeout(() => notice.classList.remove('is-visible'), 3200)
}

export function isMutationControl(element) {
  const control = element?.closest?.('button, input[type="submit"], input[type="button"], [role="button"]')
  if (!control) return false
  if (control.closest('[data-profile-form], [data-password-form]')) return false
  if (control.matches('[data-open-profile], [data-profile-action]')) return false
  const label = String(control.textContent || control.value || control.getAttribute('aria-label') || '').trim()
  return control.type === 'submit' || MUTATION_LABEL_PATTERN.test(label)
}

export function applyAccessPolicy(scope = document) {
  document.body.dataset.accessRole = getAccessRole()
  if (can(ACCESS_CAPABILITIES.SPORT_MUTATE)) return

  const view = scope.matches?.('#viewRoot') ? scope : scope.querySelector?.('#viewRoot')
  if (!view) return

  view.querySelectorAll('input, select, textarea, [contenteditable="true"]').forEach((field) => {
    if (field.closest('[data-profile-form], [data-password-form]')) return
    if (field.matches('[type="search"], [data-library-search]')) return
    field.disabled = true
    field.setAttribute('aria-disabled', 'true')
  })

  view.querySelectorAll('button, input[type="submit"], input[type="button"]').forEach((control) => {
    if (!isMutationControl(control)) return
    control.disabled = true
    control.setAttribute('aria-disabled', 'true')
    control.title = 'Disponibile solo con accesso di modifica'
  })
}

export function bindGlobalAccessGuard() {
  if (document.documentElement.dataset.accessGuardBound) return
  document.documentElement.dataset.accessGuardBound = 'true'

  document.addEventListener('click', (event) => {
    if (can(ACCESS_CAPABILITIES.SPORT_MUTATE)) return
    if (!isMutationControl(event.target)) return
    event.preventDefault()
    event.stopImmediatePropagation()
    showAccessNotice()
  }, true)

  document.addEventListener('submit', (event) => {
    if (can(ACCESS_CAPABILITIES.SPORT_MUTATE)) return
    if (event.target?.matches?.('[data-profile-form], [data-password-form]')) return
    event.preventDefault()
    event.stopImmediatePropagation()
    showAccessNotice()
  }, true)
}
