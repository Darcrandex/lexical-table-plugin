import { createContext, useContext } from 'react'
import { SelectedCell } from './types'

export type FormTableContextValue = {
  selectedCells: SelectedCell[]
  setSelectedCells: React.Dispatch<React.SetStateAction<SelectedCell[]>>

  selectedRowId?: string
  setSelectedRowId: React.Dispatch<React.SetStateAction<string | undefined>>

  selectedColId?: string
  setSelectedColId: React.Dispatch<React.SetStateAction<string | undefined>>
}

export const FormTableContext = createContext<FormTableContextValue>({
  selectedCells: [],
  setSelectedCells: () => {},

  selectedRowId: undefined,
  setSelectedRowId: () => {},

  selectedColId: undefined,
  setSelectedColId: () => {},
})

export function useFormTableContext() {
  return useContext(FormTableContext)
}
