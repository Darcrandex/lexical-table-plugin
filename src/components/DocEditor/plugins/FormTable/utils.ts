import { $getNodeByKey, LexicalEditor, NodeKey } from 'lexical'
import { customAlphabet } from 'nanoid'
import { flatten, range } from 'ramda'
import { $isFormTableNode } from './FormTableNode'
import { FormTableCompProps } from './types'

// 确保元素 id 以字母开头
export function uid() {
  return 'a' + customAlphabet(String.fromCharCode(...flatten([range(48, 58), range(65, 91), range(97, 123)])), 11)()
}

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
