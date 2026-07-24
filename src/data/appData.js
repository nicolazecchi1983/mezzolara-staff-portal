export const dashboardStats = [
  { label: 'Prossimo allenamento', value: '17:30', meta: 'Oggi · Budrio', icon: 'calendar' },
  { label: 'Giocatori disponibili', value: '24/27', meta: '3 da verificare', icon: 'squad' },
  { label: 'Training Sheet', value: '6', meta: 'Preparazione luglio', icon: 'sheet' },
  { label: 'Analisi da completare', value: '2', meta: 'Ultime gare', icon: 'analysis' },
]

export const todayItems = [
  { time: '10:00', title: 'Briefing staff', meta: 'Sala riunioni', type: 'meeting' },
  { time: '17:30', title: 'Allenamento', meta: 'Budrio · AL 004', type: 'training' },
  { time: '19:45', title: 'Caricamento Training Sheet', meta: 'Scadenza interna', type: 'sheet' },
]

export const recentActivity = [
  { title: 'AL 003 aggiornata', meta: '26/07/2026 · Test aerobico massimale' },
  { title: 'Rosa modificata', meta: 'Aggiunto Lugaro Manuel' },
  { title: 'Analisi gara salvata', meta: 'Possesso · costruzione dinamica' },
]

export const players = [
  { initials: 'TN', name: 'Tommaso Nistor', year: '2006', role: 'Portiere', foot: 'DX', status: 'Disponibile' },
  { initials: 'AM', name: 'Andrea Morelli', year: '2008', role: 'Difensore', foot: 'DX', status: 'Disponibile' },
  { initials: 'EM', name: 'Eddie Martusciello', year: '2008', role: 'Centrocampista', foot: 'SX', status: 'Disponibile' },
  { initials: 'GC', name: 'Gabriele Cacciamani', year: '2008', role: 'Attaccante', foot: 'DX', status: 'Da verificare' },
  { initials: 'MM', name: 'Matteo Morisi', year: '2006', role: 'Difensore', foot: 'SX', status: 'Disponibile' },
  { initials: 'AL', name: 'Andrea Lantignotti', year: '2007', role: 'Esterno', foot: 'DX', status: 'Disponibile' },
]

export const analysisItems = [
  { opponent: 'Imolese', date: '18/07/2026', clips: 12, status: 'In lavorazione', tag: 'Costruzione' },
  { opponent: 'Forlì', date: '11/07/2026', clips: 18, status: 'Completata', tag: 'Pressing' },
  { opponent: 'Ravenna', date: '04/07/2026', clips: 9, status: 'Da iniziare', tag: 'Transizioni' },
]

export const calendarEvents = [
  { day: 21, type: 'training', title: 'Allenamento', time: '17:30', place: 'Budrio', sheet: 'AL 001', present: 25, intensity: 3, volume: 4, load: 3 },
  { day: 23, type: 'training', title: 'Allenamento', time: '17:30', place: 'Mezzolara', sheet: 'AL 002', present: 24, intensity: 4, volume: 4, load: 4 },
  { day: 25, type: 'match', title: 'Partita', time: '15:30', place: 'Avversario', sheet: 'Match plan', present: 22, intensity: 5, volume: 3, load: 4 },
  { day: 26, type: 'training', title: 'Allenamento', time: '17:30', place: 'Budrio', sheet: 'AL 003', present: 26, intensity: 5, volume: 4, load: 5 },
  { day: 27, type: 'training', title: 'Allenamento', time: '17:30', place: 'Mezzolara', sheet: 'AL 005', present: 25, intensity: 4, volume: 4, load: 4 },
  { day: 29, type: 'meeting', title: 'Riunione staff', time: '20:00', place: 'Online', sheet: 'Note staff', present: 6, intensity: 1, volume: 1, load: 1 },
]
