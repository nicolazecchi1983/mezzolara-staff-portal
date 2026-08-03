const POSSESSION_LABELS = [
  'Costruzione da rimessa',
  'Costruzione media',
  'Sviluppo e rifinitura',
  'Finalizzazione',
  'Transizione positiva',
]

const NON_POSSESSION_LABELS = [
  'Prima pressione',
  'Blocco medio',
  'Blocco basso',
  'Transizione negativa',
]

function numericSuffix(value = '') {
  const match = String(value).match(/\d+/)
  return match ? Number(match[0]) : Number.NaN
}

function collectDynamicRows(root, selector, prefix, mapper) {
  return [...root.querySelectorAll(selector)]
    .map((row) => {
      const input = row.querySelector(`[name^="${prefix}"]`)
      const index = numericSuffix(input?.name)
      return Number.isFinite(index) ? mapper(index) : null
    })
    .filter(Boolean)
}

export function buildMatchReportModel({ data = {}, root, team = {} } = {}) {
  if (!root) throw new Error('Match report root non disponibile')

  const formationName = data.custom_formation || data.formation || '—'
  const starters = Array.from({ length: 11 }, (_, index) => ({
    number: data[`starter_number_${index}`] || '',
    name: data[`starter_${index}`] || 'Da definire',
    x: Number(data[`position_x_${index}`] || 50),
    y: Number(data[`position_y_${index}`] || 50),
  }))
  const bench = Array.from({ length: 9 }, (_, index) => ({
    number: data[`bench_number_${index}`] || '',
    name: data[`bench_${index}`] || '',
  })).filter((item) => item.name)

  const substitutions = collectDynamicRows(root, '[data-match-row="substitution"]', 'sub_minute_', (index) => ({
    minute: data[`sub_minute_${index}`],
    out: data[`sub_out_${index}`],
    in: data[`sub_in_${index}`],
    reason: data[`sub_reason_${index}`],
  })).filter((item) => item.minute || item.out || item.in)

  const goals = collectDynamicRows(root, '[data-match-row="goal"]', 'goal_minute_', (index) => ({
    minute: data[`goal_minute_${index}`],
    scorer: data[`scorer_${index}`],
    assist: data[`assist_${index}`],
  })).filter((item) => item.minute || item.scorer)

  const cards = collectDynamicRows(root, '[data-match-row="card"]', 'card_minute_', (index) => ({
    minute: data[`card_minute_${index}`],
    player: data[`card_player_${index}`],
    type: data[`card_type_${index}`],
  })).filter((item) => item.minute || item.player)

  const opponentSystems = Object.keys(data)
    .filter((key) => /^opponent_system_\d+$/.test(key))
    .sort((a, b) => numericSuffix(a) - numericSuffix(b))
    .map((key) => {
      const index = numericSuffix(key)
      return {
        system: data[key],
        minute: data[`opponent_system_minute_${index}`],
        note: data[`opponent_system_note_${index}`],
      }
    })
    .filter((item) => item.system)

  const ownNotes = Object.keys(data)
    .filter((key) => /^own_note_\d+$/.test(key) && data[key])
    .sort((a, b) => numericSuffix(a) - numericSuffix(b))
    .map((key) => data[key])

  const possessionNotes = POSSESSION_LABELS
    .map((label, index) => ({ label, note: data[`opponent_possession_note_${index}`] }))
    .filter((item) => item.note)

  const nonPossessionNotes = NON_POSSESSION_LABELS
    .map((label, index) => ({ label, note: data[`opponent_nonpossession_note_${index}`] }))
    .filter((item) => item.note)

  const setPieces = [
    data.opponent_corners ? { label: 'Calci d’angolo', note: data.opponent_corners } : null,
    data.opponent_wide_free_kicks ? { label: 'Punizioni laterali', note: data.opponent_wide_free_kicks } : null,
  ].filter(Boolean)

  const penaltySummary = data.opponent_penalty_taken
    ? [data.opponent_penalty_result, data.opponent_penalty_direction, data.opponent_penalty_note]
      .filter(Boolean)
      .join(' · ')
    : ''

  return {
    team,
    data,
    formationName,
    starters,
    bench,
    substitutions,
    goals,
    cards,
    opponentSystems,
    ownNotes,
    possessionNotes,
    nonPossessionNotes,
    setPieces,
    penaltySummary,
  }
}
