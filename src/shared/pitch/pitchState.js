import { getFormationLayout } from './formationLayouts.js'

export const PITCH_POSITION_MODE = Object.freeze({
  AUTOMATIC: 'automatic',
  CUSTOM: 'custom',
})

const clamp = (value, min = 4, max = 96) => Math.min(max, Math.max(min, Number(value) || 0))
const clonePositions = (positions) => positions.map(([x, y]) => [Number(x), Number(y)])

export function createPitchState({ formation = '4-4-2', positions = null, mode = null, mirrored = false } = {}) {
  let currentFormation = formation
  let currentMode = mode || (Array.isArray(positions) && positions.length === 11 ? PITCH_POSITION_MODE.CUSTOM : PITCH_POSITION_MODE.AUTOMATIC)
  const orient = (layout) => mirrored ? layout.map(([x, y]) => [x, 100 - y]) : layout
  let currentPositions = Array.isArray(positions) && positions.length === 11
    ? clonePositions(positions)
    : orient(getFormationLayout(formation))
  let revision = 0

  const snapshot = () => ({
    formation: currentFormation,
    mode: currentMode,
    positions: clonePositions(currentPositions),
    revision,
  })

  const applyFormation = (nextFormation) => {
    currentFormation = nextFormation || '4-4-2'
    currentPositions = orient(getFormationLayout(currentFormation))
    currentMode = PITCH_POSITION_MODE.AUTOMATIC
    revision += 1
    return snapshot()
  }

  const moveToken = (index, x, y) => {
    if (!Number.isInteger(index) || index < 0 || index >= 11) return snapshot()
    currentPositions[index] = [clamp(x), clamp(y)]
    currentMode = PITCH_POSITION_MODE.CUSTOM
    revision += 1
    return snapshot()
  }

  const restore = ({ formation: restoredFormation, positions: restoredPositions, mode: restoredMode } = {}) => {
    currentFormation = restoredFormation || currentFormation
    if (Array.isArray(restoredPositions) && restoredPositions.length === 11) {
      currentPositions = clonePositions(restoredPositions)
      currentMode = restoredMode || PITCH_POSITION_MODE.CUSTOM
    } else {
      currentPositions = orient(getFormationLayout(currentFormation))
      currentMode = PITCH_POSITION_MODE.AUTOMATIC
    }
    revision += 1
    return snapshot()
  }

  return { snapshot, applyFormation, moveToken, restore }
}
