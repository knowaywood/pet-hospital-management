import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Col, Row, Statistic, Table, Tag, message, Button, Modal, Form, Input, Select, InputNumber, Drawer } from 'antd'
import {
  CalendarOutlined, WarningOutlined, DollarOutlined, BellOutlined,
  PlusOutlined, SettingOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'

interface Stats {
  todayAppointments: number
  lowStock: number
  unpaidBills: number
  pendingReminders: number
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<Stats>({ todayAppointments: 0, lowStock: 0, unpaidBills: 0, pendingReminders: 0 })
  const [reminders, setReminders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [owners, setOwners] = useState<any[]>([])
  const [pets, setPets] = useState<any[]>([])
  const [clinicSettings, setClinicSettings] = useState({ clinic_name: '', phone: '', address: '' })
  const [form] = Form.useForm()
  const [settingsForm] = Form.useForm()

  const load = async () => {
    if (!window.api) return
    try {
      const [s, r, settings] = await Promise.all([
        window.api.dashboard.stats(),
        window.api.reminders.pending(),
        window.api.settings.all(),
      ])
      setStats(s)
      setReminders(r || [])
      setClinicSettings({
        clinic_name: settings.clinic_name || '',
        phone: settings.phone || '',
        address: settings.address || '',
      })
    } catch (e: any) {
      message.error('加载失败: ' + e.message)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const copySms = (reminder: any) => {
    const phone = clinicSettings.phone || 'XXX-XXXXXXX'
    const name = clinicSettings.clinic_name || '宠物医院'
    const text = `【${name}】温馨提示：您的${reminder.title}已到期，请尽快联系我院。电话：${phone}`
    navigator.clipboard.writeText(text).then(() => message.success('短信文案已复制'))
  }

  const dismissReminder = async (id: number) => {
    if (!window.api) return
    await window.api.reminders.update(id, { status: 'dismissed' })
    load()
  }

  const completeReminder = async (id: number) => {
    if (!window.api) return
    await window.api.reminders.update(id, { status: 'completed' })
    load()
  }

  const openCreate = async () => {
    if (!window.api) return
    form.resetFields()
    form.setFieldsValue({ days: 30, type: 'followup' })
    const o = await window.api.owners.all()
    setOwners(o || [])
    setCreateOpen(true)
  }

  const handleOwnerChange = async (ownerId: number) => {
    if (!window.api) return
    form.setFieldsValue({ pet_id: undefined })
    const p = await window.api.pets.byOwner(ownerId)
    setPets(p || [])
  }

  const handleCreateOk = async () => {
    const values = await form.validateFields()
    if (!window.api) return
    try {
      await window.api.reminders.create({
        ...values,
        due_date: dayjs().add(values.days, 'day').format('YYYY-MM-DD'),
      })
      message.success('提醒已创建')
      setCreateOpen(false)
      load()
    } catch (e: any) { message.error('创建失败: ' + e.message) }
  }

  const typeLabels: Record<string, string> = {
    vaccination: '疫苗', followup: '复诊', custom: '其他',
  }

  const openSettings = () => {
    settingsForm.setFieldsValue(clinicSettings)
    setSettingsOpen(true)
  }

  const handleSettingsOk = async () => {
    const values = await settingsForm.validateFields()
    if (!window.api) return
    await window.api.settings.set('clinic_name', values.clinic_name)
    await window.api.settings.set('phone', values.phone)
    await window.api.settings.set('address', values.address)
    message.success('设置已保存')
    setSettingsOpen(false)
    setClinicSettings(values)
  }

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>
        工作台
        <Button type="text" icon={<SettingOutlined />} onClick={openSettings} style={{ marginLeft: 12 }}>医院信息</Button>
      </h2>
      <Row gutter={16}>
        <Col span={6}>
          <Card hoverable onClick={() => navigate('/appointments')} style={{ cursor: 'pointer' }}>
            <Statistic title="今日预约" value={stats.todayAppointments} prefix={<CalendarOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card hoverable onClick={() => navigate('/medicines')} style={{ cursor: 'pointer' }}>
            <Statistic title="低库存药品" value={stats.lowStock} prefix={<WarningOutlined />} valueStyle={{ color: stats.lowStock > 0 ? '#e74a3b' : undefined }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card hoverable onClick={() => navigate('/bills')} style={{ cursor: 'pointer' }}>
            <Statistic title="待处理账单" value={stats.unpaidBills} prefix={<DollarOutlined />} valueStyle={{ color: stats.unpaidBills > 0 ? '#f6c23e' : undefined }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card hoverable style={{ cursor: 'pointer' }}>
            <Statistic title="待处理提醒" value={stats.pendingReminders} prefix={<BellOutlined />} />
          </Card>
        </Col>
      </Row>

      <Card
        title="回访提醒"
        style={{ marginTop: 24 }}
        extra={<Button type="primary" size="small" icon={<PlusOutlined />} onClick={openCreate}>新建提醒</Button>}
      >
        <Table
          dataSource={reminders}
          rowKey="id"
          loading={loading}
          pagination={false}
          columns={[
            { title: '标题', dataIndex: 'title' },
            { title: '类型', dataIndex: 'type', render: (t: string) => <Tag>{typeLabels[t] || t}</Tag> },
            { title: '到期日期', dataIndex: 'due_date', render: (v: string) => {
              const d = dayjs(v).diff(dayjs(), 'day')
              return d <= 0 ? `已过期 ${Math.abs(d)} 天` : `${d} 天后`
            }},
            {
              title: '操作', render: (_, r) => (
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button size="small" onClick={() => copySms(r)}>复制短信</Button>
                  <Button size="small" type="primary" onClick={() => completeReminder(r.id)}>完成</Button>
                  <Button size="small" danger onClick={() => dismissReminder(r.id)}>忽略</Button>
                </div>
              ),
            },
          ]}
        />
      </Card>

      <Modal title="新建回访提醒" open={createOpen} onOk={handleCreateOk} onCancel={() => setCreateOpen(false)} width={500}>
        <Form form={form} layout="vertical">
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

      <Drawer
        title="医院信息"
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        width={400}
        extra={<Button type="primary" onClick={handleSettingsOk}>保存</Button>}
      >
        <Form form={settingsForm} layout="vertical">
          <Form.Item name="clinic_name" label="医院名称">
            <Input placeholder="XX宠物医院" />
          </Form.Item>
          <Form.Item name="phone" label="医院电话">
            <Input placeholder="138xxxx1234" />
          </Form.Item>
          <Form.Item name="address" label="医院地址">
            <Input.TextArea rows={3} placeholder="详细地址" />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  )
}
