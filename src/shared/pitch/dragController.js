export function bindPitchTokenDragging({ pitch, tokens, getIndex, onMove, onCommit }) {
  if (!pitch) return () => {}
  const cleanups = []

  tokens.forEach((token) => {
    let dragging = false
    const index = getIndex(token)
    const move = (event) => {
      if (!dragging) return
      const rect = pitch.getBoundingClientRect()
      const x = ((event.clientX - rect.left) / rect.width) * 100
      const y = ((event.clientY - rect.top) / rect.height) * 100
      onMove(index, x, y, token)
    }
    const down = (event) => {
      if (event.button !== undefined && event.button !== 0) return
      dragging = true
      token.classList.add('is-dragging')
      token.setPointerCapture?.(event.pointerId)
      event.preventDefault()
    }
    const up = (event) => {
      if (!dragging) return
      move(event)
      dragging = false
      token.classList.remove('is-dragging')
      token.releasePointerCapture?.(event.pointerId)
      onCommit?.(index, token)
    }
    const cancel = () => {
      dragging = false
      token.classList.remove('is-dragging')
    }
    token.addEventListener('pointerdown', down)
    token.addEventListener('pointermove', move)
    token.addEventListener('pointerup', up)
    token.addEventListener('pointercancel', cancel)
    cleanups.push(() => {
      token.removeEventListener('pointerdown', down)
      token.removeEventListener('pointermove', move)
      token.removeEventListener('pointerup', up)
      token.removeEventListener('pointercancel', cancel)
    })
  })

  return () => cleanups.forEach((cleanup) => cleanup())
}
