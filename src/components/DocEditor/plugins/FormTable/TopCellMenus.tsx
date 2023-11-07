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
import { DEFAULT_CELL_WIDTH, DEFAULT_EDITOR_STATE_STRING } from './const'
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
              const editorState = createEditor().parseEditorState(DEFAULT_EDITOR_STATE_STRING)

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
                rowIndex,
                colIndex: cellIndex,
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
        const shouldAddRowSpanCells = uniqBy(
          prop('id'),
          intersectantCellsIndex.reduce<any[]>((acc, cur) => {
            const cell = flatCells.find((v) => v.colIndex === cur.colIndex && v.rowIndex + v.rowSpan >= cur.rowIndex)
            if (cell) {
              return [...acc, cell]
            }

            return acc
          }, [])
        )

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
      $setFormTableProps(editor, props.nodeKey, (prev) => {
        const prevRows = prev.rows || []
        const flattenCells = prevRows.reduce<CellData[]>((acc, row) => acc.concat(row.cells), [])

        // 预插入的列索引
        const colIndex = (head(props.selectedCells)?.colIndex || 0) + (direction === 'left' ? 0 : 1)

        // 预插入的列与当前表格中已合并的单元格相交部分的单元格
        const intersectantCells = flattenCells.filter((v) => v.colIndex === colIndex)

        // 与列相交的需要隐藏的单元格
        const shouldHideCells = intersectantCells
          // 属于合并的单元格内的已经隐藏的单元格
          .filter((v) => v.hidden)
          .filter((v) => {
            // 当前单元格所在列 === 所属合并单元格所在列
            // 则不需要隐藏
            const isSameColWithMergeCell = intersectantCells.some(
              (m) =>
                !m.hidden && // 非隐藏
                m.rowSpan &&
                m.rowSpan > 0 && // 是跨行的单元格(合并的单元格)
                v.rowIndex >= m.rowIndex &&
                v.rowIndex <= m.rowIndex + (m.rowSpan || 1)
            )

            return !isSameColWithMergeCell
          })

        // 与列相交的合并的单元格(多个)
        const shouldAddColSpanCells = shouldHideCells.reduce<CellData[]>((acc, curr) => {
          const matched = flattenCells.find(
            (m) =>
              !m.hidden &&
              m.colSpan &&
              m.colSpan > 1 && // 是跨列的单元格
              curr.colIndex >= m.colIndex &&
              curr.colIndex <= m.colIndex + (m.colSpan || 1) &&
              m.rowIndex === curr.rowIndex
          )
          return matched ? [...acc, matched] : acc
        }, [])

        // 新的列头
        const colHeader: ColHeader = { id: uid(), width: DEFAULT_CELL_WIDTH }

        // 插入列
        const rowsWithAppendCol = prevRows.map((row, rowIndex) => {
          const id = uid()
          const editorState = createEditor().parseEditorState(DEFAULT_EDITOR_STATE_STRING)
          const cell: CellData = {
            id,
            rowIndex,
            colIndex,
            nestedEditor: createEditor({ namespace: id, editable: false, editorState }),
            hidden: shouldHideCells.some((v) => v.rowIndex === rowIndex && v.colIndex === colIndex),
          }

          return {
            ...row,
            cells: insertAll(colIndex, [cell], row.cells),
          }
        })

        // 相交的合并单元格扩展列宽
        const rowsWithColspanUpdated = rowsWithAppendCol.map((row) => ({
          ...row,
          cells: row.cells.map((v) =>
            shouldAddColSpanCells.some((m) => m.id === v.id) ? { ...v, colSpan: (v.colSpan || 1) + 1 } : v
          ),
        }))

        return {
          ...prev,
          rows: rowsWithColspanUpdated,
          colHeaders: insertAll(colIndex, [colHeader], prev.colHeaders || []),
        }
      })
    },
    [editor, props.nodeKey, props.selectedCells]
  )

  // 删除行列
  const canRemove = useMemo(() => {
    return props.selectedCells.length === 1
  }, [props.selectedCells.length])

  const removeCol = useCallback(() => {
    $setFormTableProps(editor, props.nodeKey, (prev) => {
      // 单元格可能是合并的单元格
      // 删除时需要把横跨的所有列都删除
      const startColIndex = head(props.selectedCells)?.colIndex || 0
      const endColIndex = startColIndex + (head(props.selectedCells)?.colSpan || 1) - 1

      const prevRows = prev.rows || []
      const flattenCells = prevRows.reduce<CellData[]>((acc, row) => acc.concat(row.cells), [])

      // 所在列的单元格
      const cellsInCols = flattenCells.filter((v) => v.colIndex >= startColIndex && v.colIndex <= endColIndex)

      // 如果存在相交的合并单元格
      // 判断合并单元格是否完全落入列范围内
      // 如果是则删除,否则保留
      const shouldRemoveCells = cellsInCols.filter((v) => v.colIndex + (v.colSpan || 1) - 1 <= endColIndex)

      // 被隐藏的单元格
      const hiddenCells = cellsInCols.filter((v) => v.hidden)

      // 右侧溢出的合并单元格
      const rightOverflowCells = cellsInCols.filter((v) => v.colSpan && v.colIndex + (v.colSpan || 1) - 1 > endColIndex)

      // 根据列范围内隐藏的单元格找到其所属的合并单元格
      // 左侧溢出的合并单元格
      const leftOverflowCells = hiddenCells.reduce<CellData[]>((acc, curr) => {
        const matched = flattenCells.find(
          (v) =>
            v.rowIndex === curr.rowIndex && // 同一行
            v.colIndex < startColIndex && // 左侧
            v.colIndex + (v.colSpan || 1) - 1 >= startColIndex &&
            v.colIndex + (v.colSpan || 1) - 1 <= endColIndex
        )
        return matched ? [...acc, matched] : acc
      }, [])

      // 全溢出的合并单元格
      const allOverflowCells = hiddenCells.reduce<CellData[]>((acc, curr) => {
        const matched = flattenCells.find(
          (v) =>
            v.rowIndex === curr.rowIndex && // 同一行
            v.colIndex < startColIndex && // 左侧
            v.colIndex + (v.colSpan || 1) - 1 > endColIndex // 右侧
        )
        return matched ? [...acc, matched] : acc
      }, [])

      // 先删除相交的单元格
      const rowsWithRemovedCells = prevRows.map((row) => ({
        ...row,
        cells: row.cells.filter((v) => !shouldRemoveCells.some((m) => m.id === v.id)),
      }))

      // 修改溢出的合并单元格的 colSpan
      const rowsWithColspanUpdated = rowsWithRemovedCells.map((row) => ({
        ...row,
        cells: row.cells.map((v) => {
          const currColSpan = v.colSpan || 1

          if (rightOverflowCells.some((m) => m.id === v.id)) {
            return { ...v, colSpan: currColSpan - (endColIndex - v.colIndex) - 1 }
          }

          if (leftOverflowCells.some((m) => m.id === v.id)) {
            return { ...v, colSpan: currColSpan - (v.colIndex + currColSpan - startColIndex) }
          }

          if (allOverflowCells.some((m) => m.id === v.id)) {
            return { ...v, colSpan: currColSpan - (endColIndex - startColIndex + 1) }
          }

          return v
        }),
      }))

      return {
        ...prev,
        colHeaders: prev.colHeaders?.filter((_, i) => i < startColIndex || i > endColIndex),
        rows: rowsWithColspanUpdated,
      }
    })

    props.setSelectedCells([])
  }, [editor, props])

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

        <button
          disabled={!canRemove}
          className='disabled:text-gray-400 disabled:cursor-not-allowed'
          onClick={() => removeCol()}
        >
          删除所在列
        </button>

        <button>背景色</button>
      </caption>
    </>
  )
}
