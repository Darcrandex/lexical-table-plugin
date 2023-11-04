/**
 * @name EditableCell
 * @description
 * @author darcrand
 */

import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import LexicalErrorBoundary from '@lexical/react/LexicalErrorBoundary'
import { LexicalNestedComposer } from '@lexical/react/LexicalNestedComposer'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { mergeRegister } from '@lexical/utils'
import clsx from 'clsx'
import { BLUR_COMMAND, COMMAND_PRIORITY_EDITOR, LexicalEditor } from 'lexical'
import { useEffect } from 'react'

export type EditableCellProps = { nestedEditor: LexicalEditor }

export default function EditableCell(props: EditableCellProps) {
  useEffect(() => {
    // 初始化为不可编辑
    props.nestedEditor.setEditable(false)

    return mergeRegister(
      // 编辑器失去焦点的时候,退出编辑模式
      props.nestedEditor.registerCommand(
        BLUR_COMMAND,
        (_payload, _editor) => {
          _editor.setEditable(false)
          return true
        },
        COMMAND_PRIORITY_EDITOR
      )
    )
  }, [props.nestedEditor])

  const doEdit = () => {
    props.nestedEditor.setEditable(true)
    props.nestedEditor.focus()
  }

  const isEditable = props.nestedEditor.isEditable()

  return (
    <>
      <section
        onDoubleClick={(e) => {
          e.stopPropagation()
          doEdit()
        }}
      >
        <LexicalNestedComposer initialEditor={props.nestedEditor}>
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                className={clsx(
                  'm-4 outline-none min-h-[22px] bg-indigo-400',
                  !isEditable && 'select-none pointer-events-none'
                )}
              />
            }
            placeholder={null}
            ErrorBoundary={LexicalErrorBoundary}
          />
        </LexicalNestedComposer>
      </section>
    </>
  )
}
