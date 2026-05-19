import { useEffect, useState } from 'react'
import { Table, Button, Modal, Form, InputNumber, Tag, message, Card, Space, Drawer, Popconfirm, DatePicker, Empty, Image } from 'antd'
import { DollarOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'

export default function Bills() {
  const [bills, setBills] = useState<any[]>([])
  const [owners, setOwners] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [payOpen, setPayOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedBill, setSelectedBill] = useState<any>(null)
  const [billItems, setBillItems] = useState<any[]>([])
  const [selectedDate, setSelectedDate] = useState<string>(dayjs().format('YYYY-MM-DD'))
  const [visitOpen, setVisitOpen] = useState(false)
  const [visitAppt, setVisitAppt] = useState<any>(null)
  const [visitRecords, setVisitRecords] = useState<any[]>([])
  const [visitAttachments, setVisitAttachments] = useState<any[]>([])
  const [visitPet, setVisitPet] = useState<any>(null)
  const [visitOwner, setVisitOwner] = useState<any>(null)
  const [payForm] = Form.useForm()

  const load = async () => {
    if (!window.api) return
    setLoading(true)
    try {
      const allOwners = await window.api.owners.all()
      setOwners(allOwners || [])
      const allBills: any[] = []
      for (const o of (allOwners || [])) {
        const b = await window.api.bills.byOwner(o.id)
        allBills.push(...(b || []).map((b: any) => ({ ...b, ownerName: o.name })))
      }
      allBills.sort((a, b) => b.created_at - a.created_at)
      setBills(allBills)
    } catch (e: any) { message.error('加载失败') }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filteredBills = selectedDate
    ? bills.filter(b => {
        const d = new Date(typeof b.created_at === 'number' ? b.created_at : b.created_at)
        return dayjs(d).format('YYYY-MM-DD') === selectedDate
      })
    : bills

  // Group by date
  const groupedBills: Record<string, any[]> = {}
  for (const b of filteredBills) {
    const d = new Date(typeof b.created_at === 'number' ? b.created_at : b.created_at)
    const dateKey = dayjs(d).format('YYYY-MM-DD')
    if (!groupedBills[dateKey]) groupedBills[dateKey] = []
    groupedBills[dateKey].push(b)
  }

  const openDetail = async (bill: any) => {
    setSelectedBill(bill)
    if (window.api) {
      const items = await window.api.billItems.byBill(bill.id)
      setBillItems(items || [])
    }
    setDetailOpen(true)
  }

  const openPay = (bill: any) => {
    setSelectedBill(bill)
    payForm.resetFields()
    payForm.setFieldsValue({ amount: (bill.total_amount - bill.paid_amount).toFixed(2) })
    setPayOpen(true)
  }

  const handlePay = async () => {
    const values = await payForm.validateFields()
    if (!window.api || !selectedBill) return
    try {
      const newPaid = selectedBill.paid_amount + Number(values.amount)
      const newStatus = newPaid >= selectedBill.total_amount ? 'paid' : 'partial'
      await window.api.bills.update(selectedBill.id, { paid_amount: newPaid, status: newStatus })
      message.success(`已收款 ¥${Number(values.amount).toFixed(2)}`)
      setPayOpen(false)
      load()
    } catch (e: any) { message.error('操作失败') }
  }

  const handleCancel = async (bill: any) => {
    if (!window.api) return
    await window.api.bills.cancel(bill.id)
    message.success('已撤销，预约已取消')
    load()
  }

  const openVisit = async (bill: any) => {
    if (!window.api || !bill.appointment_id) return
    const appts = await window.api.appointments.all()
    const appt = (appts as any[])?.find((a: any) => a.id === bill.appointment_id)
    if (!appt) { message.warning('未找到关联预约'); return }
    setVisitAppt(appt)
    // Load pet and owner info
    const pet = await window.api.pets.get(appt.pet_id)
    setVisitPet(pet)
    if (pet) {
      const owner = await window.api.owners.get(pet.owner_id)
      setVisitOwner(owner)
    }
    const [recs] = await Promise.all([
      window.api.records.byPet(appt.pet_id),
    ])
    const linkedRecord = (recs as any[])?.find((r: any) => r.appointment_id === bill.appointment_id)
    setVisitRecords(linkedRecord ? [linkedRecord] : [])
    if (linkedRecord) {
      const linkedAtts = await window.api.attachments.byRecord(linkedRecord.id)
      setVisitAttachments(linkedAtts || [])
    } else {
      setVisitAttachments([])
    }
    setVisitOpen(true)
  }

  const fileUrl = (path: string) => path ? `file://${path}` : ''

  const statusColors: Record<string, string> = { unpaid: 'red', partial: 'orange', paid: 'green' }
  const statusLabels: Record<string, string> = { unpaid: '未付', partial: '部分付', paid: '已付清' }

  const itemTypeLabels: Record<string, string> = {
    consultation: '诊疗费', medicine: '药品', procedure: '处置费', other: '其他',
  }

  const dateKeys = Object.keys(groupedBills).sort().reverse()

  const daySum = (dateKey: string) =>
    groupedBills[dateKey].reduce((s, b) => s + b.total_amount, 0)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Space>
          <h2 style={{ margin: 0 }}>收费结算</h2>
          <DatePicker
            value={selectedDate ? dayjs(selectedDate) : null}
            onChange={(d) => setSelectedDate(d ? d.format('YYYY-MM-DD') : '')}
            allowClear
            placeholder="全部日期"
            style={{ width: 160 }}
          />
        </Space>
        <Button onClick={load}>刷新</Button>
      </div>

      {dateKeys.length === 0 ? (
        <Empty description="当天无账单" />
      ) : (
        dateKeys.map(dateKey => (
          <Card
            key={dateKey}
            size="small"
            title={
              <Space>
                <span>{dateKey}</span>
                <Tag>{groupedBills[dateKey].length} 笔</Tag>
                <span style={{ fontWeight: 'bold', color: '#e94560' }}>合计 ¥{daySum(dateKey).toFixed(2)}</span>
              </Space>
            }
            style={{ marginBottom: 16 }}
          >
            <Table
              rowKey="id" dataSource={groupedBills[dateKey]} pagination={false} size="small"
              onRow={(record) => ({
                style: { cursor: 'pointer' },
                onClick: () => openVisit(record),
              })}
              columns={[
                { title: 'ID', dataIndex: 'id', width: 50 },
                { title: '客户', dataIndex: 'ownerName' },
                { title: '总额', dataIndex: 'total_amount', render: (v: number) => `¥${v?.toFixed(2)}` },
                { title: '已付', dataIndex: 'paid_amount', render: (v: number) => `¥${v?.toFixed(2)}` },
                {
                  title: '欠款', render: (_: any, r: any) => (
                    <span style={{ color: r.status !== 'paid' ? 'red' : '#999', fontWeight: r.status !== 'paid' ? 'bold' : 'normal' }}>
                      ¥{(r.total_amount - r.paid_amount).toFixed(2)}
                    </span>
                  ),
                },
                { title: '状态', dataIndex: 'status', render: (s: string) => <Tag color={statusColors[s]}>{statusLabels[s]}</Tag> },
                {
                  title: '操作', render: (_: any, r: any) => (
                    <Space>
                      <Button size="small" onClick={(e) => { e.stopPropagation(); openDetail(r) }}>详情</Button>
                      {r.status !== 'paid' && (
                        <Button size="small" type="primary" icon={<DollarOutlined />} onClick={(e) => { e.stopPropagation(); openPay(r) }}>收款</Button>
                      )}
                      <Popconfirm title="确定撤销并取消预约?" onConfirm={() => handleCancel(r)}>
                        <Button size="small" danger onClick={(e) => e.stopPropagation()}>撤销</Button>
                      </Popconfirm>
                    </Space>
                  ),
                },
              ]}
            />
          </Card>
        ))
      )}

      <Drawer title="账单详情" open={detailOpen} onClose={() => setDetailOpen(false)} width={500}>
        {selectedBill && (
          <div>
            <Card size="small" style={{ marginBottom: 16 }}>
              <div>总金额: ¥{selectedBill.total_amount?.toFixed(2)}</div>
              <div>已付: ¥{selectedBill.paid_amount?.toFixed(2)}</div>
              <div style={{ fontWeight: 'bold', color: 'red' }}>待付: ¥{(selectedBill.total_amount - selectedBill.paid_amount).toFixed(2)}</div>
              <Tag color={statusColors[selectedBill.status]} style={{ marginTop: 4 }}>{statusLabels[selectedBill.status]}</Tag>
            </Card>
            <Table rowKey="id" dataSource={billItems} size="small" pagination={false}
              columns={[
                { title: '类型', dataIndex: 'item_type', render: (t: string) => itemTypeLabels[t] || t },
                { title: '描述', dataIndex: 'description' },
                { title: '数量', dataIndex: 'quantity' },
                { title: '单价', dataIndex: 'unit_price', render: (v: number) => v ? `¥${v.toFixed(2)}` : '-' },
                { title: '金额', dataIndex: 'amount', render: (v: number) => `¥${v?.toFixed(2)}` },
              ]} />
          </div>
        )}
      </Drawer>

      <Modal title="收款" open={payOpen} onOk={handlePay} onCancel={() => setPayOpen(false)}>
        {selectedBill && (
          <Card size="small" style={{ marginBottom: 16 }}>
            <div>总金额: ¥{selectedBill.total_amount?.toFixed(2)}</div>
            <div>已付: ¥{selectedBill.paid_amount?.toFixed(2)}</div>
            <div style={{ fontWeight: 'bold', color: 'red' }}>待付: ¥{(selectedBill.total_amount - selectedBill.paid_amount).toFixed(2)}</div>
          </Card>
        )}
        <Form form={payForm} layout="vertical">
          <Form.Item name="amount" label="收款金额" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={0} step={0.01} prefix="¥"
              max={selectedBill ? selectedBill.total_amount - selectedBill.paid_amount : 0} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Visit Summary Drawer */}
      <Drawer
        title={visitAppt ? `就诊 #${visitAppt.id}` : '就诊'}
        open={visitOpen}
        onClose={() => { setVisitOpen(false); setVisitAppt(null); setVisitPet(null); setVisitOwner(null) }}
        width={550}
      >
        {visitAppt && (
          <div>
            <Card size="small" style={{ marginBottom: 16 }}>
              <div>客户: <strong>{visitOwner?.name || '--'}</strong>
                {visitOwner?.phone && <span style={{ color: '#888', marginLeft: 8 }}>{visitOwner.phone}</span>}
              </div>
              <div>宠物: {visitPet?.name || `#${visitAppt.pet_id}`}
                {visitPet && <span style={{ color: '#888', marginLeft: 8 }}>{visitPet.species}{visitPet.breed ? ` / ${visitPet.breed}` : ''}</span>}
              </div>
            </Card>
            <Card size="small" style={{ marginBottom: 16 }}>
              <div>类型: <Tag>{{
                treatment: '治疗', grooming: '美容', bath: '洗澡', vaccination: '疫苗', other: '其他',
              }[visitAppt.type] || visitAppt.type}</Tag></div>
              <div>医生: {visitAppt.doctor_name} | 时间: {visitAppt.scheduled_time}</div>
              <div>状态: <Tag color={{
                scheduled: 'blue', in_progress: 'orange', completed: 'green', cancelled: 'default',
              }[visitAppt.status]}>{{
                scheduled: '待就诊', in_progress: '就诊中', completed: '已完成', cancelled: '已取消',
              }[visitAppt.status]}</Tag></div>
              {visitAppt.reason && <div style={{ marginTop: 4 }}>主诉: {visitAppt.reason}</div>}
            </Card>

            {visitRecords.length > 0 ? visitRecords.map((r: any) => (
              <div key={r.id}>
                <Card size="small" title="诊断" style={{ marginBottom: 16 }}>
                  {r.diagnosis || '无'}
                </Card>
                <Card size="small" title="处方" style={{ marginBottom: 16 }}>
                  {(() => {
                    try {
                      const rows = JSON.parse(r.prescription || '[]')
                      if (rows.length === 0) return '无'
                      return (
                        <Table size="small" pagination={false} dataSource={rows} rowKey={(_, i) => String(i)}
                          columns={[
                            { title: '药品', dataIndex: 'medicineName' },
                            { title: '数量', dataIndex: 'quantity' },
                            { title: '单价', dataIndex: 'unitPrice', render: (v: number) => `¥${v?.toFixed(2)}` },
                            { title: '金额', dataIndex: 'amount', render: (v: number) => `¥${v?.toFixed(2)}` },
                          ]} />
                      )
                    } catch { return r.prescription || '无' }
                  })()}
                </Card>
                {r.notes && (
                  <Card size="small" title="备注" style={{ marginBottom: 16 }}>{r.notes}</Card>
                )}
                <Card size="small" title={`费用 ¥${r.total_fee?.toFixed(2)}`} style={{ marginBottom: 16 }} />
              </div>
            )) : (
              <Empty description="暂无诊疗记录" />
            )}

            {visitAttachments.length > 0 && (
              <Card size="small" title={`附件 (${visitAttachments.length})`} style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {visitAttachments.map((a: any) => (
                    <div key={a.id} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 4, maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {a.title || a.file_name}
                      </div>
                      <Image src={fileUrl(a.thumbnail_path)} width={80} height={80}
                        style={{ objectFit: 'cover', borderRadius: 4 }}
                        preview={{ src: fileUrl(a.original_path) }}
                        fallback="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjgwIiBmaWxsPSIjZjBmMGYwIi8+PHRleHQgeD0iNDAiIHk9IjQwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSIgZmlsbD0iIzk5OSIgZm9udC1zaXplPSIxMCI+5Zu+54mHPC90ZXh0Pjwvc3ZnPg=="
                      />
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}
      </Drawer>
    </div>
  )
}
