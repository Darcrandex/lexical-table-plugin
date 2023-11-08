/**
 * @name BordersRender
 * @description 单元格里面的自定义边框
 * @author darcrand
 */

import { CellBorderSettings } from '../types'

export type BordersRenderProps = { borders?: CellBorderSettings[] }

export default function BordersRender(props: BordersRenderProps) {
  const { borders } = props

  const renderBorder = (direction: string, className: string) => {
    if (borders?.some((v) => v.direction === direction)) {
      // 因为使用了定位, 外部的元素需要使用相对定位
      return <i className={`absolute pointer-events-none select-none ${className}`}></i>
    }
    return null
  }

  return (
    <>
      {renderBorder('left', '-top-[1px] -bottom-[1px] -left-[1px] border-l border-emerald-400')}
      {renderBorder('top', '-top-[1px] -left-[1px] -right-[1px] border-t border-emerald-400')}
      {renderBorder('right', '-top-[1px] -right-[1px] -bottom-[1px] border-r border-emerald-400')}
      {renderBorder('bottom', '-bottom-[1px] -left-[1px] -right-[1px] border-b border-emerald-400')}
    </>
  )
}
