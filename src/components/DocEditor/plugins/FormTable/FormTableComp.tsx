/**
 * @name FormTableComp
 * @description table
 * @author darcrand
 */

import { useClickAway } from 'ahooks'
import clsx from 'clsx'
import { NodeKey } from 'lexical'
import { prop, uniqBy } from 'ramda'
import { useCallback, useEffect, useRef, useState } from 'react'
import ColHeaderItem from './ColHeaderItem'
import EditableCell from './EditableCell'
import TopCellMenus from './TopCellMenus'
import { BordersRender } from './TopCellMenus/BorderTools'
import { DATA_CELL, ROW_HEADER } from './const'
import { useSelectedCells } from './store'
import { FormTableCompProps, SelectedCell } from './types'

export default function FormTableComp(props: FormTableCompProps & { nodeKey: NodeKey }) {
  // 选中单元格
  const tableRef = useRef<HTMLTableElement>(null)
  const menuRef = useRef<HTMLElement>(null)
  const { selectedCells, setSelectedCells } = useSelectedCells()

  const [startPos, setStartPos] = useState({ x: 0, y: 0 })
  const [selecting, setSelecting] = useState(false)

  const onSelectStart = useCallback((e: MouseEvent) => {
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
        // 所有转换过的单元格信息
        const cells: SelectedCell[] = []
        // 与选区有交集的单元格
        const cellsInArea: SelectedCell[] = []
        // 通过延伸的单元格
        const cellsInRange: SelectedCell[] = []

        // 排除隐藏的单元格
        const cellEles = Array.from(tableRef.current.querySelectorAll(`td.${DATA_CELL}:not(.hidden)`))

        for (let index = 0; index < cellEles.length; index++) {
          const ele = cellEles[index]
          const id = ele.getAttribute('id')
          if (!id) continue

          const cellRect = ele.getBoundingClientRect()
          const rowIndex = Number.parseInt(ele.getAttribute('data-row-index') || '0')
          const colIndex = Number.parseInt(ele.getAttribute('data-col-index') || '0')

          // 由于因合并单元格而被删除的单元格是通过隐藏实现的（DOM结构不变）
          // 因此单元格的索引值相当于列的索引值
          // const colIndex = Number.parseInt(ele.getAttribute('data-cell-index') || '0')

          const rowSpan = Number.parseInt(ele.getAttribute('rowspan') || '1')
          const colSpan = Number.parseInt(ele.getAttribute('colspan') || '1')
          cells.push({ id, rowIndex, colIndex, rowSpan, colSpan })

          if (
            Math.max(x1, cellRect.left) <= Math.min(x2, cellRect.right) &&
            Math.max(y1, cellRect.top) <= Math.min(y2, cellRect.bottom)
          ) {
            cellsInArea.push({ id, rowIndex, colIndex, rowSpan, colSpan })
          }
        }

        cellsInRange.push(...cellsInArea)

        // 递归延伸单元格
        let maxLoopTimes = 10000
        const loop = () => {
          // 当前最大行列
          const minRowIndex = Math.min(...cellsInRange.map((v) => v.rowIndex))
          const maxRowIndex = Math.max(...cellsInRange.map((v) => v.rowIndex + (v.rowSpan || 1) - 1))
          const minColIndex = Math.min(...cellsInRange.map((v) => v.colIndex))
          const maxColIndex = Math.max(...cellsInRange.map((v) => v.colIndex + (v.colSpan || 1) - 1))

          const extendedCells = cells
            // 先排除已经选中的单元格
            .filter((v) => cellsInRange.every((m) => v.id !== m.id))
            // 再添加符合条件的单元格
            .filter((v) => {
              return (
                v.rowIndex >= minRowIndex &&
                v.rowIndex <= maxRowIndex &&
                v.colIndex >= minColIndex &&
                v.colIndex <= maxColIndex
              )
            })

          // 如果存在跨行列的单元格，需要将该单元格所在的行列延申的其他单元格添加到选区
          cellsInRange.push(...extendedCells)

          // 判断进入递归
          // 延伸单元格的最大行列
          const _minRowIndex = Math.min(...cellsInRange.map((v) => v.rowIndex))
          const _maxRowIndex = Math.max(...cellsInRange.map((v) => v.rowIndex + (v.rowSpan || 1) - 1))
          const _minColIndex = Math.min(...cellsInRange.map((v) => v.colIndex))
          const _maxColIndex = Math.max(...cellsInRange.map((v) => v.colIndex + (v.colSpan || 1) - 1))

          if (
            maxLoopTimes > 0 &&
            (_minColIndex !== minColIndex ||
              _maxColIndex !== maxColIndex ||
              _minRowIndex !== minRowIndex ||
              _maxRowIndex !== maxRowIndex)
          ) {
            --maxLoopTimes
            loop()
          }
        }

        // 第一次进入循环
        loop()

        setSelectedCells(uniqBy(prop('id'), cellsInRange))
      }
    },
    [selecting, setSelectedCells, startPos.x, startPos.y]
  )

  const onSelectEnd = useCallback(() => {
    setSelecting(false)
  }, [])

  useEffect(() => {
    window.addEventListener('mousemove', onSelectMove)
    window.addEventListener('mouseup', onSelectEnd)
    return () => {
      window.removeEventListener('mousemove', onSelectMove)
      window.removeEventListener('mouseup', onSelectEnd)
    }
  }, [onSelectEnd, onSelectMove])

  // 点击外部清空
  useClickAway(() => {
    setSelectedCells([])
  }, [tableRef, menuRef])

  return (
    <>
      <h1>FormTableComp</h1>

      {/* 单元格功能菜单 */}
      <section ref={menuRef} className='relative'>
        <TopCellMenus nodeKey={props.nodeKey} />
      </section>

      <table ref={tableRef} className='relative select-none overflow-y-hidden'>
        <thead>
          <tr>
            <th id='origin' className='bg-orange-400'></th>

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
              <th id={row.id} className={clsx(ROW_HEADER, 'bg-violet-400 px-2')}>
                {rowIndex + 1}
              </th>

              {row.cells?.map((cell, cellIndex) => (
                <td
                  key={cell.id}
                  id={cell.id}
                  data-row-index={cell.rowIndex}
                  data-col-index={cell.colIndex}
                  data-cell-index={cellIndex}
                  rowSpan={cell.rowSpan}
                  colSpan={cell.colSpan}
                  className={clsx(
                    DATA_CELL,
                    'relative border p-0',
                    cell.hidden && 'hidden invisible',
                    selectedCells.some((v) => v.id === cell.id) ? 'bg-yellow-400' : 'bg-white'
                  )}
                  style={cell.style}
                  onClick={() =>
                    setSelectedCells([
                      { id: cell.id, rowIndex, colIndex: cellIndex, rowSpan: cell.rowSpan, colSpan: cell.colSpan },
                    ])
                  }
                  onMouseDown={(e) => onSelectStart(e.nativeEvent)}
                >
                  {!!cell.nestedEditor && <EditableCell nestedEditor={cell.nestedEditor} />}

                  <BordersRender borders={cell.borders} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}
