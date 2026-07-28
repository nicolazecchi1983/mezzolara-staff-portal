import { icon } from './icons.js'
import { supabase } from '../supabase.js'

import {
  dashboardStats,
  todayItems,
  recentActivity,
  players,
  analysisItems,
} from '../data/appData.js'

let calendarEvents = []

async function loadCalendarEvents() {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('start_at')

  if (error) {
    alert(`Errore Supabase: ${error.message}`)
    return
  }

  calendarEvents = data.map((event) => {
    const trainingSheetPath = event.training_sheet_path ?? null
    const trainingSheetUrl = trainingSheetPath
      ? supabase.storage
          .from('training-sheets')
          .getPublicUrl(trainingSheetPath).data.publicUrl
      : null

    return {
      id: event.id,
      day: new Date(event.start_at).getDate(),
      title: event.title,
      time: new Date(event.start_at).toLocaleTimeString('it-IT', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      place: event.location,
      type: event.event_type,
      startAt: event.start_at,
      trainingSheetPath,
      trainingSheetUrl,
    }
  })
}

const menu = [
  ['dashboard', 'Dashboard'],
  ['calendar', 'Calendario'],
  ['sheet', 'Training Sheet'],
  ['library', 'Training Library'],
  ['squad', 'Rosa'],
  ['analysis', 'Analisi Gare'],
  ['methodology', 'Metodologia'],
  ['settings', 'Impostazioni'],
]

function menuHtml() {
  return menu
    .map(
      ([key, label], index) => `
        <button
          class="nav-item ${index === 0 ? 'is-active' : ''}"
          type="button"
          data-section="${key}"
        >
          <span class="nav-icon">${icon(key)}</span>
          <span>${label}</span>
        </button>
      `,
    )
    .join('')
}

function statCards() {
  return dashboardStats
    .map(
      (item) => `
        <article class="stat-card">
          <div class="stat-icon">
            ${icon(item.icon)}
          </div>

          <div>
            <span>${item.label}</span>
            <strong>${item.value}</strong>
            <small>${item.meta}</small>
          </div>
        </article>
      `,
    )
    .join('')
}

function dashboardView() {
  return `
    <section class="view page-view">
      <div class="page-head">
        <div>
          <h1>Dashboard</h1>

          <p>
            <span>STAGIONE 2026/27</span>
            <b>•</b>
            Serie D
          </p>
        </div>

        <button class="primary-action" type="button">
          ${icon('plus')}
          Nuovo elemento
        </button>
      </div>

      <div class="stats-grid">
        ${statCards()}
      </div>

      <div class="dashboard-layout">
        <article class="panel today-panel">
          <div class="panel-head">
            <div>
              <span>OGGI</span>
              <h2>26 Luglio 2026</h2>
            </div>

            <strong>3 attività</strong>
          </div>

          <div class="timeline">
            ${todayItems
              .map(
                (item) => `
                  <div class="timeline-item">
                    <time>${item.time}</time>
                    <i class="${item.type}"></i>

                    <div>
                      <strong>${item.title}</strong>
                      <span>${item.meta}</span>
                    </div>
                  </div>
                `,
              )
              .join('')}
          </div>
        </article>

        <article class="panel quick-panel">
          <div class="panel-head">
            <div>
              <span>PROSSIMO ALLENAMENTO</span>
              <h2>17:30 · Budrio</h2>
            </div>
          </div>

          <div class="training-summary">
            <div>
              <span>Training Sheet</span>
              <strong>AL 004</strong>
            </div>

            <div>
              <span>Presenti</span>
              <strong>26</strong>
            </div>

            <div>
              <span>Intensità</span>
              <strong>5/5</strong>
            </div>

            <div>
              <span>Volume</span>
              <strong>4/5</strong>
            </div>
          </div>

          <button
            class="wide-button"
            type="button"
            data-open-event="26"
          >
            Apri allenamento
          </button>
        </article>

        <article class="panel activity-panel">
          <div class="panel-head">
            <div>
              <span>ATTIVITÀ RECENTI</span>
              <h2>Ultime modifiche</h2>
            </div>
          </div>

          <div class="activity-list">
            ${recentActivity
              .map(
                (activity) => `
                  <div>
                    <strong>${activity.title}</strong>
                    <span>${activity.meta}</span>
                  </div>
                `,
              )
              .join('')}
          </div>
        </article>
      </div>
    </section>
  `
}

function calendarCells() {
  const cells = [
    ...[29, 30].map((day) => ({
      day,
      muted: true,
    })),

    ...Array.from(
      {
        length: 31,
      },
      (_, index) => ({
        day: index + 1,
        muted: false,
      }),
    ),

    ...[1, 2].map((day) => ({
      day,
      muted: true,
    })),
  ]

  return cells
    .map(({ day, muted }) => {
      const event = muted
        ? null
        : calendarEvents.find((item) => item.day === day)

      return `
        <div class="calendar-cell ${muted ? 'is-muted' : ''}">
          <span
            class="day-number ${
              !muted && day === 26 ? 'is-today' : ''
            }"
          >
            ${day}
          </span>

          ${
            event
              ? `
                <button
                  class="calendar-event calendar-event--${event.type}"
                  data-open-event="${day}"
                  type="button"
                >
                  <strong>
                    <i></i>
                    ${event.title}
                  </strong>

                  <span>
                    ${event.time} · ${event.place}
                  </span>
                </button>
              `
              : ''
          }
        </div>
      `
    })
    .join('')
}

function calendarView() {
  return `
    <section class="view page-view">
      <div class="page-head">
        <div>
          <h1>Calendario</h1>

          <p>
            <span>STAGIONE 2026/27</span>
            <b>•</b>
            Serie D
          </p>
        </div>

        <button class="primary-action" type="button" data-new-event>
          ${icon('plus')}
          Nuovo evento
        </button>
      </div>

      <section class="calendar-panel">
        <div class="calendar-toolbar">
          <div>
            <button type="button">‹</button>
            <button type="button">›</button>
            <button type="button">Oggi</button>
          </div>

          <h2>Luglio 2026</h2>

          <div>
            <button class="is-active" type="button">
              Mese
            </button>

            <button type="button">
              Settimana
            </button>

            <button type="button">
              Agenda
            </button>
          </div>
        </div>

        <div class="calendar-weekdays">
          <span>LUN</span>
          <span>MAR</span>
          <span>MER</span>
          <span>GIO</span>
          <span>VEN</span>
          <span>SAB</span>
          <span>DOM</span>
        </div>

        <div class="calendar-grid">
          ${calendarCells()}
        </div>
      </section>
    </section>
  `
}

function squadView() {
  return `
    <section class="view page-view">
      <div class="page-head">
        <div>
          <h1>Rosa</h1>

          <p>
            <span>27 GIOCATORI</span>
            <b>•</b>
            Serie D
          </p>
        </div>

        <button class="primary-action" type="button">
          ${icon('plus')}
          Nuovo giocatore
        </button>
      </div>

      <div class="players-grid">
        ${players
          .map(
            (player) => `
              <article class="player-card">
                <div class="player-avatar">
                  ${player.initials}
                </div>

                <div class="player-main">
                  <h3>${player.name}</h3>
                  <p>${player.year} · ${player.role}</p>
                </div>

                <div class="player-meta">
                  <span>Piede ${player.foot}</span>

                  <strong
                    class="${
                      player.status === 'Disponibile'
                        ? 'ok'
                        : 'warn'
                    }"
                  >
                    ${player.status}
                  </strong>
                </div>
              </article>
            `,
          )
          .join('')}
      </div>
    </section>
  `
}

function analysisView() {
  return `
    <section class="view page-view">
      <div class="page-head">
        <div>
          <h1>Analisi Gare</h1>

          <p>
            <span>VIDEO E CLIP</span>
            <b>•</b>
            Stagione 2026/27
          </p>
        </div>

        <button class="primary-action" type="button">
          ${icon('plus')}
          Nuova analisi
        </button>
      </div>

      <div class="analysis-grid">
        ${analysisItems
          .map(
            (analysis) => `
              <article class="analysis-card">
                <div class="video-placeholder">
                  ${icon('analysis')}
                </div>

                <div class="analysis-copy">
                  <span>${analysis.date}</span>
                  <h3>Mezzolara · ${analysis.opponent}</h3>
                  <p>${analysis.clips} clip · ${analysis.tag}</p>
                  <strong>${analysis.status}</strong>
                </div>
              </article>
            `,
          )
          .join('')}
      </div>
    </section>
  `
}

function placeholderView(title) {
  return `
    <section class="view page-view">
      <div class="page-head">
        <div>
          <h1>${title}</h1>

          <p>
            <span>SEZIONE PRONTA</span>
            <b>•</b>
            Prossima release
          </p>
        </div>
      </div>

      <div class="placeholder-panel">
        <h2>${title}</h2>

        <p>
          La struttura grafica è pronta per essere collegata a
          Supabase.
        </p>
      </div>
    </section>
  `
}

function profileView() {
  return `
    <section class="view page-view">
      <div class="page-head">
        <div>
          <h1>Profilo</h1>

          <p>
            <span>ACCOUNT PERSONALE</span>
            <b>•</b>
            Nicola Zecchi
          </p>
        </div>
      </div>

      <div class="placeholder-panel">
        <h2>Nicola Zecchi</h2>

        <p>
          Qui potrai gestire i dati personali, il ruolo nello staff,
          la foto profilo e le preferenze dell’account.
        </p>
      </div>
    </section>
  `
}

function drawerHtml(event) {
  return `
    <div class="drawer-backdrop" data-close-drawer></div>

    <aside class="event-drawer">
      <div class="drawer-head">
        <div>
          <span>ALLENAMENTO</span>
          <h2>${new Date(event.startAt).toLocaleDateString('it-IT')}</h2>
        </div>

        <button type="button" data-close-drawer aria-label="Chiudi">
          ${icon('close')}
        </button>
      </div>

      <div class="drawer-section">
        <label>Orario</label>
        <strong>${event.time}</strong>
        <small>${event.place || 'Campo non indicato'}</small>
      </div>

      <div class="drawer-section">
        <label>Training Sheet</label>

        ${
          event.trainingSheetUrl
            ? `
              <a
                class="wide-button"
                href="${event.trainingSheetUrl}"
                target="_blank"
                rel="noopener noreferrer"
              >
                Apri Training Sheet
              </a>
            `
            : '<small>Nessuna Training Sheet collegata.</small>'
        }
      </div>
    </aside>
  `
}

function newEventModalHtml() {
  const today = new Date().toISOString().slice(0, 10)

  return `
    <style>
      .new-event-modal-backdrop {
        position: fixed;
        inset: 0;
        z-index: 1000;
        display: grid;
        place-items: center;
        padding: 24px;
        background: rgba(0, 0, 0, 0.72);
      }

      .new-event-modal {
        width: min(560px, 100%);
        max-height: calc(100vh - 48px);
        overflow: auto;
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 20px;
        background: #080d17;
        color: #ffffff;
      }

      .new-event-modal__head,
      .new-event-modal__actions {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding: 20px 22px;
      }

      .new-event-modal__head {
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }

      .new-event-modal__head h2 {
        margin: 0;
      }

      .new-event-modal__close {
        border: 0;
        background: transparent;
        color: inherit;
        cursor: pointer;
      }

      .new-event-form {
        display: grid;
        gap: 16px;
        padding: 22px;
      }

      .new-event-form label {
        display: grid;
        gap: 8px;
        font-weight: 600;
      }

      .new-event-form input {
        width: 100%;
        box-sizing: border-box;
        border: 1px solid rgba(255, 255, 255, 0.16);
        border-radius: 12px;
        padding: 12px 14px;
        background: #111827;
        color: #ffffff;
        font: inherit;
      }

      .new-event-form__row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 14px;
      }

      .new-event-modal__actions {
        justify-content: flex-end;
        padding: 0;
      }

      .new-event-modal__secondary {
        border: 1px solid rgba(255, 255, 255, 0.18);
        border-radius: 12px;
        padding: 11px 16px;
        background: transparent;
        color: inherit;
        cursor: pointer;
      }

      .new-event-form__message {
        min-height: 20px;
        margin: 0;
        color: #ffb4b4;
      }

      @media (max-width: 560px) {
        .new-event-form__row {
          grid-template-columns: 1fr;
        }
      }
    </style>

    <div class="new-event-modal-backdrop" data-close-new-event>
      <section
        class="new-event-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="newEventTitle"
      >
        <div class="new-event-modal__head">
          <div>
            <span>CALENDARIO</span>
            <h2 id="newEventTitle">Nuovo allenamento</h2>
          </div>

          <button
            class="new-event-modal__close"
            type="button"
            data-close-new-event
            aria-label="Chiudi"
          >
            ${icon('close')}
          </button>
        </div>

        <form id="newEventForm" class="new-event-form">
          <div class="new-event-form__row">
            <label>
              Data
              <input name="date" type="date" value="${today}" required>
            </label>

            <label>
              Ora
              <input name="time" type="time" value="17:30" required>
            </label>
          </div>

          <label>
            Campo
            <input
              name="location"
              type="text"
              placeholder="Es. Mezzolara"
              required
            >
          </label>

          <label>
            Training Sheet
            <input
              name="trainingSheet"
              type="file"
              accept="image/png,image/jpeg,application/pdf"
              required
            >
          </label>

          <p
            id="newEventMessage"
            class="new-event-form__message"
            aria-live="polite"
          ></p>

          <div class="new-event-modal__actions">
            <button
              class="new-event-modal__secondary"
              type="button"
              data-close-new-event
            >
              Annulla
            </button>

            <button
              id="saveNewEventButton"
              class="primary-action"
              type="submit"
            >
              Salva allenamento
            </button>
          </div>
        </form>
      </section>
    </div>
  `
}

function profileMenuHtml(userInitial, userEmail) {
  return `
    <div class="profile-menu-wrapper">
      <button
        id="profileMenuButton"
        class="profile-menu-button"
        type="button"
        aria-expanded="false"
        aria-controls="profileDropdown"
        aria-label="Apri menu profilo"
      >
        <span class="user-avatar">
          ${userInitial}
        </span>

        <span class="profile-menu-identity">
          <strong>Nicola Zecchi</strong>
          <small>Staff</small>
        </span>

        <span
          class="profile-menu-chevron"
          aria-hidden="true"
        >
          ⌄
        </span>
      </button>

      <div
        id="profileDropdown"
        class="profile-dropdown"
        role="menu"
        aria-hidden="true"
      >
        <div class="profile-dropdown-head">
          <span class="profile-dropdown-avatar">
            ${userInitial}
          </span>

          <div>
            <strong>Nicola Zecchi</strong>
            <span>${userEmail}</span>
          </div>
        </div>

        <div class="profile-dropdown-separator"></div>

        <button
          class="profile-dropdown-item"
          type="button"
          data-profile-action="profile"
          role="menuitem"
        >
          <span class="profile-dropdown-icon">
            ${icon('squad')}
          </span>

          <span>Profilo</span>
        </button>

        <button
          class="profile-dropdown-item"
          type="button"
          data-profile-action="settings"
          role="menuitem"
        >
          <span class="profile-dropdown-icon">
            ${icon('settings')}
          </span>

          <span>Impostazioni</span>
        </button>

        <div class="profile-dropdown-separator"></div>

        <button
          class="profile-dropdown-item profile-dropdown-item--logout"
          type="button"
          data-profile-action="logout"
          role="menuitem"
        >
          <span class="profile-dropdown-icon">
            ${icon('logout')}
          </span>

          <span>Esci</span>
        </button>
      </div>
    </div>
  `
}

export function renderApp(user) {
  const userEmail = user.email ?? ''
  const userInitial =
    userEmail.charAt(0).toUpperCase() || 'N'

  return `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="sidebar-brand">
          <div class="brand-square">
            NZ
          </div>

          <div>
            <strong>NICOLA ZECCHI</strong>
            <span>STAFF</span>
          </div>
        </div>

        <nav class="sidebar-nav">
          ${menuHtml()}
        </nav>

        <button
          id="logoutButton"
          class="logout-button"
          type="button"
        >
          ${icon('logout')}
          <span>Esci</span>
        </button>
      </aside>

      <div class="workspace">
        <header class="topbar">
          <div class="mobile-topbar-brand">
            <span class="mobile-brand-square">
              NZ
            </span>

            <div>
              <strong>NZ</strong>
              <span>Coach Portal</span>
            </div>
          </div>

          ${profileMenuHtml(userInitial, userEmail)}
        </header>

        <main id="viewRoot">
          ${dashboardView()}
        </main>
      </div>

      <div id="drawerRoot"></div>
      <div id="modalRoot"></div>
    </div>
  `
}

export async function attachAppEvents() {
  await loadCalendarEvents()
  
  const root = document.querySelector('#viewRoot')
  const drawerRoot = document.querySelector('#drawerRoot')
  const modalRoot = document.querySelector('#modalRoot')

  const logoutButton =
    document.querySelector('#logoutButton')

  const profileMenuButton =
    document.querySelector('#profileMenuButton')

  const profileDropdown =
    document.querySelector('#profileDropdown')

  function setActiveNavigation(sectionKey) {
    document
      .querySelectorAll('.nav-item')
      .forEach((item) => {
        item.classList.toggle(
          'is-active',
          item.dataset.section === sectionKey,
        )
      })
  }

 async function setView(key, label) {
  if (key === 'calendar') {
    await loadCalendarEvents()
  }

  const views = {
    dashboard: dashboardView,
    calendar: calendarView,
    squad: squadView,
    analysis: analysisView,
    profile: profileView,
  }

  root.innerHTML = views[key]
    ? views[key]()
    : placeholderView(label)

  bindDynamic()
}

  function closeNewEventModal() {
    if (!modalRoot) {
      return
    }

    modalRoot.innerHTML = ''
  }

  function openNewEventModal() {
    if (!modalRoot) {
      return
    }

    modalRoot.innerHTML = newEventModalHtml()

    const backdrop = modalRoot.querySelector(
      '.new-event-modal-backdrop',
    )
    const form = modalRoot.querySelector('#newEventForm')
    const message = modalRoot.querySelector('#newEventMessage')
    const saveButton = modalRoot.querySelector(
      '#saveNewEventButton',
    )

    modalRoot
      .querySelectorAll('[data-close-new-event]')
      .forEach((element) => {
        element.addEventListener('click', (event) => {
          if (
            element === backdrop &&
            event.target !== backdrop
          ) {
            return
          }

          closeNewEventModal()
        })
      })

    form?.addEventListener('submit', async (event) => {
      event.preventDefault()

      const formData = new FormData(form)
      const date = formData.get('date')
      const time = formData.get('time')
      const location = String(
        formData.get('location') ?? '',
      ).trim()
      const file = formData.get('trainingSheet')

      if (
        !date ||
        !time ||
        !location ||
        !(file instanceof File) ||
        file.size === 0
      ) {
        message.textContent =
          'Compila tutti i campi e seleziona la Training Sheet.'
        return
      }

      saveButton.disabled = true
      saveButton.textContent = 'Salvataggio...'
      message.textContent = ''

      const safeName = file.name
        .normalize('NFD')
        .replace(/[\\u0300-\\u036f]/g, '')
        .replace(/[^a-zA-Z0-9._-]/g, '-')

      const filePath =
        `${date}/${crypto.randomUUID()}-${safeName}`

      const { error: uploadError } =
        await supabase.storage
          .from('training-sheets')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          })

      if (uploadError) {
        message.textContent =
          `Errore caricamento: ${uploadError.message}`
        saveButton.disabled = false
        saveButton.textContent = 'Salva allenamento'
        return
      }

      const startAt = new Date(
        `${date}T${time}:00`,
      ).toISOString()

      const { error: insertError } = await supabase
        .from('events')
        .insert({
          title: 'Allenamento',
          event_type: 'training',
          start_at: startAt,
          location,
          training_sheet_path: filePath,
        })

      if (insertError) {
        await supabase.storage
          .from('training-sheets')
          .remove([filePath])

        message.textContent =
          `Errore salvataggio: ${insertError.message}`
        saveButton.disabled = false
        saveButton.textContent = 'Salva allenamento'
        return
      }

      closeNewEventModal()
      await loadCalendarEvents()
      root.innerHTML = calendarView()
      bindDynamic()
    })
  }

  function openDrawer(day) {
    const event = calendarEvents.find(
      (item) => item.day === Number(day),
    )

    if (!event) {
      return
    }

    drawerRoot.innerHTML = drawerHtml(event)

    document.body.classList.add('drawer-open')

    drawerRoot
      .querySelectorAll('[data-close-drawer]')
      .forEach((element) => {
        element.addEventListener('click', closeDrawer)
      })
  }

  function closeDrawer() {
    drawerRoot.innerHTML = ''
    document.body.classList.remove('drawer-open')
  }

  function openProfileMenu() {
    if (!profileMenuButton || !profileDropdown) {
      return
    }

    profileMenuButton.setAttribute(
      'aria-expanded',
      'true',
    )

    profileDropdown.setAttribute(
      'aria-hidden',
      'false',
    )

    profileDropdown.classList.add('is-open')
    document.body.classList.add('profile-menu-open')
  }

  function closeProfileMenu() {
    if (!profileMenuButton || !profileDropdown) {
      return
    }

    profileMenuButton.setAttribute(
      'aria-expanded',
      'false',
    )

    profileDropdown.setAttribute(
      'aria-hidden',
      'true',
    )

    profileDropdown.classList.remove('is-open')
    document.body.classList.remove('profile-menu-open')
  }

  function toggleProfileMenu() {
    const isOpen =
      profileDropdown?.classList.contains('is-open')

    if (isOpen) {
      closeProfileMenu()
      return
    }

    openProfileMenu()
  }

  function bindDynamic() {
    root
      .querySelectorAll('[data-open-event]')
      .forEach((button) => {
        button.addEventListener('click', () => {
          openDrawer(button.dataset.openEvent)
        })
      })
  }

  document.addEventListener('click', (event) => {
    const newEventButton = event.target.closest('[data-new-event]')

    if (newEventButton) {
      event.preventDefault()
      openNewEventModal()
    }
  })

  document
    .querySelectorAll('.nav-item')
    .forEach((button) => {
      button.addEventListener('click', async () => {
        const sectionKey = button.dataset.section
        const sectionLabel = button.textContent.trim()

        setActiveNavigation(sectionKey)
        await setView(sectionKey, sectionLabel)
        closeProfileMenu()
      })
    })

  profileMenuButton?.addEventListener(
    'click',
    (event) => {
      event.stopPropagation()
      toggleProfileMenu()
    },
  )

  profileDropdown?.addEventListener(
    'click',
    (event) => {
      event.stopPropagation()
    },
  )

  document
    .querySelectorAll('[data-profile-action]')
    .forEach((button) => {
      button.addEventListener('click', async () => {
        const action = button.dataset.profileAction

        if (action === 'profile') {
          setActiveNavigation('')
          setView('profile', 'Profilo')
          closeProfileMenu()
          return
        }

        if (action === 'settings') {
          setActiveNavigation('settings')
          setView('settings', 'Impostazioni')
          closeProfileMenu()
          return
        }

        if (action === 'logout') {
          closeProfileMenu()
          logoutButton?.click()
        }
      })
    })

  document.addEventListener('click', (event) => {
    const clickedInsideProfileMenu =
      event.target.closest('.profile-menu-wrapper')

    if (!clickedInsideProfileMenu) {
      closeProfileMenu()
    }
  })

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeProfileMenu()
      closeDrawer()
      closeNewEventModal()
    }
  })

  bindDynamic()
}