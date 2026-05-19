export interface Owner {
  id: number
  name: string
  phone: string
  address: string
  created_at: number
}

export interface Pet {
  id: number
  owner_id: number
  name: string
  species: string
  breed: string
  gender: 'male' | 'female' | 'unknown'
  age: string
  weight_kg: number
  notes: string
  created_at: number
}

export type AppointmentType = 'treatment' | 'grooming' | 'bath' | 'vaccination' | 'other'

export interface Appointment {
  id: number
  pet_id: number
  owner_id: number
  doctor_name: string
  scheduled_time: string
  reason: string
  type: AppointmentType
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  created_at: number
}

export interface MedicalRecord {
  id: number
  pet_id: number
  appointment_id: number
  diagnosis: string
  prescription: string
  notes: string
  total_fee: number
  created_at: number
}

export interface Medicine {
  id: number
  name: string
  specification: string
  unit: string
  stock_quantity: number
  price_per_unit: number
  min_stock_alert: number
  is_service: number
  created_at: number
}

export interface Bill {
  id: number
  owner_id: number
  appointment_id: number
  total_amount: number
  paid_amount: number
  status: 'unpaid' | 'partial' | 'paid'
  created_at: number
}

export interface BillItem {
  id: number
  bill_id: number
  item_type: 'consultation' | 'medicine' | 'procedure' | 'other'
  description: string
  quantity: number
  unit_price: number
  amount: number
}

export interface Vaccine {
  id: number
  pet_id: number
  vaccine_name: string
  administered_date: string
  next_due_date: string
  batch_number: string
  notes: string
  created_at: number
}

export interface Reminder {
  id: number
  pet_id: number
  owner_id: number
  type: 'vaccination' | 'followup' | 'custom'
  title: string
  due_date: string
  status: 'pending' | 'completed' | 'dismissed'
  created_at: number
}

export interface Attachment {
  id: number
  record_id: number
  file_name: string
  title: string
  mime_type: string
  file_size: number
  thumbnail_path: string
  original_path: string
  preview_path: string
  created_at: number
}

export interface InventoryLog {
  id: number
  medicine_id: number
  change_type: 'purchase' | 'dispense' | 'adjust' | 'return'
  quantity: number
  batch_number: string
  purchase_price: number
  related_id: number
  note: string
  created_at: number
}

export interface ClinicSettings {
  clinic_name: string
  phone: string
  address: string
}
