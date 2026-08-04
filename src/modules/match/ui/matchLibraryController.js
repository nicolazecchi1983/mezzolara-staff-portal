export function bindMatchLibrary({
  root,
  storage,
  createMatchLibraryService,
  getTeamProfile,
  formatDateInputValue,
  setView,
  setActiveNavigation,
}) {
  const matchLibrary = root.querySelector('[data-match-library]')
if (matchLibrary) {
  const service = createMatchLibraryService({ storage })
  const createForm = matchLibrary.querySelector('[data-match-create-form]')
  const toggleCreate = (show) => {
    createForm.hidden = !show
    if (show) createForm.elements.date.value ||= formatDateInputValue(new Date())
  }
  matchLibrary.querySelector('[data-toggle-match-create]')?.addEventListener('click', () => toggleCreate(createForm.hidden))
  matchLibrary.querySelector('[data-cancel-match-create]')?.addEventListener('click', () => toggleCreate(false))
  createForm?.addEventListener('submit', async (event) => {
    event.preventDefault()
    const data = Object.fromEntries(new FormData(createForm).entries())
    service.create({ ...data, season: getTeamProfile().season || '' })
    await setView('match-library', 'Match Library')
  })
  const applyMatchFilters = () => {
    const query = matchLibrary.querySelector('[data-match-library-search]')?.value.trim().toLocaleLowerCase('it-IT') || ''
    const competition = matchLibrary.querySelector('[data-match-library-competition]')?.value || ''
    const location = matchLibrary.querySelector('[data-match-library-location]')?.value || ''
    const outcome = matchLibrary.querySelector('[data-match-library-outcome]')?.value || ''
    let visible = 0
    matchLibrary.querySelectorAll('[data-match-library-card]').forEach((card) => {
      const show = (!query || card.dataset.searchText.includes(query))
        && (!competition || card.dataset.competition === competition)
        && (!location || card.dataset.location === location)
        && (!outcome || card.dataset.outcome === outcome)
      card.hidden = !show
      if (show) visible += 1
    })
    const empty = matchLibrary.querySelector('[data-match-library-empty]')
    if (empty) empty.hidden = visible > 0
  }
  matchLibrary.querySelectorAll('[data-match-library-search], [data-match-library-competition], [data-match-library-location], [data-match-library-outcome]').forEach((control) => {
    control.addEventListener(control.matches('input') ? 'input' : 'change', applyMatchFilters)
  })
  matchLibrary.addEventListener('click', async (event) => {
    const openButton = event.target.closest('[data-open-match-workspace]')
    if (openButton) {
      storage.setItem('staff-active-match', JSON.stringify({ id: openButton.dataset.openMatchWorkspace, opponent: openButton.dataset.matchOpponent, date: openButton.dataset.matchDate }))
      setActiveNavigation('match-library')
      storage.setItem('nz-active-section', 'match-workspace')
      await setView('match-workspace', 'Match Workspace')
      return
    }
    const deleteButton = event.target.closest('[data-delete-library-match]')
    if (deleteButton && window.confirm('Eliminare questa gara dalla Match Library?')) {
      service.remove(deleteButton.dataset.deleteLibraryMatch)
      await setView('match-library', 'Match Library')
    }
  })
}

}
