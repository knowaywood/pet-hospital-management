import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'

export const owners = sqliteTable('owners', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().default(''),
  phone: text('phone').notNull().unique(),
  address: text('address').notNull().default(''),
  created_at: integer('created_at').notNull(),
})

export const pets = sqliteTable('pets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  owner_id: integer('owner_id').notNull().references(() => owners.id),
  name: text('name').notNull(),
  species: text('species').notNull(),
  breed: text('breed').notNull().default(''),
  gender: text('gender', { enum: ['male', 'female', 'unknown'] }).notNull().default('unknown'),
  age: text('age').notNull().default(''),
  weight_kg: real('weight_kg').notNull().default(0),
  notes: text('notes').notNull().default(''),
  created_at: integer('created_at').notNull(),
})

export const appointments = sqliteTable('appointments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  pet_id: integer('pet_id').notNull().references(() => pets.id),
  owner_id: integer('owner_id').notNull().references(() => owners.id),
  doctor_name: text('doctor_name').notNull(),
  scheduled_time: text('scheduled_time').notNull(),
  reason: text('reason').notNull().default(''),
  type: text('type', { enum: ['treatment', 'grooming', 'bath', 'vaccination', 'other'] }).notNull().default('treatment'),
  status: text('status', { enum: ['scheduled', 'in_progress', 'completed', 'cancelled'] }).notNull().default('scheduled'),
  created_at: integer('created_at').notNull(),
})

export const medical_records = sqliteTable('medical_records', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  pet_id: integer('pet_id').notNull().references(() => pets.id),
  appointment_id: integer('appointment_id').notNull().references(() => appointments.id),
  diagnosis: text('diagnosis').notNull().default(''),
  prescription: text('prescription').notNull().default(''),
  notes: text('notes').notNull().default(''),
  total_fee: real('total_fee').notNull().default(0),
  created_at: integer('created_at').notNull(),
})

export const medicines = sqliteTable('medicines', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  specification: text('specification').notNull().default(''),
  unit: text('unit').notNull().default('片'),
  stock_quantity: integer('stock_quantity').notNull().default(0),
  price_per_unit: real('price_per_unit').notNull().default(0),
  min_stock_alert: integer('min_stock_alert').notNull().default(10),
  is_service: integer('is_service').notNull().default(0),
  created_at: integer('created_at').notNull(),
})

export const bills = sqliteTable('bills', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  owner_id: integer('owner_id').notNull().references(() => owners.id),
  appointment_id: integer('appointment_id').notNull().references(() => appointments.id),
  total_amount: real('total_amount').notNull().default(0),
  paid_amount: real('paid_amount').notNull().default(0),
  status: text('status', { enum: ['unpaid', 'partial', 'paid'] }).notNull().default('unpaid'),
  created_at: integer('created_at').notNull(),
})

export const bill_items = sqliteTable('bill_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  bill_id: integer('bill_id').notNull().references(() => bills.id),
  item_type: text('item_type', { enum: ['consultation', 'medicine', 'procedure', 'other'] }).notNull(),
  description: text('description').notNull(),
  quantity: integer('quantity').notNull().default(1),
  unit_price: real('unit_price').notNull().default(0),
  amount: real('amount').notNull().default(0),
})

export const vaccines = sqliteTable('vaccines', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  pet_id: integer('pet_id').notNull().references(() => pets.id),
  vaccine_name: text('vaccine_name').notNull(),
  administered_date: text('administered_date').notNull(),
  next_due_date: text('next_due_date').notNull().default(''),
  batch_number: text('batch_number').notNull().default(''),
  notes: text('notes').notNull().default(''),
  created_at: integer('created_at').notNull(),
})

export const reminders = sqliteTable('reminders', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  pet_id: integer('pet_id').notNull().references(() => pets.id),
  owner_id: integer('owner_id').notNull().references(() => owners.id),
  type: text('type', { enum: ['vaccination', 'followup', 'custom'] }).notNull(),
  title: text('title').notNull(),
  due_date: text('due_date').notNull(),
  status: text('status', { enum: ['pending', 'completed', 'dismissed'] }).notNull().default('pending'),
  created_at: integer('created_at').notNull(),
})

export const attachments = sqliteTable('attachments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  record_id: integer('record_id').notNull().references(() => medical_records.id),
  file_name: text('file_name').notNull(),
  title: text('title').notNull().default(''),
  mime_type: text('mime_type').notNull(),
  file_size: integer('file_size').notNull().default(0),
  thumbnail_path: text('thumbnail_path').notNull().default(''),
  original_path: text('original_path').notNull().default(''),
  preview_path: text('preview_path').notNull().default(''),
  created_at: integer('created_at').notNull(),
})

export const inventory_logs = sqliteTable('inventory_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  medicine_id: integer('medicine_id').notNull().references(() => medicines.id),
  change_type: text('change_type', { enum: ['purchase', 'dispense', 'adjust', 'return'] }).notNull(),
  quantity: integer('quantity').notNull(),
  batch_number: text('batch_number').notNull().default(''),
  purchase_price: real('purchase_price').notNull().default(0),
  related_id: integer('related_id').notNull().default(0),
  note: text('note').notNull().default(''),
  created_at: integer('created_at').notNull(),
})

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull().default(''),
})
