import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $insertNodeToNearestRoot } from '@lexical/utils'
import { COMMAND_PRIORITY_EDITOR } from 'lexical'
import { useEffect } from 'react'
import { $createFormTableNode } from './FormTableNode'
import { INSERT_FROM_TABLE } from './const'
import { FormTableCommandPayload } from './types'

export function FormTablePlugin() {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    return editor.registerCommand(
      INSERT_FROM_TABLE,
      (payload?: FormTableCommandPayload) => {
        const node = $createFormTableNode(payload || { cols: 3, rows: 3 })
        $insertNodeToNearestRoot(node)
        return true
      },
      COMMAND_PRIORITY_EDITOR
    )
  }, [editor])

  return null
}
