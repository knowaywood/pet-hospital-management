export interface Owner {
  id: number
  name: string
  phone: string
  address: string
  created_at: string
}

export interface Pet {
  id: number
  owner_id: number
  name: string
  species: string
  breed: string
  gender: 'male' | 'female' | 'unknown'
  birth_date: string
  weight_kg: number
  notes: string
  created_at: string
}

export interface Appointment {
  id: number
  pet_id: number
  owner_id: number
  doctor_name: string
  scheduled_time: string
  reason: string
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  created_at: string
}

export interface MedicalRecord {
  id: number
  pet_id: number
  appointment_id: number
  diagnosis: string
  prescription: string
  notes: string
  total_fee: number
  created_at: string
}

export interface Medicine {
  id: number
  name: string
  specification: string
  unit: string
  stock_quantity: number
  price_per_unit: number
  min_stock_alert: number
  created_at: string
}

export interface Bill {
  id: number
  owner_id: number
  appointment_id: number
  total_amount: number
  paid_amount: number
  status: 'unpaid' | 'partial' | 'paid'
  created_at: string
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
