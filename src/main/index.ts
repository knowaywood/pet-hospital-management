import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { getDatabase } from './db/connection'
import * as schema from './db/schema'
import { eq, like, desc } from 'drizzle-orm'

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
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
    db.select().from(schema.owners).all()
  )

  ipcMain.handle('db:owners:search', (_e, keyword: string) =>
    db.select().from(schema.owners)
      .where(like(schema.owners.name, `%${keyword}%`))
      .all()
  )

  ipcMain.handle('db:owners:get', (_e, id: number) =>
    db.select().from(schema.owners).where(eq(schema.owners.id, id)).get()
  )

  ipcMain.handle('db:owners:create', (_e, data: typeof schema.owners.$inferInsert) =>
    db.insert(schema.owners).values(data).returning().get()
  )

  ipcMain.handle('db:owners:update', (_e, id: number, data: Partial<typeof schema.owners.$inferInsert>) =>
    db.update(schema.owners).set(data).where(eq(schema.owners.id, id)).returning().get()
  )

  ipcMain.handle('db:owners:delete', (_e, id: number) => {
    db.delete(schema.owners).where(eq(schema.owners.id, id)).run()
  })

  // ---- Pets ----
  ipcMain.handle('db:pets:byOwner', (_e, ownerId: number) =>
    db.select().from(schema.pets).where(eq(schema.pets.owner_id, ownerId)).all()
  )

  ipcMain.handle('db:pets:create', (_e, data: typeof schema.pets.$inferInsert) =>
    db.insert(schema.pets).values(data).returning().get()
  )

  ipcMain.handle('db:pets:update', (_e, id: number, data: Partial<typeof schema.pets.$inferInsert>) =>
    db.update(schema.pets).set(data).where(eq(schema.pets.id, id)).returning().get()
  )

  ipcMain.handle('db:pets:delete', (_e, id: number) => {
    db.delete(schema.pets).where(eq(schema.pets.id, id)).run()
  })

  // ---- Appointments ----
  ipcMain.handle('db:appointments:all', () =>
    db.select().from(schema.appointments).orderBy(desc(schema.appointments.scheduled_time)).all()
  )

  ipcMain.handle('db:appointments:create', (_e, data: typeof schema.appointments.$inferInsert) =>
    db.insert(schema.appointments).values(data).returning().get()
  )

  ipcMain.handle('db:appointments:update', (_e, id: number, data: Partial<typeof schema.appointments.$inferInsert>) =>
    db.update(schema.appointments).set(data).where(eq(schema.appointments.id, id)).returning().get()
  )

  ipcMain.handle('db:appointments:delete', (_e, id: number) => {
    db.delete(schema.appointments).where(eq(schema.appointments.id, id)).run()
  })

  // ---- Medical Records ----
  ipcMain.handle('db:records:byPet', (_e, petId: number) =>
    db.select().from(schema.medical_records).where(eq(schema.medical_records.pet_id, petId)).orderBy(desc(schema.medical_records.created_at)).all()
  )

  ipcMain.handle('db:records:create', (_e, data: typeof schema.medical_records.$inferInsert) =>
    db.insert(schema.medical_records).values(data).returning().get()
  )

  // ---- Medicines ----
  ipcMain.handle('db:medicines:all', () =>
    db.select().from(schema.medicines).all()
  )

  ipcMain.handle('db:medicines:create', (_e, data: typeof schema.medicines.$inferInsert) =>
    db.insert(schema.medicines).values(data).returning().get()
  )

  ipcMain.handle('db:medicines:update', (_e, id: number, data: Partial<typeof schema.medicines.$inferInsert>) =>
    db.update(schema.medicines).set(data).where(eq(schema.medicines.id, id)).returning().get()
  )

  ipcMain.handle('db:medicines:delete', (_e, id: number) => {
    db.delete(schema.medicines).where(eq(schema.medicines.id, id)).run()
  })

  // ---- Bills ----
  ipcMain.handle('db:bills:byOwner', (_e, ownerId: number) =>
    db.select().from(schema.bills).where(eq(schema.bills.owner_id, ownerId)).orderBy(desc(schema.bills.created_at)).all()
  )

  ipcMain.handle('db:bills:create', (_e, data: typeof schema.bills.$inferInsert) =>
    db.insert(schema.bills).values(data).returning().get()
  )

  ipcMain.handle('db:bills:update', (_e, id: number, data: Partial<typeof schema.bills.$inferInsert>) =>
    db.update(schema.bills).set(data).where(eq(schema.bills.id, id)).returning().get()
  )

  // ---- Bill Items ----
  ipcMain.handle('db:billItems:byBill', (_e, billId: number) =>
    db.select().from(schema.bill_items).where(eq(schema.bill_items.bill_id, billId)).all()
  )

  ipcMain.handle('db:billItems:create', (_e, data: typeof schema.bill_items.$inferInsert) =>
    db.insert(schema.bill_items).values(data).returning().get()
  )
}
