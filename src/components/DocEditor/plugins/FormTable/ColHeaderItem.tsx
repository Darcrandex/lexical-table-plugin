/**
 * @name ColHeaderItem
 * @description
 * @author darcrand
 */

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import clsx from 'clsx'
import { NodeKey } from 'lexical'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { COL_HEADER, DEFAULT_CELL_WIDTH, MIN_CELL_WIDTH } from './const'
import { ColHeader } from './types'
import { $setFormTableProps } from './utils'

export default function ColHeaderItem(props: { col: ColHeader; index: number; nodeKey: NodeKey }) {
  const [editor] = useLexicalComposerContext()
  const elRef = useRef<HTMLTableCellElement>(null)

  const [startPos, setStartPos] = useState({ x: 0, y: 0 })
  const [resizing, setResizing] = useState(false)
  const [prevWidth, setPrevWidth] = useState(props.col.width || DEFAULT_CELL_WIDTH)
  const [currWidth, setCurrWidth] = useState(props.col.width || DEFAULT_CELL_WIDTH)

  const onResizeStart = useCallback(
    (e: MouseEvent) => {
      setStartPos({ x: e.clientX, y: e.clientY })
      setPrevWidth(props.col.width || DEFAULT_CELL_WIDTH)
      setResizing(true)
    },
    [props.col.width]
  )

  const onResizeEnd = useCallback(() => {
    if (resizing) {
      setResizing(false)

      console.log('end')

      $setFormTableProps(editor, props.nodeKey, (prev) => {
        return {
          ...prev,
          colHeaders: prev.colHeaders?.map((v) => (v.id === props.col.id ? { ...v, width: currWidth } : v)),
        }
      })
    }
  }, [currWidth, editor, props.col.id, props.nodeKey, resizing])

  const onResizing = useCallback(
    (e: MouseEvent) => {
      if (!resizing) return

      const rect = elRef.current?.getBoundingClientRect()
      if (rect && (rect.top > e.clientY || rect.bottom < e.clientY)) {
        onResizeEnd()
        return
      }

      const dx = e.clientX - startPos.x
      setCurrWidth(Math.max(MIN_CELL_WIDTH, prevWidth + dx))
    },
    [onResizeEnd, prevWidth, resizing, startPos.x]
  )

  useEffect(() => {
    window.addEventListener('mousemove', onResizing)
    window.addEventListener('mouseup', onResizeEnd)

    return () => {
      window.removeEventListener('mousemove', onResizing)
      window.removeEventListener('mouseup', onResizeEnd)
    }
  }, [onResizeEnd, onResizing])

  const tableElementHeight = useMemo(() => {
    if (resizing) {
      const tableEle = elRef.current?.parentElement?.parentElement?.parentElement
      if (tableEle) {
        const rect = tableEle.getBoundingClientRect()
        return rect.height
      }
    }
  }, [resizing])

  return (
    <>
      <th
        ref={elRef}
        id={props.col.id}
        className={clsx(COL_HEADER, 'bg-pink-400 relative py-2')}
        style={{ width: resizing ? currWidth : props.col.width }}
      >
        {String.fromCharCode(65 + props.index)}

        <i
          className='group/col-resizer absolute z-10 top-0 right-0 bottom-0 w-4 translate-x-1/2 cursor-col-resize'
          onMouseDown={(e) => {
            e.stopPropagation()
            onResizeStart(e.nativeEvent)
          }}
        >
          <i
            className='absolute top-0 left-1/2 w-[1px] -translate-x-1/2 bg-blue-400 pointer-events-none transition-all opacity-0 group-hover/col-resizer:opacity-100'
            style={{ height: tableElementHeight }}
          ></i>
        </i>
      </th>
    </>
  )
}
