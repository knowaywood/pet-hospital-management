import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { mkdirSync, writeFileSync, unlinkSync, existsSync } from 'fs'
import { randomUUID } from 'crypto'
import { getDatabase, getAttachmentsDir } from './db/connection'
import * as schema from './db/schema'
import { eq, like, desc, and, sql } from 'drizzle-orm'

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      webSecurity: false,
    },
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  getDatabase()
  registerIpcHandlers()
  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

function registerIpcHandlers() {
  const db = getDatabase()

  // ---- Owners ----
  ipcMain.handle('db:owners:all', () =>
    db.select().from(schema.owners).orderBy(desc(schema.owners.created_at)).all()
  )
  ipcMain.handle('db:owners:search', (_e, keyword: string) =>
    db.select().from(schema.owners)
      .where(like(schema.owners.name, `%${keyword}%`))
      .all()
  )
  ipcMain.handle('db:owners:searchByPhone', (_e, keyword: string) =>
    db.select().from(schema.owners)
      .where(like(schema.owners.phone, `%${keyword}%`))
      .all()
  )
  ipcMain.handle('db:owners:searchByPet', (_e, keyword: string) => {
    const rows = db.select({ owner_id: schema.pets.owner_id }).from(schema.pets)
      .where(like(schema.pets.name, `%${keyword}%`))
      .all()
    const ids = [...new Set(rows.map(r => r.owner_id))]
    if (ids.length === 0) return []
    return db.select().from(schema.owners)
      .where(sql`id IN (${ids.join(',')})`)
      .all()
  })
  ipcMain.handle('db:owners:get', (_e, id: number) =>
    db.select().from(schema.owners).where(eq(schema.owners.id, id)).get()
  )
  ipcMain.handle('db:owners:create', (_e, data: any) => {
    try {
      return db.insert(schema.owners).values({ ...data, created_at: Date.now() }).returning().get()
    } catch (err: any) {
      if (err.message?.includes('UNIQUE constraint')) {
        throw new Error('手机号已存在，不能重复添加同一个客户')
      }
      throw err
    }
  })
  ipcMain.handle('db:owners:update', (_e, id: number, data: any) => {
    try {
      return db.update(schema.owners).set(data).where(eq(schema.owners.id, id)).returning().get()
    } catch (err: any) {
      if (err.message?.includes('UNIQUE constraint')) {
        throw new Error('手机号已被其他客户使用')
      }
      throw err
    }
  })
  ipcMain.handle('db:owners:delete', (_e, id: number) => {
    db.delete(schema.owners).where(eq(schema.owners.id, id)).run()
  })

  // ---- Pets ----
  ipcMain.handle('db:pets:byOwner', (_e, ownerId: number) =>
    db.select().from(schema.pets).where(eq(schema.pets.owner_id, ownerId)).all()
  )
  ipcMain.handle('db:pets:get', (_e, id: number) =>
    db.select().from(schema.pets).where(eq(schema.pets.id, id)).get()
  )
  ipcMain.handle('db:pets:create', (_e, data: any) =>
    db.insert(schema.pets).values({ ...data, created_at: Date.now() }).returning().get()
  )
  ipcMain.handle('db:pets:update', (_e, id: number, data: any) =>
    db.update(schema.pets).set(data).where(eq(schema.pets.id, id)).returning().get()
  )
  ipcMain.handle('db:pets:delete', (_e, id: number) => {
    db.delete(schema.pets).where(eq(schema.pets.id, id)).run()
  })

  // ---- Appointments ----
  ipcMain.handle('db:appointments:all', () =>
    db.select().from(schema.appointments).orderBy(desc(schema.appointments.scheduled_time)).all()
  )
  ipcMain.handle('db:appointments:create', (_e, data: any) =>
    db.insert(schema.appointments).values({ ...data, created_at: Date.now() }).returning().get()
  )
  ipcMain.handle('db:appointments:update', (_e, id: number, data: any) =>
    db.update(schema.appointments).set(data).where(eq(schema.appointments.id, id)).returning().get()
  )
  ipcMain.handle('db:appointments:delete', (_e, id: number) => {
    db.delete(schema.appointments).where(eq(schema.appointments.id, id)).run()
  })

  // ---- Medical Records ----
  ipcMain.handle('db:records:byPet', (_e, petId: number) =>
    db.select().from(schema.medical_records)
      .where(eq(schema.medical_records.pet_id, petId))
      .orderBy(desc(schema.medical_records.created_at))
      .all()
  )
  ipcMain.handle('db:records:get', (_e, id: number) =>
    db.select().from(schema.medical_records)
      .where(eq(schema.medical_records.id, id))
      .get()
  )
  ipcMain.handle('db:records:lastByPet', (_e, petId: number) =>
    db.select().from(schema.medical_records)
      .where(eq(schema.medical_records.pet_id, petId))
      .orderBy(desc(schema.medical_records.created_at))
      .limit(1)
      .get()
  )
  ipcMain.handle('db:records:create', (_e, data: any) =>
    db.insert(schema.medical_records).values({ ...data, created_at: Date.now() }).returning().get()
  )
  ipcMain.handle('db:records:update', (_e, id: number, data: any) =>
    db.update(schema.medical_records).set(data).where(eq(schema.medical_records.id, id)).returning().get()
  )

  // ---- Medicines ----
  ipcMain.handle('db:medicines:all', () =>
    db.select().from(schema.medicines).all()
  )
  ipcMain.handle('db:medicines:search', (_e, keyword: string) =>
    db.select().from(schema.medicines)
      .where(like(schema.medicines.name, `%${keyword}%`))
      .all()
  )
  ipcMain.handle('db:medicines:create', (_e, data: any) =>
    db.insert(schema.medicines).values({ ...data, created_at: Date.now() }).returning().get()
  )
  ipcMain.handle('db:medicines:update', (_e, id: number, data: any) =>
    db.update(schema.medicines).set(data).where(eq(schema.medicines.id, id)).returning().get()
  )
  ipcMain.handle('db:medicines:delete', (_e, id: number) => {
    db.delete(schema.medicines).where(eq(schema.medicines.id, id)).run()
  })

  // ---- Bills ----
  ipcMain.handle('db:bills:byOwner', (_e, ownerId: number) =>
    db.select().from(schema.bills).where(eq(schema.bills.owner_id, ownerId)).orderBy(desc(schema.bills.created_at)).all()
  )
  ipcMain.handle('db:bills:create', (_e, data: any) =>
    db.insert(schema.bills).values({ ...data, created_at: Date.now() }).returning().get()
  )
  ipcMain.handle('db:bills:update', (_e, id: number, data: any) =>
    db.update(schema.bills).set(data).where(eq(schema.bills.id, id)).returning().get()
  )
  ipcMain.handle('db:bills:cancel', (_e, id: number) => {
    const bill = db.select().from(schema.bills).where(eq(schema.bills.id, id)).get()
    if (bill) {
      db.update(schema.appointments).set({ status: 'cancelled' }).where(eq(schema.appointments.id, bill.appointment_id)).run()
      db.update(schema.bills).set({ status: 'unpaid' }).where(eq(schema.bills.id, id)).run()
    }
  })

  // ---- Bill Items ----
  ipcMain.handle('db:billItems:byBill', (_e, billId: number) =>
    db.select().from(schema.bill_items).where(eq(schema.bill_items.bill_id, billId)).all()
  )
  ipcMain.handle('db:billItems:create', (_e, data: any) =>
    db.insert(schema.bill_items).values(data).returning().get()
  )

  // ---- Vaccines ----
  ipcMain.handle('db:vaccines:byPet', (_e, petId: number) =>
    db.select().from(schema.vaccines)
      .where(eq(schema.vaccines.pet_id, petId))
      .orderBy(desc(schema.vaccines.administered_date))
      .all()
  )
  ipcMain.handle('db:vaccines:create', (_e, data: any) => {
    const vaccine = db.insert(schema.vaccines).values({ ...data, created_at: Date.now() }).returning().get()
    // Auto-create reminder if next_due_date is set
    if (data.next_due_date) {
      const pet = db.select().from(schema.pets).where(eq(schema.pets.id, data.pet_id)).get()
      if (pet) {
        db.insert(schema.reminders).values({
          pet_id: data.pet_id,
          owner_id: pet.owner_id,
          type: 'vaccination',
          title: `${data.vaccine_name} 疫苗到期`,
          due_date: data.next_due_date,
          status: 'pending',
          created_at: Date.now(),
        }).run()
      }
    }
    return vaccine
  })

  // ---- Reminders ----
  ipcMain.handle('db:reminders:pending', () => {
    const cutoff = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0]
    return db.select().from(schema.reminders)
      .where(and(eq(schema.reminders.status, 'pending'), sql`due_date <= ${cutoff}`))
      .all()
  })
  ipcMain.handle('db:reminders:byOwner', (_e, ownerId: number) =>
    db.select().from(schema.reminders)
      .where(eq(schema.reminders.owner_id, ownerId))
      .orderBy(desc(schema.reminders.due_date))
      .all()
  )
  ipcMain.handle('db:reminders:create', (_e, data: any) =>
    db.insert(schema.reminders).values({ ...data, created_at: Date.now() }).returning().get()
  )
  ipcMain.handle('db:reminders:update', (_e, id: number, data: any) =>
    db.update(schema.reminders).set(data).where(eq(schema.reminders.id, id)).returning().get()
  )

  // ---- Attachments ----
  ipcMain.handle('db:attachments:byRecord', (_e, recordId: number) =>
    db.select().from(schema.attachments).where(eq(schema.attachments.record_id, recordId)).all()
  )
  ipcMain.handle('db:attachments:create', (_e, data: any) =>
    db.insert(schema.attachments).values({ ...data, created_at: Date.now() }).returning().get()
  )
  ipcMain.handle('db:attachments:delete', (_e, id: number) => {
    db.delete(schema.attachments).where(eq(schema.attachments.id, id)).run()
  })
  ipcMain.handle('db:attachmentsDir', () => getAttachmentsDir())

  // ---- Inventory Logs ----
  ipcMain.handle('db:inventoryLogs:byMedicine', (_e, medicineId: number) =>
    db.select().from(schema.inventory_logs)
      .where(eq(schema.inventory_logs.medicine_id, medicineId))
      .orderBy(desc(schema.inventory_logs.created_at))
      .all()
  )
  ipcMain.handle('db:inventoryLogs:create', (_e, data: any) =>
    db.insert(schema.inventory_logs).values({ ...data, created_at: Date.now() }).returning().get()
  )

  // ---- Dashboard stats ----
  ipcMain.handle('db:dashboard:stats', () => {
    const today = new Date().toISOString().split('T')[0]
    const todayLike = `${today}%`

    const todayAppointments = (db.select({ c: sql<number>`count(*)` })
      .from(schema.appointments)
      .where(like(schema.appointments.scheduled_time, todayLike))
      .get() as any)?.c ?? 0

    const lowStock = (db.select({ c: sql<number>`count(*)` })
      .from(schema.medicines)
      .where(sql`is_service = 0 AND stock_quantity <= min_stock_alert`)
      .get() as any)?.c ?? 0

    const unpaidBills = (db.select({ c: sql<number>`count(*)` })
      .from(schema.bills)
      .where(sql`status != 'paid'`)
      .get() as any)?.c ?? 0

    const pendingReminders = (db.select({ c: sql<number>`count(*)` })
      .from(schema.reminders)
      .where(eq(schema.reminders.status, 'pending'))
      .get() as any)?.c ?? 0

    return { todayAppointments, lowStock, unpaidBills, pendingReminders }
  })

  // ---- File Attachments ----
  ipcMain.handle('file:saveAttachment', (_e, data: { recordId: number; fileName: string; mimeType: string; title?: string; originalBuffer: number[]; thumbnailBuffer: number[] }) => {
    const baseDir = getAttachmentsDir()
    const recordDir = join(baseDir, String(data.recordId))
    if (!existsSync(recordDir)) {
      mkdirSync(recordDir, { recursive: true })
    }

    const uid = randomUUID()
    const ext = data.fileName.includes('.') ? data.fileName.split('.').pop() || 'bin' : 'bin'
    const originalName = `original_${uid}.${ext}`
    const thumbName = `thumb_${uid}.jpg`
    const originalPath = join(recordDir, originalName)
    const thumbPath = join(recordDir, thumbName)

    writeFileSync(originalPath, Buffer.from(data.originalBuffer))
    writeFileSync(thumbPath, Buffer.from(data.thumbnailBuffer))

    const record = db.insert(schema.attachments).values({
      record_id: data.recordId,
      file_name: data.fileName,
      title: data.title || '',
      mime_type: data.mimeType,
      file_size: data.originalBuffer.length,
      thumbnail_path: thumbPath,
      original_path: originalPath,
      preview_path: originalPath,
      created_at: Date.now(),
    }).returning().get()

    return record
  })

  ipcMain.handle('file:deleteAttachment', (_e, id: number) => {
    const att = db.select().from(schema.attachments).where(eq(schema.attachments.id, id)).get()
    if (att) {
      try { if (existsSync(att.original_path)) unlinkSync(att.original_path) } catch {}
      try { if (existsSync(att.thumbnail_path)) unlinkSync(att.thumbnail_path) } catch {}
    }
    db.delete(schema.attachments).where(eq(schema.attachments.id, id)).run()
  })

  ipcMain.handle('file:getFilePath', (_e, id: number) => {
    const att = db.select().from(schema.attachments).where(eq(schema.attachments.id, id)).get()
    return att ? att.original_path : null
  })

  // ---- Settings ----
  ipcMain.handle('db:settings:get', (_e, key: string) => {
    const row = db.select().from(schema.settings).where(eq(schema.settings.key, key)).get()
    return row?.value || ''
  })
  ipcMain.handle('db:settings:set', (_e, key: string, value: string) => {
    db.insert(schema.settings).values({ key, value })
      .onConflictDoUpdate({ target: schema.settings.key, set: { value } })
      .run()
  })
  ipcMain.handle('db:settings:all', () => {
    const rows = db.select().from(schema.settings).all()
    const result: Record<string, string> = {}
    for (const r of rows) result[r.key] = r.value
    return result
  })
}
