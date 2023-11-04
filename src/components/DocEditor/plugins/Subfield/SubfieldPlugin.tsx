import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $insertNodeToNearestRoot } from '@lexical/utils'
import { COMMAND_PRIORITY_EDITOR, createCommand } from 'lexical'
import { useEffect } from 'react'
import { $createSubfieldNode } from './SubfieldNode'
import { SubfieldPayload } from './types'

import { $createSubfieldItemNode } from '../SubfieldItem'

export const InsertSubfieldCommand = createCommand<SubfieldPayload>('insert-subfield-block-node')

export function SubfieldPlugin() {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    return editor.registerCommand(
      InsertSubfieldCommand,
      (payload: SubfieldPayload) => {
        console.log('SubfieldPlugin', payload)
        const node = $createSubfieldNode()

        const items = Array(payload.cols)
          .fill(0)
          .map(() => $createSubfieldItemNode())
        node.append(...items)

        $insertNodeToNearestRoot(node)
        return true
      },
      COMMAND_PRIORITY_EDITOR
    )
  }, [editor])

  return null
}
