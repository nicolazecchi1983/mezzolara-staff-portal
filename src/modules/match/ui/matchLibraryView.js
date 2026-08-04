export function createMatchLibraryView({
  createMatchLibraryService,
  getMatchOutcome,
  getTeamProfile,
  getCalendarEvents,
  storage,
  escapeHtml,
  icon,
}) {
  return function matchLibraryView() {
  const service = createMatchLibraryService({ storage })
  const season = getTeamProfile().season || ''
  const matches = service.list(getCalendarEvents(), season)
  const competitionOptions = [...new Set(matches.map((match) => match.competition).filter(Boolean))]
  const rows = matches.map((match) => {
    const outcome = getMatchOutcome(match)
    const dateLabel = match.date
      ? new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${match.date}T12:00:00`))
      : 'Data da definire'
    const result = match.goalsFor == null || match.goalsAgainst == null ? '–' : `${match.goalsFor}–${match.goalsAgainst}`
    const searchText = [match.opponent, match.competition, match.venue, match.season, match.date].join(' ').toLocaleLowerCase('it-IT')
    return `<article class="match-library-card" data-match-library-card data-search-text="${escapeHtml(searchText)}" data-competition="${escapeHtml(match.competition)}" data-location="${match.homeAway}" data-outcome="${outcome}">
      <div class="match-library-date"><strong>${escapeHtml(dateLabel)}</strong><span>${escapeHtml(match.time || '')}</span></div>
      <div class="match-library-main">
        <span class="match-library-kicker">${escapeHtml(match.competition)}${match.matchDay ? ` · Giornata ${match.matchDay}` : ''}</span>
        <h3>${match.homeAway === 'home' ? escapeHtml(getTeamProfile().shortName || 'Noi') : escapeHtml(match.opponent)} <b>${result}</b> ${match.homeAway === 'away' ? escapeHtml(getTeamProfile().shortName || 'Noi') : escapeHtml(match.opponent)}</h3>
        <p>${escapeHtml(match.venue || 'Impianto da definire')} · ${match.homeAway === 'home' ? 'Casa' : 'Trasferta'}</p>
      </div>
      <div class="match-library-status"><span>${escapeHtml(match.documentStatus)}</span><small>${match.source === 'calendar' ? 'Calendario' : 'Archivio'}</small></div>
      <div class="match-library-actions">
        <button type="button" class="button button--primary" data-open-match-workspace="${escapeHtml(match.id)}" data-match-opponent="${escapeHtml(match.opponent)}" data-match-date="${escapeHtml(match.date)}">Apri partita</button>
        ${match.source === 'library' ? `<button type="button" class="icon-button" data-delete-library-match="${escapeHtml(match.id)}" aria-label="Elimina gara">×</button>` : ''}
      </div>
    </article>`
  }).join('')

  return `<section class="content-section match-library" data-match-library>
    <header class="page-heading match-library-heading">
      <div><span class="eyebrow">A.12 · Archivio gare</span><h1>Match Library</h1><p>Tutte le partite della stagione, ordinate e collegate al Match Sheet.</p></div>
      <button type="button" class="button button--primary" data-toggle-match-create>+ Nuova gara</button>
    </header>

    <form class="match-library-create" data-match-create-form hidden>
      <div class="match-library-form-grid">
        <label><span>Data</span><input type="date" name="date" required></label>
        <label><span>Ora</span><input type="time" name="time"></label>
        <label><span>Avversario</span><input type="text" name="opponent" required placeholder="Nome squadra"></label>
        <label><span>Competizione</span><select name="competition"><option>Campionato</option><option>Coppa</option><option>Amichevole</option></select></label>
        <label><span>Casa / trasferta</span><select name="homeAway"><option value="home">Casa</option><option value="away">Trasferta</option></select></label>
        <label><span>Impianto</span><input type="text" name="venue" placeholder="Campo o stadio"></label>
      </div>
      <div class="match-library-form-actions"><button type="submit" class="button button--primary">Salva gara</button><button type="button" class="button" data-cancel-match-create>Annulla</button><span data-match-create-message></span></div>
    </form>

    <div class="match-library-toolbar">
      <label class="match-library-search"><span class="nav-icon">${icon('search')}</span><input type="search" placeholder="Cerca avversario, competizione o impianto" data-match-library-search></label>
      <select data-match-library-competition><option value="">Tutte le competizioni</option>${competitionOptions.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join('')}</select>
      <select data-match-library-location><option value="">Casa e trasferta</option><option value="home">Casa</option><option value="away">Trasferta</option></select>
      <select data-match-library-outcome><option value="">Tutti i risultati</option><option value="win">Vittorie</option><option value="draw">Pareggi</option><option value="loss">Sconfitte</option><option value="pending">Da giocare</option></select>
    </div>

    <div class="match-library-summary"><strong>${matches.length}</strong><span>gare archiviate</span></div>
    <div class="match-library-list" data-match-library-list>${rows || '<div class="empty-state">Nessuna gara presente. Crea la prima gara o aggiungila dal Calendario.</div>'}</div>
    <div class="empty-state" data-match-library-empty hidden>Nessuna gara corrisponde ai filtri selezionati.</div>
  </section>`
  }
}
