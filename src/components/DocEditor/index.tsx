/**
 * @name DocEditor
 * @description
 * @author darcrand
 */

import { InitialConfigType, LexicalComposer } from '@lexical/react/LexicalComposer'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import LexicalErrorBoundary from '@lexical/react/LexicalErrorBoundary'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'

import { FormTableNode, FormTablePlugin, InsertFormTableCommand } from './plugins/FormTable'
import InitialEditorStatePlugin from './plugins/InitialEditorStatePlugin'
import { InsertSubfieldCommand, SubfieldNode, SubfieldPlugin } from './plugins/Subfield'
import { SubfieldItemNode } from './plugins/SubfieldItem'

export default function DocEditor(props: { editorState?: string }) {
  const config: InitialConfigType = {
    namespace: 'DocEditor',
    editable: true,
    nodes: [FormTableNode, SubfieldNode, SubfieldItemNode],
    onError: (error) => {
      console.log(error)
    },
  }
  return (
    <>
      <LexicalComposer initialConfig={config}>
        <EditorContent />
        <InitialEditorStatePlugin editorState={props.editorState} />
      </LexicalComposer>
    </>
  )
}

function EditorContent() {
  const [editor] = useLexicalComposerContext()
  const onSave = () => {
    const jsonData = editor.getEditorState().toJSON()
    console.log('save', jsonData)
    window.localStorage.setItem('editorState', JSON.stringify(jsonData))
  }

  return (
    <>
      <section className='flex flex-col h-screen'>
        <header className='p-4 bg-gray-200 space-x-4'>
          <button onClick={onSave}>Save</button>

          <button onClick={() => editor.dispatchCommand(InsertFormTableCommand, { rows: 6, cols: 4 })}>table</button>

          <button onClick={() => editor.dispatchCommand(InsertSubfieldCommand, { cols: 6 })}>subfield</button>
        </header>

        <main className='flex-1 bg-red-100'>
          <RichTextPlugin
            contentEditable={
              <ContentEditable className='w-[1200px] max-w-full min-h-[400px] mx-auto my-10 p-4 border outline-none bg-white' />
            }
            placeholder={null}
            ErrorBoundary={LexicalErrorBoundary}
          />
        </main>
      </section>

      <FormTablePlugin />
      <SubfieldPlugin />
    </>
  )
}
