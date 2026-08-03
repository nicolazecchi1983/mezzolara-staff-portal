export function validateMatchCore(data = {}) {
  const errors = []
  if (!String(data.date || '').trim()) errors.push('La data della gara è obbligatoria.')
  if (!String(data.opponent || '').trim() || data.opponent === 'Da definire') errors.push('Definisci la squadra avversaria.')
  return { valid: errors.length === 0, errors }
}
