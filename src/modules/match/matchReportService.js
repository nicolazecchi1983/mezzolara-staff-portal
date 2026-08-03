import { buildMatchReportModel } from './matchReportModel.js'
import { validateMatchReport } from './matchReportValidation.js'

export function createMatchReportService({ root, collectData, getTeam, renderer } = {}) {
  if (!root || typeof collectData !== 'function' || typeof getTeam !== 'function' || !renderer) {
    throw new Error('Configurazione Match Report incompleta')
  }

  function build() {
    return buildMatchReportModel({ data: collectData(), root, team: getTeam() })
  }

  function render() {
    const model = build()
    const preview = root.querySelector('[data-match-report-preview]')
    if (preview) preview.innerHTML = renderer.renderPaper(model)
    const inline = renderer.renderInline(model)
    root.querySelectorAll('[data-match-inline-preview]').forEach((box) => {
      box.innerHTML = `<span>ANTEPRIMA REPORT</span><div>${inline[box.dataset.matchInlinePreview] || ''}</div>`
    })
    return model
  }

  function getPrintablePaper() {
    const model = render()
    const validation = validateMatchReport(model)
    return {
      model,
      validation,
      paper: root.querySelector('.match-report-paper'),
    }
  }

  return { build, render, getPrintablePaper }
}
