export function validateMatchReport(model) {
  const errors = []
  if (!model?.data) errors.push('Dati gara non disponibili')
  if (!model?.data?.opponent?.trim()) errors.push('Avversario non definito')
  if (!model?.data?.date) errors.push('Data gara non definita')
  if (!Array.isArray(model?.starters) || model.starters.length !== 11) errors.push('Formazione incompleta')
  return { valid: errors.length === 0, errors }
}
