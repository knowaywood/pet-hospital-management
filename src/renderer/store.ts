import { create } from 'zustand'
import type { Owner, Pet } from '../../shared/types'

interface AppState {
  currentOwner: Owner | null
  currentPet: Pet | null
  setCurrentOwner: (owner: Owner | null) => void
  setCurrentPet: (pet: Pet | null) => void
}

export const useStore = create<AppState>((set) => ({
  currentOwner: null,
  currentPet: null,
  setCurrentOwner: (owner) => set({ currentOwner: owner }),
  setCurrentPet: (pet) => set({ currentPet: pet }),
}))
