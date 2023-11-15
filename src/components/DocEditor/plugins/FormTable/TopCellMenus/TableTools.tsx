/**
 * @name TableTools
 * @description
 * @author darcrand
 */

import { NodeKey } from 'lexical'

export type TableToolsProps = { className?: string }

export default function TableTools(props: TableToolsProps & { nodeKey: NodeKey }) {
  return (
    <>
      <button>删除表格</button>
    </>
  )
}
