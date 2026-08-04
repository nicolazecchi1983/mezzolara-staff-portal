function safeDateLabel(value) {
  if (!value) return 'Data da definire'
  try {
    return new Intl.DateTimeFormat('it-IT', {
      weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
    }).format(new Date(`${value}T12:00:00`))
  } catch {
    return value
  }
}

export function createMatchWorkspaceView({
  storage,
  createMatchLibraryService,
  getCalendarEvents,
  getTeamProfile,
  escapeHtml,
}) {
  return function matchWorkspaceView() {
    let active = null
    try { active = JSON.parse(storage.getItem('staff-active-match') || 'null') } catch {}

    if (!active?.id) {
      return `<section class="content-section match-workspace match-workspace--empty">
        <div class="empty-state"><h1>Nessuna partita selezionata</h1><p>Apri una gara dalla Match Library per entrare nel workspace.</p><button type="button" class="button button--primary" data-workspace-action="match-library">Apri Match Library</button></div>
      </section>`
    }

    const service = createMatchLibraryService({ storage })
    const season = getTeamProfile().season || ''
    const match = service.list(getCalendarEvents(), season).find((item) => String(item.id) === String(active.id)) || active
    const team = getTeamProfile()
    const homeAway = match.homeAway || 'home'
    const ourName = team.shortName || team.name || 'Noi'
    const opponent = match.opponent || active.opponent || 'Avversario da definire'
    const homeTeam = homeAway === 'away' ? opponent : ourName
    const awayTeam = homeAway === 'away' ? ourName : opponent
    const score = match.goalsFor == null || match.goalsAgainst == null
      ? '–'
      : homeAway === 'away'
        ? `${match.goalsAgainst} – ${match.goalsFor}`
        : `${match.goalsFor} – ${match.goalsAgainst}`

    const sections = [
      ['callups', 'Convocazioni', 'Seleziona i giocatori disponibili per questa gara.', 'Prepara convocazioni'],
      ['match-sheet', 'Match Sheet', 'Formazione, panchina, eventi e dati strutturati della gara.', 'Apri Match Sheet'],
      ['analysis', 'Analisi gara', 'Valutazioni qualitative e lettura tecnica della prestazione.', 'Apri Analisi'],
      ['attachments', 'Allegati', 'Distinte, immagini, documenti e materiali collegati.', 'In preparazione'],
      ['statistics', 'Statistiche', 'Dati aggregati generati da Match Sheet e Analisi.', 'In preparazione'],
    ]

    return `<section class="content-section match-workspace" data-match-workspace data-match-id="${escapeHtml(String(match.id))}">
      <header class="match-workspace-header">
        <button type="button" class="match-workspace-back" data-workspace-action="match-library">← Match Library</button>
        <div class="match-workspace-title-row">
          <div>
            <span class="eyebrow">${escapeHtml(match.competition || 'Partita')}${match.matchDay ? ` · Giornata ${escapeHtml(String(match.matchDay))}` : ''}</span>
            <h1>${escapeHtml(homeTeam)} <b>${escapeHtml(score)}</b> ${escapeHtml(awayTeam)}</h1>
            <p>${escapeHtml(safeDateLabel(match.date || active.date))}${match.time ? ` · ${escapeHtml(match.time)}` : ''} · ${escapeHtml(match.venue || 'Impianto da definire')}</p>
          </div>
          <span class="match-workspace-id">MATCH ID · ${escapeHtml(String(match.id))}</span>
        </div>
      </header>

      <nav class="match-workspace-tabs" aria-label="Workspace partita">
        ${sections.map(([key, label]) => `<button type="button" data-workspace-action="${key}">${escapeHtml(label)}</button>`).join('')}
      </nav>

      <div class="match-workspace-grid">
        ${sections.map(([key, label, description, action]) => `<article class="match-workspace-card ${key === 'attachments' || key === 'statistics' ? 'is-disabled' : ''}">
          <div><span>${escapeHtml(label)}</span><h2>${escapeHtml(label)}</h2><p>${escapeHtml(description)}</p></div>
          <button type="button" class="button ${key === 'attachments' || key === 'statistics' ? '' : 'button--primary'}" data-workspace-action="${key}" ${key === 'attachments' || key === 'statistics' ? 'disabled' : ''}>${escapeHtml(action)}</button>
        </article>`).join('')}
      </div>

      <aside class="match-workspace-report-note">
        <strong>Match Report</strong>
        <span>Verrà generato dai dati del Match Sheet e dell’Analisi gara, senza nuova compilazione.</span>
      </aside>
    </section>`
  }
}
