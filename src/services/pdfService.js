function waitForImages(root) {
  const images = [...root.querySelectorAll('img')]
  return Promise.all(images.map((image) => image.complete
    ? Promise.resolve()
    : new Promise((resolve) => {
        image.addEventListener('load', resolve, { once: true })
        image.addEventListener('error', resolve, { once: true })
      })))
}

export async function printHtmlDocument({ title = 'Documento', html, className = '', styles = '' }) {
  const printWindow = window.open('', '_blank', 'width=1100,height=900')
  if (!printWindow) throw new Error('Il browser ha bloccato la finestra di stampa.')
  const document = printWindow.document
  document.open()
  document.write(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>${styles}</head><body class="${className}">${html}</body></html>`)
  document.close()
  await new Promise((resolve) => printWindow.addEventListener('load', resolve, { once: true }))
  if (document.fonts?.ready) await document.fonts.ready.catch(() => {})
  await waitForImages(document)
  await new Promise((resolve) => printWindow.requestAnimationFrame(() => printWindow.requestAnimationFrame(resolve)))
  printWindow.focus()
  printWindow.addEventListener('afterprint', () => printWindow.close(), { once: true })
  printWindow.print()
}
