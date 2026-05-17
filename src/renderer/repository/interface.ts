import type { Owner, Pet, Appointment, MedicalRecord, Medicine, Bill, BillItem } from '../../../shared/types'

export interface IOwnerRepository {
  all(): Promise<Owner[]>
  search(keyword: string): Promise<Owner[]>
  get(id: number): Promise<Owner | undefined>
  create(data: Omit<Owner, 'id' | 'created_at'>): Promise<Owner>
  update(id: number, data: Partial<Omit<Owner, 'id' | 'created_at'>>): Promise<Owner | undefined>
  delete(id: number): Promise<void>
}

export interface IPetRepository {
  byOwner(ownerId: number): Promise<Pet[]>
  create(data: Omit<Pet, 'id' | 'created_at'>): Promise<Pet>
  update(id: number, data: Partial<Omit<Pet, 'id' | 'created_at'>>): Promise<Pet | undefined>
  delete(id: number): Promise<void>
}

export interface IAppointmentRepository {
  all(): Promise<Appointment[]>
  create(data: Omit<Appointment, 'id' | 'created_at'>): Promise<Appointment>
  update(id: number, data: Partial<Omit<Appointment, 'id' | 'created_at'>>): Promise<Appointment | undefined>
  delete(id: number): Promise<void>
}

export interface IMedicalRecordRepository {
  byPet(petId: number): Promise<MedicalRecord[]>
  create(data: Omit<MedicalRecord, 'id' | 'created_at'>): Promise<MedicalRecord>
}

export interface IMedicineRepository {
  all(): Promise<Medicine[]>
  create(data: Omit<Medicine, 'id' | 'created_at'>): Promise<Medicine>
  update(id: number, data: Partial<Omit<Medicine, 'id' | 'created_at'>>): Promise<Medicine | undefined>
  delete(id: number): Promise<void>
}

export interface IBillRepository {
  byOwner(ownerId: number): Promise<Bill[]>
  create(data: Omit<Bill, 'id' | 'created_at'>): Promise<Bill>
  update(id: number, data: Partial<Omit<Bill, 'id' | 'created_at'>>): Promise<Bill | undefined>
}

export interface IBillItemRepository {
  byBill(billId: number): Promise<BillItem[]>
  create(data: Omit<BillItem, 'id'>): Promise<BillItem>
}

export interface IRepository {
  owners: IOwnerRepository
  pets: IPetRepository
  appointments: IAppointmentRepository
  records: IMedicalRecordRepository
  medicines: IMedicineRepository
  bills: IBillRepository
  billItems: IBillItemRepository
}
