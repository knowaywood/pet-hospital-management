import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'

export const owners = sqliteTable('owners', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  phone: text('phone').notNull(),
  address: text('address').notNull().default(''),
  created_at: text('created_at').notNull().default('datetime("now")'),
})

export const pets = sqliteTable('pets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  owner_id: integer('owner_id').notNull().references(() => owners.id),
  name: text('name').notNull(),
  species: text('species').notNull(),
  breed: text('breed').notNull().default(''),
  gender: text('gender', { enum: ['male', 'female', 'unknown'] }).notNull().default('unknown'),
  birth_date: text('birth_date').notNull().default(''),
  weight_kg: real('weight_kg').notNull().default(0),
  notes: text('notes').notNull().default(''),
  created_at: text('created_at').notNull().default('datetime("now")'),
})

export const appointments = sqliteTable('appointments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  pet_id: integer('pet_id').notNull().references(() => pets.id),
  owner_id: integer('owner_id').notNull().references(() => owners.id),
  doctor_name: text('doctor_name').notNull(),
  scheduled_time: text('scheduled_time').notNull(),
  reason: text('reason').notNull().default(''),
  status: text('status', { enum: ['scheduled', 'in_progress', 'completed', 'cancelled'] }).notNull().default('scheduled'),
  created_at: text('created_at').notNull().default('datetime("now")'),
})

export const medical_records = sqliteTable('medical_records', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  pet_id: integer('pet_id').notNull().references(() => pets.id),
  appointment_id: integer('appointment_id').notNull().references(() => appointments.id),
  diagnosis: text('diagnosis').notNull().default(''),
  prescription: text('prescription').notNull().default(''),
  notes: text('notes').notNull().default(''),
  total_fee: real('total_fee').notNull().default(0),
  created_at: text('created_at').notNull().default('datetime("now")'),
})

export const medicines = sqliteTable('medicines', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  specification: text('specification').notNull().default(''),
  unit: text('unit').notNull().default('片'),
  stock_quantity: integer('stock_quantity').notNull().default(0),
  price_per_unit: real('price_per_unit').notNull().default(0),
  min_stock_alert: integer('min_stock_alert').notNull().default(10),
  created_at: text('created_at').notNull().default('datetime("now")'),
})

export const bills = sqliteTable('bills', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  owner_id: integer('owner_id').notNull().references(() => owners.id),
  appointment_id: integer('appointment_id').notNull().references(() => appointments.id),
  total_amount: real('total_amount').notNull().default(0),
  paid_amount: real('paid_amount').notNull().default(0),
  status: text('status', { enum: ['unpaid', 'partial', 'paid'] }).notNull().default('unpaid'),
  created_at: text('created_at').notNull().default('datetime("now")'),
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
