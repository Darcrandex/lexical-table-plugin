/**
 * @name InitialEditorStatePlugin
 * @description
 * @author darcrand
 */

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { useEffect } from 'react'

export default function InitialEditorStatePlugin(props: { editorState?: string }) {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    try {
      if (typeof props.editorState === 'string' && props.editorState.trim()) {
        const state = editor.parseEditorState(props.editorState)
        editor.setEditorState(state)
      }
    } catch (error) {
      console.log('error', error)
    }
  }, [editor, props.editorState])

  return null
}
