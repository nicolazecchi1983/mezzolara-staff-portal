import { supabase } from '../../supabase.js'
import { AppError } from '../appError.js'

function requireStorage() {
  if (!supabase) {
    throw new AppError('Supabase non configurato.', {
      code: 'STORAGE_NOT_CONFIGURED',
      stage: 'storage',
      userMessage: 'Servizio documenti non disponibile. Ricarica la pagina e riprova.',
    })
  }
}

export async function uploadPrivateDocument({ bucket, path, blob, contentType, cacheControl = '3600' }) {
  requireStorage()
  const { error } = await supabase.storage.from(bucket).upload(path, blob, {
    contentType,
    cacheControl,
    upsert: false,
  })
  if (error) {
    throw new AppError(`Upload non riuscito: ${error.message}`, {
      code: 'STORAGE_UPLOAD_FAILED',
      stage: 'upload',
      cause: error,
      userMessage: 'Non è stato possibile caricare il nuovo documento. Il documento precedente è rimasto invariato.',
    })
  }
  return path
}

export async function removePrivateDocument({ bucket, path, silent = true }) {
  if (!supabase || !path) return false
  const { error } = await supabase.storage.from(bucket).remove([path])
  if (!error) return true
  if (silent) {
    console.warn('Rimozione documento non riuscita:', { bucket, path, error: error.message })
    return false
  }
  throw new AppError(`Rimozione non riuscita: ${error.message}`, {
    code: 'STORAGE_REMOVE_FAILED',
    stage: 'cleanup',
    cause: error,
    userMessage: 'Il documento è stato aggiornato, ma non è stato possibile rimuovere la versione precedente.',
  })
}
