import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Card, Table, Button, Descriptions, message, Tag, Row, Col,
  Modal, Form, Input, Select, AutoComplete, InputNumber, Space, Popconfirm, Drawer, Image, DatePicker,
} from 'antd'
import { PlusOutlined, FileTextOutlined } from '@ant-design/icons'
import { useStore } from '../store'
import dayjs from 'dayjs'

export default function OwnerDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { currentOwner, setCurrentOwner, setCurrentPet, currentPet } = useStore()
  const [pets, setPets] = useState<any[]>([])
  const [bills, setBills] = useState<any[]>([])
  const [reminders, setReminders] = useState<any[]>([])
  const [owners, setOwners] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [petModalOpen, setPetModalOpen] = useState(false)
  const [editingPet, setEditingPet] = useState<any>(null)
  const [petDetail, setPetDetail] = useState<any>(null)
  const [petRecords, setPetRecords] = useState<any[]>([])
  const [petVaccines, setPetVaccines] = useState<any[]>([])
  const [recordAttachments, setRecordAttachments] = useState<Record<number, any[]>>({})
  const [expandedRecords, setExpandedRecords] = useState<Set<number>>(new Set())
  const [apptModalOpen, setApptModalOpen] = useState(false)
  const [reminderOpen, setReminderOpen] = useState(false)
  const [petForm] = Form.useForm()
  const [apptForm] = Form.useForm()
  const [reminderForm] = Form.useForm()

  const load = async () => {
    if (!window.api || !id) return
    setLoading(true)
    try {
      const ownerId = Number(id)
      if (!currentOwner || currentOwner.id !== ownerId) {
        const o = await window.api!.owners.get(ownerId)
        if (o) setCurrentOwner(o)
      }
      const allOwners = await window.api!.owners.all()
      setOwners(allOwners || [])
      const [p, b, r] = await Promise.all([
        window.api!.pets.byOwner(ownerId),
        window.api!.bills.byOwner(ownerId),
        window.api!.reminders.byOwner(ownerId),
      ])
      setPets(p || [])
      setBills(b || [])
      setReminders(r || [])
    } catch (e: any) {
      console.error('OwnerDetail load error:', e)
      message.error('加载失败: ' + (e.message || String(e)))
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  const openPetCreate = () => {
    setEditingPet(null)
    petForm.resetFields()
    petForm.setFieldsValue({ gender: 'unknown', owner_id: Number(id) })
    setPetModalOpen(true)
  }

  const openPetEdit = (pet: any) => {
    setEditingPet(pet)
    petForm.setFieldsValue(pet)
    setPetModalOpen(true)
  }

  const handlePetOk = async () => {
    const values = await petForm.validateFields()
    if (!window.api) return
    try {
      if (editingPet) {
        await window.api.pets.update(editingPet.id, values)
        message.success('宠物已更新')
      } else {
        await window.api.pets.create(values)
        message.success('宠物已添加')
      }
      setPetModalOpen(false)
      load()
    } catch (e: any) { message.error('操作失败') }
  }

  const handlePetDelete = async (petId: number) => {
    if (!window.api) return
    await window.api.pets.delete(petId)
    message.success('已删除')
    load()
  }

  const openPetDetail = async (pet: any) => {
    setCurrentPet(pet)
    setPetDetail(pet)
    setExpandedRecords(new Set())
    setRecordAttachments({})
    if (window.api) {
      const [recs, vacs] = await Promise.all([
        window.api.records.byPet(pet.id),
        window.api.vaccines.byPet(pet.id),
      ])
      setPetRecords(recs || [])
      setPetVaccines(vacs || [])
      // Load attachments for all records
      const attMap: Record<number, any[]> = {}
      for (const r of (recs || [])) {
        attMap[r.id] = await window.api.attachments.byRecord(r.id) || []
      }
      setRecordAttachments(attMap)
    }
  }

  const openNewAppointment = () => {
    apptForm.resetFields()
    apptForm.setFieldsValue({
      owner_id: currentOwner?.id,
      pet_id: petDetail?.id,
      scheduled_time: dayjs(),
      type: 'treatment',
    })
    setApptModalOpen(true)
  }

  const handleApptOk = async () => {
    const values = await apptForm.validateFields()
    if (!window.api) return
    try {
      await window.api.appointments.create({
        ...values,
        scheduled_time: values.scheduled_time.format('YYYY-MM-DD HH:mm'),
      })
      message.success('预约已创建')
      setApptModalOpen(false)
    } catch (e: any) { message.error('操作失败: ' + e.message) }
  }

  const openNewReminder = () => {
    reminderForm.resetFields()
    reminderForm.setFieldsValue({
      owner_id: currentOwner?.id,
      days: 30,
      type: 'followup',
    })
    setReminderOpen(true)
  }

  const handleReminderOk = async () => {
    const values = await reminderForm.validateFields()
    if (!window.api) return
    try {
      await window.api.reminders.create({
        ...values,
        due_date: dayjs().add(values.days, 'day').format('YYYY-MM-DD'),
      })
      message.success('提醒已创建')
      setReminderOpen(false)
      load()
    } catch (e: any) { message.error('创建失败: ' + e.message) }
  }

  const goFullRecords = () => {
    setCurrentPet(petDetail)
    navigate(`/records/${petDetail.id}`)
  }

  const toggleRecordExpand = (recordId: number) => {
    setExpandedRecords(prev => {
      const next = new Set(prev)
      if (next.has(recordId)) next.delete(recordId)
      else next.add(recordId)
      return next
    })
  }

  const fileUrl = (path: string) => {
    if (!path) return ''
    return `file://${path}`
  }

  return (
    <div>
      <Button onClick={() => navigate('/owners')} style={{ marginBottom: 16 }}>返回客户列表</Button>

      {currentOwner && (
        <Card style={{ marginBottom: 16 }}>
          <Descriptions title="客户信息" bordered size="small" column={3}>
            <Descriptions.Item label="姓名">{currentOwner.name}</Descriptions.Item>
            <Descriptions.Item label="电话">{currentOwner.phone}</Descriptions.Item>
            <Descriptions.Item label="地址">{currentOwner.address}</Descriptions.Item>
          </Descriptions>
        </Card>
      )}

      {/* Pet Management */}
      <Card
        title="宠物档案"
        extra={<Button type="primary" size="small" icon={<PlusOutlined />} onClick={openPetCreate}>添加宠物</Button>}
        style={{ marginBottom: 16 }}
      >
        <Table
          rowKey="id" dataSource={pets} loading={loading} pagination={false}
          onRow={(record) => ({
            style: { cursor: 'pointer' },
            onClick: () => openPetDetail(record),
          })}
          columns={[
            { title: '名称', dataIndex: 'name', render: (v: string) => v || '-' },
            { title: '种类', dataIndex: 'species' },
            { title: '品种', dataIndex: 'breed' },
            { title: '性别', dataIndex: 'gender', render: (g: string) => {
              const map: any = { male: '公', female: '母', unknown: '未知' }
              return <Tag>{map[g] || g}</Tag>
            }},
            { title: '体重(kg)', dataIndex: 'weight_kg' },
            { title: '年龄', dataIndex: 'age', render: (v: string) => v || '-' },
            { title: '备注', dataIndex: 'notes', ellipsis: true },
            {
              title: '操作', render: (_: any, r: any) => (
                <Space>
                  <Button size="small" onClick={(e) => { e.stopPropagation(); openPetEdit(r) }}>编辑</Button>
                  <Popconfirm title="确定删除?" onConfirm={() => handlePetDelete(r.id)}>
                    <Button size="small" danger onClick={(e) => e.stopPropagation()}>删除</Button>
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
        />
      </Card>

      <Row gutter={16}>
        <Col span={12}>
          <Card title="账单记录">
            <Table
              rowKey="id" dataSource={bills} loading={loading} pagination={false}
              columns={[
                { title: 'ID', dataIndex: 'id', width: 50 },
                { title: '总额', dataIndex: 'total_amount', render: (v: number) => `¥${v?.toFixed(2)}` },
                { title: '已付', dataIndex: 'paid_amount', render: (v: number) => `¥${v?.toFixed(2)}` },
                { title: '状态', dataIndex: 'status', render: (s: string) => (
                  <Tag color={s === 'paid' ? 'green' : s === 'partial' ? 'orange' : 'red'}>{s}</Tag>
                )},
              ]}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="回访提醒" extra={<Button size="small" icon={<PlusOutlined />} onClick={openNewReminder}>新建</Button>}>
            <Table
              rowKey="id" dataSource={reminders} loading={loading} pagination={false}
              columns={[
                { title: '标题', dataIndex: 'title' },
                { title: '到期日', dataIndex: 'due_date' },
                { title: '状态', dataIndex: 'status', render: (s: string) => {
                  const labels: any = { pending: '待处理', completed: '已完成', dismissed: '已忽略' }
                  const colors: any = { pending: 'orange', completed: 'green', dismissed: 'default' }
                  return <Tag color={colors[s]}>{labels[s] || s}</Tag>
                }},
                {
                  title: '操作', render: (_: any, r: any) => (
                    <Space>
                      {r.status === 'pending' && (
                        <>
                          <Button size="small" type="primary" onClick={async () => {
                            if (!window.api) return
                            await window.api.reminders.update(r.id, { status: 'completed' })
                            load()
                          }}>完成</Button>
                          <Button size="small" danger onClick={async () => {
                            if (!window.api) return
                            await window.api.reminders.update(r.id, { status: 'dismissed' })
                            load()
                          }}>忽略</Button>
                        </>
                      )}
                    </Space>
                  ),
                },
              ]}
            />
          </Card>
        </Col>
      </Row>

      {/* Pet Modal */}
      <Modal
        title={editingPet ? '编辑宠物' : '添加宠物'}
        open={petModalOpen}
        onOk={handlePetOk}
        onCancel={() => setPetModalOpen(false)}
      >
        <Form form={petForm} layout="vertical">
          <Form.Item name="owner_id" label="主人" rules={[{ required: true }]}>
            <Select options={owners.map((o: any) => ({ label: o.name, value: o.id }))} />
          </Form.Item>
          <Form.Item name="name" label="名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="species" label="种类" rules={[{ required: true }]}>
            <AutoComplete
              placeholder="选择或输入种类"
              options={[
                { label: '狗', value: '狗' },
                { label: '猫', value: '猫' },
              ]}
            />
          </Form.Item>
          <Form.Item name="breed" label="品种">
            <Input placeholder="金毛 / 英短 / ..." />
          </Form.Item>
          <Form.Item name="gender" label="性别">
            <Select options={[
              { label: '公', value: 'male' },
              { label: '母', value: 'female' },
              { label: '未知', value: 'unknown' },
            ]} />
          </Form.Item>
          <Form.Item name="age" label="年龄">
            <Input placeholder="3岁 / 6个月 / 2岁半" />
          </Form.Item>
          <Form.Item name="weight_kg" label="体重(kg)">
            <InputNumber min={0} step={0.1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="notes" label="备注">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Pet Detail Drawer */}
      <Drawer
        title={`${petDetail?.name || ''} — 详情`}
        placement="right"
        width={640}
        open={!!petDetail}
        onClose={() => { setPetDetail(null); setPetRecords([]); setPetVaccines([]); setRecordAttachments({}); setExpandedRecords(new Set()) }}
      >
        {petDetail && (
          <div>
            <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="种类">{petDetail.species}</Descriptions.Item>
              <Descriptions.Item label="品种">{petDetail.breed}</Descriptions.Item>
              <Descriptions.Item label="性别">{petDetail.gender === 'male' ? '公' : petDetail.gender === 'female' ? '母' : '未知'}</Descriptions.Item>
              <Descriptions.Item label="体重">{petDetail.weight_kg} kg</Descriptions.Item>
              <Descriptions.Item label="年龄" span={2}>{petDetail.age || '-'}</Descriptions.Item>
              <Descriptions.Item label="备注" span={2}>{petDetail.notes || '-'}</Descriptions.Item>
            </Descriptions>

            <Card
              title="诊疗历史"
              size="small"
              style={{ marginBottom: 16 }}
              extra={
                <Space>
                  <Button size="small" type="primary" onClick={openNewAppointment}>新建预约</Button>
                  <Button size="small" icon={<FileTextOutlined />} onClick={goFullRecords}>完整病历</Button>
                </Space>
              }
            >
              {petRecords.length === 0 ? (
                <div style={{ color: '#999', textAlign: 'center', padding: 20 }}>暂无诊疗记录</div>
              ) : (
                <div>
                  {petRecords.map((r: any) => {
                    const isExpanded = expandedRecords.has(r.id)
                    const atts = recordAttachments[r.id] || []
                    let prescriptionList: any[] = []
                    try { prescriptionList = JSON.parse(r.prescription || '[]') } catch {}
                    return (
                      <Card
                        key={r.id}
                        size="small"
                        style={{ marginBottom: 8 }}
                        title={
                          <span style={{ fontSize: 13, fontWeight: 'normal' }}>
                            <strong>{(function(v: any) {
                              if (!v) return '-'
                              const d = new Date(typeof v === 'number' ? v : v)
                              return isNaN(d.getTime()) ? '-' : d.toLocaleString('zh-CN')
                            })(r.created_at)}</strong>
                            <Tag style={{ marginLeft: 8 }} color="blue">¥{r.total_fee?.toFixed(2)}</Tag>
                          </span>
                        }
                        extra={<Button type="link" size="small" onClick={() => toggleRecordExpand(r.id)}>{isExpanded ? '收起' : '展开'}</Button>}
                      >
                        <div style={{ marginBottom: 4 }}>
                          <span style={{ color: '#666' }}>诊断：</span>
                          <span>{r.diagnosis || '未填写'}</span>
                        </div>
                        <div>
                          <span style={{ color: '#666' }}>处方：</span>
                          <span>{prescriptionList.length > 0 ? prescriptionList.map((p: any) => `${p.medicineName} x${p.quantity}`).join(' | ') : '无'}</span>
                        </div>

                        {isExpanded && (
                          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f0f0f0' }}>
                            {prescriptionList.length > 0 && (
                              <div style={{ marginBottom: 12 }}>
                                <div style={{ fontWeight: 'bold', marginBottom: 4, fontSize: 12 }}>处方明细</div>
                                <Table
                                  size="small" pagination={false}
                                  dataSource={prescriptionList} rowKey={(_, i) => String(i)}
                                  columns={[
                                    { title: '药品', dataIndex: 'medicineName' },
                                    { title: '规格', dataIndex: 'specification' },
                                    { title: '数量', dataIndex: 'quantity' },
                                    { title: '单价', dataIndex: 'unitPrice', render: (v: number) => `¥${v?.toFixed(2)}` },
                                    { title: '金额', dataIndex: 'amount', render: (v: number) => `¥${v?.toFixed(2)}` },
                                  ]}
                                />
                              </div>
                            )}

                            {r.notes && (
                              <div style={{ marginBottom: 12 }}>
                                <div style={{ fontWeight: 'bold', marginBottom: 4, fontSize: 12 }}>备注</div>
                                <div style={{ color: '#666', fontSize: 12 }}>{r.notes}</div>
                              </div>
                            )}

                            {atts.length > 0 && (
                              <div>
                                <div style={{ fontWeight: 'bold', marginBottom: 4, fontSize: 12 }}>
                                  附件 / 化验单 ({atts.length})
                                </div>
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                  {atts.map((a: any) => (
                                    <div key={a.id} style={{ textAlign: 'center' }}>
                                      <div style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 4, maxWidth: 70, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {a.title || a.file_name}
                                      </div>
                                      <Image
                                        src={fileUrl(a.thumbnail_path)}
                                        width={70} height={70}
                                        style={{ objectFit: 'cover', borderRadius: 4, border: '1px solid #f0f0f0' }}
                                        preview={{ src: fileUrl(a.original_path) }}
                                        fallback="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNzAiIGhlaWdodD0iNzAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjcwIiBoZWlnaHQ9IjcwIiBmaWxsPSIjZjBmMGYwIi8+PHRleHQgeD0iMzUiIHk9IjM1IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSIgZmlsbD0iIzk5OSIgZm9udC1zaXplPSIxMCI+5Zu+54mHPC90ZXh0Pjwvc3ZnPg=="
                                      />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </Card>
                    )
                  })}
                </div>
              )}
            </Card>

            <Card title="疫苗接种" size="small">
              {petVaccines.length === 0 ? (
                <div style={{ color: '#999', textAlign: 'center', padding: 20 }}>暂无疫苗记录</div>
              ) : (
                <Table
                  rowKey="id" dataSource={petVaccines} pagination={false} size="small"
                  columns={[
                    { title: '疫苗', dataIndex: 'vaccine_name' },
                    { title: '接种日期', dataIndex: 'administered_date' },
                    { title: '下次到期', dataIndex: 'next_due_date' },
                    { title: '批号', dataIndex: 'batch_number' },
                  ]}
                />
              )}
            </Card>
          </div>
        )}
      </Drawer>

      {/* New Appointment Modal (inline) */}
      <Modal
        title="新建预约"
        open={apptModalOpen}
        onOk={handleApptOk}
        onCancel={() => setApptModalOpen(false)}
        width={500}
      >
        <Form form={apptForm} layout="vertical">
          <Form.Item name="owner_id" label="客户" hidden rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="pet_id" label="宠物" hidden rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          {currentOwner && petDetail && (
            <div style={{ marginBottom: 16, padding: 8, background: '#f5f5f5', borderRadius: 4 }}>
              客户: <strong>{currentOwner.name}</strong> | 宠物: <strong>{petDetail.name}</strong>
            </div>
          )}
          <Form.Item name="type" label="类型" rules={[{ required: true }]}>
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

      {/* New Reminder Modal */}
      <Modal title="新建提醒" open={reminderOpen} onOk={handleReminderOk} onCancel={() => setReminderOpen(false)} width={500}>
        <Form form={reminderForm} layout="vertical">
          <Form.Item name="owner_id" label="客户" hidden rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          {currentOwner && (
            <div style={{ marginBottom: 16, padding: 8, background: '#f5f5f5', borderRadius: 4 }}>
              客户: <strong>{currentOwner.name}</strong> ({currentOwner.phone})
            </div>
          )}
          <Form.Item name="pet_id" label="宠物" rules={[{ required: true }]}>
            <Select placeholder="选择宠物" options={pets.map((p: any) => ({ label: `${p.name} (${p.species})`, value: p.id }))} />
          </Form.Item>
          <Form.Item name="type" label="类型">
            <Select options={[
              { label: '疫苗到期', value: 'vaccination' },
              { label: '复诊', value: 'followup' },
              { label: '其他', value: 'custom' },
            ]} />
          </Form.Item>
          <Form.Item name="title" label="标题" rules={[{ required: true }]}>
            <Input placeholder="狂犬疫苗到期 / 术后7天复诊" />
          </Form.Item>
          <Form.Item name="days" label="天数" rules={[{ required: true }]}>
            <InputNumber min={1} max={3650} addonAfter="天后" style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
