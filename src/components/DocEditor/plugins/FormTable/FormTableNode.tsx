import { DecoratorNode, NodeKey, createEditor } from 'lexical'
import { ReactNode } from 'react'
import FormTableComp from './FormTableComp'
import {
  DEFAULT_CELL_WIDTH,
  FormTableCommandPayload,
  FormTableCompProps,
  FormTableData,
  FormTableType,
  defaultEditorStateStr,
} from './types'
import { uid } from './utils'

export class FormTableNode extends DecoratorNode<ReactNode> {
  __props: FormTableCompProps = {}

  constructor(props: FormTableCompProps, key?: NodeKey) {
    console.log('constructor', props)
    super(key)

    this.__props = props
  }

  static getType() {
    return FormTableType
  }

  static clone(node: FormTableNode) {
    return new FormTableNode(node.__props)
  }

  static importJSON(payload: FormTableData) {
    console.log('importJSON', payload)

    // 根据保存的数据重新实例化表格

    return new FormTableNode({
      ...payload.props,
      rows: payload.props.rows?.map((row) => ({
        ...row,
        cols: row.cols.map((col) => {
          // 实例化并初始化内容
          const editorState = createEditor().parseEditorState(JSON.stringify(col.stateData))

          return {
            ...col,
            nestedEditor: createEditor({ editorState, namespace: col.id, editable: false }),
          }
        }),
      })),
    })
  }

  exportJSON(): FormTableData {
    console.log('exportJSON', this.__props)

    return {
      props: {
        ...this.__props,
        rows: this.__props.rows?.map((row) => ({
          ...row,
          cols: row.cols.map((col) => ({
            ...col,
            // 保存的时候, 销毁编辑器实例
            nestedEditor: undefined,
            stateData: col.nestedEditor?.toJSON().editorState,
          })),
        })),
      },
      version: 1,
      type: FormTableType,
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
      .map(() => ({
        id: uid(),
        cols: Array(payload.cols)
          .fill(0)
          .map(() => {
            const cellId = uid()
            const editorState = createEditor().parseEditorState(defaultEditorStateStr)
            return {
              id: cellId,
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
