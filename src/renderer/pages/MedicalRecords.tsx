import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Table, Button, Modal, Form, Input, Select, InputNumber, Space, Drawer, message,
  Card, Upload, Image, AutoComplete, Empty, Popconfirm,
} from 'antd'
import { PlusOutlined, DeleteOutlined, ClearOutlined } from '@ant-design/icons'
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
      const canvas = document.createElement('canvas')
      const scale = Math.min(maxSize / img.width, maxSize / img.height, 1)
      canvas.width = img.width * scale
      canvas.height = img.height * scale
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
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

export default function MedicalRecords() {
  const { petId } = useParams()
  const navigate = useNavigate()
  const [pets, setPets] = useState<any[]>([])
  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [drawerRecord, setDrawerRecord] = useState<any>(null)
  const [attachments, setAttachments] = useState<any[]>([])
  const [uploadingFiles, setUploadingFiles] = useState(false)
  const [titleModalOpen, setTitleModalOpen] = useState(false)
  const [titleModalFile, setTitleModalFile] = useState<File | null>(null)
  const [titleModalTitle, setTitleModalTitle] = useState('')
  const [form] = Form.useForm()
  const [prescriptionRows, setPrescriptionRows] = useState<PrescriptionRow[]>([])
  const [medicineOptions, setMedicineOptions] = useState<{ label: string; value: string; spec: string; unit: string; price: number }[]>([])

  const loadPets = async () => {
    if (!window.api) return
    const allOwners = await window.api.owners.all()
    const allPets: any[] = []
    for (const o of (allOwners || [])) {
      const p = await window.api.pets.byOwner(o.id)
      allPets.push(...(p || []).map((p: any) => ({ ...p, ownerName: o.name })))
    }
    setPets(allPets)
  }

  const loadRecords = async (pid?: number) => {
    if (!window.api) return
    setLoading(true)
    const id = pid || (petId ? Number(petId) : undefined)
    if (id) {
      const recs = await window.api.records.byPet(id)
      setRecords(recs || [])
    }
    setLoading(false)
  }

  useEffect(() => { loadPets() }, [])
  useEffect(() => { loadRecords() }, [petId])

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

  const openCreate = async () => {
    await loadMedicineOptions()
    form.resetFields()

    if (petId) {
      form.setFieldsValue({ pet_id: Number(petId) })
    }

    if (window.api && petId) {
      const last = await window.api.records.lastByPet(Number(petId))
      if (last) {
        form.setFieldsValue({ diagnosis: last.diagnosis })
        try {
          const parsed = JSON.parse(last.prescription || '[]')
          if (Array.isArray(parsed) && parsed.length > 0) {
            const rows: PrescriptionRow[] = parsed.map((p: any, i: number) => ({
              key: String(i),
              medicineName: p.medicineName || '',
              specification: p.specification || '',
              unit: p.unit || '',
              unitPrice: p.unitPrice || 0,
              quantity: p.quantity || 1,
              amount: (p.unitPrice || 0) * (p.quantity || 1),
            }))
            setPrescriptionRows(rows)
          }
        } catch { setPrescriptionRows([]) }
      } else {
        setPrescriptionRows([])
      }
    } else {
      setPrescriptionRows([])
    }

    setModalOpen(true)
  }

  const clearPrescription = () => {
    form.setFieldsValue({ diagnosis: '' })
    setPrescriptionRows([])
  }

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
        updated.amount = (field === 'unitPrice' ? value : updated.unitPrice) * (field === 'quantity' ? value : updated.quantity)
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

  const handleOk = async () => {
    const values = await form.validateFields()
    if (!window.api) return

    try {
      const prescriptionJson = JSON.stringify(prescriptionRows.filter(r => r.medicineName))
      const record = await window.api.records.create({
        pet_id: values.pet_id,
        appointment_id: values.appointment_id || 0,
        diagnosis: values.diagnosis || '',
        prescription: prescriptionJson,
        notes: values.notes || '',
        total_fee: totalFee,
      })

      for (const row of prescriptionRows) {
        if (!row.medicineName) continue
        const meds = await window.api.medicines.search(row.medicineName)
        const med = (meds as any[])?.find((m: any) => m.name === row.medicineName)
        if (med && !med.is_service) {
          const newQty = Math.max(0, med.stock_quantity - row.quantity)
          await window.api.medicines.update(med.id, { stock_quantity: newQty })
        }
        await window.api.inventoryLogs.create({
          medicine_id: med ? med.id : 0,
          change_type: 'dispense',
          quantity: -row.quantity,
          related_id: record.id,
          note: `开${med?.is_service ? '服务' : '药'}: ${row.medicineName} x${row.quantity}`,
        })
      }

      message.success('诊疗记录已创建')
      setModalOpen(false)
      loadRecords(values.pet_id)
    } catch (e: any) { message.error('操作失败: ' + e.message) }
  }

  const loadAttachments = async (recordId: number) => {
    if (!window.api) return
    const atts = await window.api.attachments.byRecord(recordId)
    setAttachments(atts || [])
  }

  const openDetail = async (record: any) => {
    setDrawerRecord(record)
    loadAttachments(record.id)
  }

  const handleFileDrop = async (file: File, title?: string) => {
    if (!window.api || !drawerRecord) return
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
            recordId: drawerRecord.id,
            fileName: pageFileName,
            title: thumbs.length > 1 ? `${finalTitle} (第${pageNum}页)` : finalTitle,
            mimeType: 'image/jpeg',
            originalBuffer: Array.from(new Uint8Array(thumbs[i])),
            thumbnailBuffer: Array.from(new Uint8Array(thumbs[i])),
          })
        }
        loadAttachments(drawerRecord.id)
        setUploadingFiles(false)
        return
      } else {
        message.warning('不支持的文件类型，仅支持图片和 PDF')
        setUploadingFiles(false)
        return
      }

      await window.api.attachments.saveFile({
        recordId: drawerRecord.id,
        fileName,
        title: finalTitle,
        mimeType: file.type,
        originalBuffer: Array.from(new Uint8Array(arrayBuffer)),
        thumbnailBuffer: Array.from(new Uint8Array(thumbnailBuffer)),
      })
      message.success(`${fileName} 已上传`)
      loadAttachments(drawerRecord.id)
    } catch (e: any) {
      message.error('文件上传失败: ' + e.message)
    }
    setUploadingFiles(false)
  }

  const onFileSelected = (file: File) => {
    setTitleModalFile(file)
    setTitleModalTitle(file.name.replace(/\.[^.]+$/, ''))
    setTitleModalOpen(true)
    return false
  }

  const handleDeleteAttachment = async (id: number) => {
    if (!window.api) return
    try {
      await window.api.attachments.deleteFile(id)
      message.success('附件已删除')
      if (drawerRecord) loadAttachments(drawerRecord.id)
    } catch (e: any) {
      message.error('删除失败')
    }
  }

  const fileUrl = (path: string) => {
    if (!path) return ''
    return `file://${path}`
  }

  const petMap: Record<number, string> = {}
  pets.forEach(p => { petMap[p.id] = `${p.name} (${p.ownerName})` })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2>诊疗记录</h2>
        <Space>
          <Select
            showSearch
            placeholder="选择宠物"
            value={petId ? Number(petId) : undefined}
            onChange={(v) => navigate(`/records/${v}`)}
            style={{ width: 240 }}
            filterOption={(i, o) => (o?.label as string || '').includes(i)}
            options={pets.map((p: any) => ({ label: `${p.name} (${p.ownerName})`, value: p.id }))}
            allowClear
            onClear={() => navigate('/records')}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} disabled={!petId}>
            新建记录
          </Button>
        </Space>
      </div>
      <Table
        rowKey="id" dataSource={records}
        onRow={(record) => ({
          style: { cursor: 'pointer' },
          onClick: () => openDetail(record),
        })}
        columns={[
          { title: '日期', dataIndex: 'created_at', render: (v: any) => {
            if (!v) return '-'
            const d = new Date(typeof v === 'number' ? v : v)
            return isNaN(d.getTime()) ? '-' : d.toLocaleString('zh-CN')
          }},
          { title: '诊断', dataIndex: 'diagnosis', render: (v: string) => v || '-' },
          { title: '处方', dataIndex: 'prescription', ellipsis: true, render: (v: string) => {
            try { return JSON.parse(v).map((r: any) => r.medicineName).join(', ') || '-' }
            catch { return v || '-' }
          }},
          { title: '费用', dataIndex: 'total_fee', render: (v: number) => `¥${v?.toFixed(2)}` },
        ]}
        loading={loading}
      />

      {/* Create / Edit Modal */}
      <Modal
        title="诊疗记录"
        open={modalOpen}
        onOk={handleOk}
        onCancel={() => setModalOpen(false)}
        width={800}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="pet_id" label="宠物" rules={[{ required: true }]}>
            <Select
              showSearch
              filterOption={(i, o) => (o?.label as string || '').includes(i)}
              options={pets.map((p: any) => ({ label: `${p.name} (${p.ownerName})`, value: p.id }))}
            />
          </Form.Item>
          <Form.Item name="diagnosis" label="诊断">
            <Input.TextArea rows={2} />
          </Form.Item>

          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <strong>处方</strong>
              <Space>
                <Button icon={<ClearOutlined />} size="small" onClick={clearPrescription}>清空处方</Button>
                <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={addPrescriptionRow}>添加药品</Button>
              </Space>
            </div>
            {prescriptionRows.length === 0 && <Empty description="无药品（可从上次处方自动加载）" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
            {prescriptionRows.map((row) => (
              <Card key={row.key} size="small" style={{ marginBottom: 8 }}
                extra={<Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={() => removePrescriptionRow(row.key)} />}
              >
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <AutoComplete
                    style={{ width: 200 }}
                    value={row.medicineName}
                    placeholder="搜索药品或输入药名"
                    options={medicineOptions.map(m => ({ label: m.label, value: m.value }))}
                    onSelect={(v) => handleMedicineSelect(row.key, v)}
                    onChange={(v) => handleMedicineChange(row.key, v)}
                  />
                  <Input value={row.specification} placeholder="规格" style={{ width: 100 }}
                    onChange={(e) => updatePrescriptionRow(row.key, 'specification', e.target.value)} />
                  <Input value={row.unit} placeholder="单位" style={{ width: 60 }}
                    onChange={(e) => updatePrescriptionRow(row.key, 'unit', e.target.value)} />
                  <InputNumber value={row.unitPrice} placeholder="单价" style={{ width: 80 }} prefix="¥"
                    onChange={(v) => updatePrescriptionRow(row.key, 'unitPrice', v || 0)} />
                  <InputNumber value={row.quantity} placeholder="数量" style={{ width: 80 }} min={1}
                    onChange={(v) => updatePrescriptionRow(row.key, 'quantity', v || 1)} />
                  <span style={{ fontWeight: 'bold', minWidth: 60 }}>¥{row.amount.toFixed(2)}</span>
                </div>
              </Card>
            ))}
          </div>

          <div style={{ textAlign: 'right', marginBottom: 16, fontSize: 18, fontWeight: 'bold' }}>
            总计: ¥{totalFee.toFixed(2)}
          </div>

          <Form.Item name="notes" label="备注">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Detail Drawer */}
      <Drawer
        title="诊疗详情"
        placement="right"
        width={640}
        open={!!drawerRecord}
        onClose={() => { setDrawerRecord(null); setAttachments([]) }}
      >
        {drawerRecord && (
          <div>
            <Card title="诊断" size="small" style={{ marginBottom: 16 }}>
              {drawerRecord.diagnosis || '无'}
            </Card>
            <Card title="处方" size="small" style={{ marginBottom: 16 }}>
              {(() => {
                try {
                  const rows = JSON.parse(drawerRecord.prescription || '[]')
                  if (rows.length === 0) return '无'
                  return (
                    <Table size="small" pagination={false} dataSource={rows} rowKey={(_, i) => String(i)}
                      columns={[
                        { title: '药品', dataIndex: 'medicineName' },
                        { title: '规格', dataIndex: 'specification' },
                        { title: '数量', dataIndex: 'quantity' },
                        { title: '单位', dataIndex: 'unit' },
                        { title: '单价', dataIndex: 'unitPrice', render: (v: number) => `¥${v?.toFixed(2)}` },
                        { title: '金额', dataIndex: 'amount', render: (v: number) => `¥${v?.toFixed(2)}` },
                      ]}
                    />
                  )
                } catch { return drawerRecord.prescription || '无' }
              })()}
            </Card>
            <Card title="备注" size="small" style={{ marginBottom: 16 }}>
              {drawerRecord.notes || '无'}
            </Card>
            <Card title="费用" size="small" style={{ marginBottom: 16 }}>
              ¥{drawerRecord.total_fee?.toFixed(2)}
            </Card>
            <Card title="附件" size="small">
              <Upload.Dragger
                multiple
                accept="image/*,.pdf"
                showUploadList={false}
                disabled={uploadingFiles}
                beforeUpload={(file) => onFileSelected(file)}
              >
                <p className="ant-upload-drag-icon">
                  <PlusOutlined />
                </p>
                <p className="ant-upload-text">点击或拖入图片/PDF</p>
                <p className="ant-upload-hint">支持 JPG、PNG、PDF，可多文件上传</p>
              </Upload.Dragger>
              {attachments.length > 0 && (
                <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {attachments.map((a: any) => (
                    <div key={a.id} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 4, maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {a.title || a.file_name}
                      </div>
                      <div style={{ position: 'relative', width: 100, height: 100, borderRadius: 4, overflow: 'hidden', border: '1px solid #f0f0f0' }}>
                        <Image
                          src={fileUrl(a.thumbnail_path)}
                          width={100}
                          height={100}
                          style={{ objectFit: 'cover' }}
                          fallback="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2YwZjBmMCIvPjx0ZXh0IHg9IjUwIiB5PSI1MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iIGZpbGw9IiM5OTkiIGZvbnQtc2l6ZT0iMTIiPua3t+WxguaXpeecnzwvdGV4dD48L3N2Zz4="
                          preview={{ src: fileUrl(a.original_path) }}
                        />
                        <Popconfirm title="删除此附件?" onConfirm={() => handleDeleteAttachment(a.id)}>
                          <Button
                            type="text" danger size="small"
                            icon={<DeleteOutlined />}
                            style={{ position: 'absolute', top: 0, right: 0, background: 'rgba(255,255,255,0.8)' }}
                          />
                        </Popconfirm>
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
