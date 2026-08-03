export class AppError extends Error {
  constructor(message, { code = 'APP_ERROR', stage = null, cause = null, userMessage = null } = {}) {
    super(message, cause ? { cause } : undefined)
    this.name = 'AppError'
    this.code = code
    this.stage = stage
    this.userMessage = userMessage || message
  }
}

export function toAppError(error, fallback = {}) {
  if (error instanceof AppError) return error
  const message = error?.message || fallback.message || 'Operazione non riuscita.'
  return new AppError(message, {
    code: fallback.code || error?.code || 'APP_ERROR',
    stage: fallback.stage || null,
    cause: error,
    userMessage: fallback.userMessage || message,
  })
}

export function getUserErrorMessage(error, fallback = 'Operazione non riuscita. Riprova.') {
  return error?.userMessage || fallback
}
