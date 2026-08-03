import { openPrintHtmlDocument } from '../shared/print/printEngine.js'

/**
 * Compatibilità con i moduli esistenti.
 * Tutte le stampe HTML passano ora dal Print Engine condiviso.
 */
export async function printHtmlDocument({ title = 'Documento', html, className = '', styles = '' }) {
  const content = styles ? `<style>${styles}</style>${html}` : html
  return openPrintHtmlDocument({ title, html: content, className })
}
