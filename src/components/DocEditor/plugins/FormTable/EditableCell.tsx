/**
 * @name EditableCell
 * @description
 * @author darcrand
 */

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import LexicalErrorBoundary from '@lexical/react/LexicalErrorBoundary'
import { LexicalNestedComposer } from '@lexical/react/LexicalNestedComposer'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { mergeRegister } from '@lexical/utils'
import clsx from 'clsx'
import { BLUR_COMMAND, COMMAND_PRIORITY_EDITOR, LexicalEditor } from 'lexical'
import React, { useCallback, useEffect, useRef, useState } from 'react'

export type EditableCellProps = { nestedEditor: LexicalEditor }

export default function EditableCell(props: EditableCellProps) {
  return (
    <>
      <LexicalNestedComposer initialEditor={props.nestedEditor}>
        <InnerContent />
      </LexicalNestedComposer>
    </>
  )
}

function InnerContent() {
  const [editor] = useLexicalComposerContext()
  const [isEditable, setIsEditable] = useState(false)
  const elRef = useRef<HTMLElement>(null)

  const doEdit = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      editor.update(() => {
        editor.setEditable(true)
        editor.focus()
        setIsEditable(true)
      })
    },
    [editor]
  )

  // 编辑器失去焦点的时候,退出编辑模式
  useEffect(() => {
    return mergeRegister(
      editor.registerCommand(
        BLUR_COMMAND,
        (_payload, _editor) => {
          _editor.setEditable(false)
          setIsEditable(false)
          return true
        },
        COMMAND_PRIORITY_EDITOR
      )
    )
  }, [editor])

  // 外部事件, 取消编辑状态
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (!elRef.current?.contains(e.target as any)) {
        editor.setEditable(false)
        setIsEditable(false)
      }
    }

    window.addEventListener('mouseup', handle)
    return () => {
      window.removeEventListener('mouseup', handle)
    }
  }, [editor])

  return (
    <>
      <section ref={elRef} onDoubleClick={doEdit}>
        <RichTextPlugin
          contentEditable={
            <ContentEditable
              className={clsx(
                'm-1 p-1 outline-none min-h-[22px]',
                isEditable ? 'bg-green-200' : 'select-none pointer-events-none'
              )}
            />
          }
          placeholder={null}
          ErrorBoundary={LexicalErrorBoundary}
        />
      </section>
    </>
  )
}
