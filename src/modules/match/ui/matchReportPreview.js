export function createMatchReportPreview({
  matchReportService,
  state,
  storage,
  form,
  collect,
  draftService,
  createMatchCalendarService,
  createCalendarEvent,
  updateCalendarEvent,
  loadCalendarEvents,
  getCalendarEvents,
  printMatchReport,
}) {
return function openMatchReportPreview() {
        const { paper, validation } = matchReportService.getPrintablePaper()
        if (!paper) {
          if (state) state.textContent = 'Report non disponibile'
          return
        }
        if (!validation.valid && state) {
          state.textContent = `Report incompleto: ${validation.errors.join(' · ')}`
        }
        document.querySelector('[data-match-report-dialog]')?.remove()
        const trigger = document.activeElement
        const dialog = document.createElement('div')
        dialog.className = 'match-report-dialog'
        dialog.dataset.matchReportDialog = ''
        dialog.innerHTML = `<section class="match-report-dialog-panel" role="dialog" aria-modal="true" aria-label="Anteprima Match Report"><header><div><span>ANTEPRIMA DI STAMPA</span><h2>Match Report</h2></div><button type="button" data-close-match-report aria-label="Chiudi">×</button></header><div class="match-report-dialog-body">${paper.outerHTML}</div><footer><button type="button" class="secondary-button" data-close-match-report>Annulla</button><button type="button" class="primary-button" data-confirm-match-report>Stampa / salva PDF</button></footer></section>`
        document.body.appendChild(dialog)
        document.body.classList.add('modal-open')
        const close = () => {
          dialog.remove()
          document.body.classList.remove('modal-open')
          trigger?.focus?.()
        }
        dialog.querySelectorAll('[data-close-match-report]').forEach((button) => button.addEventListener('click', close))
        dialog.addEventListener('click', (event) => { if (event.target === dialog) close() })
        dialog.addEventListener('keydown', (event) => { if (event.key === 'Escape') close() })
        dialog.querySelector('[data-close-match-report]')?.focus()
        dialog.querySelector('[data-confirm-match-report]')?.addEventListener('click', async (event) => {
          const button = event.currentTarget
          const printable = dialog.querySelector('.match-report-paper')
          const activeMatch = (() => {
            try { return JSON.parse(storage.getItem('staff-active-match') || 'null') } catch { return null }
          })()
          button.disabled = true
          button.textContent = 'Salvataggio nel Calendario…'
          if (state) state.textContent = 'Collegamento al Calendario…'
          try {
            const calendarService = createMatchCalendarService({
              createEvent: createCalendarEvent,
              updateEvent: updateCalendarEvent,
              reloadEvents: loadCalendarEvents,
            })
            const saved = await calendarService.publish({
              matchData: collect(),
              activeMatch,
              calendarEvents: getCalendarEvents(),
            })
            if (saved.eventId) {
              storage.setItem('staff-active-match', JSON.stringify({
                ...(activeMatch || {}),
                id: saved.eventId,
                opponent: form.elements.opponent?.value || activeMatch?.opponent || '',
                date: form.elements.date?.value || activeMatch?.date || '',
              }))
            }
            draftService.save(form)
            if (state) state.textContent = saved.created ? 'Report salvato e gara creata nel Calendario' : 'Report salvato nel Calendario'
            printMatchReport(printable)
            button.textContent = 'Stampa / salva PDF'
            button.disabled = false
          } catch (error) {
            console.error('Salvataggio Match Report nel Calendario non riuscito:', error)
            if (state) state.textContent = error.message || 'Salvataggio nel Calendario non riuscito'
            button.textContent = 'Riprova salvataggio'
            button.disabled = false
          }
        })
      }
}

