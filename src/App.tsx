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
    } else {
      // 默认的数据
      setState(
        JSON.stringify({
          root: {
            children: [
              {
                children: [],
                direction: null,
                format: '',
                indent: 0,
                type: 'paragraph',
                version: 1,
              },
            ],
            direction: null,
            format: '',
            indent: 0,
            type: 'root',
            version: 1,
          },
        })
      )
    }
  }, [])

  return <>{editorStateStr && <DocEditor editorState={editorStateStr} />}</>
}
