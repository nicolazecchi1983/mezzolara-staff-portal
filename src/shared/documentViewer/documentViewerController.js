import { documentViewerHtml } from './documentViewer.js'

export function createDocumentViewerController(root) {
  let previousFocus = null
  let onKeyDown = null

  function close({ restoreFocus = true } = {}) {
    if (!root || !root.hasChildNodes()) return

    document.removeEventListener('keydown', onKeyDown)
    onKeyDown = null
    root.innerHTML = ''
    document.body.classList.remove('document-viewer-open')

    if (restoreFocus && previousFocus instanceof HTMLElement && document.contains(previousFocus)) {
      previousFocus.focus({ preventScroll: true })
    }
    previousFocus = null
  }

  function open(documentData) {
    if (!root || !documentData?.url) return false

    close({ restoreFocus: false })
    previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    root.innerHTML = documentViewerHtml(documentData)
    document.body.classList.add('document-viewer-open')

    const dialog = root.querySelector('.document-viewer')
    const closeButton = root.querySelector('.document-viewer-close')

    root.querySelectorAll('[data-close-document-viewer]').forEach((element) => {
      element.addEventListener('click', (event) => {
        if (element.classList.contains('document-viewer-backdrop') && event.target !== element) return
        close()
      })
    })

    onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        close()
        return
      }

      if (event.key !== 'Tab' || !dialog) return
      const focusable = [...dialog.querySelectorAll('button, a[href], iframe, [tabindex]:not([tabindex="-1"])')]
        .filter((element) => !element.hasAttribute('disabled'))
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    requestAnimationFrame(() => closeButton?.focus({ preventScroll: true }))
    return true
  }

  return Object.freeze({ open, close })
}
