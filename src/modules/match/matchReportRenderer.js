import { getFormationLayout } from '../../shared/pitch/formationLayouts.js'

export function createMatchReportRenderer({ escapeHtml }) {
  if (typeof escapeHtml !== 'function') throw new Error('escapeHtml obbligatorio')
  const escape = escapeHtml

  function renderPaper(model) {
    const {
      team, data: d, formationName, starters, bench, substitutions, goals, cards,
      opponentSystems, ownNotes, possessionNotes, nonPossessionNotes, setPieces, penaltySummary,
    } = model
    const teamName = team.shortName || team.name || 'Squadra'
    const pitchTokens = starters.map((player) => `<span class="report-token" style="left:${player.x}%;top:${player.y}%"><b>${escape(player.number)}</b><small>${escape(player.name.split(/\s+/).at(-1) || player.name)}</small></span>`).join('')
    const opponentTokens = Array.from({ length: 11 }, (_, index) => {
      const fallback = getFormationLayout(opponentSystems[0]?.system || '4-4-2')[index] || [50, 50]
      const x = Number(d[`opponent_position_x_${index}`] || fallback[0])
      const y = Number(d[`opponent_position_y_${index}`] || fallback[1])
      return `<span class="report-token report-token--opponent" style="left:${x}%;top:${y}%"><b>${index + 1}</b></span>`
    }).join('')

    return `<article class="match-report-paper">
      <div class="match-report-watermark"><b>NZ</b><span>NICOLA ZECCHI · MATCH REPORT</span></div>
      <header class="match-report-hero"><div><span class="match-report-kicker">MATCH SHEET · ${escape(teamName)}</span><h2>${escape(d.opponent || 'Avversario da definire')}</h2><p>${escape(d.competition || '')} · ${escape(d.date || '')} · ${escape(d.location || '')}</p></div><div class="match-report-result"><small>RISULTATO</small><strong>${escape(d.result || '—')}</strong></div></header>
      <div class="report-summary"><span><small>Sistema</small><b>${escape(formationName)}</b></span><span><small>1° tempo</small><b>${escape(d.half_result || '—')}</b></span><span><small>Casa/Trasferta</small><b>${escape(d.venue || '—')}</b></span></div>
      <section class="report-lineup-section"><h3>Confronto sistemi di gioco</h3><div class="report-dual-pitches"><article><h4>${escape(teamName)} · ${escape(formationName)}</h4><div class="report-pitch"><span class="pitch-goal pitch-goal-top"></span><span class="pitch-goal pitch-goal-bottom"></span>${pitchTokens}</div></article><article><h4>${escape(d.opponent || 'Avversario')} · ${escape(opponentSystems[0]?.system || 'Da definire')}</h4><div class="report-pitch report-pitch--opponent"><span class="pitch-goal pitch-goal-top"></span><span class="pitch-goal pitch-goal-bottom"></span>${opponentTokens}</div></article></div><div class="report-bench-strip"><h4>A disposizione</h4>${bench.length ? `<ol>${bench.map((item) => `<li><b>${escape(item.number || '—')}</b> ${escape(item.name)}</li>`).join('')}</ol>` : '<p>Da definire</p>'}</div></section>
      <section class="report-event-grid report-event-grid--three"><div><h3>Sostituzioni</h3>${substitutions.length ? `<ul>${substitutions.map((item) => `<li><b>${escape(item.minute || '—')}’</b> ${escape(item.out || '—')} → ${escape(item.in || '—')} <small>${escape(item.reason || '')}</small></li>`).join('')}</ul>` : '<p>Nessuna</p>'}</div><div><h3>Gol e assist</h3>${goals.length ? `<ul>${goals.map((item) => `<li><b>${escape(item.minute || '—')}’</b> ${escape(item.scorer || '—')}${item.assist ? ` · assist ${escape(item.assist)}` : ''}</li>`).join('')}</ul>` : '<p>Nessun gol registrato</p>'}</div><div><h3>Sanzioni</h3>${cards.length ? `<ul>${cards.map((item) => `<li><b>${escape(item.minute || '—')}’</b> ${escape(item.player || '—')} · ${escape(item.type || '')}</li>`).join('')}</ul>` : '<p>Nessuna sanzione</p>'}</div></section>
      <section><h3>Note propria squadra</h3>${ownNotes.length ? ownNotes.map((note) => `<p>${escape(note)}</p>`).join('') : '<p>Da completare</p>'}</section>
      <section class="report-two-cols"><div><h3>Sistemi avversari</h3>${opponentSystems.length ? `<ul>${opponentSystems.map((item, index) => `<li><b>${index === 0 ? 'Iniziale' : escape(item.minute || 'Cambio')}</b> · ${escape(item.system)}${item.note ? `<br><small>${escape(item.note)}</small>` : ''}</li>`).join('')}</ul>` : '<p>Da definire</p>'}</div><div><h3>Fasi avversarie</h3><h4>Possesso</h4>${possessionNotes.length ? possessionNotes.map((item) => `<p><b>${escape(item.label)}:</b> ${escape(item.note)}</p>`).join('') : '<p>—</p>'}<h4>Non possesso</h4>${nonPossessionNotes.length ? nonPossessionNotes.map((item) => `<p><b>${escape(item.label)}:</b> ${escape(item.note)}</p>`).join('') : '<p>—</p>'}</div></section>
      <section><h3>Palle inattive avversarie</h3>${setPieces.length ? `<div class="report-set-pieces">${setPieces.map((item) => `<article><h4>${escape(item.label)}</h4><p>${escape(item.note)}</p></article>`).join('')}</div>` : '<p>Da completare</p>'}${penaltySummary ? `<p class="report-penalty"><b>Rigore:</b> ${escape(penaltySummary)}</p>` : ''}</section>
      <section class="report-two-cols"><div><h3>Valutazione propria squadra</h3><p><b>Punti di forza:</b> ${escape(d.own_strengths || 'Da completare')}</p><p><b>Criticità:</b> ${escape(d.own_issues || 'Da completare')}</p></div><div><h3>Valutazione avversario</h3><p><b>Punti di forza:</b> ${escape(d.opp_strengths || 'Da completare')}</p><p><b>Punti deboli:</b> ${escape(d.opp_weaknesses || 'Da completare')}</p><p><b>Per il ritorno:</b> ${escape(d.return_notes || 'Da completare')}</p></div></section>
    </article>`
  }

  function renderInline(model) {
    const { team, data: d, formationName, starters, bench, substitutions, goals, cards, opponentSystems, ownNotes, possessionNotes, nonPossessionNotes } = model
    const teamName = team.shortName || team.name || 'Squadra'
    return {
      1: `<strong>${escape(d.opponent || 'Avversario da definire')}</strong><span>${escape(d.competition || '—')} · ${escape(d.date || '—')} · ${escape(d.result || '—')}</span>`,
      2: `<strong>${escape(teamName)} · ${escape(formationName)}</strong><span>${starters.filter((item) => item.name && item.name !== 'Da definire').length}/11 titolari · ${bench.length} a disposizione</span>`,
      3: `<strong>${escape(d.opponent || 'Avversario')}</strong><span>${escape(opponentSystems[0]?.system || 'Sistema da definire')} · ${possessionNotes.length + nonPossessionNotes.length} osservazioni</span>`,
      4: `<strong>${substitutions.length} cambi · ${goals.length} gol · ${cards.length} sanzioni</strong><span>${ownNotes.length ? `${ownNotes.length} blocchi note compilati` : 'Note da completare'}</span>`,
    }
  }

  return { renderPaper, renderInline }
}
