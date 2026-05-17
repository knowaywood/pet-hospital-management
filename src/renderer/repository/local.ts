import type { IRepository } from './interface'

function api() {
  if (!window.api) throw new Error('API not available (not running in Electron)')
  return window.api
}

export const localRepository: IRepository = {
  owners: {
    all: () => api().owners.all(),
    search: (keyword) => api().owners.search(keyword),
    get: (id) => api().owners.get(id),
    create: (data) => api().owners.create(data),
    update: (id, data) => api().owners.update(id, data),
    delete: (id) => api().owners.delete(id),
  },
  pets: {
    byOwner: (ownerId) => api().pets.byOwner(ownerId),
    create: (data) => api().pets.create(data),
    update: (id, data) => api().pets.update(id, data),
    delete: (id) => api().pets.delete(id),
  },
  appointments: {
    all: () => api().appointments.all(),
    create: (data) => api().appointments.create(data),
    update: (id, data) => api().appointments.update(id, data),
    delete: (id) => api().appointments.delete(id),
  },
  records: {
    byPet: (petId) => api().records.byPet(petId),
    create: (data) => api().records.create(data),
  },
  medicines: {
    all: () => api().medicines.all(),
    create: (data) => api().medicines.create(data),
    update: (id, data) => api().medicines.update(id, data),
    delete: (id) => api().medicines.delete(id),
  },
  bills: {
    byOwner: (ownerId) => api().bills.byOwner(ownerId),
    create: (data) => api().bills.create(data),
    update: (id, data) => api().bills.update(id, data),
  },
  billItems: {
    byBill: (billId) => api().billItems.byBill(billId),
    create: (data) => api().billItems.create(data),
  },
}
