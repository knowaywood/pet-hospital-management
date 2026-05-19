import { contextBridge, ipcRenderer } from 'electron'

const api = {
  owners: {
    all: () => ipcRenderer.invoke('db:owners:all'),
    search: (keyword: string) => ipcRenderer.invoke('db:owners:search', keyword),
    searchByPhone: (keyword: string) => ipcRenderer.invoke('db:owners:searchByPhone', keyword),
    searchByPet: (keyword: string) => ipcRenderer.invoke('db:owners:searchByPet', keyword),
    get: (id: number) => ipcRenderer.invoke('db:owners:get', id),
    create: (data: any) => ipcRenderer.invoke('db:owners:create', data),
    update: (id: number, data: any) => ipcRenderer.invoke('db:owners:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('db:owners:delete', id),
  },
  pets: {
    byOwner: (ownerId: number) => ipcRenderer.invoke('db:pets:byOwner', ownerId),
    get: (id: number) => ipcRenderer.invoke('db:pets:get', id),
    create: (data: any) => ipcRenderer.invoke('db:pets:create', data),
    update: (id: number, data: any) => ipcRenderer.invoke('db:pets:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('db:pets:delete', id),
  },
  appointments: {
    all: () => ipcRenderer.invoke('db:appointments:all'),
    create: (data: any) => ipcRenderer.invoke('db:appointments:create', data),
    update: (id: number, data: any) => ipcRenderer.invoke('db:appointments:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('db:appointments:delete', id),
  },
  records: {
    byPet: (petId: number) => ipcRenderer.invoke('db:records:byPet', petId),
    get: (id: number) => ipcRenderer.invoke('db:records:get', id),
    lastByPet: (petId: number) => ipcRenderer.invoke('db:records:lastByPet', petId),
    create: (data: any) => ipcRenderer.invoke('db:records:create', data),
    update: (id: number, data: any) => ipcRenderer.invoke('db:records:update', id, data),
  },
  medicines: {
    all: () => ipcRenderer.invoke('db:medicines:all'),
    search: (keyword: string) => ipcRenderer.invoke('db:medicines:search', keyword),
    create: (data: any) => ipcRenderer.invoke('db:medicines:create', data),
    update: (id: number, data: any) => ipcRenderer.invoke('db:medicines:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('db:medicines:delete', id),
  },
  bills: {
    byOwner: (ownerId: number) => ipcRenderer.invoke('db:bills:byOwner', ownerId),
    create: (data: any) => ipcRenderer.invoke('db:bills:create', data),
    update: (id: number, data: any) => ipcRenderer.invoke('db:bills:update', id, data),
    cancel: (id: number) => ipcRenderer.invoke('db:bills:cancel', id),
  },
  billItems: {
    byBill: (billId: number) => ipcRenderer.invoke('db:billItems:byBill', billId),
    create: (data: any) => ipcRenderer.invoke('db:billItems:create', data),
  },
  vaccines: {
    byPet: (petId: number) => ipcRenderer.invoke('db:vaccines:byPet', petId),
    create: (data: any) => ipcRenderer.invoke('db:vaccines:create', data),
  },
  reminders: {
    pending: () => ipcRenderer.invoke('db:reminders:pending'),
    byOwner: (ownerId: number) => ipcRenderer.invoke('db:reminders:byOwner', ownerId),
    create: (data: any) => ipcRenderer.invoke('db:reminders:create', data),
    update: (id: number, data: any) => ipcRenderer.invoke('db:reminders:update', id, data),
  },
  attachments: {
    byRecord: (recordId: number) => ipcRenderer.invoke('db:attachments:byRecord', recordId),
    create: (data: any) => ipcRenderer.invoke('db:attachments:create', data),
    delete: (id: number) => ipcRenderer.invoke('db:attachments:delete', id),
    saveFile: (data: { recordId: number; fileName: string; mimeType: string; title?: string; originalBuffer: number[]; thumbnailBuffer: number[] }) =>
      ipcRenderer.invoke('file:saveAttachment', data),
    deleteFile: (id: number) => ipcRenderer.invoke('file:deleteAttachment', id),
    getFilePath: (id: number) => ipcRenderer.invoke('file:getFilePath', id),
  },
  attachmentsDir: () => ipcRenderer.invoke('db:attachmentsDir'),
  inventoryLogs: {
    byMedicine: (medicineId: number) => ipcRenderer.invoke('db:inventoryLogs:byMedicine', medicineId),
    create: (data: any) => ipcRenderer.invoke('db:inventoryLogs:create', data),
  },
  dashboard: {
    stats: () => ipcRenderer.invoke('db:dashboard:stats'),
  },
  settings: {
    get: (key: string) => ipcRenderer.invoke('db:settings:get', key),
    set: (key: string, value: string) => ipcRenderer.invoke('db:settings:set', key, value),
    all: () => ipcRenderer.invoke('db:settings:all'),
  },
}

contextBridge.exposeInMainWorld('api', api)

export type PetHospitalApi = typeof api
