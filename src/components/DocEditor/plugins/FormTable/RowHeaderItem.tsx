/**
 * @name RowHeaderItem
 * @description 行头
 * @author darcrand
 */

import { useSize } from 'ahooks'
import clsx from 'clsx'
import { NodeKey } from 'lexical'
import { useEffect, useRef, useState } from 'react'
import { ROW_HEADER } from './const'
import { useFormTableContext } from './context'

type RowHeaderItemProps = { id: string; index: number; tableId: string; nodeKey: NodeKey }

export default function RowHeaderItem(props: RowHeaderItemProps) {
  const { selectedRowId, setSelectedColId, setSelectedRowId, setSelectedCells } = useFormTableContext()

  const elRef = useRef<any>(null)
  const [tableWidth, setTableWidth] = useState(0)
  const size = useSize(() => document.getElementById(props.tableId))

  useEffect(() => {
    const tableEle = elRef.current?.parentElement?.parentElement
    if (tableEle) {
      const rect = tableEle.getBoundingClientRect()
      setTableWidth(rect.width)
    }
  }, [size])

  return (
    <>
      <th
        ref={elRef}
        id={props.id}
        className={clsx(
          ROW_HEADER,
          'relative px-4 border',
          props.id === selectedRowId ? 'bg-emerald-300' : 'bg-violet-400'
        )}
        onClick={(e) => {
          e.stopPropagation()
          setSelectedRowId(props.id)
          setSelectedColId(undefined)
          setSelectedCells([])
        }}
      >
        {props.index + 1}

        {props.id === selectedRowId && (
          <i
            className='absolute z-10 left-0 top-0 bottom-0 bg-emerald-300/25 pointer-events-none'
            style={{ width: tableWidth }}
          ></i>
        )}
      </th>
    </>
  )
}
