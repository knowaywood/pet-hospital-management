import type { IRepository } from './interface'

export function createRemoteRepository(baseUrl: string): IRepository {
  async function request<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${baseUrl}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  }

  return {
    owners: {
      all: () => request('/api/owners'),
      search: (keyword) => request(`/api/owners?q=${encodeURIComponent(keyword)}`),
      get: (id) => request(`/api/owners/${id}`),
      create: (data) => request('/api/owners', { method: 'POST', body: JSON.stringify(data) }),
      update: (id, data) => request(`/api/owners/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
      delete: (id) => request(`/api/owners/${id}`, { method: 'DELETE' }),
    },
    pets: {
      byOwner: (ownerId) => request(`/api/owners/${ownerId}/pets`),
      create: (data) => request('/api/pets', { method: 'POST', body: JSON.stringify(data) }),
      update: (id, data) => request(`/api/pets/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
      delete: (id) => request(`/api/pets/${id}`, { method: 'DELETE' }),
    },
    appointments: {
      all: () => request('/api/appointments'),
      create: (data) => request('/api/appointments', { method: 'POST', body: JSON.stringify(data) }),
      update: (id, data) => request(`/api/appointments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
      delete: (id) => request(`/api/appointments/${id}`, { method: 'DELETE' }),
    },
    records: {
      byPet: (petId) => request(`/api/pets/${petId}/records`),
      create: (data) => request('/api/records', { method: 'POST', body: JSON.stringify(data) }),
    },
    medicines: {
      all: () => request('/api/medicines'),
      create: (data) => request('/api/medicines', { method: 'POST', body: JSON.stringify(data) }),
      update: (id, data) => request(`/api/medicines/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
      delete: (id) => request(`/api/medicines/${id}`, { method: 'DELETE' }),
    },
    bills: {
      byOwner: (ownerId) => request(`/api/owners/${ownerId}/bills`),
      create: (data) => request('/api/bills', { method: 'POST', body: JSON.stringify(data) }),
      update: (id, data) => request(`/api/bills/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    },
    billItems: {
      byBill: (billId) => request(`/api/bills/${billId}/items`),
      create: (data) => request('/api/bill-items', { method: 'POST', body: JSON.stringify(data) }),
    },
  }
}
