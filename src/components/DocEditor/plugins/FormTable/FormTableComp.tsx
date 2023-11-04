/**
 * @name FormTableComp
 * @description table
 * @author darcrand
 */

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { useClickAway } from 'ahooks'
import { NodeKey } from 'lexical'
import { useRef, useState } from 'react'
import ColHeaderItem from './ColHeaderItem'
import EditableCell from './EditableCell'
import { FormTableCompProps } from './types'

export default function FormTableComp(props: FormTableCompProps & { nodeKey: NodeKey }) {
  const [editor] = useLexicalComposerContext()

  // 选中单元格
  const [selectedCellIds, setSelectedCellIds] = useState<string[]>([])
  const tableRef = useRef<HTMLTableElement>(null)
  useClickAway(() => {
    setSelectedCellIds([])
  }, tableRef)

  return (
    <>
      <h1>FormTableComp</h1>

      <table ref={tableRef} className='select-none overflow-y-hidden'>
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
              <th id={row.id} className='bg-violet-400' style={{ width: 24, height: 24 }}>
                {rowIndex + 1}
              </th>

              {row.cols?.map((col) => (
                <td
                  key={col.id}
                  className={selectedCellIds.includes(col.id) ? 'bg-yellow-400' : ''}
                  onClick={() => {
                    setSelectedCellIds([col.id])
                  }}
                >
                  {!!col.nestedEditor && <EditableCell nestedEditor={col.nestedEditor} />}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}
