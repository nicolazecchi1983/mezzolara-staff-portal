const PRINT_PAYLOAD_PREFIX = 'staff-print-payload:'
const PRINT_PAGE_PATH = '/print.html'

function createPrintToken() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function collectDocumentStyles(doc = document) {
  return [...doc.querySelectorAll('link[rel="stylesheet"], style')]
    .map((node) => node.outerHTML)
    .join('')
}

function assertPrintableElement(element) {
  if (!(element instanceof Element)) {
    throw new Error('Documento da stampare non disponibile')
  }

  const rect = element.getBoundingClientRect()
  if (!element.innerHTML.trim() || rect.width < 20 || rect.height < 20) {
    throw new Error('Il documento non è ancora pronto per la stampa')
  }
}

function savePrintPayload(token, payload) {
  try {
    localStorage.setItem(`${PRINT_PAYLOAD_PREFIX}${token}`, JSON.stringify(payload))
  } catch (error) {
    throw new Error('Il documento è troppo grande per essere preparato alla stampa', { cause: error })
  }
}

function removePrintPayload(token) {
  localStorage.removeItem(`${PRINT_PAYLOAD_PREFIX}${token}`)
}

export function openPrintDocument(element, {
  title = 'Documento',
  bodyClass = '',
  pagePath = PRINT_PAGE_PATH,
  autoClose = true,
} = {}) {
  assertPrintableElement(element)

  const token = createPrintToken()
  const payload = {
    version: 1,
    createdAt: Date.now(),
    title,
    bodyClass,
    autoClose,
    baseHref: `${location.origin}/`,
    styles: collectDocumentStyles(),
    content: element.outerHTML,
  }

  savePrintPayload(token, payload)

  const printUrl = new URL(pagePath, location.origin)
  printUrl.searchParams.set('token', token)
  const printWindow = window.open(printUrl.toString(), '_blank', 'width=1100,height=900')

  if (!printWindow) {
    removePrintPayload(token)
    throw new Error('Il browser ha bloccato la finestra di stampa')
  }

  // Pulizia di sicurezza se la pagina di stampa non riesce a consumare il payload.
  window.setTimeout(() => removePrintPayload(token), 60_000)
  return printWindow
}

export function openPrintHtmlDocument({ title = 'Documento', html = '', className = '', styles = '' } = {}) {
  const host = document.createElement('div')
  host.className = className
  host.innerHTML = String(html)
  if (!host.innerHTML.trim()) throw new Error('Documento da stampare non disponibile')
  document.body.appendChild(host)
  try {
    return openPrintDocument(host, {
      title,
      bodyClass: className,
    })
  } finally {
    host.remove()
  }
}
