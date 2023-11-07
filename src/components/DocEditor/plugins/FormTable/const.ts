import { createCommand } from 'lexical'
import { FormTableCommandPayload } from './types'

export const FORM_TABLE_TYPE = 'form-table-node'
export const DEFAULT_CELL_WIDTH = 200

export const DEFAULT_EDITOR_STATE_STRING =
  '{"root":{"children":[{"children":[],"direction":null,"format":"","indent":0,"type":"paragraph","version":1}],"direction":null,"format":"","indent":0,"type":"root","version":1}}'

export const COL_HEADER = 'form-table_col-header'
export const ROW_HEADER = 'form-table_row-header'
export const DATA_CELL = 'form-table_data-cell'

export const INSERT_FROM_TABLE = createCommand<FormTableCommandPayload | undefined>('insert-form-table-block-node')
