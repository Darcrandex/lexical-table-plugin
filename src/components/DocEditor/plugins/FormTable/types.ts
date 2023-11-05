import { LexicalEditor, SerializedLexicalNode, Spread } from 'lexical'

export type ColHeader = { id: string; width?: number }

export type RowItem = { id: string; height?: number; cells: CellData[] }

export type CellData = {
  id: string
  colSpan?: number
  rowSpan?: number

  // 实例化时, 会创建一个 LexicalEditor
  nestedEditor?: LexicalEditor
  // 保存导出数据时, 将 editorState 转换成 JSON
  stateData?: Record<string, any>
}

export type FormTableCompProps = {
  bgColor?: string
  colHeaders?: ColHeader[]
  rows?: RowItem[]
}

// node
export type FormTableCommandPayload = {
  rows: number
  cols: number
}

export type FormTableData = Spread<{ props: FormTableCompProps }, SerializedLexicalNode>
export const FormTableType = 'form-table-node'
export const DEFAULT_CELL_WIDTH = 200

export const defaultEditorStateStr =
  '{"root":{"children":[{"children":[],"direction":null,"format":"","indent":0,"type":"paragraph","version":1}],"direction":null,"format":"","indent":0,"type":"root","version":1}}'

// 交互阶段
// 已选单元格基本信息
export type SelectedCell = Pick<CellData, 'id' | 'rowSpan' | 'colSpan'> & {
  rowIndex: number
  // 单元格的索引值不一定等于它对应的列的索引
  cellIndex: number
}
