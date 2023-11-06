/**
 * @name TopCellMenus
 * @description 顶部单元格菜单
 * @description 需要确保父级的 table 有定位属性
 * @author darcrand
 */

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import clsx from 'clsx'
import { NodeKey, createEditor } from 'lexical'
import { clone, head, insertAll, prop, uniqBy } from 'ramda'
import React, { useCallback, useMemo, useRef } from 'react'
import { DEFAULT_CELL_WIDTH, defaultEditorStateStr } from './const'
import { CellData, ColHeader, SelectedCell } from './types'
import { $getFormTableProps, $setFormTableProps, uid } from './utils'

export type TopCellMenusProps = {
  selectedCells: SelectedCell[]
  setSelectedCells: React.Dispatch<React.SetStateAction<SelectedCell[]>>

  nodeKey: NodeKey
}

export default function TopCellMenus(props: TopCellMenusProps) {
  const [editor] = useLexicalComposerContext()
  const elRef = useRef<HTMLElement>(null)

  // 合并单元格
  const canMergeCells = useMemo(() => {
    return (
      props.selectedCells.length > 1 &&
      props.selectedCells.every((cell) => (cell.rowSpan || 1) + (cell.colSpan || 1) === 2)
    )
  }, [props.selectedCells])

  const mergeCells = useCallback(() => {
    // 左上角需要修改的单元格
    let targetCell: SelectedCell = {
      id: '',
      colIndex: Infinity,
      rowIndex: Infinity,
    }

    const rowSpan =
      1 +
      Math.max(...props.selectedCells.map((v) => v.rowIndex)) -
      Math.min(...props.selectedCells.map((v) => v.rowIndex))
    const colSpan =
      1 +
      Math.max(...props.selectedCells.map((v) => v.colIndex)) -
      Math.min(...props.selectedCells.map((v) => v.colIndex))

    // 找到最左上角的单元格,并设置新的行列数
    for (let index = 0; index < props.selectedCells.length; index++) {
      const item = props.selectedCells[index]
      if (item.rowIndex < targetCell.rowIndex || item.colIndex < targetCell.colIndex) {
        targetCell = { ...item, rowSpan, colSpan }
        break
      }
    }

    // 需要被隐藏的单元格
    const removeCellIds = props.selectedCells.filter((v) => v.id !== targetCell.id).map((v) => v.id)

    $setFormTableProps(editor, props.nodeKey, (prev) => {
      return {
        ...prev,
        rows: prev.rows?.map((row) => {
          return {
            ...row,
            cells: row.cells
              // （隐式）删除其他单元格
              .map((v) => ({ ...v, hidden: v.hidden || removeCellIds.includes(v.id) }))
              // 再修改跨行跨列
              // 合并 editorState
              .map((v) => (v.id === targetCell.id ? { ...v, rowSpan, colSpan } : v)),
          }
        }),
      }
    })

    props.setSelectedCells([targetCell])
  }, [editor, props])

  // 拆分单元格
  const canUnmergeCells = useMemo(() => {
    return (
      props.selectedCells.length > 0 &&
      props.selectedCells.some((cell) => (cell.rowSpan || 1) + (cell.colSpan || 1) > 2)
    )
  }, [props.selectedCells])

  const unmergeCells = useCallback(() => {
    const rows = clone($getFormTableProps(editor, props.nodeKey).rows) || []
    const shouldUnmergeCells = props.selectedCells.filter((v) => (v.rowSpan || 1) + (v.colSpan || 1) > 2)

    // 找到需要重新显示的单元格
    const shouldVisibleCells: SelectedCell[] = []
    for (let i = 0; i < shouldUnmergeCells.length; i++) {
      const item = shouldUnmergeCells[i]

      for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
        const row = rows[rowIndex]

        for (let colIndex = 0; colIndex < row.cells.length; colIndex++) {
          const cell = row.cells[colIndex]
          const maxRowIndex = item.rowIndex + (item.rowSpan || 1) - 1
          const maxColIndex = item.colIndex + (item.colSpan || 1) - 1
          if (
            cell.id !== item.id &&
            rowIndex >= item.rowIndex &&
            rowIndex <= maxRowIndex &&
            colIndex >= item.colIndex &&
            colIndex <= maxColIndex
          ) {
            shouldVisibleCells.push({ id: cell.id, rowIndex, colIndex })
          }
        }
      }
    }

    $setFormTableProps(editor, props.nodeKey, (prev) => {
      return {
        ...prev,
        rows: prev.rows?.map((row) => {
          return {
            ...row,
            cells: row.cells
              // 重新显示被隐藏的单元格
              .map((v) => (shouldVisibleCells.some((m) => m.id === v.id) ? { ...v, hidden: undefined } : v))
              // 还原跨行跨列
              .map((v) => ({ ...v, rowSpan: undefined, colSpan: undefined })),
          }
        }),
      }
    })

    props.setSelectedCells((prev) => [...prev, ...shouldVisibleCells])
  }, [editor, props])

  // 插入行列
  const canInsert = useMemo(() => {
    // 目前只考虑选择一个单元格后的情况
    return props.selectedCells.length === 1
  }, [props.selectedCells])

  const insertRow = useCallback(
    (direction?: 'up' | 'down') => {
      const rowIndex = (head(props.selectedCells)?.rowIndex || 0) + (direction === 'up' ? 0 : 1)

      // 相交的单元格坐标
      const intersectantCellsIndex: { rowIndex: number; colIndex: number }[] = []

      $setFormTableProps(editor, props.nodeKey, (prev) => {
        const cols = prev.colHeaders?.length || 0
        const prevRows = prev.rows || []

        const row = {
          id: uid(),
          cells: Array(cols)
            .fill(0)
            .map<CellData>((_, cellIndex) => {
              const cellId = uid()
              const editorState = createEditor().parseEditorState(defaultEditorStateStr)

              // 原来的行
              const replaceRow = prevRows.find((_, ridx) => ridx === rowIndex)
              // 目标行与存在合并单元格相交的列号
              const hiddenCellIndexArr =
                replaceRow?.cells.reduce<number[]>((acc, cur, idx) => (cur.hidden ? [...acc, idx] : acc), []) || []

              // 相交的单元格坐标
              const arr = hiddenCellIndexArr.map((idx) => ({ rowIndex: rowIndex, colIndex: idx }))
              intersectantCellsIndex.push(...arr)

              return {
                id: cellId,
                nestedEditor: createEditor({ namespace: cellId, editable: false, editorState }),
                hidden: hiddenCellIndexArr?.includes(cellIndex),
              }
            }),
        }

        // 添加了新行的表格
        const nextRows = insertAll(rowIndex, [row], prevRows)
        console.log('intersectantCellsIndex', intersectantCellsIndex)
        const flatCells = prevRows.reduce<any[]>((acc, row, i) => {
          return acc.concat(
            row.cells.map((cell, j) => {
              return { id: cell.id, rowIndex: i, colIndex: j, rowSpan: cell.rowSpan, colSpan: cell.colSpan }
            })
          )
        }, [])

        console.log('flatCells', flatCells)
        const shouldAddRowSpanCells = intersectantCellsIndex.reduce<any[]>((acc, cur) => {
          const cell = flatCells.find((v) => v.colIndex === cur.colIndex && v.rowIndex + v.rowSpan >= cur.rowIndex)
          if (cell) {
            return [...acc, cell]
          }

          return acc
        }, [])

        console.log('shouldAddRowSpanCells', uniqBy(prop('id'), shouldAddRowSpanCells))

        const rowsWithRowSpanUpdated = nextRows.map((row) => {
          return {
            ...row,
            cells: row.cells.map((cell) => {
              if (shouldAddRowSpanCells.some((v) => v.id === cell.id)) {
                return { ...cell, rowSpan: (cell.rowSpan || 0) + 1 }
              } else {
                return cell
              }
            }),
          }
        })

        return {
          ...prev,
          rows: rowsWithRowSpanUpdated,
        }
      })
    },
    [editor, props.nodeKey, props.selectedCells]
  )

  const insertCol = useCallback(
    (direction?: 'left' | 'right') => {
      const colIndex = (head(props.selectedCells)?.colIndex || 0) + (direction === 'left' ? 0 : 1)
      const colHeader: ColHeader = { id: uid(), width: DEFAULT_CELL_WIDTH }

      $setFormTableProps(editor, props.nodeKey, (prev) => {
        const nextRows = prev.rows?.map((row) => {
          const cellId = uid()
          const editorState = createEditor().parseEditorState(defaultEditorStateStr)

          const newCell: CellData = {
            id: cellId,
            nestedEditor: createEditor({ namespace: cellId, editable: false, editorState }),
          }

          return {
            ...row,
            cells: insertAll(colIndex, [newCell], row.cells),
          }
        })

        return {
          ...prev,
          colHeaders: insertAll(colIndex, [colHeader], prev.colHeaders || []),
          rows: nextRows,
        }
      })
    },
    [editor, props.nodeKey, props.selectedCells]
  )

  return (
    <>
      <caption
        ref={elRef}
        className={clsx(
          'absolute left-0 top-0 right-0 flex space-x-4 p-2 -translate-y-full bg-lime-500 transition-all',
          props.selectedCells.length > 0 ? 'visible opacity-100' : 'invisible opacity-0'
        )}
      >
        <button
          disabled={!canMergeCells}
          className='disabled:text-gray-400 disabled:cursor-not-allowed'
          onClick={mergeCells}
        >
          合并单元格
        </button>
        <button
          disabled={!canUnmergeCells}
          className='disabled:text-gray-400 disabled:cursor-not-allowed'
          onClick={unmergeCells}
        >
          拆分单元格
        </button>

        <button
          disabled={!canInsert}
          className='disabled:text-gray-400 disabled:cursor-not-allowed'
          onClick={() => insertRow()}
        >
          向下插入行
        </button>

        <button
          disabled={!canInsert}
          className='disabled:text-gray-400 disabled:cursor-not-allowed'
          onClick={() => insertCol()}
        >
          向右插入列
        </button>

        <button>背景色</button>
      </caption>
    </>
  )
}
