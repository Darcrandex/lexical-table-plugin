import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $insertNodeToNearestRoot } from '@lexical/utils'
import { COMMAND_PRIORITY_EDITOR, createCommand } from 'lexical'
import { useEffect } from 'react'
import { $createFormTableNode } from './FormTableNode'
import { FormTableCommandPayload } from './types'

export const InsertFormTableCommand = createCommand<FormTableCommandPayload | undefined>('insert-form-table-block-node')

export function FormTablePlugin() {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    return editor.registerCommand(
      InsertFormTableCommand,
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
