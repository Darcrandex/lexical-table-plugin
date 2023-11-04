import { $getNodeByKey, LexicalEditor, NodeKey } from 'lexical'
import { $isFormTableNode } from './FormTableNode'
import { FormTableCompProps } from './types'

export function $getFormTableProps(editor: LexicalEditor, nodeKey: NodeKey): FormTableCompProps {
  return editor.getEditorState().read(() => {
    const node = $getNodeByKey(nodeKey)
    if ($isFormTableNode(node)) {
      return node.getProps()
    }
    return {}
  })
}

export function $setFormTableProps(
  editor: LexicalEditor,
  nodeKey: NodeKey,
  next: (prev: FormTableCompProps) => FormTableCompProps
) {
  editor.update(() => {
    const node = $getNodeByKey(nodeKey)
    if ($isFormTableNode(node)) {
      node.setProps(next)
    }
  })
}
