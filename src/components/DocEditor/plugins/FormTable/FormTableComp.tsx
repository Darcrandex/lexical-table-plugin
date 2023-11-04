/**
 * @name FormTableComp
 * @description table
 * @author darcrand
 */

import { useClickAway } from 'ahooks'
import { NodeKey } from 'lexical'
import { useCallback, useEffect, useRef, useState } from 'react'
import ColHeaderItem from './ColHeaderItem'
import EditableCell from './EditableCell'
import { FormTableCompProps } from './types'

export default function FormTableComp(props: FormTableCompProps & { nodeKey: NodeKey }) {
  // 选中单元格
  const tableRef = useRef<HTMLTableElement>(null)
  const [selectedCellIds, setSelectedCellIds] = useState<string[]>([])
  const [startPos, setStartPos] = useState({ x: 0, y: 0 })
  const [selecting, setSelecting] = useState(false)

  const onSelectStart = useCallback((e: MouseEvent) => {
    console.log('start')
    if (!tableRef.current?.contains(e.target as any)) {
      return
    }

    setSelecting(true)
    setStartPos({ x: e.clientX, y: e.clientY })
  }, [])

  const onSelectMove = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation()
      if (!selecting) return

      // 左上角
      const x1 = Math.min(startPos.x, e.clientX)
      const y1 = Math.min(startPos.y, e.clientY)
      // 右下角
      const x2 = Math.max(startPos.x, e.clientX)
      const y2 = Math.max(startPos.y, e.clientY)

      if (tableRef.current) {
        const ids: string[] = []
        const allCells = tableRef.current.querySelectorAll('td')
        allCells.forEach((ele) => {
          const cellId = ele.getAttribute('id') || ''
          const rect = ele.getBoundingClientRect()

          // 当 x轴，y轴 都有交集时，说明在选区内部
          if (
            Math.max(x1, rect.left) <= Math.min(x2, rect.right) &&
            Math.max(y1, rect.top) <= Math.min(y2, rect.bottom)
          ) {
            ids.push(cellId)
          }
        })

        setSelectedCellIds(ids.filter(Boolean))
      }
    },
    [selecting, startPos]
  )

  const onSelectEnd = useCallback(() => {
    setSelecting(false)
  }, [])

  useEffect(() => {
    window.addEventListener('mousedown', onSelectStart)
    window.addEventListener('mousemove', onSelectMove)
    window.addEventListener('mouseup', onSelectEnd)
    return () => {
      window.removeEventListener('mousedown', onSelectStart)
      window.removeEventListener('mousemove', onSelectMove)
      window.removeEventListener('mouseup', onSelectEnd)
    }
  }, [onSelectEnd, onSelectMove, onSelectStart])

  // 点击外部清空
  useClickAway(() => {
    setSelectedCellIds([])
  }, tableRef)

  return (
    <>
      <h1>FormTableComp</h1>

      <table ref={tableRef} className='select-none overflow-y-hidden'>
        <thead>
          <tr>
            <th id='origin' className='bg-orange-400' style={{ width: 24, height: 24 }}></th>

            {/* 列头 */}
            {props.colHeaders?.map((item, colIndex) => (
              <ColHeaderItem key={item.id} col={item} index={colIndex} nodeKey={props.nodeKey} />
            ))}
          </tr>
        </thead>

        <tbody>
          {props.rows?.map((row, rowIndex) => (
            <tr key={row.id}>
              {/* 行头 */}
              <th id={row.id} className='bg-violet-400' style={{ width: 24, height: 24 }}>
                {rowIndex + 1}
              </th>

              {row.cols?.map((col) => (
                <td
                  key={col.id}
                  id={col.id}
                  className={selectedCellIds.includes(col.id) ? 'bg-yellow-400' : ''}
                  onClick={() => setSelectedCellIds([col.id])}
                >
                  {!!col.nestedEditor && <EditableCell nestedEditor={col.nestedEditor} />}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}
