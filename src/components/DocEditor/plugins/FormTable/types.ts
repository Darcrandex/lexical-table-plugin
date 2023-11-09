import { LexicalEditor, SerializedLexicalNode, Spread } from 'lexical'
import { CSSProperties } from 'react'

export type ColHeader = { id: string; width?: number }

export type RowItem = { id: string; height?: number; cells: CellData[] }

export type CellData = {
  id: string // table 元素的id

  // 行列索引一定有,但是动态的
  rowIndex: number
  colIndex: number

  colSpan?: number
  rowSpan?: number

  // 实例化时, 会创建一个 LexicalEditor
  nestedEditor?: LexicalEditor
  // 保存导出数据时, 将 editorState 转换成 JSON
  stateData?: Record<string, any>

  // 用于隐藏那些被合并，需要删除的单元格
  hidden?: boolean

  // 自定义样式
  style?: CSSProperties

  // 自定义边框
  borders?: CellBorderSettings[]
}

export type FormTableCompProps = {
  id: string
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

// 选区所选单元格
export type SelectedCell = Omit<CellData, 'nestedEditor' | 'stateData'>

// 表格边框配置
export type CellBorderSettings = {
  direction: 'left' | 'top' | 'right' | 'bottom'
  color?: string
}
