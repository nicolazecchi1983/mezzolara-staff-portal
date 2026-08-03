function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function documentBody({ url, title, mimeType = '' }) {
  const safeUrl = escapeHtml(url)
  const safeTitle = escapeHtml(title || 'Documento')
  const isPdf = mimeType === 'application/pdf' || /\.pdf(?:$|[?#])/i.test(url)

  if (isPdf) {
    return `<iframe class="document-viewer-frame" src="${safeUrl}#toolbar=1&navpanes=0&scrollbar=1" title="${safeTitle}"></iframe>`
  }

  return `<img class="document-viewer-image" src="${safeUrl}" alt="${safeTitle}">`
}

export function documentViewerHtml(document) {
  const title = document?.title || 'Documento'
  const url = document?.url || ''
  const downloadUrl = document?.downloadUrl || url

  return `
    <div class="document-viewer-backdrop" data-close-document-viewer>
      <section class="document-viewer" role="dialog" aria-modal="true" aria-labelledby="documentViewerTitle">
        <header class="document-viewer-header">
          <div>
            <span>ANTEPRIMA DOCUMENTO</span>
            <h2 id="documentViewerTitle">${escapeHtml(title)}</h2>
          </div>
          <button class="document-viewer-close" type="button" data-close-document-viewer aria-label="Chiudi anteprima">×</button>
        </header>
        <div class="document-viewer-body">
          ${documentBody({ url, title, mimeType: document?.mimeType })}
        </div>
        <footer class="document-viewer-footer">
          <button class="portal-action-button portal-action-button--secondary" type="button" data-close-document-viewer>Chiudi</button>
          <a class="portal-action-button portal-action-button--primary" href="${escapeHtml(downloadUrl)}" target="_blank" rel="noopener noreferrer">Apri in una nuova scheda</a>
        </footer>
      </section>
    </div>
  `
}
