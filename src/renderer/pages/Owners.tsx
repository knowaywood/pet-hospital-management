import { useEffect, useState } from 'react'
import { Table, Button, Modal, Form, Input, Select, Space, Popconfirm, message } from 'antd'
import { PlusOutlined, SearchOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import type { Owner } from '../../../shared/types'

type SearchType = 'name' | 'phone' | 'pet'

export default function Owners() {
  const [list, setList] = useState<Owner[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Owner | null>(null)
  const [searchType, setSearchType] = useState<SearchType>('phone')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [form] = Form.useForm()
  const navigate = useNavigate()
  const { setCurrentOwner } = useStore()

  const load = async (type?: SearchType, keyword?: string) => {
    if (!window.api) return
    setLoading(true)
    try {
      let result: Owner[] = []
      if (keyword) {
        if (type === 'phone') {
          result = await window.api.owners.searchByPhone(keyword) as Owner[]
        } else if (type === 'pet') {
          result = await window.api.owners.searchByPet(keyword) as Owner[]
        } else {
          result = await window.api.owners.search(keyword) as Owner[]
        }
      } else {
        result = await window.api.owners.all() as Owner[]
      }
      setList(result)
    } catch (e: any) { message.error('加载失败') }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const doSearch = () => {
    load(searchType, searchKeyword)
  }

  const handleSearchChange = (value: string) => {
    setSearchKeyword(value)
    if (!value) load()
  }

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    setModalOpen(true)
  }

  const openEdit = (record: Owner) => {
    setEditing(record)
    form.setFieldsValue(record)
    setModalOpen(true)
  }

  const handleOk = async () => {
    const values = await form.validateFields()
    if (!window.api) return
    try {
      if (editing) {
        await window.api.owners.update(editing.id, values)
        message.success('已更新')
      } else {
        await window.api.owners.create(values)
        message.success('已添加')
      }
      setModalOpen(false)
      load()
    } catch (e: any) { message.error(e.message || '操作失败') }
  }

  const handleDelete = async (id: number) => {
    if (!window.api) return
    await window.api.owners.delete(id)
    message.success('已删除')
    load()
  }

  const goDetail = async (owner: Owner) => {
    setCurrentOwner(owner)
    navigate(`/owners/${owner.id}`)
  }

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '姓名', dataIndex: 'name', render: (v: string) => v || '-' },
    { title: '电话', dataIndex: 'phone' },
    { title: '地址', dataIndex: 'address' },
    { title: '创建时间', dataIndex: 'created_at',
      render: (v: any) => {
        if (!v) return '-'
        const d = new Date(typeof v === 'number' ? v : v)
        return isNaN(d.getTime()) ? '-' : d.toLocaleString('zh-CN')
      },
    },
    {
      title: '操作', render: (_: any, r: Owner) => (
        <Space>
          <Button size="small" onClick={(e) => { e.stopPropagation(); openEdit(r) }}>编辑</Button>
          <Popconfirm title="确定删除?" onConfirm={() => handleDelete(r.id)}>
            <Button size="small" danger onClick={(e) => e.stopPropagation()}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Space>
          <Select
            value={searchType}
            onChange={(v) => { setSearchType(v); setSearchKeyword(''); load() }}
            style={{ width: 100 }}
            options={[
              { label: '手机号', value: 'phone' },
              { label: '宠物名', value: 'pet' },
              { label: '客户姓名', value: 'name' },
            ]}
          />
          <Input.Search
            key={searchType}
            placeholder={
              searchType === 'name' ? '搜索客户姓名' :
              searchType === 'phone' ? '搜索手机号（部分匹配）' :
              '搜索宠物名字'
            }
            allowClear
            value={searchKeyword}
            onChange={(e) => handleSearchChange(e.target.value)}
            onSearch={doSearch}
            style={{ width: 280 }}
          />
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新建客户</Button>
      </div>
      <Table
        rowKey="id" dataSource={list} columns={columns} loading={loading}
        onRow={(record) => ({
          style: { cursor: 'pointer' },
          onClick: () => goDetail(record),
        })}
      />
      <Modal title={editing ? '编辑客户' : '新建客户'} open={modalOpen} onOk={handleOk} onCancel={() => setModalOpen(false)}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="姓名">
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="电话" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="address" label="地址">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
