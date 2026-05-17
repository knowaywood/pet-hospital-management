import { contextBridge, ipcRenderer } from 'electron'

const api = {
  owners: {
    all: () => ipcRenderer.invoke('db:owners:all'),
    search: (keyword: string) => ipcRenderer.invoke('db:owners:search', keyword),
    get: (id: number) => ipcRenderer.invoke('db:owners:get', id),
    create: (data: any) => ipcRenderer.invoke('db:owners:create', data),
    update: (id: number, data: any) => ipcRenderer.invoke('db:owners:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('db:owners:delete', id),
  },
  pets: {
    byOwner: (ownerId: number) => ipcRenderer.invoke('db:pets:byOwner', ownerId),
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
    create: (data: any) => ipcRenderer.invoke('db:records:create', data),
  },
  medicines: {
    all: () => ipcRenderer.invoke('db:medicines:all'),
    create: (data: any) => ipcRenderer.invoke('db:medicines:create', data),
    update: (id: number, data: any) => ipcRenderer.invoke('db:medicines:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('db:medicines:delete', id),
  },
  bills: {
    byOwner: (ownerId: number) => ipcRenderer.invoke('db:bills:byOwner', ownerId),
    create: (data: any) => ipcRenderer.invoke('db:bills:create', data),
    update: (id: number, data: any) => ipcRenderer.invoke('db:bills:update', id, data),
  },
  billItems: {
    byBill: (billId: number) => ipcRenderer.invoke('db:billItems:byBill', billId),
    create: (data: any) => ipcRenderer.invoke('db:billItems:create', data),
  },
}

contextBridge.exposeInMainWorld('api', api)

export type PetHospitalApi = typeof api
