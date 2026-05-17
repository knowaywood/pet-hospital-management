import type { PetHospitalApi } from '../preload/index'

declare global {
  interface Window {
    api?: PetHospitalApi
  }
}

export {}
