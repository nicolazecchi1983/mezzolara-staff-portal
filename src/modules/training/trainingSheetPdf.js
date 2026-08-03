const CAPTURE_WIDTH = 794

function assertPdfDependencies() {
  if (!window.html2canvas || !window.jspdf?.jsPDF) {
    throw new Error('Generatore PDF non disponibile. Controlla la connessione e ricarica la pagina.')
  }
}

async function captureTrainingSheet(previewElement) {
  if (!previewElement) throw new Error('Anteprima Training Sheet non disponibile.')
  const captureRoot = document.createElement('div')
  captureRoot.className = 'ts-capture-root'
  const capturePaper = previewElement.cloneNode(true)
  capturePaper.classList.add('ts-paper--capture')
  Object.assign(capturePaper.style, {
    width: `${CAPTURE_WIDTH}px`,
    minWidth: `${CAPTURE_WIDTH}px`,
    maxWidth: `${CAPTURE_WIDTH}px`,
    transform: 'none',
    margin: '0',
  })
  captureRoot.appendChild(capturePaper)
  document.body.appendChild(captureRoot)
  try {
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    return await window.html2canvas(capturePaper, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      width: CAPTURE_WIDTH,
      height: capturePaper.scrollHeight,
      windowWidth: 1280,
    })
  } finally {
    captureRoot.remove()
  }
}

export async function generateTrainingSheetPdf(previewElement) {
  assertPdfDependencies()
  const canvas = await captureTrainingSheet(previewElement)
  const { jsPDF } = window.jspdf
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true })
  const pageWidth = 210
  const pageHeight = 297
  const margin = 5
  const imageWidth = pageWidth - margin * 2
  const imageHeight = canvas.height * imageWidth / canvas.width
  const scale = Math.min(1, (pageHeight - margin * 2) / imageHeight)
  const finalWidth = imageWidth * scale
  const finalHeight = imageHeight * scale
  pdf.addImage(
    canvas.toDataURL('image/jpeg', 0.96),
    'JPEG',
    (pageWidth - finalWidth) / 2,
    margin,
    finalWidth,
    finalHeight,
    undefined,
    'FAST',
  )
  return { pdf, blob: pdf.output('blob') }
}
