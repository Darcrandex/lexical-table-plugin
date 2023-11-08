/**
 * @name TopCellMenus
 * @description 顶部单元格菜单
 * @author darcrand
 */

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import clsx from 'clsx'
import { NodeKey, createEditor } from 'lexical'
import { clone, head, insertAll, mergeDeepRight, prop, uniqBy } from 'ramda'
import { CSSProperties, useCallback, useMemo, useRef } from 'react'
import { DEFAULT_CELL_WIDTH, DEFAULT_EDITOR_STATE_STRING } from './const'
import { useSelectedCells } from './store'
import { CellData, ColHeader } from './types'
import { $setFormTableProps, uid } from './utils'

export type TopCellMenusProps = {
  nodeKey: NodeKey
}

export default function TopCellMenus(props: TopCellMenusProps) {
  const [editor] = useLexicalComposerContext()
  const elRef = useRef<HTMLElement>(null)
  const { selectedCells, setSelectedCells } = useSelectedCells()

  // 合并单元格
  const canMergeCells = useMemo(() => {
    return selectedCells.length > 1 && selectedCells.every((cell) => (cell.rowSpan || 1) + (cell.colSpan || 1) === 2)
  }, [selectedCells])

  const mergeCells = useCallback(() => {
    const minRowIndex = Math.min(...selectedCells.map((v) => v.rowIndex))
    const minColIndex = Math.min(...selectedCells.map((v) => v.colIndex))
    const maxRowIndex = Math.max(...selectedCells.map((v) => v.rowIndex))
    const maxColIndex = Math.max(...selectedCells.map((v) => v.colIndex))
    const rowSpan = maxRowIndex - minRowIndex + 1
    const colSpan = maxColIndex - minColIndex + 1

    const topLeftCell = selectedCells.find((v) => v.rowIndex === minRowIndex && v.colIndex === minColIndex)
    const shouldHideCells = selectedCells.filter((v) => v.rowIndex !== minRowIndex || v.colIndex !== minColIndex)

    $setFormTableProps(editor, props.nodeKey, (prev) => {
      const prevRows = prev.rows || []
      const flatCells = prevRows.reduce<CellData[]>((acc, row) => [...acc, ...row.cells], [])

      // 将需要合并的单元格以及它包含的所有单元格的内容合并
      const mergedChildren = flatCells
        .filter((m) => m.id === topLeftCell?.id || shouldHideCells.some((v) => v.id === m.id))
        .reduce<any[]>((acc, curr) => {
          if (curr.nestedEditor) {
            const state = curr.nestedEditor.getEditorState().toJSON()
            acc.push(...state.root.children)
          }
          return acc
        }, [])

      const rowsWithHiddenCells = prevRows.map((row) => ({
        ...row,
        cells: row.cells.map((cell) => {
          // 清空内容
          cell.nestedEditor?.setEditorState(editor.parseEditorState(DEFAULT_EDITOR_STATE_STRING))
          return {
            ...cell,
            hidden: cell.hidden || shouldHideCells.some((v) => v.id === cell.id),
          }
        }),
      }))

      const rowsWithSpanUpdated = rowsWithHiddenCells.map((row) => ({
        ...row,
        cells: row.cells.map((v) => {
          if (v.id === topLeftCell?.id) {
            const ds = JSON.parse(DEFAULT_EDITOR_STATE_STRING)
            const data = mergeDeepRight(ds, { root: { children: mergedChildren } })
            v.nestedEditor?.setEditorState(createEditor().parseEditorState(JSON.stringify(data)))

            return { ...v, rowSpan, colSpan }
          }

          return v
        }),
      }))

      return { ...prev, rows: rowsWithSpanUpdated }
    })

    !!topLeftCell && setSelectedCells([topLeftCell])
  }, [editor, props.nodeKey, selectedCells, setSelectedCells])

  // 拆分单元格
  const canUnmergeCells = useMemo(() => {
    return selectedCells.length > 0 && selectedCells.some((cell) => (cell.rowSpan || 1) + (cell.colSpan || 1) > 2)
  }, [selectedCells])

  const unmergeCells = useCallback(() => {
    // 更新后选中的单元格
    const nextSelectedCells = clone(selectedCells)

    $setFormTableProps(editor, props.nodeKey, (prev) => {
      const prevRows = prev.rows || []
      const flattenCells = prevRows.reduce<CellData[]>((acc, row) => acc.concat(row.cells), [])

      // 选区中的合并单元格
      const mergeCells = selectedCells.filter((v) => (v.colSpan || 1) + (v.rowSpan || 1) > 2)

      // 合并单元格内部被隐藏的单元格
      const hiddenCells = mergeCells.reduce<CellData[]>((acc, curr) => {
        const minRowIndex = curr.rowIndex
        const maxRowIndex = curr.rowIndex + (curr.rowSpan || 1) - 1
        const minColIndex = curr.colIndex
        const maxColIndex = curr.colIndex + (curr.colSpan || 1) - 1

        const cells = flattenCells.filter(
          (v) =>
            v.rowIndex >= minRowIndex &&
            v.rowIndex <= maxRowIndex &&
            v.colIndex >= minColIndex &&
            v.colIndex <= maxColIndex &&
            v.hidden
        )
        return acc.concat(cells)
      }, [])

      // 添加重新显示的单元格到选区
      nextSelectedCells.push(...hiddenCells)

      // 重置原来被合并的单元格的跨行跨列
      const rowsWithResetSpan = prevRows.map((row) => ({
        ...row,
        cells: row.cells.map((v) =>
          mergeCells.some((m) => m.id === v.id) ? { ...v, rowSpan: undefined, colSpan: undefined } : v
        ),
      }))

      // 重新显示之前因被合并而隐藏的单元格
      const rowsWithReshowCells = rowsWithResetSpan.map((row) => ({
        ...row,
        cells: row.cells.map((v) => (hiddenCells.some((m) => m.id === v.id) ? { ...v, hidden: undefined } : v)),
      }))

      return { ...prev, rows: rowsWithReshowCells }
    })

    setSelectedCells(nextSelectedCells)
  }, [editor, props.nodeKey, selectedCells, setSelectedCells])

  // 插入行列
  const canInsert = useMemo(() => {
    // 目前只考虑选择一个单元格后的情况
    return selectedCells.length === 1
  }, [selectedCells])

  const insertRow = useCallback(
    (direction?: 'up' | 'down') => {
      const rowIndex = (head(selectedCells)?.rowIndex || 0) + (direction === 'up' ? 0 : 1)

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

        // 更新索引
        const rowsWithIndexUpdated = rowsWithRowSpanUpdated.map((row, i) => {
          return {
            ...row,
            rowIndex: i,
            cells: row.cells.map((v, j) => ({ ...v, rowIndex: i, colIndex: j })),
          }
        })

        return {
          ...prev,
          rows: rowsWithIndexUpdated,
        }
      })
    },
    [editor, props.nodeKey, selectedCells]
  )

  const insertCol = useCallback(
    (direction?: 'left' | 'right') => {
      $setFormTableProps(editor, props.nodeKey, (prev) => {
        const prevRows = prev.rows || []
        const flattenCells = prevRows.reduce<CellData[]>((acc, row) => acc.concat(row.cells), [])

        // 预插入的列索引
        const colIndex = (head(selectedCells)?.colIndex || 0) + (direction === 'left' ? 0 : 1)

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

        // 更新索引
        const rowsWithIndexUpdated = rowsWithColspanUpdated.map((row, i) => {
          return {
            ...row,
            rowIndex: i,
            cells: row.cells.map((v, j) => ({ ...v, rowIndex: i, colIndex: j })),
          }
        })

        return {
          ...prev,
          rows: rowsWithIndexUpdated,
          colHeaders: insertAll(colIndex, [colHeader], prev.colHeaders || []),
        }
      })
    },
    [editor, props.nodeKey, selectedCells]
  )

  // 删除行列
  const canRemove = useMemo(() => {
    return selectedCells.length === 1
  }, [selectedCells.length])

  const removeCol = useCallback(() => {
    $setFormTableProps(editor, props.nodeKey, (prev) => {
      // 单元格可能是合并的单元格
      // 删除时需要把横跨的所有列都删除
      const startColIndex = head(selectedCells)?.colIndex || 0
      const endColIndex = startColIndex + (head(selectedCells)?.colSpan || 1) - 1

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

      // 相应的索引需要更新
      const rowsWithIndexUpdated = rowsWithColspanUpdated.map((row, i) => {
        return {
          ...row,
          rowIndex: i,
          cells: row.cells.map((v, j) => ({ ...v, rowIndex: i, colIndex: j })),
        }
      })

      return {
        ...prev,
        colHeaders: prev.colHeaders?.filter((_, i) => i < startColIndex || i > endColIndex),
        rows: rowsWithIndexUpdated,
      }
    })

    setSelectedCells([])
  }, [editor, props.nodeKey, selectedCells, setSelectedCells])

  const removeRow = useCallback(() => {
    // 目前的逻辑是只删除一行
    // 如果所选的单元格是一个合并的单元格,则删除该单元格所在的行,单元格的 rowSpan 会减一

    // 单元格所在的行
    const rowIndex = head(selectedCells)?.rowIndex || 0

    $setFormTableProps(editor, props.nodeKey, (prev) => {
      const prevRows = prev.rows || []

      const flattenCells = prevRows.reduce<CellData[]>((acc, row) => acc.concat(row.cells), [])

      // 所在行的所有单元格
      const cellsInRow = flattenCells.filter((v) => v.rowIndex === rowIndex)

      // 合并的跨行单元格
      const mergedCells = cellsInRow.filter((v) => v.rowSpan && v.rowSpan > 1)

      // 被删除的隐藏单元格
      const hiddenCells = cellsInRow.filter((v) => v.hidden)

      // 被删除的隐藏单元格所对应的合并单元格
      // 这些合并单元格的 rowSpan 会减一
      const outsideMergedCells = hiddenCells.reduce<CellData[]>((acc, curr) => {
        const matched = flattenCells.find(
          (v) =>
            curr.rowIndex > v.rowIndex &&
            curr.rowIndex <= v.rowIndex + (v.rowSpan || 1) - 1 &&
            curr.colIndex >= v.colIndex &&
            curr.colIndex <= v.colIndex + (v.colSpan || 1) - 1
        )
        return matched ? [...acc, matched] : acc
      }, [])

      // 需要目标行的所有单元格
      const rowsWithRemovedCells = prevRows.filter((_, i) => i !== rowIndex)

      // 找到被删除的合并单元格的下一行的单元格
      // 显示它,并继承它所属合并单元格的 rowSpan
      const rowsWithExpandedCells = rowsWithRemovedCells.map((row) => ({
        ...row,
        cells: row.cells.map((v) => {
          if (v.hidden) {
            // 当前隐藏单元格的上一行合并单元格
            const matchedMergedCell = mergedCells.find(
              (m) => m.colIndex === v.colIndex && m.rowIndex === v.rowIndex - 1
            )

            if (matchedMergedCell) {
              const state = matchedMergedCell.nestedEditor?.getEditorState().toJSON()
              if (state && v.nestedEditor) {
                v.nestedEditor.setEditorState(createEditor().parseEditorState(JSON.stringify(state)))
              }

              return {
                ...v,
                hidden: undefined,
                rowSpan: (matchedMergedCell.rowSpan || 1) - 1,
                colSpan: matchedMergedCell.colSpan,
                style: matchedMergedCell.style,
              }
            }
          }

          return v
        }),
      }))

      const rowsWithRowSpanUpdated = rowsWithExpandedCells.map((row) => ({
        ...row,
        cells: row.cells.map((v) => {
          if (outsideMergedCells.some((m) => m.id === v.id)) {
            return { ...v, rowSpan: (v.rowSpan || 1) - 1 }
          }

          return v
        }),
      }))

      // 因为行列数目发生了变化，需要重新计算 rowIndex 和 colIndex
      const rowsWithIndexUpdated = rowsWithRowSpanUpdated.map((row, i) => {
        return {
          ...row,
          rowIndex: i,
          cells: row.cells.map((v, j) => ({ ...v, rowIndex: i, colIndex: j })),
        }
      })

      return { ...prev, rows: rowsWithIndexUpdated }
    })

    setSelectedCells([])
  }, [editor, props.nodeKey, selectedCells, setSelectedCells])

  // 修改单元格样式
  const canSetStyles = useMemo(() => selectedCells.length > 0, [selectedCells])
  const setCellStyle = useCallback(
    (style: CSSProperties) => {
      $setFormTableProps(editor, props.nodeKey, (prev) => {
        return {
          ...prev,
          rows: prev.rows?.map((row) => ({
            ...row,
            cells: row.cells.map((cell) => {
              if (selectedCells.some((v) => v.id === cell.id)) {
                return { ...cell, style }
              }
              return cell
            }),
          })),
        }
      })
    },
    [editor, props.nodeKey, selectedCells]
  )

  return (
    <>
      <section
        ref={elRef}
        className={clsx(
          'absolute left-0 top-0 right-0 flex space-x-4 p-2 -translate-y-full bg-lime-500 transition-all flex-wrap',
          selectedCells.length > 0 ? 'visible opacity-100' : 'invisible opacity-0'
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

        <button
          disabled={!canRemove}
          className='disabled:text-gray-400 disabled:cursor-not-allowed'
          onClick={() => removeRow()}
        >
          删除所在行
        </button>

        <button
          disabled={!canSetStyles}
          className='disabled:text-gray-400 disabled:cursor-not-allowed'
          onClick={() => setCellStyle({ background: 'red' })}
        >
          背景色
        </button>
      </section>
    </>
  )
}
