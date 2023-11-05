/**
 * @name FormTableComp
 * @description table
 * @author darcrand
 */

import { useClickAway } from 'ahooks'
import clsx from 'clsx'
import { NodeKey } from 'lexical'
import { useCallback, useEffect, useRef, useState } from 'react'
import ColHeaderItem from './ColHeaderItem'
import EditableCell from './EditableCell'
import TopCellMenus from './TopCellMenus'
import { FormTableCompProps } from './types'

export default function FormTableComp(props: FormTableCompProps & { nodeKey: NodeKey }) {
  // 选中单元格
  const tableRef = useRef<HTMLTableElement>(null)
  const [selectedCellIds, setSelectedCellIds] = useState<string[]>([])

  const [startPos, setStartPos] = useState({ x: 0, y: 0 })
  const [selecting, setSelecting] = useState(false)

  const onSelectStart = useCallback((e: MouseEvent) => {
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
        const cellEles = tableRef.current.querySelectorAll('td.data-cell:not(.hidden)')

        for (let index = 0; index < cellEles.length; index++) {
          const ele = cellEles[index]
          const id = ele.getAttribute('id')
          if (!id) continue

          const cellRect = ele.getBoundingClientRect()

          // 当 x轴，y轴 都有交集时，说明在选区内部
          // !!! 算法需要调整，如果单元格是一个合并后的单元格，区域可能错误
          if (
            Math.max(x1, cellRect.left) <= Math.min(x2, cellRect.right) &&
            Math.max(y1, cellRect.top) <= Math.min(y2, cellRect.bottom)
          ) {
            ids.push(id)
          }
        }

        setSelectedCellIds(ids)
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

      <table ref={tableRef} className='relative select-none overflow-y-hidden'>
        {/* 单元格功能菜单 */}
        <TopCellMenus
          selectedCellIds={selectedCellIds}
          setSelectedCellIds={setSelectedCellIds}
          nodeKey={props.nodeKey}
        />

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
              <th id={row.id} className={clsx('row-header', 'bg-violet-400')} style={{ width: 24, height: 24 }}>
                {rowIndex + 1}
              </th>

              {row.cells?.map((cell, cellIndex) => (
                <td
                  key={cell.id}
                  id={cell.id}
                  data-row-index={rowIndex}
                  data-cell-index={cellIndex}
                  rowSpan={cell.rowSpan}
                  colSpan={cell.colSpan}
                  className={clsx(
                    'data-cell',
                    cell.hidden && 'hidden invisible',
                    selectedCellIds.some((v) => v === cell.id) ? 'bg-yellow-400' : 'bg-blue-300'
                  )}
                  onClick={() => setSelectedCellIds([cell.id])}
                >
                  {!!cell.nestedEditor && <EditableCell nestedEditor={cell.nestedEditor} />}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}
