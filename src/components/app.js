import { icon } from './icons.js'
import { dashboardStats, todayItems, recentActivity, players, analysisItems, calendarEvents } from '../data/appData.js'

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
  return menu.map(([key, label], index) => `
    <button class="nav-item ${index === 0 ? 'is-active' : ''}" type="button" data-section="${key}">
      <span class="nav-icon">${icon(key)}</span><span>${label}</span>
    </button>`).join('')
}

function statCards() {
  return dashboardStats.map(item => `
    <article class="stat-card">
      <div class="stat-icon">${icon(item.icon)}</div>
      <div><span>${item.label}</span><strong>${item.value}</strong><small>${item.meta}</small></div>
    </article>`).join('')
}

function dashboardView() {
  return `
    <section class="view page-view">
      <div class="page-head"><div><h1>Dashboard</h1><p><span>STAGIONE 2026/27</span><b>•</b> Serie D</p></div><button class="primary-action">${icon('plus')} Nuovo elemento</button></div>
      <div class="stats-grid">${statCards()}</div>
      <div class="dashboard-layout">
        <article class="panel today-panel">
          <div class="panel-head"><div><span>OGGI</span><h2>26 Luglio 2026</h2></div><strong>3 attività</strong></div>
          <div class="timeline">
            ${todayItems.map(i => `<div class="timeline-item"><time>${i.time}</time><i class="${i.type}"></i><div><strong>${i.title}</strong><span>${i.meta}</span></div></div>`).join('')}
          </div>
        </article>
        <article class="panel quick-panel">
          <div class="panel-head"><div><span>PROSSIMO ALLENAMENTO</span><h2>17:30 · Budrio</h2></div></div>
          <div class="training-summary">
            <div><span>Training Sheet</span><strong>AL 004</strong></div>
            <div><span>Presenti</span><strong>26</strong></div>
            <div><span>Intensità</span><strong>5/5</strong></div>
            <div><span>Volume</span><strong>4/5</strong></div>
          </div>
          <button class="wide-button" data-open-event="26">Apri allenamento</button>
        </article>
        <article class="panel activity-panel">
          <div class="panel-head"><div><span>ATTIVITÀ RECENTI</span><h2>Ultime modifiche</h2></div></div>
          <div class="activity-list">${recentActivity.map(a => `<div><strong>${a.title}</strong><span>${a.meta}</span></div>`).join('')}</div>
        </article>
      </div>
    </section>`
}

function calendarCells() {
  const cells = [
    ...[29,30].map(day => ({day, muted:true})),
    ...Array.from({length:31}, (_,i)=>({day:i+1, muted:false})),
    ...[1,2].map(day => ({day, muted:true}))
  ]
  return cells.map(({day, muted}) => {
    const ev = muted ? null : calendarEvents.find(e=>e.day===day)
    return `<div class="calendar-cell ${muted?'is-muted':''}">
      <span class="day-number ${!muted&&day===26?'is-today':''}">${day}</span>
      ${ev ? `<button class="calendar-event calendar-event--${ev.type}" data-open-event="${day}" type="button"><strong><i></i>${ev.title}</strong><span>${ev.time} · ${ev.place}</span></button>`:''}
    </div>`
  }).join('')
}

function calendarView() {
  return `
  <section class="view page-view">
    <div class="page-head"><div><h1>Calendario</h1><p><span>STAGIONE 2026/27</span><b>•</b> Serie D</p></div><button class="primary-action">${icon('plus')} Nuovo evento</button></div>
    <section class="calendar-panel">
      <div class="calendar-toolbar"><div><button>‹</button><button>›</button><button>Oggi</button></div><h2>Luglio 2026</h2><div><button class="is-active">Mese</button><button>Settimana</button><button>Agenda</button></div></div>
      <div class="calendar-weekdays"><span>LUN</span><span>MAR</span><span>MER</span><span>GIO</span><span>VEN</span><span>SAB</span><span>DOM</span></div>
      <div class="calendar-grid">${calendarCells()}</div>
    </section>
  </section>`
}

function squadView() {
  return `
  <section class="view page-view">
    <div class="page-head"><div><h1>Rosa</h1><p><span>27 GIOCATORI</span><b>•</b> Serie D</p></div><button class="primary-action">${icon('plus')} Nuovo giocatore</button></div>
    <div class="players-grid">${players.map(p=>`
      <article class="player-card">
        <div class="player-avatar">${p.initials}</div>
        <div class="player-main"><h3>${p.name}</h3><p>${p.year} · ${p.role}</p></div>
        <div class="player-meta"><span>Piede ${p.foot}</span><strong class="${p.status==='Disponibile'?'ok':'warn'}">${p.status}</strong></div>
      </article>`).join('')}
    </div>
  </section>`
}

function analysisView() {
  return `
  <section class="view page-view">
    <div class="page-head"><div><h1>Analisi Gare</h1><p><span>VIDEO E CLIP</span><b>•</b> Stagione 2026/27</p></div><button class="primary-action">${icon('plus')} Nuova analisi</button></div>
    <div class="analysis-grid">${analysisItems.map(a=>`
      <article class="analysis-card">
        <div class="video-placeholder">${icon('analysis')}</div>
        <div class="analysis-copy"><span>${a.date}</span><h3>Mezzolara · ${a.opponent}</h3><p>${a.clips} clip · ${a.tag}</p><strong>${a.status}</strong></div>
      </article>`).join('')}
    </div>
  </section>`
}

function placeholderView(title) {
  return `<section class="view page-view"><div class="page-head"><div><h1>${title}</h1><p><span>SEZIONE PRONTA</span><b>•</b> Prossima release</p></div></div><div class="placeholder-panel"><h2>${title}</h2><p>La struttura grafica è pronta per essere collegata a Supabase.</p></div></section>`
}

function drawerHtml(event) {
  return `
    <div class="drawer-backdrop" data-close-drawer></div>
    <aside class="event-drawer">
      <div class="drawer-head"><div><span>ALLENAMENTO</span><h2>26 Luglio 2026</h2></div><button data-close-drawer>${icon('close')}</button></div>
      <div class="drawer-section"><label>Orario</label><strong>${event.time}</strong><small>${event.place}</small></div>
      <div class="drawer-grid">
        <div><span>Presenti</span><strong>${event.present}</strong></div>
        <div><span>Training Sheet</span><strong>${event.sheet}</strong></div>
        <div><span>Intensità</span><strong>${event.intensity}/5</strong></div>
        <div><span>Volume</span><strong>${event.volume}/5</strong></div>
      </div>
      <div class="drawer-section"><label>Note</label><textarea placeholder="Aggiungi note per lo staff..."></textarea></div>
      <div class="drawer-actions"><button>Carica PNG</button><button class="primary-action">Salva modifiche</button></div>
    </aside>`
}

export function renderApp(user) {
  return `
  <div class="app-shell">
    <aside class="sidebar">
      <div class="sidebar-brand"><div class="brand-square">NZ</div><div><strong>NICOLA ZECCHI</strong><span>STAFF</span></div></div>
      <nav class="sidebar-nav">${menuHtml()}</nav>
      <button id="logoutButton" class="logout-button">${icon('logout')}<span>Esci</span></button>
    </aside>
    <div class="workspace">
      <header class="topbar"><div></div><div class="user-menu"><span class="user-avatar">${user.email?.charAt(0).toUpperCase() ?? 'N'}</span><strong>Nicola Zecchi</strong><span>⌄</span></div></header>
      <main id="viewRoot">${dashboardView()}</main>
    </div>
    <div id="drawerRoot"></div>
  </div>`
}

export function attachAppEvents() {
  const root = document.querySelector('#viewRoot')
  const drawerRoot = document.querySelector('#drawerRoot')

  function setView(key, label) {
    const views = {
      dashboard: dashboardView,
      calendar: calendarView,
      squad: squadView,
      analysis: analysisView,
    }
    root.innerHTML = views[key] ? views[key]() : placeholderView(label)
    bindDynamic()
  }

  function openDrawer(day) {
    const event = calendarEvents.find(e => e.day === Number(day))
    if (!event) return
    drawerRoot.innerHTML = drawerHtml(event)
    document.body.classList.add('drawer-open')
    drawerRoot.querySelectorAll('[data-close-drawer]').forEach(el => el.addEventListener('click', closeDrawer))
  }

  function closeDrawer() {
    drawerRoot.innerHTML = ''
    document.body.classList.remove('drawer-open')
  }

  function bindDynamic() {
    root.querySelectorAll('[data-open-event]').forEach(btn => btn.addEventListener('click', () => openDrawer(btn.dataset.openEvent)))
  }

  document.querySelectorAll('.nav-item').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('is-active'))
    btn.classList.add('is-active')
    setView(btn.dataset.section, btn.textContent.trim())
  }))

  bindDynamic()
}
