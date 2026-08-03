export const MATCH_DRAFT_SCHEMA_VERSION = 2

export function normalizeScore(home, away) {
  const left = String(home ?? '').trim()
  const right = String(away ?? '').trim()
  return left || right ? `${left || 0}-${right || 0}` : ''
}

export function collectMatchFormData(form) {
  if (!form) return {}
  if (form.elements.result) {
    form.elements.result.value = normalizeScore(form.elements.result_home?.value, form.elements.result_away?.value)
  }
  if (form.elements.half_result) {
    form.elements.half_result.value = normalizeScore(form.elements.half_result_home?.value, form.elements.half_result_away?.value)
  }

  const data = Object.fromEntries(new FormData(form).entries())
  form.querySelectorAll('input[type="checkbox"]').forEach((input) => {
    data[input.name] = input.checked
  })

  return {
    _schemaVersion: MATCH_DRAFT_SCHEMA_VERSION,
    ...data,
  }
}

export function getMatchDraftPayload(raw) {
  if (!raw || typeof raw !== 'object') return null
  const { _schemaVersion, ...data } = raw
  return data
}
