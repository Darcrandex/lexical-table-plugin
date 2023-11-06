/**
 * @name InitialEditorStatePlugin
 * @description
 * @author darcrand
 */

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { useEffect, useRef } from 'react'

export default function InitialEditorStatePlugin(props: { editorState?: string }) {
  const [editor] = useLexicalComposerContext()
  const timer = useRef<any>(null)

  useEffect(() => {
    try {
      if (timer.current) {
        clearTimeout(timer.current)
      }

      timer.current = setTimeout(() => {
        if (typeof props.editorState === 'string' && props.editorState.trim()) {
          const state = editor.parseEditorState(props.editorState)
          editor.setEditorState(state)
        }
      }, 250)
    } catch (error) {
      console.log('error', error)
    }
  }, [editor, props.editorState])

  return null
}
