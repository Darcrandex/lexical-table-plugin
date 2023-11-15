/**
 * @name TableTools
 * @description
 * @author darcrand
 */

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $getNodeByKey, NodeKey } from 'lexical'
import { useCallback } from 'react'
import { $isFormTableNode } from '../FormTableNode'

export type TableToolsProps = { className?: string }

export default function TableTools(props: TableToolsProps & { nodeKey: NodeKey }) {
  const [editor] = useLexicalComposerContext()

  const onRemove = useCallback(() => {
    if (props.nodeKey) {
      editor.update(() => {
        const node = $getNodeByKey(props.nodeKey)
        if ($isFormTableNode(node)) {
          node.remove()
        }
      })
    }

    return false
  }, [editor, props.nodeKey])

  return (
    <>
      <button className='disabled:text-gray-400 disabled:cursor-not-allowed' onClick={() => onRemove()}>
        删除表格
      </button>
    </>
  )
}
