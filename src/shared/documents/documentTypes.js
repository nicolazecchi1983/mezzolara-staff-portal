import { registerDocumentType } from './documentRegistry.js'

export const TRAINING_SHEET_DOCUMENT = registerDocumentType({
  type: 'training_sheet',
  label: 'Training Sheet',
  formats: ['pdf'],
})

export const MATCH_REPORT_DOCUMENT = registerDocumentType({
  type: 'match_report',
  label: 'Match Report',
  formats: ['print', 'pdf'],
})

export const TEAM_BOARD_DOCUMENT = registerDocumentType({
  type: 'team_board',
  label: 'Board convocazioni',
  formats: ['print', 'pdf'],
})
