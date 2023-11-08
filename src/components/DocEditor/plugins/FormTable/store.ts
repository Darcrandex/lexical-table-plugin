import { atom, useAtom } from 'jotai'
import { SelectedCell } from './types'

// 选中单元格
const selectedAtom = atom<SelectedCell[]>([])
export const useSelectedCells = () => {
  const [selectedCells, setSelectedCells] = useAtom(selectedAtom)
  return { selectedCells, setSelectedCells }
}
