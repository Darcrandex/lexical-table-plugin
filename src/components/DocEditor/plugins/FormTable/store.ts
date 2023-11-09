import { atom, useAtom } from 'jotai'
import { SelectedCell } from './types'

// 选中单元格
const selectedAtom = atom<SelectedCell[]>([])
export const useSelectedCells = () => {
  const [selectedCells, setSelectedCells] = useAtom(selectedAtom)
  return { selectedCells, setSelectedCells }
}

// 选中的行头
const selectedRowAtom = atom<string | undefined>(undefined)
export const useSelectedRow = () => {
  const [selectedRowId, setSelectedRowId] = useAtom(selectedRowAtom)
  return { selectedRowId, setSelectedRowId }
}

// 选中的列头
const selectedColAtom = atom<string | undefined>(undefined)
export const useSelectedCol = () => {
  const [selectedColId, setSelectedColId] = useAtom(selectedColAtom)
  return { selectedColId, setSelectedColId }
}
