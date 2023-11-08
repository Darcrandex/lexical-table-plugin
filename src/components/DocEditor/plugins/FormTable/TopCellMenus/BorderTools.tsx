/**
 * @name BorderTools
 * @description 单元格的边框设置工具
 * @author darcrand
 */

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { NodeKey } from 'lexical'
import { clone, prop, uniqBy } from 'ramda'
import { useCallback, useMemo } from 'react'
import { useSelectedCells } from '../store'
import { CellBorderSettings } from '../types'
import { $setFormTableProps } from '../utils'

export default function BorderTools(props: { nodeKey: NodeKey }) {
  const [editor] = useLexicalComposerContext()
  const { selectedCells } = useSelectedCells()

  const show = useMemo(() => selectedCells.length >= 1, [selectedCells.length])

  const setBorders = useCallback(
    (type: string) => {
      $setFormTableProps(editor, props.nodeKey, (prev) => {
        return {
          ...prev,
          rows: prev.rows?.map((row) => ({
            ...row,
            cells: row.cells.map((cell) => {
              if (selectedCells.some((v) => v.id === cell.id)) {
                let borders = clone(cell.borders) || []

                const borderConfigs: Record<string, CellBorderSettings[]> = {
                  all: [{ direction: 'left' }, { direction: 'top' }, { direction: 'right' }, { direction: 'bottom' }],
                  left: [{ direction: 'left' }],
                  top: [{ direction: 'top' }],
                  bottom: [{ direction: 'bottom' }],
                  right: [{ direction: 'right' }],
                }

                borders = type === 'empty' ? [] : uniqBy(prop('direction'), borders.concat(borderConfigs[type]))

                return { ...cell, borders }
              }
              return cell
            }),
          })),
        }
      })
    },
    [editor, props.nodeKey, selectedCells]
  )

  if (!show) return null

  return (
    <>
      <button onClick={() => setBorders('all')}>all</button>
      <button onClick={() => setBorders('left')}>left</button>
      <button onClick={() => setBorders('top')}>top</button>
      <button onClick={() => setBorders('right')}>right</button>
      <button onClick={() => setBorders('bottom')}>bottom</button>
      <button onClick={() => setBorders('empty')}>empty</button>
    </>
  )
}
