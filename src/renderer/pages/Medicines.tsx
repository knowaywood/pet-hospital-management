import { useEffect, useState } from 'react'
import { Table, Button, Modal, Form, Input, InputNumber, Space, Popconfirm, message, Tag, Drawer, Switch, Card, Descriptions } from 'antd'
import { PlusOutlined } from '@ant-design/icons'

export default function Medicines() {
  const [list, setList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [purchaseOpen, setPurchaseOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [selectedMedicine, setSelectedMedicine] = useState<any>(null)
  const [logsDrawer, setLogsDrawer] = useState(false)
  const [logs, setLogs] = useState<any[]>([])
  const [traceOpen, setTraceOpen] = useState(false)
  const [traceData, setTraceData] = useState<any>(null)
  const [form] = Form.useForm()
  const [purchaseForm] = Form.useForm()

  const load = async () => {
    if (!window.api) return
    setLoading(true)
    try {
      const result = await window.api.medicines.all()
      setList(result || [])
    } catch (e: any) { message.error('加载失败') }
    setLoading(false)
  }

  const loadLogs = async (medicineId: number) => {
    if (!window.api) return
    const result = await window.api.inventoryLogs.byMedicine(medicineId)
    setLogs(result || [])
    setLogsDrawer(true)
  }

  useEffect(() => { load() }, [])

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ unit: '片', stock_quantity: 0, price_per_unit: 0, min_stock_alert: 10, is_service: false })
    setModalOpen(true)
  }

  const openEdit = (record: any) => {
    setEditing(record)
    form.setFieldsValue(record)
    setModalOpen(true)
  }

  const openPurchase = (record: any) => {
    setSelectedMedicine(record)
    purchaseForm.resetFields()
    purchaseForm.setFieldsValue({ quantity: 1, purchase_price: record.price_per_unit })
    setPurchaseOpen(true)
  }

  const handleOk = async () => {
    const values = await form.validateFields()
    const data = { ...values, is_service: values.is_service ? 1 : 0 }
    if (!window.api) return
    try {
      if (editing) {
        await window.api.medicines.update(editing.id, data)
        message.success('已更新')
      } else {
        await window.api.medicines.create(data)
        message.success('已添加')
      }
      setModalOpen(false)
      load()
    } catch (e: any) { message.error('操作失败') }
  }

  const handlePurchase = async () => {
    const values = await purchaseForm.validateFields()
    if (!window.api || !selectedMedicine) return
    try {
      const newQty = selectedMedicine.stock_quantity + values.quantity
      await window.api.medicines.update(selectedMedicine.id, { stock_quantity: newQty })
      await window.api.inventoryLogs.create({
        medicine_id: selectedMedicine.id,
        change_type: 'purchase',
        quantity: values.quantity,
        batch_number: values.batch_number || '',
        purchase_price: values.purchase_price || 0,
        note: values.note || '',
      })
      message.success('入库成功')
      setPurchaseOpen(false)
      load()
    } catch (e: any) { message.error('操作失败') }
  }

  const handleDelete = async (id: number) => {
    if (!window.api) return
    await window.api.medicines.delete(id)
    message.success('已删除')
    load()
  }

  const changeTypeLabels: Record<string, string> = {
    purchase: '入库', dispense: '开药出库', adjust: '盘调', return: '退药',
  }

  const handleTrace = async (log: any) => {
    if (!window.api) return
    const data: any = { log }
    try {
      const med = list.find((m: any) => m.id === log.medicine_id)
      if (med) data.medicine = med

      if (log.related_id && (log.change_type === 'dispense' || log.change_type === 'return')) {
        const record = await window.api.records.get(log.related_id)
        if (record) {
          data.record = record
          const pet = await window.api.pets.get(record.pet_id)
          if (pet) {
            data.pet = pet
            const owner = await window.api.owners.get(pet.owner_id)
            if (owner) data.owner = owner
          }
          const appts = await window.api.appointments.all()
          data.appt = (appts as any[])?.find((a: any) => a.id === record.appointment_id)
          if (data.appt) {
            const bills = await window.api.bills.byOwner(data.appt.owner_id)
            data.bill = (bills as any[])?.find((b: any) => b.appointment_id === record.appointment_id)
          }
        }
      }
    } catch {}
    setTraceData(data)
    setTraceOpen(true)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2>药品库存</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>添加药品</Button>
      </div>
      <Table
        rowKey="id" dataSource={list} columns={[
          { title: 'ID', dataIndex: 'id', width: 50 },
          { title: '药品名称', dataIndex: 'name' },
          { title: '规格', dataIndex: 'specification' },
          { title: '单位', dataIndex: 'unit' },
          {
            title: '类型', dataIndex: 'is_service',
            render: (v: number) => v ? <Tag color="blue">服务</Tag> : <Tag>药品</Tag>,
          },
          {
            title: '库存', dataIndex: 'stock_quantity',
            render: (v: number, r: any) => r.is_service ? <span style={{ color: '#999' }}>不限制</span> : (
              <Tag color={v <= r.min_stock_alert ? 'red' : 'green'}>{v}</Tag>
            ),
          },
          { title: '预警线', dataIndex: 'min_stock_alert', render: (v: number, r: any) => r.is_service ? '-' : v },
          { title: '单价', dataIndex: 'price_per_unit', render: (v: number) => `¥${v?.toFixed(2)}` },
          {
            title: '操作', render: (_: any, r: any) => (
              <Space>
                <Button size="small" onClick={() => openPurchase(r)}>入库</Button>
                <Button size="small" onClick={() => openEdit(r)}>编辑</Button>
                <Button size="small" onClick={() => loadLogs(r.id)}>流水</Button>
                <Popconfirm title="确定删除?" onConfirm={() => handleDelete(r.id)}>
                  <Button size="small" danger>删除</Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
        loading={loading}
      />

      <Modal title={editing ? '编辑药品' : '添加药品'} open={modalOpen} onOk={handleOk} onCancel={() => setModalOpen(false)}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="药品名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="specification" label="规格">
            <Input placeholder="50mg / 500ml / ..." />
          </Form.Item>
          <Form.Item name="unit" label="单位">
            <Input placeholder="片/支/瓶/盒" />
          </Form.Item>
          <Form.Item name="stock_quantity" label="库存数量">
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
          <Form.Item name="price_per_unit" label="单价">
            <InputNumber style={{ width: '100%' }} min={0} step={0.01} prefix="¥" />
          </Form.Item>
          <Form.Item name="min_stock_alert" label="库存预警线">
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
          <Form.Item name="is_service" label="无限库存服务" valuePropName="checked">
            <Switch checkedChildren="是" unCheckedChildren="否" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="药品入库" open={purchaseOpen} onOk={handlePurchase} onCancel={() => setPurchaseOpen(false)}>
        {selectedMedicine && <p>药品: <strong>{selectedMedicine.name}</strong> ({selectedMedicine.specification}) | 当前库存: {selectedMedicine.stock_quantity}</p>}
        <Form form={purchaseForm} layout="vertical">
          <Form.Item name="quantity" label="入库数量" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={1} />
          </Form.Item>
          <Form.Item name="purchase_price" label="采购单价">
            <InputNumber style={{ width: '100%' }} min={0} step={0.01} prefix="¥" />
          </Form.Item>
          <Form.Item name="batch_number" label="批号">
            <Input />
          </Form.Item>
          <Form.Item name="note" label="备注">
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer title="库存流水" placement="right" open={logsDrawer} onClose={() => setLogsDrawer(false)} width={500}>
        <Table
          rowKey="id" dataSource={logs} size="small" pagination={false}
          onRow={(record) => ({
            style: { cursor: 'pointer' },
            onClick: () => handleTrace(record),
          })}
          columns={[
            { title: '时间', dataIndex: 'created_at', render: (v: any) => {
              if (!v) return '-'
              const d = new Date(typeof v === 'number' ? v : v)
              return isNaN(d.getTime()) ? '-' : d.toLocaleString('zh-CN')
            }},
            { title: '类型', dataIndex: 'change_type', render: (t: string) => <Tag>{changeTypeLabels[t] || t}</Tag> },
            { title: '数量', dataIndex: 'quantity', render: (v: number) => <span style={{ color: v > 0 ? 'green' : 'red' }}>{v > 0 ? `+${v}` : v}</span> },
            { title: '批号', dataIndex: 'batch_number' },
            { title: '进价', dataIndex: 'purchase_price', render: (v: number) => v ? `¥${v.toFixed(2)}` : '-' },
            { title: '备注', dataIndex: 'note', ellipsis: true },
          ]}
        />
      </Drawer>

      {/* Trace Drawer */}
      <Drawer title="操作追溯" open={traceOpen} onClose={() => { setTraceOpen(false); setTraceData(null) }} width={500}>
        {traceData && (
          <div>
            <Card size="small" title="流水记录" style={{ marginBottom: 16 }}>
              <Descriptions size="small" column={2}>
                {traceData.medicine && <Descriptions.Item label="药品" span={2}>{traceData.medicine.name} ({traceData.medicine.specification})</Descriptions.Item>}
                <Descriptions.Item label="类型"><Tag>{changeTypeLabels[traceData.log.change_type] || traceData.log.change_type}</Tag></Descriptions.Item>
                <Descriptions.Item label="数量">{traceData.log.quantity > 0 ? `+${traceData.log.quantity}` : traceData.log.quantity}</Descriptions.Item>
                {traceData.log.batch_number && <Descriptions.Item label="批号">{traceData.log.batch_number}</Descriptions.Item>}
                {traceData.log.purchase_price > 0 && <Descriptions.Item label="进价">¥{traceData.log.purchase_price.toFixed(2)}</Descriptions.Item>}
                {traceData.log.note && <Descriptions.Item label="备注" span={2}>{traceData.log.note}</Descriptions.Item>}
              </Descriptions>
            </Card>

            {(traceData.pet || traceData.owner) && (
              <Card size="small" title="宠物 / 客户" style={{ marginBottom: 16 }}>
                <Descriptions size="small" column={2}>
                  {traceData.pet && <Descriptions.Item label="宠物">{traceData.pet.name} ({traceData.pet.species}{traceData.pet.breed ? ` / ${traceData.pet.breed}` : ''})</Descriptions.Item>}
                  {traceData.owner && <Descriptions.Item label="主人">{traceData.owner.name}{traceData.owner.phone ? ` ${traceData.owner.phone}` : ''}</Descriptions.Item>}
                </Descriptions>
              </Card>
            )}

            {traceData.appt && (
              <Card size="small" title="关联预约" style={{ marginBottom: 16 }}>
                <Descriptions size="small" column={2}>
                  <Descriptions.Item label="类型">{{
                    treatment: '治疗', grooming: '美容', bath: '洗澡', vaccination: '疫苗', other: '其他',
                  }[traceData.appt.type] || traceData.appt.type}</Descriptions.Item>
                  <Descriptions.Item label="医生">{traceData.appt.doctor_name}</Descriptions.Item>
                  <Descriptions.Item label="时间" span={2}>{traceData.appt.scheduled_time}</Descriptions.Item>
                  <Descriptions.Item label="状态" span={2}><Tag color={{
                    scheduled: 'blue', in_progress: 'orange', completed: 'green', cancelled: 'default',
                  }[traceData.appt.status]}>{{
                    scheduled: '待就诊', in_progress: '就诊中', completed: '已完成', cancelled: '已取消',
                  }[traceData.appt.status]}</Tag></Descriptions.Item>
                </Descriptions>
              </Card>
            )}

            {traceData.record && (
              <Card size="small" title="病历记录" style={{ marginBottom: 16 }}>
                <Descriptions size="small" column={1}>
                  <Descriptions.Item label="诊断">{traceData.record.diagnosis || '无'}</Descriptions.Item>
                  <Descriptions.Item label="处方">{(() => {
                    try { return JSON.parse(traceData.record.prescription || '[]').map((p: any) => `${p.medicineName} x${p.quantity}`).join(', ') || '无' }
                    catch { return traceData.record.prescription || '无' }
                  })()}</Descriptions.Item>
                  <Descriptions.Item label="费用">¥{traceData.record.total_fee?.toFixed(2)}</Descriptions.Item>
                </Descriptions>
              </Card>
            )}

            {traceData.bill && (
              <Card size="small" title="关联账单">
                <Descriptions size="small" column={2}>
                  <Descriptions.Item label="总计">¥{traceData.bill.total_amount?.toFixed(2)}</Descriptions.Item>
                  <Descriptions.Item label="已付">¥{traceData.bill.paid_amount?.toFixed(2)}</Descriptions.Item>
                  <Descriptions.Item label="状态" span={2}><Tag color={{
                    unpaid: 'red', partial: 'orange', paid: 'green',
                  }[traceData.bill.status]}>{{
                    unpaid: '未付', partial: '部分付', paid: '已付清',
                  }[traceData.bill.status]}</Tag></Descriptions.Item>
                </Descriptions>
              </Card>
            )}
          </div>
        )}
      </Drawer>
    </div>
  )
}
