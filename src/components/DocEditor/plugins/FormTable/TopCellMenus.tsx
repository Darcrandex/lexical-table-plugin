/**
 * @name TopCellMenus
 * @description 顶部单元格菜单
 * @description 需要确保父级的 table 有定位属性
 * @author darcrand
 */

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import clsx from 'clsx'
import { NodeKey } from 'lexical'
import { clone } from 'ramda'
import React, { useCallback, useMemo, useRef } from 'react'
import { SelectedCell } from './types'
import { $getFormTableProps, $setFormTableProps } from './utils'

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

  return (
    <>
      <caption
        ref={elRef}
        className={clsx(
          'absolute left-0 top-0 right-0 flex space-x-4 -translate-y-full bg-lime-500 transition-all',
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
        <button>背景色</button>
      </caption>
    </>
  )
}
