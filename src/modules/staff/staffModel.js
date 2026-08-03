const TECHNICAL_ROLES = Object.freeze([
  ['coach', 'Allenatore'],
  ['assistant', 'Vice allenatore'],
  ['athletic_coach', 'Preparatore fisico'],
  ['goalkeeper_coach', 'Preparatore portieri'],
  ['analyst', 'Match analyst'],
  ['observer', 'Osservatore'],
  ['physio', 'Fisioterapista'],
  ['collaborator', 'Collaboratore tecnico'],
  ['sporting_director', 'Direttore sportivo'],
])

const ACCESS_LEVELS = Object.freeze([
  ['admin', 'Amministratore'],
  ['collaborator', 'Collaboratore'],
  ['read_only', 'Solo lettura'],
])

export function technicalRoleOptions(selected = 'observer') {
  return TECHNICAL_ROLES
    .map(([value, label]) => {
      const isSelected = selected === value || (selected === 'owner' && value === 'coach')
      return `<option value="${value}" ${isSelected ? 'selected' : ''}>${label}</option>`
    })
    .join('')
}

export function appRoleOptions(selected = 'collaborator', { includeOwner = false } = {}) {
  const options = includeOwner
    ? [['owner', 'Proprietario'], ...ACCESS_LEVELS]
    : ACCESS_LEVELS
  return options
    .map(([value, label]) => `<option value="${value}" ${selected === value ? 'selected' : ''}>${label}</option>`)
    .join('')
}

export function accessLevelLabel(level = 'read_only') {
  return ({
    owner: 'Proprietario',
    admin: 'Amministratore',
    collaborator: 'Collaboratore',
    read_only: 'Solo lettura',
  })[level] || 'Solo lettura'
}
