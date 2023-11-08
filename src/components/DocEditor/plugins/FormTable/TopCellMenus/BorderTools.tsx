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

                if (type === 'all') {
                  borders = [
                    { direction: 'left' },
                    { direction: 'top' },
                    { direction: 'right' },
                    { direction: 'bottom' },
                  ]
                } else if (type === 'empty') {
                  borders = []
                } else if (type === 'left') {
                  borders = uniqBy(prop('direction'), borders.concat({ direction: 'left' }))
                } else if (type === 'top') {
                  borders = uniqBy(prop('direction'), borders.concat({ direction: 'top' }))
                } else if (type === 'bottom') {
                  borders = uniqBy(prop('direction'), borders.concat({ direction: 'bottom' }))
                } else if (type === 'right') {
                  borders = uniqBy(prop('direction'), borders.concat({ direction: 'right' }))
                }

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

export function BordersRender(props: { borders?: CellBorderSettings[] }) {
  return (
    <>
      {props.borders?.some((v) => v.direction === 'left') && (
        <i className='absolute -top-[1px] -bottom-[1px] -left-[1px] border-l border-emerald-400'></i>
      )}

      {props.borders?.some((v) => v.direction === 'top') && (
        <i className='absolute -top-[1px] -left-[1px] -right-[1px] border-t border-emerald-400'></i>
      )}

      {props.borders?.some((v) => v.direction === 'right') && (
        <i className='absolute -top-[1px] -right-[1px] -bottom-[1px] border-r border-emerald-400'></i>
      )}

      {props.borders?.some((v) => v.direction === 'bottom') && (
        <i className='absolute -bottom-[1px] -left-[1px] -right-[1px] border-b border-emerald-400'></i>
      )}
    </>
  )
}
