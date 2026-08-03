import { openPrintDocument } from '../../shared/print/printEngine.js'

export function printMatchReport(paper, { title = 'Match Report' } = {}) {
  return openPrintDocument(paper, {
    title,
    bodyClass: 'match-print-body',
  })
}
