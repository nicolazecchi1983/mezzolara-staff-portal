import { AppError, toAppError } from '../../core/appError.js'
import {
  buildTrainingSheetEventPayload,
  buildTrainingSheetFileName,
  buildTrainingSheetStoragePath,
  normalizeTrainingSheetData,
  validateTrainingSheetForPublish,
} from './trainingSheetModel.js'
import { generateTrainingSheetPdf } from './trainingSheetPdf.js'
import { removeTrainingSheetPdf, uploadTrainingSheetPdf } from './trainingSheetRepository.js'
import { requireTrainingSheetPublishPermission } from './trainingSheetPermissions.js'

export async function publishTrainingSheet({
  rawData,
  previewElement,
  team,
  squadTotal,
  existingEvent,
  confirmPreview,
  createEvent,
  updateEvent,
}) {
  requireTrainingSheetPublishPermission()
  const data = normalizeTrainingSheetData(rawData)
  validateTrainingSheetForPublish(data)

  const fileName = buildTrainingSheetFileName(data)
  let generated
  try {
    generated = await generateTrainingSheetPdf(previewElement)
  } catch (error) {
    throw toAppError(error, {
      code: 'TRAINING_PDF_GENERATION_FAILED',
      stage: 'generation',
      userMessage: 'Non è stato possibile generare il PDF. Controlla l’anteprima e riprova.',
    })
  }

  const { pdf, blob } = generated
  const confirmed = await confirmPreview(blob, fileName)
  if (!confirmed) return { cancelled: true }

  const filePath = buildTrainingSheetStoragePath({
    teamId: team?.id,
    season: team?.season,
    date: data.date,
    fileName,
  })
  await uploadTrainingSheetPdf(filePath, blob)

  const payload = buildTrainingSheetEventPayload({ data, filePath, squadTotal })
  let savedEvent
  try {
    savedEvent = existingEvent
      ? await updateEvent(existingEvent.id, payload)
      : await createEvent(payload)
  } catch (error) {
    await removeTrainingSheetPdf(filePath)
    throw new AppError(`Collegamento al calendario non riuscito: ${error?.message || 'errore sconosciuto'}`, {
      code: 'TRAINING_EVENT_SAVE_FAILED',
      stage: 'calendar',
      cause: error,
      userMessage: 'Il PDF è stato generato, ma non è stato possibile collegarlo al Calendario. Il nuovo file è stato annullato e il documento precedente è rimasto invariato.',
    })
  }

  const previousPath = existingEvent?.trainingSheetPath || null
  if (previousPath && previousPath !== filePath) {
    await removeTrainingSheetPdf(previousPath)
  }

  pdf.save(fileName)
  return {
    cancelled: false,
    data,
    fileName,
    filePath,
    event: savedEvent || existingEvent || null,
  }
}
