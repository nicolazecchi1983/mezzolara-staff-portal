export const calendarEvents = [
  { day: 21, type: 'training', title: 'Allenamento', time: '17:30', place: 'Budrio' },
  { day: 23, type: 'training', title: 'Allenamento', time: '17:30', place: 'Mezzolara' },
  { day: 25, type: 'match', title: 'Partita', time: '15:30', place: 'Avversario' },
  { day: 26, type: 'training', title: 'Allenamento', time: '17:30', place: 'Budrio' },
  { day: 27, type: 'training', title: 'Allenamento', time: '17:30', place: 'Mezzolara' },
  { day: 29, type: 'meeting', title: 'Riunione staff', time: '20:00', place: 'Online' },
]

export const dashboardStats = [
  {
    key: 'next',
    label: 'Prossimo allenamento',
    value: '17:30',
    meta: 'Oggi · 26 Luglio 2026',
    footer: 'Budrio',
    icon: 'calendar',
  },
  {
    key: 'players',
    label: 'Giocatori',
    value: '27',
    meta: 'Rosa attuale',
    footer: 'Vai alla rosa',
    icon: 'squad',
  },
  {
    key: 'sheets',
    label: 'Training Sheet',
    value: '154',
    meta: 'Schede caricate',
    footer: 'Vai alle schede',
    icon: 'sheet',
  },
  {
    key: 'analysis',
    label: 'Analisi gare',
    value: '12',
    meta: 'Partite analizzate',
    footer: 'Vai all’analisi',
    icon: 'analysis',
  },
]
