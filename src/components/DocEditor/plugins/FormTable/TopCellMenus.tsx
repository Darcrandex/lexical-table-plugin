/**
 * @name TopCellMenus
 * @description 顶部单元格菜单
 * @description 需要确保父级的 table 有定位属性
 * @author darcrand
 */

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import clsx from 'clsx'
import { NodeKey } from 'lexical'
import { useCallback, useMemo, useRef } from 'react'
import { $setFormTableProps } from './utils'

type CellInfo = { id: string; rowIndex: number; colIndex: number; rowSpan?: number; colSpan?: number }

export type TopCellMenusProps = {
  selectedCellIds: string[]
  setSelectedCellIds: (ids: string[]) => void
  nodeKey: NodeKey
}

export default function TopCellMenus(props: TopCellMenusProps) {
  const [editor] = useLexicalComposerContext()
  const elRef = useRef<HTMLElement>(null)
  const selectedCellIds = props.selectedCellIds

  // 所选单元格的视图信息
  const cellInfoArr: CellInfo[] = useMemo(() => {
    const tableEle = elRef.current?.parentElement
    const colHeaderEles = tableEle?.querySelectorAll('th.col-header')
    if (!tableEle || !colHeaderEles) return []

    const cells = selectedCellIds.map((id) => {
      const currCellEle = tableEle?.querySelector(`#${id}`)
      if (currCellEle) {
        const rowIndex = Number.parseInt(currCellEle.getAttribute('data-row-index') || '0')
        const rowSpan = currCellEle.getAttribute('rowspan')
        const colSpan = currCellEle.getAttribute('colspan')

        // 单元格索引其实是不等于列索引的
        // 但是通过隐藏需要删除的单元格，保持原有的 DOM 结构
        // 可以使单元格索引等于列索引
        const colIndex = Number.parseInt(currCellEle.getAttribute('data-cell-index') || '0')
        return {
          id,
          rowIndex,
          colIndex,
          rowSpan: rowSpan ? Number.parseInt(rowSpan) : undefined,
          colSpan: colSpan ? Number.parseInt(colSpan) : undefined,
        }
      }
      return { id, rowIndex: 0, colIndex: 0 }
    })

    return cells
  }, [selectedCellIds])

  const canMergeCells = useMemo(() => {
    return cellInfoArr.length > 1 && cellInfoArr.every((cell) => (cell.rowSpan || 1) + (cell.colSpan || 1) === 2)
  }, [cellInfoArr])

  const canUnmergeCells = useMemo(() => {
    return cellInfoArr.length > 0 && cellInfoArr.some((cell) => (cell.rowSpan || 1) + (cell.colSpan || 1) > 2)
  }, [cellInfoArr])

  // 合并单元格
  const mergeCells = useCallback(() => {
    // 左上角需要修改的单元格
    let targetCellInfo: CellInfo = {
      id: '',
      colIndex: Infinity,
      rowIndex: Infinity,
    }

    for (let index = 0; index < cellInfoArr.length; index++) {
      const item = cellInfoArr[index]
      if (item.rowIndex < targetCellInfo.rowIndex || item.colIndex < targetCellInfo.colIndex) {
        targetCellInfo = { ...item }
        break
      }
    }

    const rowSpan =
      1 + Math.max(...cellInfoArr.map((v) => v.rowIndex)) - Math.min(...cellInfoArr.map((v) => v.rowIndex))
    const colSpan =
      1 + Math.max(...cellInfoArr.map((v) => v.colIndex)) - Math.min(...cellInfoArr.map((v) => v.colIndex))

    const removeCellIds = cellInfoArr.filter((v) => v.id !== targetCellInfo.id).map((v) => v.id)

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
              .map((v) => (v.id === targetCellInfo.id ? { ...v, rowSpan, colSpan } : v)),
          }
        }),
      }
    })

    props.setSelectedCellIds([targetCellInfo.id])
  }, [cellInfoArr, editor, props])

  const unmergeCells = useCallback(() => {
    const shouldUnmergeCells = cellInfoArr.filter((v) => (v.rowSpan || 1) + (v.colSpan || 1) > 2)
    console.log('shouldUnmergeCells', shouldUnmergeCells)
  }, [cellInfoArr])

  return (
    <>
      <caption
        ref={elRef}
        className={clsx(
          'absolute left-0 top-0 right-0 flex space-x-4 -translate-y-full bg-lime-500 transition-all',
          cellInfoArr.length > 0 ? 'visible opacity-100' : 'invisible opacity-0'
        )}
      >
        <button disabled={!canMergeCells} onClick={mergeCells}>
          合并单元格
        </button>
        <button disabled={!canUnmergeCells} onClick={unmergeCells}>
          拆分单元格
        </button>
        <button>背景色</button>
      </caption>
    </>
  )
}
