/**
 * @name App
 * @description
 * @author darcrand
 */

import { useEffect, useState } from 'react'
import DocEditor from './components/DocEditor'

export default function App() {
  const [editorStateStr, setState] = useState<string | undefined>()

  useEffect(() => {
    const str = window.localStorage.getItem('editorState')

    if (str) {
      setState(str)
    }
  }, [])

  return (
    <>
      <DocEditor editorState={editorStateStr} />
    </>
  )
}
