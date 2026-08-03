export function createPitchController({ state, render, persist = () => {} }) {
  if (!state || typeof render !== 'function') throw new Error('Pitch controller configuration non valida')

  const commit = (snapshot, shouldPersist = true) => {
    render(snapshot)
    if (shouldPersist) persist(snapshot)
    return snapshot
  }

  return {
    initialize(snapshot) {
      return commit(snapshot || state.snapshot(), false)
    },
    applyFormation(formation, shouldPersist = true) {
      return commit(state.applyFormation(formation), shouldPersist)
    },
    moveToken(index, x, y, shouldPersist = true) {
      return commit(state.moveToken(index, x, y), shouldPersist)
    },
    restore(payload, shouldPersist = false) {
      return commit(state.restore(payload), shouldPersist)
    },
    snapshot: () => state.snapshot(),
  }
}
