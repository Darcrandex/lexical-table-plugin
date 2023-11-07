import { DecoratorNode, NodeKey, createEditor } from 'lexical'
import { ReactNode } from 'react'
import FormTableComp from './FormTableComp'
import { DEFAULT_CELL_WIDTH, DEFAULT_EDITOR_STATE_STRING, FORM_TABLE_TYPE } from './const'
import { FormTableCommandPayload, FormTableCompProps, FormTableData } from './types'
import { uid } from './utils'

export class FormTableNode extends DecoratorNode<ReactNode> {
  __props: FormTableCompProps = {}

  constructor(props: FormTableCompProps, key?: NodeKey) {
    super(key)

    this.__props = props
  }

  static getType() {
    return FORM_TABLE_TYPE
  }

  static clone(node: FormTableNode) {
    return new FormTableNode(node.__props)
  }

  static importJSON(payload: FormTableData) {
    // console.log('importJSON', payload)

    // 根据保存的数据重新实例化表格

    return new FormTableNode({
      ...payload.props,
      rows: payload.props.rows?.map((row) => ({
        ...row,
        cells: row.cells.map((cell) => {
          // 实例化并初始化内容
          const editorState = createEditor().parseEditorState(JSON.stringify(cell.stateData))

          return {
            ...cell,
            nestedEditor: createEditor({ editorState, namespace: cell.id, editable: false }),
          }
        }),
      })),
    })
  }

  exportJSON(): FormTableData {
    // console.log('exportJSON', this.__props)

    return {
      props: {
        ...this.__props,
        rows: this.__props.rows?.map((row) => ({
          ...row,
          cells: row.cells.map((cell) => ({
            ...cell,
            // 保存的时候, 销毁编辑器实例
            nestedEditor: undefined,
            stateData: cell.nestedEditor?.toJSON().editorState,
          })),
        })),
      },
      version: 1,
      type: FORM_TABLE_TYPE,
    }
  }

  createDOM() {
    const el = document.createElement('div')
    // 注意：
    // 这种方式并不会让 tailwindcss 识别
    // 由于内部组件中使用到同样的类名
    // 因此忽略
    el.classList.add('select-none')
    return el
  }

  updateDOM() {
    return false
  }

  decorate() {
    return <FormTableComp {...this.__props} nodeKey={this.getKey()} />
  }

  getProps() {
    return this.getLatest().__props
  }

  setProps(fn: (prev: FormTableCompProps) => FormTableCompProps) {
    const self = this.getWritable()
    self.__props = fn(self.__props)
  }
}

export function $createFormTableNode(payload: FormTableCommandPayload) {
  // 初次创建表格

  const props: FormTableCompProps = {
    colHeaders: Array(payload.cols)
      .fill(0)
      .map(() => ({ id: uid(), width: DEFAULT_CELL_WIDTH })),

    rows: Array(payload.rows)
      .fill(0)
      .map((_, rowIndex) => ({
        id: uid(),
        cells: Array(payload.cols)
          .fill(0)
          .map((_, colIndex) => {
            const cellId = uid()
            const editorState = createEditor().parseEditorState(DEFAULT_EDITOR_STATE_STRING)
            return {
              id: cellId,
              rowIndex,
              colIndex,
              nestedEditor: createEditor({ namespace: cellId, editable: false, editorState }),
            }
          }),
      })),
  }

  return new FormTableNode(props)
}

export function $isFormTableNode(node: any): node is FormTableNode {
  return node instanceof FormTableNode
}
