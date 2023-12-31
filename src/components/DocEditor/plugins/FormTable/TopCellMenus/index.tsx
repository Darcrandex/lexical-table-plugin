/**
 * @name TopCellMenus
 * @description 顶部单元格菜单
 * @author darcrand
 */

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import clsx from 'clsx'
import { NodeKey, createEditor } from 'lexical'
import { clone, insertAll, isNil, isNotNil, mergeDeepRight, prop, uniqBy } from 'ramda'
import { CSSProperties, useCallback, useMemo, useRef } from 'react'
import { DEFAULT_CELL_WIDTH, DEFAULT_EDITOR_STATE_STRING } from '../const'
import { useFormTableContext } from '../context'
import { CellData, ColHeader } from '../types'
import { $setFormTableProps, uid } from '../utils'
import BorderTools from './BorderTools'
import TableTools from './TableTools'

export type TopCellMenusProps = {
  nodeKey: NodeKey
}

export default function TopCellMenus(props: TopCellMenusProps) {
  const [editor] = useLexicalComposerContext()
  const elRef = useRef<HTMLElement>(null)

  const { selectedCells, selectedColId, selectedRowId, setSelectedCells } = useFormTableContext()

  const showMenus = useMemo(() => {
    return selectedCells.length > 0 || isNotNil(selectedRowId) || isNotNil(selectedColId)
  }, [selectedCells.length, selectedColId, selectedRowId])

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

  const insertRow = useCallback(
    (direction?: 'up' | 'down') => {
      $setFormTableProps(editor, props.nodeKey, (prev) => {
        const colLen = prev.colHeaders?.length || 0
        const prevRows = prev.rows || []
        const flatCells = prevRows.reduce<CellData[]>((acc, row) => acc.concat(row.cells), [])
        const rowIndex = prevRows.findIndex((v) => v.id === selectedRowId) + (direction === 'up' ? 0 : 1)

        const cellsInCurrRow = flatCells.filter((v) => v.rowIndex === rowIndex - 1)
        const cellsInNextRow = flatCells.filter((v) => v.rowIndex === rowIndex)

        const newCells: CellData[] = Array(colLen)
          .fill(0)
          .map((_, colIndex) => {
            let hidden: boolean | undefined

            // 当前列的单元格
            const cell1 = cellsInCurrRow.find((v) => v.colIndex === colIndex)
            // 当前列的下一行单元格
            const cell2 = cellsInNextRow.find((v) => v.colIndex === colIndex)

            // 如果 cell1 是一个跨行单元格
            if (cell1 && cell1.rowSpan && cell1.rowSpan > 1) {
              hidden = true
            }

            // 如果相邻的两个单元格都是被隐藏的单元格
            // 判断它们是否属于同一个合并单元格
            if (cell1?.hidden && cell2?.hidden) {
              const mergeCell1 = flatCells.find(
                (v) =>
                  cell1.rowIndex >= v.rowIndex &&
                  cell1.rowIndex <= v.rowIndex + (v.rowSpan || 1) - 1 &&
                  cell1.colIndex >= v.colIndex &&
                  cell1.colIndex <= v.colIndex + (v.colSpan || 1) - 1
              )

              const mergeCell2 = flatCells.find(
                (v) =>
                  cell2.rowIndex >= v.rowIndex &&
                  cell2.rowIndex <= v.rowIndex + (v.rowSpan || 1) - 1 &&
                  cell2.colIndex >= v.colIndex &&
                  cell2.colIndex <= v.colIndex + (v.colSpan || 1) - 1
              )

              if (mergeCell1?.id === mergeCell2?.id) {
                hidden = true
              }
            }

            const id = uid()
            const editorState = createEditor().parseEditorState(DEFAULT_EDITOR_STATE_STRING)

            return {
              id,
              rowIndex,
              colIndex,
              nestedEditor: createEditor({ namespace: id, editable: false, editorState }),
              hidden,
            }
          })

        const shouldAddRowSpanCells = uniqBy(
          prop('id'),
          newCells.reduce<CellData[]>((acc, curr) => {
            const matched = flatCells.find(
              (v) =>
                curr.hidden &&
                !v.hidden &&
                curr.rowIndex > v.rowIndex &&
                curr.rowIndex <= v.rowIndex + (v.rowSpan || 1) - 1 &&
                curr.colIndex >= v.colIndex &&
                curr.colIndex <= v.colIndex + (v.colSpan || 1) - 1
            )

            return matched ? [...acc, matched] : acc
          }, [])
        )

        const rowsWithAppendRow = insertAll(rowIndex, [{ id: uid(), cells: newCells }], prevRows)

        const rowsWithRowSpanUpdated = rowsWithAppendRow.map((row) => {
          return {
            ...row,
            cells: row.cells.map((cell) => {
              if (shouldAddRowSpanCells.some((v) => v.id === cell.id)) {
                return { ...cell, rowSpan: (cell.rowSpan || 1) + 1 }
              }
              return cell
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

        return { ...prev, rows: rowsWithIndexUpdated }
      })
    },
    [editor, props.nodeKey, selectedRowId]
  )

  const insertCol = useCallback(
    (direction?: 'left' | 'right') => {
      $setFormTableProps(editor, props.nodeKey, (prev) => {
        const prevRows = prev.rows || []
        const colHeaders = prev.colHeaders || []
        const flattenCells = prevRows.reduce<CellData[]>((acc, row) => acc.concat(row.cells), [])

        // 预插入的列索引
        const colIndex = colHeaders.findIndex((v) => v.id === selectedColId) + (direction === 'left' ? 0 : 1)

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
    [editor, props.nodeKey, selectedColId]
  )

  const removeCol = useCallback(() => {
    $setFormTableProps(editor, props.nodeKey, (prev) => {
      const prevRows = prev.rows || []
      const colHeaders = prev.colHeaders || []
      const flattenCells = prevRows.reduce<CellData[]>((acc, row) => acc.concat(row.cells), [])

      // 要删除的列索引
      const colIndex = colHeaders.findIndex((v) => v.id === selectedColId)

      // 所在列的单元格
      const cellsInCols = flattenCells.filter((v) => v.colIndex === colIndex)

      // 属于跨列的合并单元格
      const mergedCells = cellsInCols.filter((v) => v.colSpan && v.colSpan > 1)

      // 在当前列左侧
      // 且与当前列相交的合并单元格
      const outsideMergedCells = cellsInCols.reduce<CellData[]>((acc, curr) => {
        const matched = flattenCells.find(
          (v) =>
            v.rowIndex === curr.rowIndex && // 同一行
            v.colIndex < colIndex && // 左侧
            v.colIndex + (v.colSpan || 1) - 1 >= colIndex
        )
        return matched ? [...acc, matched] : acc
      }, [])

      // 先删除相交的单元格
      const rowsWithRemovedCells = prevRows.map((row) => ({
        ...row,
        cells: row.cells.filter((v) => !cellsInCols.some((m) => m.id === v.id)),
      }))

      // 修改溢出的合并单元格的 colSpan
      const rowsWithColspanUpdated = rowsWithRemovedCells.map((row) => ({
        ...row,
        cells: row.cells.map((v) => {
          const currColSpan = v.colSpan || 1

          if (outsideMergedCells.some((m) => m.id === v.id)) {
            return { ...v, colSpan: currColSpan - 1 }
          }

          // 当前单元格是一个隐藏的单元格
          // 并且是被删除的合并单元格的后一个单元格
          // 继承被删除的合并单元格的属性
          if (v.hidden) {
            const matched = mergedCells.find((k) => k.colIndex === v.colIndex - 1 && k.rowIndex === v.rowIndex)
            if (matched) {
              return {
                ...v,
                colSpan: (matched.colSpan || 1) - 1,
                rowSpan: matched.rowSpan,
                hidden: undefined,
                style: matched.style,
                borders: matched.borders,
              }
            }
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
        colHeaders: prev.colHeaders?.filter((_, i) => i !== colIndex),
        rows: rowsWithIndexUpdated,
      }
    })

    setSelectedCells([])
  }, [editor, props.nodeKey, selectedColId, setSelectedCells])

  const removeRow = useCallback(() => {
    // 目前的逻辑是只删除一行
    // 如果所选的单元格是一个合并的单元格,则删除该单元格所在的行,单元格的 rowSpan 会减一

    $setFormTableProps(editor, props.nodeKey, (prev) => {
      const prevRows = prev.rows || []
      const flattenCells = prevRows.reduce<CellData[]>((acc, row) => acc.concat(row.cells), [])

      // 要删除的列索引
      const rowIndex = prevRows.findIndex((v) => v.id === selectedRowId)

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
  }, [editor, props.nodeKey, selectedRowId, setSelectedCells])

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
          'absolute left-0 top-0 right-0 flex space-x-4 p-2 -translate-y-full bg-lime-500 transition-all delay-200 flex-wrap',
          showMenus ? 'visible opacity-100' : 'invisible opacity-0'
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
          disabled={isNil(selectedRowId)}
          className='disabled:text-gray-400 disabled:cursor-not-allowed'
          onClick={() => insertRow()}
        >
          向下插入行
        </button>

        <button
          disabled={isNil(selectedColId)}
          className='disabled:text-gray-400 disabled:cursor-not-allowed'
          onClick={() => insertCol()}
        >
          向右插入列
        </button>

        <button
          disabled={isNil(selectedColId)}
          className='disabled:text-gray-400 disabled:cursor-not-allowed'
          onClick={() => removeCol()}
        >
          删除所在列
        </button>

        <button
          disabled={isNil(selectedRowId)}
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

        <BorderTools nodeKey={props.nodeKey} />

        <TableTools nodeKey={props.nodeKey} />
      </section>
    </>
  )
}
