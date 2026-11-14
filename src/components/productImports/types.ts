/** The lifecycle strings the API exposes for an import. */
export type ProductImportStatus =
  | 'pending'
  | 'parsing'
  | 'validating'
  | 'validated'
  | 'importing'
  | 'completed'
  | 'completed_with_errors'
  | 'failed'
  | 'cancelled'

/** Per-row state of a staged row. */
export type ProductImportRowStatus =
  | 'pending'
  | 'valid'
  | 'invalid'
  | 'imported'
  | 'failed'
  | 'skipped'

export const ROW_STATUS_OPTIONS: Array<{ value: '' | ProductImportRowStatus; label: string }> = [
  { value: '', label: 'All rows' },
  { value: 'valid', label: 'Valid' },
  { value: 'invalid', label: 'Invalid' },
  { value: 'imported', label: 'Imported' },
  { value: 'failed', label: 'Failed' },
  { value: 'skipped', label: 'Skipped' },
]
