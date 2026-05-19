import { useEffect, useState } from 'react'
import {
  Calendar, Card, Button, Modal, Form, Input, Select, DatePicker, Space, Popconfirm, message, Tag,
  Drawer, Table, AutoComplete, InputNumber, Empty, Badge, Upload, Image,
} from 'antd'
import { PlusOutlined, ClearOutlined, DeleteOutlined, CheckCircleOutlined, MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons'
import { useStore } from '../store'
import dayjs from 'dayjs'
import * as pdfjsLib from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs'

interface PrescriptionRow {
  key: string
  medicineName: string
  specification: string
  unit: string
  unitPrice: number
  quantity: number
  amount: number
}

function generateImageThumbnail(file: File, maxSize = 200): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.onload = () => {
      const scale = Math.min(maxSize / img.width, maxSize / img.height, 1)
      const canvas = document.createElement('canvas')
      canvas.width = img.width * scale
      canvas.height = img.height * scale
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob((blob) => {
        if (blob) blob.arrayBuffer().then(resolve).catch(reject)
        else reject(new Error('canvas toBlob failed'))
      }, 'image/jpeg', 0.7)
    }
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

async function generatePDFThumbnails(file: File, maxSize = 200): Promise<ArrayBuffer[]> {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const thumbnails: ArrayBuffer[] = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const viewport = page.getViewport({ scale: 1 })
    const scale = Math.min(maxSize / viewport.width, maxSize / viewport.height, 2)
    const scaledViewport = page.getViewport({ scale })
    const canvas = document.createElement('canvas')
    canvas.width = scaledViewport.width
    canvas.height = scaledViewport.height
    const ctx = canvas.getContext('2d')!
    await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.7))
    if (blob) thumbnails.push(await blob.arrayBuffer())
  }
  return thumbnails
}

export default function Appointments() {
  const [list, setList] = useState<any[]>([])
  const [owners, setOwners] = useState<any[]>([])
  const [pets, setPets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [visitOpen, setVisitOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string>(dayjs().format('YYYY-MM-DD'))
  const [visitAppt, setVisitAppt] = useState<any>(null)
  const [prescriptionRows, setPrescriptionRows] = useState<PrescriptionRow[]>([])
  const [calendarVisible, setCalendarVisible] = useState(false)
  const [visitAttachments, setVisitAttachments] = useState<any[]>([])
  const [draftRecordId, setDraftRecordId] = useState<number | null>(null)
  const [uploadingFiles, setUploadingFiles] = useState(false)
  const [titleModalOpen, setTitleModalOpen] = useState(false)
  const [titleModalFile, setTitleModalFile] = useState<File | null>(null)
  const [titleModalTitle, setTitleModalTitle] = useState('')
  const [medicineOptions, setMedicineOptions] = useState<{ label: string; value: string; spec: string; unit: string; price: number }[]>([])
  const [createForm] = Form.useForm()
  const [visitForm] = Form.useForm()
  const [reminderOpen, setReminderOpen] = useState(false)
  const [reminderForm] = Form.useForm()

  const { currentOwner, currentPet, setCurrentOwner, setCurrentPet } = useStore()

  const load = async () => {
    if (!window.api) return
    setLoading(true)
    try {
      const [appts, allOwners] = await Promise.all([
        window.api.appointments.all(),
        window.api.owners.all(),
      ])
      setList(appts || [])
      setOwners(allOwners || [])
    } catch (e: any) { message.error('加载失败') }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openCreate = async () => {
    createForm.resetFields()
    createForm.setFieldsValue({ scheduled_time: dayjs(), type: 'treatment' })
    if (currentOwner) {
      createForm.setFieldsValue({ owner_id: currentOwner.id })
      const ownerPets = await window.api?.pets.byOwner(currentOwner.id)
      setPets(ownerPets || [])
      if (currentPet) createForm.setFieldsValue({ pet_id: currentPet.id })
    }
    setCreateOpen(true)
  }

  const handleOwnerChange = async (ownerId: number) => {
    if (!window.api) return
    createForm.setFieldsValue({ pet_id: undefined })
    const ownerPets = await window.api.pets.byOwner(ownerId)
    setPets(ownerPets || [])
  }

  const handleCreateOk = async () => {
    const values = await createForm.validateFields()
    if (!window.api) return
    try {
      await window.api.appointments.create({
        ...values,
        scheduled_time: values.scheduled_time.format('YYYY-MM-DD HH:mm'),
      })
      message.success('预约已创建')
      setCreateOpen(false)
      load()
    } catch (e: any) { message.error('操作失败') }
  }

  const handleStatus = async (id: number, status: string) => {
    if (!window.api) return
    await window.api.appointments.update(id, { status })
    load()
    if (visitAppt && visitAppt.id === id) {
      setVisitAppt({ ...visitAppt, status })
    }
  }

  // --- Visit Workspace ---
  const loadMedicineOptions = async () => {
    if (!window.api) return
    const meds = await window.api.medicines.all()
    setMedicineOptions((meds || []).map((m: any) => ({
      label: `${m.name} ${m.specification}`,
      value: m.name,
      spec: m.specification,
      unit: m.unit,
      price: m.price_per_unit,
    })))
  }

  const openVisit = async (appt: any) => {
    setVisitAppt(appt)
    setPrescriptionRows([])
    setVisitAttachments([])
    setDraftRecordId(null)
    visitForm.resetFields()
    await loadMedicineOptions()
    if (appt.reason) visitForm.setFieldsValue({ diagnosis: appt.reason })
    // Load last prescription for this pet
    if (window.api && appt.pet_id) {
      const last = await window.api.records.lastByPet(appt.pet_id)
      if (last) {
        try {
          const parsed = JSON.parse(last.prescription || '[]')
          if (Array.isArray(parsed) && parsed.length > 0) {
            setPrescriptionRows(parsed.map((p: any, i: number) => ({
              key: String(i),
              medicineName: p.medicineName || '',
              specification: p.specification || '',
              unit: p.unit || '',
              unitPrice: p.unitPrice || 0,
              quantity: p.quantity || 1,
              amount: (p.unitPrice || 0) * (p.quantity || 1),
            })))
          }
        } catch {}
      }
      // Create draft medical record so attachments can be saved immediately
      try {
        const draft = await window.api.records.create({
          pet_id: appt.pet_id,
          appointment_id: appt.id,
          diagnosis: '',
          prescription: '',
          notes: '',
          total_fee: 0,
        })
        setDraftRecordId(draft.id)
        const atts = await window.api.attachments.byRecord(draft.id)
        setVisitAttachments(atts || [])
      } catch {}
    }
    setVisitOpen(true)
    if (appt.status === 'scheduled') {
      handleStatus(appt.id, 'in_progress')
    }
  }

  const clearPrescription = () => setPrescriptionRows([])

  const addPrescriptionRow = () => {
    setPrescriptionRows(prev => [...prev, {
      key: String(Date.now()),
      medicineName: '', specification: '', unit: '', unitPrice: 0, quantity: 1, amount: 0,
    }])
  }

  const removePrescriptionRow = (key: string) => {
    setPrescriptionRows(prev => prev.filter(r => r.key !== key))
  }

  const updatePrescriptionRow = (key: string, field: string, value: any) => {
    setPrescriptionRows(prev => prev.map(r => {
      if (r.key !== key) return r
      const updated = { ...r, [field]: value }
      if (field === 'quantity' || field === 'unitPrice') {
        updated.amount = updated.unitPrice * updated.quantity
      }
      return updated
    }))
  }

  const handleMedicineSelect = (key: string, value: string) => {
    const match = medicineOptions.find(m => m.value === value)
    if (match) {
      setPrescriptionRows(prev => prev.map(r => {
        if (r.key !== key) return r
        return {
          ...r,
          medicineName: match.value,
          specification: match.spec,
          unit: match.unit,
          unitPrice: match.price,
          amount: match.price * r.quantity,
        }
      }))
    }
  }

  const handleMedicineChange = (key: string, value: string) => {
    setPrescriptionRows(prev => prev.map(r => {
      if (r.key !== key) return r
      // If user is typing freely (didn't select from dropdown), keep current name but clear auto-filled data if it was previously matched
      const isCustom = !medicineOptions.some(m => m.value === value)
      return {
        ...r,
        medicineName: value,
        ...(isCustom && r.specification && medicineOptions.some(m => m.value === r.medicineName && m.spec === r.specification)
          ? { specification: '', unit: '', unitPrice: 0, amount: 0 }
          : {}),
      }
    }))
  }

  const totalFee = prescriptionRows.reduce((sum, r) => sum + r.amount, 0)

  const loadVisitAttachments = async () => {
    if (!window.api || !draftRecordId) return
    const atts = await window.api.attachments.byRecord(draftRecordId)
    setVisitAttachments(atts || [])
  }

  const handleFileDrop = async (file: File, title?: string) => {
    if (!window.api || !draftRecordId) return
    setUploadingFiles(true)
    try {
      const fileName = file.name
      const finalTitle = title || fileName.replace(/\.[^.]+$/, '')
      const arrayBuffer = await file.arrayBuffer()
      const isPDF = file.type === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf')
      const isImage = file.type.startsWith('image/')
      let thumbnailBuffer: ArrayBuffer

      if (isImage) {
        thumbnailBuffer = await generateImageThumbnail(file)
      } else if (isPDF) {
        const thumbs = await generatePDFThumbnails(file)
        if (thumbs.length === 0) throw new Error('PDF 无页面')
        thumbnailBuffer = thumbs[0]
        for (let i = 0; i < thumbs.length; i++) {
          const pageNum = i + 1
          const pageFileName = fileName.replace(/\.pdf$/i, `_p${pageNum}.jpg`)
          await window.api.attachments.saveFile({
            recordId: draftRecordId,
            fileName: pageFileName,
            title: thumbs.length > 1 ? `${finalTitle} (第${pageNum}页)` : finalTitle,
            mimeType: 'image/jpeg',
            originalBuffer: Array.from(new Uint8Array(thumbs[i])),
            thumbnailBuffer: Array.from(new Uint8Array(thumbs[i])),
          })
        }
        loadVisitAttachments()
        setUploadingFiles(false)
        return
      } else {
        message.warning('不支持的文件类型')
        setUploadingFiles(false)
        return
      }

      await window.api.attachments.saveFile({
        recordId: draftRecordId,
        fileName,
        title: finalTitle,
        mimeType: file.type,
        originalBuffer: Array.from(new Uint8Array(arrayBuffer)),
        thumbnailBuffer: Array.from(new Uint8Array(thumbnailBuffer)),
      })
      message.success(`${fileName} 已上传`)
      loadVisitAttachments()
    } catch (e: any) {
      message.error('上传失败: ' + e.message)
    }
    setUploadingFiles(false)
  }

  const onFileSelected = (file: File) => {
    setTitleModalFile(file)
    setTitleModalTitle(file.name.replace(/\.[^.]+$/, ''))
    setTitleModalOpen(true)
    return false // prevent auto upload
  }

  const handleDeleteAttachment = async (id: number) => {
    if (!window.api) return
    await window.api.attachments.deleteFile(id)
    loadVisitAttachments()
  }

  const fileUrl = (path: string) => {
    if (!path) return ''
    return `file://${path}`
  }

  const openReminder = () => {
    reminderForm.resetFields()
    reminderForm.setFieldsValue({
      owner_id: visitAppt?.owner_id,
      pet_id: visitAppt?.pet_id,
      days: 30,
      type: 'followup',
    })
    setReminderOpen(true)
  }

  const handleReminderOk = async () => {
    const values = await reminderForm.validateFields()
    if (!window.api) return
    await window.api.reminders.create({
      ...values,
      due_date: dayjs().add(values.days, 'day').format('YYYY-MM-DD'),
    })
    message.success('回访提醒已创建')
    setReminderOpen(false)
  }

  const handleVisitSave = async () => {
    const values = await visitForm.validateFields()
    if (!window.api || !visitAppt) return
    try {
      const prescriptionJson = JSON.stringify(prescriptionRows.filter(r => r.medicineName))
      if (draftRecordId) {
        await window.api.records.update(draftRecordId, {
          diagnosis: values.diagnosis || '',
          prescription: prescriptionJson,
          notes: values.notes || '',
          total_fee: totalFee,
        })
      } else {
        await window.api.records.create({
          pet_id: visitAppt.pet_id,
          appointment_id: visitAppt.id,
          diagnosis: values.diagnosis || '',
          prescription: prescriptionJson,
          notes: values.notes || '',
          total_fee: totalFee,
        })
      }
      // Auto-create bill
      await window.api.bills.create({
        owner_id: visitAppt.owner_id,
        appointment_id: visitAppt.id,
        total_amount: totalFee,
        paid_amount: 0,
        status: 'unpaid',
      })
      // Deduct inventory
      for (const row of prescriptionRows) {
        if (!row.medicineName) continue
        const meds = await window.api.medicines.search(row.medicineName)
        const med = (meds as any[])?.find((m: any) => m.name === row.medicineName)
        if (med) {
          if (!med.is_service) {
            const newQty = Math.max(0, med.stock_quantity - row.quantity)
            await window.api.medicines.update(med.id, { stock_quantity: newQty })
          }
          await window.api.inventoryLogs.create({
            medicine_id: med.id,
            change_type: 'dispense',
            quantity: -row.quantity,
            note: `就诊${med.is_service ? '服务' : '用药'}: ${row.medicineName} x${row.quantity}`,
          })
        }
      }
      // Mark completed
      await window.api.appointments.update(visitAppt.id, { status: 'completed' })
      message.success('就诊完成，账单已生成')
      setVisitOpen(false)
      setVisitAppt(null)
      load()
    } catch (e: any) { message.error('保存失败: ' + e.message) }
  }

  // --- Calendar helpers ---
  const apptsByDate: Record<string, any[]> = {}
  list.forEach(a => {
    const day = (a.scheduled_time || '').slice(0, 10)
    if (!apptsByDate[day]) apptsByDate[day] = []
    apptsByDate[day].push(a)
  })

  const dayAppts = apptsByDate[selectedDate] || []

  const dateCellRender = (date: dayjs.Dayjs) => {
    const day = date.format('YYYY-MM-DD')
    const dayList = apptsByDate[day] || []
    if (dayList.length === 0) return null
    const statusColors: Record<string, string> = {
      scheduled: '#1890ff', in_progress: '#fa8c16', completed: '#52c41a', cancelled: '#d9d9d9',
    }
    return (
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {dayList.slice(0, 3).map(a => (
          <li key={a.id} style={{ fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <Badge color={statusColors[a.status] || '#ccc'} text={a.scheduled_time?.slice(11, 16)} />
          </li>
        ))}
        {dayList.length > 3 && <li style={{ fontSize: 10, color: '#999' }}>+{dayList.length - 3} 更多</li>}
      </ul>
    )
  }

  const ownerMap: Record<number, string> = {}
  owners.forEach(o => { ownerMap[o.id] = o.name })

  const typeLabels: Record<string, string> = {
    treatment: '治疗', grooming: '美容', bath: '洗澡', vaccination: '疫苗', other: '其他',
  }
  const statusLabels: Record<string, string> = {
    scheduled: '待就诊', in_progress: '就诊中', completed: '已完成', cancelled: '已取消',
  }
  const statusColors: Record<string, string> = {
    scheduled: 'blue', in_progress: 'orange', completed: 'green', cancelled: 'default',
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2>预约就诊</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新建预约</Button>
      </div>

      <div style={{ display: 'flex', gap: 24 }}>
        {calendarVisible ? (
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontWeight: 'bold' }}>日历</span>
              <Button type="text" size="small" icon={<MenuFoldOutlined />}
                onClick={() => setCalendarVisible(false)}>收起日历</Button>
            </div>
            <Calendar
              fullscreen={false}
              value={dayjs(selectedDate)}
              onSelect={(date) => setSelectedDate(date.format('YYYY-MM-DD'))}
              cellRender={(date) => dateCellRender(date)}
            />
          </div>
        ) : (
          <></>
        )}

        <Card
          title={
            calendarVisible ? `${selectedDate} — 预约列表` : (
              <Space>
                <DatePicker
                  size="small"
                  value={dayjs(selectedDate)}
                  onChange={(d) => d && setSelectedDate(d.format('YYYY-MM-DD'))}
                  allowClear={false}
                />
                <span>预约列表</span>
                <Button type="text" size="small" icon={<MenuUnfoldOutlined />}
                  onClick={() => setCalendarVisible(true)} />
              </Space>
            )
          }
          style={{ flex: calendarVisible ? 0.6 : 1, minWidth: calendarVisible ? 300 : 0 }}
          size="small"
        >
          {dayAppts.length === 0 ? (
            <Empty description="当天无预约" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {dayAppts.map(a => (
                <Card
                  key={a.id}
                  size="small"
                  hoverable
                  onClick={() => {
                    if (a.status !== 'cancelled') openVisit(a)
                  }}
                  style={{ cursor: a.status !== 'cancelled' ? 'pointer' : 'default', opacity: a.status === 'cancelled' ? 0.5 : 1 }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <Tag color={statusColors[a.status]}>{statusLabels[a.status]}</Tag>
                      <Tag>{typeLabels[a.type] || a.type}</Tag>
                      <span style={{ fontWeight: 'bold' }}>{ownerMap[a.owner_id] || `#${a.owner_id}`}</span>
                    </div>
                    <span style={{ color: '#888', fontSize: 12 }}>{a.scheduled_time?.slice(11, 16)}</span>
                  </div>
                  <div style={{ marginTop: 4, fontSize: 12, color: '#666' }}>
                    医生: {a.doctor_name} | 宠物: #{a.pet_id}
                  </div>
                  {a.reason && <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>{a.reason}</div>}
                </Card>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Create Appointment Modal */}
      <Modal title="新建预约" open={createOpen} onOk={handleCreateOk} onCancel={() => setCreateOpen(false)} width={500}>
        <Form form={createForm} layout="vertical">
          <Form.Item name="owner_id" label="客户" rules={[{ required: true }]}>
            <Select showSearch placeholder="选择客户"
              filterOption={(i, o) => (o?.label as string || '').includes(i)}
              options={owners.map((o: any) => ({ label: o.name, value: o.id }))}
              onChange={handleOwnerChange} />
          </Form.Item>
          <Form.Item name="pet_id" label="宠物" rules={[{ required: true }]}>
            <Select showSearch placeholder="选择宠物"
              filterOption={(i, o) => (o?.label as string || '').includes(i)}
              options={pets.map((p: any) => ({ label: `${p.name} (${p.species})`, value: p.id }))} />
          </Form.Item>
          <Form.Item name="type" label="类型" rules={[{ required: true }]} initialValue="treatment">
            <Select options={[
              { label: '治疗', value: 'treatment' },
              { label: '宠物美容', value: 'grooming' },
              { label: '洗澡', value: 'bath' },
              { label: '疫苗接种', value: 'vaccination' },
              { label: '其他', value: 'other' },
            ]} />
          </Form.Item>
          <Form.Item name="doctor_name" label="医生" rules={[{ required: true }]}>
            <Input placeholder="医生姓名" />
          </Form.Item>
          <Form.Item name="scheduled_time" label="预约时间" rules={[{ required: true }]}>
            <DatePicker showTime format="YYYY-MM-DD HH:mm" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="reason" label="原因">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Visit Workspace Drawer */}
      <Drawer
        title={visitAppt ? `就诊 — ${ownerMap[visitAppt.owner_id] || ''} 宠物#${visitAppt.pet_id}` : '就诊'}
        placement="right"
        width={700}
        open={visitOpen}
        onClose={() => { setVisitOpen(false); setVisitAppt(null); setDraftRecordId(null); setVisitAttachments([]) }}
        extra={
          <Space>
            <Button size="small" onClick={openReminder}>新建回访</Button>
            {visitAppt?.status !== 'completed' && visitAppt?.status !== 'cancelled' && (
              <Button type="primary" icon={<CheckCircleOutlined />} onClick={handleVisitSave}>
                完成就诊
              </Button>
            )}
            {visitAppt?.status === 'in_progress' && (
              <Popconfirm title="取消就诊?" onConfirm={() => { handleStatus(visitAppt.id, 'cancelled'); setVisitOpen(false); }}>
                <Button danger>取消</Button>
              </Popconfirm>
            )}
          </Space>
        }
      >
        {visitAppt && (
          <div>
            <Card size="small" style={{ marginBottom: 16 }}>
              <div>类型: <Tag>{typeLabels[visitAppt.type]}</Tag> | 医生: {visitAppt.doctor_name}</div>
              <div>时间: {visitAppt.scheduled_time}</div>
              {visitAppt.reason && <div>主诉: {visitAppt.reason}</div>}
            </Card>

            <Form form={visitForm} layout="vertical">
              <Form.Item name="diagnosis" label="诊断">
                <Input.TextArea rows={3} placeholder="诊断结果..." />
              </Form.Item>
            </Form>

            <Card size="small" title={
              <Space>
                <span>处方</span>
                <Button size="small" icon={<ClearOutlined />} onClick={clearPrescription}>清空</Button>
                <Button size="small" type="dashed" icon={<PlusOutlined />} onClick={addPrescriptionRow}>添加药品</Button>
              </Space>
            } style={{ marginBottom: 16 }}>
              {prescriptionRows.length === 0 && <Empty description="暂无药品" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
              {prescriptionRows.map(row => (
                <div key={row.key} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
                  <AutoComplete style={{ width: 160 }}
                    value={row.medicineName} placeholder="搜索药品或输入药名"
                    options={medicineOptions.map(m => ({ label: m.label, value: m.value }))}
                    onSelect={(v) => handleMedicineSelect(row.key, v)}
                    onChange={(v) => handleMedicineChange(row.key, v)} />
                  <Input value={row.specification} placeholder="规格" style={{ width: 80 }}
                    onChange={(e) => updatePrescriptionRow(row.key, 'specification', e.target.value)} />
                  <Input value={row.unit} placeholder="单位" style={{ width: 50 }}
                    onChange={(e) => updatePrescriptionRow(row.key, 'unit', e.target.value)} />
                  <InputNumber value={row.unitPrice} placeholder="单价" style={{ width: 80 }} prefix="¥"
                    onChange={(v) => updatePrescriptionRow(row.key, 'unitPrice', v || 0)} />
                  <InputNumber value={row.quantity} placeholder="数" style={{ width: 55 }} min={1}
                    onChange={(v) => updatePrescriptionRow(row.key, 'quantity', v || 1)} />
                  <span style={{ fontWeight: 'bold', minWidth: 55 }}>¥{row.amount.toFixed(2)}</span>
                  <Button type="text" danger size="small" icon={<DeleteOutlined />}
                    onClick={() => removePrescriptionRow(row.key)} />
                </div>
              ))}
              <div style={{ textAlign: 'right', fontSize: 18, fontWeight: 'bold', marginTop: 8 }}>
                费用合计: ¥{totalFee.toFixed(2)}
              </div>
            </Card>

            <Form form={visitForm} layout="vertical">
              <Form.Item name="notes" label="备注">
                <Input.TextArea rows={2} placeholder="备注信息..." />
              </Form.Item>
            </Form>

            <Card size="small" title="附件 / 化验单" style={{ marginTop: 16 }}>
              <Upload.Dragger
                multiple
                accept="image/*,.pdf"
                showUploadList={false}
                disabled={uploadingFiles}
                beforeUpload={(file) => onFileSelected(file)}
              >
                <PlusOutlined />
                <div>拖入图片或 PDF</div>
              </Upload.Dragger>
              {visitAttachments.length > 0 && (
                <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {visitAttachments.map((a: any) => (
                    <div key={a.id} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 4, maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {a.title || a.file_name}
                      </div>
                      <div style={{ position: 'relative' }}>
                        <Image
                          src={fileUrl(a.thumbnail_path)}
                          width={80} height={80}
                          style={{ objectFit: 'cover', borderRadius: 4, border: '1px solid #f0f0f0' }}
                          preview={{ src: fileUrl(a.original_path) }}
                          fallback="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjgwIiBmaWxsPSIjZjBmMGYwIi8+PHRleHQgeD0iNDAiIHk9IjQwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSIgZmlsbD0iIzk5OSIgZm9udC1zaXplPSIxMCI+5Zu+54mHPC90ZXh0Pjwvc3ZnPg=="
                        />
                        <Button type="text" danger size="small" icon={<DeleteOutlined />}
                          style={{ position: 'absolute', top: 0, right: 0, background: 'rgba(255,255,255,0.8)' }}
                          onClick={(e) => { e.stopPropagation(); handleDeleteAttachment(a.id) }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}
      </Drawer>

      <Modal
        title="新建回访提醒"
        open={reminderOpen}
        onOk={handleReminderOk}
        onCancel={() => setReminderOpen(false)}
        width={500}
      >
        <Form form={reminderForm} layout="vertical">
          <Form.Item name="owner_id" hidden rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="pet_id" hidden rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          {visitAppt && (
            <div style={{ marginBottom: 16, padding: 8, background: '#f5f5f5', borderRadius: 4 }}>
              客户: <strong>{ownerMap[visitAppt.owner_id] || '#' + visitAppt.owner_id}</strong> | 宠物: #{visitAppt.pet_id}
            </div>
          )}
          <Form.Item name="type" label="类型">
            <Select options={[
              { label: '疫苗到期', value: 'vaccination' },
              { label: '复诊', value: 'followup' },
              { label: '其他', value: 'custom' },
            ]} />
          </Form.Item>
          <Form.Item name="title" label="标题" rules={[{ required: true }]}>
            <Input placeholder="术后7天复诊 / 狂犬疫苗到期" />
          </Form.Item>
          <Form.Item name="days" label="天数" rules={[{ required: true }]}>
            <InputNumber min={1} max={3650} addonAfter="天后" style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="附件标题（可选）"
        open={titleModalOpen}
        onOk={() => {
          if (titleModalFile) handleFileDrop(titleModalFile, titleModalTitle)
          setTitleModalOpen(false)
        }}
        onCancel={() => setTitleModalOpen(false)}
        okText="确认上传"
      >
        <Input
          value={titleModalTitle}
          onChange={(e) => setTitleModalTitle(e.target.value)}
          placeholder="输入标题或留空使用文件名"
          autoFocus
        />
        {titleModalFile && (
          <div style={{ marginTop: 8, color: '#888', fontSize: 12 }}>
            文件: {titleModalFile.name}
          </div>
        )}
      </Modal>
    </div>
  )
}
