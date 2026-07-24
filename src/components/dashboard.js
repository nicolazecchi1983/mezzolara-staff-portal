import { icon } from './icons.js'
import { calendarEvents, dashboardStats } from '../data/calendar.js'

const menuItems = [
  ['dashboard', 'Dashboard'],
  ['calendar', 'Calendario'],
  ['sheet', 'Training Sheet'],
  ['library', 'Training Library'],
  ['squad', 'Rosa'],
  ['analysis', 'Analisi Gare'],
  ['methodology', 'Metodologia'],
  ['settings', 'Impostazioni'],
]

function renderMenu() {
  return menuItems.map(([key, label], index) => `
    <button class="nav-item ${index === 0 ? 'is-active' : ''}" data-section="${label}" type="button">
      <span class="nav-icon">${icon(key)}</span>
      <span>${label}</span>
    </button>
  `).join('')
}

function renderStats() {
  return dashboardStats.map((item) => `
    <article class="stat-card">
      <div class="stat-icon">${icon(item.icon)}</div>
      <div class="stat-body">
        <span>${item.label}</span>
        <strong>${item.value}</strong>
        <small>${item.meta}</small>
        <button type="button">${item.footer} <span>→</span></button>
      </div>
    </article>
  `).join('')
}

function eventForDay(day) {
  return calendarEvents.find((event) => event.day === day)
}

function renderCalendarCells() {
  const previousMonth = [29, 30]
  const currentDays = Array.from({ length: 31 }, (_, index) => index + 1)
  const nextMonth = [1, 2]
  const cells = [
    ...previousMonth.map((day) => ({ day, muted: true })),
    ...currentDays.map((day) => ({ day, muted: false })),
    ...nextMonth.map((day) => ({ day, muted: true })),
  ]

  return cells.map(({ day, muted }) => {
    const event = muted ? null : eventForDay(day)
    const today = !muted && day === 26

    return `
      <div class="calendar-cell ${muted ? 'is-muted' : ''}">
        <span class="day-number ${today ? 'is-today' : ''}">${day}</span>
        ${event ? `
          <button class="calendar-event calendar-event--${event.type}" type="button">
            <strong><i></i>${event.title}</strong>
            <span>${event.time} · ${event.place}</span>
          </button>
        ` : ''}
      </div>
    `
  }).join('')
}

export function renderDashboard(user) {
  const initial = user.email?.charAt(0).toUpperCase() ?? 'N'

  return `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="sidebar-brand">
          <div class="brand-square">NZ</div>
          <div>
            <strong>NICOLA ZECCHI</strong>
            <span>STAFF</span>
          </div>
        </div>

        <nav class="sidebar-nav">${renderMenu()}</nav>

        <button id="logoutButton" class="logout-button" type="button">
          <span>${icon('logout')}</span>
          <span>Esci</span>
        </button>
      </aside>

      <div class="workspace">
        <header class="topbar">
          <div></div>
          <div class="user-menu">
            <span class="user-avatar">${initial}</span>
            <strong>Nicola Zecchi</strong>
            <span>⌄</span>
          </div>
        </header>

        <main class="dashboard">
          <section class="page-heading">
            <div>
              <h1 id="sectionTitle">Calendario</h1>
              <p><span>STAGIONE 2026/27</span><b>•</b> Serie D</p>
            </div>

            <div class="page-actions">
              <button class="ghost-button" type="button">${icon('filter')} Filtri</button>
              <button class="primary-action" type="button">${icon('plus')} Nuovo evento <span class="split">⌄</span></button>
            </div>
          </section>

          <section class="stats-grid">
            ${renderStats()}
          </section>

          <section class="calendar-panel">
            <div class="calendar-toolbar">
              <div class="toolbar-left">
                <button type="button">‹</button>
                <button type="button">›</button>
                <button class="today-button" type="button">Oggi</button>
              </div>

              <h2>Luglio 2026 <span>⌄</span></h2>

              <div class="view-switcher">
                <button class="is-active" type="button">Mese</button>
                <button type="button">Settimana</button>
                <button type="button">Agenda</button>
              </div>
            </div>

            <div class="calendar-weekdays">
              <span>LUN</span><span>MAR</span><span>MER</span><span>GIO</span><span>VEN</span><span>SAB</span><span>DOM</span>
            </div>

            <div class="calendar-grid">
              ${renderCalendarCells()}
            </div>

            <div class="calendar-footer">
              <div class="legend">
                <span><i class="training"></i>Allenamento</span>
                <span><i class="match"></i>Partita</span>
                <span><i class="friendly"></i>Amichevole</span>
                <span><i class="meeting"></i>Riunione</span>
                <span><i class="test"></i>Test</span>
                <span><i class="rest"></i>Riposo</span>
              </div>

              <span class="sync-status">Sincronizzato con database <i></i></span>
            </div>
          </section>
        </main>
      </div>
    </div>
  `
}
