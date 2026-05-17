import { useState } from 'react'

type Page = 'dashboard' | 'owners' | 'pets' | 'appointments' | 'records' | 'medicines' | 'bills'

const navItems: { key: Page; label: string }[] = [
  { key: 'dashboard', label: '工作台' },
  { key: 'owners', label: '客户管理' },
  { key: 'pets', label: '宠物档案' },
  { key: 'appointments', label: '预约挂号' },
  { key: 'records', label: '诊疗记录' },
  { key: 'medicines', label: '药品库存' },
  { key: 'bills', label: '收费结算' },
]

export default function App() {
  const [page, setPage] = useState<Page>('dashboard')

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'sans-serif' }}>
      <nav style={{
        width: 200, background: '#1a1a2e', color: '#eee',
        display: 'flex', flexDirection: 'column', paddingTop: 16,
      }}>
        <h1 style={{ textAlign: 'center', fontSize: 16, marginBottom: 24, color: '#e94560' }}>
          宠物医院管理
        </h1>
        {navItems.map(({ key, label }) => (
          <button key={key} onClick={() => setPage(key)}
            style={{
              background: page === key ? '#16213e' : 'transparent',
              color: page === key ? '#e94560' : '#ccc',
              border: 'none', padding: '12px 20px', textAlign: 'left',
              cursor: 'pointer', fontSize: 14,
              borderLeft: page === key ? '3px solid #e94560' : '3px solid transparent',
            }}
          >
            {label}
          </button>
        ))}
      </nav>

      <main style={{ flex: 1, padding: 24, background: '#f5f5f5', overflow: 'auto' }}>
        <PageContent page={page} />
      </main>
    </div>
  )
}

function PageContent({ page }: { page: Page }) {
  switch (page) {
    case 'dashboard':
      return <Dashboard />
    case 'owners':
      return <OwnersPage />
    default:
      return <Placeholder title={navItems.find(n => n.key === page)?.label || page} />
  }
}

function Dashboard() {
  return (
    <div>
      <h2>工作台</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 16 }}>
        <StatCard title="今日预约" value="--" color="#4e73df" />
        <StatCard title="待处理账单" value="--" color="#f6c23e" />
        <StatCard title="低库存药品" value="--" color="#e74a3b" />
      </div>
    </div>
  )
}

function StatCard({ title, value, color }: { title: string; value: string; color: string }) {
  return (
    <div style={{ background: 'white', padding: 20, borderRadius: 8, borderLeft: `4px solid ${color}` }}>
      <div style={{ color: '#888', fontSize: 13 }}>{title}</div>
      <div style={{ fontSize: 28, fontWeight: 'bold', marginTop: 8 }}>{value}</div>
    </div>
  )
}

function OwnersPage() {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [list, setList] = useState<any[]>([])

  const load = async () => {
    if (window.api) {
      const result = await window.api.owners.all()
      setList(result || [])
    }
  }

  const add = async () => {
    if (!name || !phone) return
    if (window.api) {
      await window.api.owners.create({ name, phone } as any)
      setName('')
      setPhone('')
      load()
    }
  }

  return (
    <div>
      <h2>客户管理</h2>
      <div style={{ display: 'flex', gap: 8, marginTop: 16, marginBottom: 16 }}>
        <input placeholder="姓名" value={name} onChange={e => setName(e.target.value)}
          style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: 4 }} />
        <input placeholder="电话" value={phone} onChange={e => setPhone(e.target.value)}
          style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: 4 }} />
        <button onClick={add} style={{ padding: '6px 16px', background: '#4e73df', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
          添加
        </button>
        <button onClick={load} style={{ padding: '6px 16px', background: '#1cc88a', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
          刷新
        </button>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: 8 }}>
        <thead>
          <tr style={{ background: '#f8f9fc', borderBottom: '2px solid #e3e6f0' }}>
            <th style={{ padding: 12, textAlign: 'left' }}>ID</th>
            <th style={{ padding: 12, textAlign: 'left' }}>姓名</th>
            <th style={{ padding: 12, textAlign: 'left' }}>电话</th>
            <th style={{ padding: 12, textAlign: 'left' }}>地址</th>
            <th style={{ padding: 12, textAlign: 'left' }}>创建时间</th>
          </tr>
        </thead>
        <tbody>
          {list.map((o: any) => (
            <tr key={o.id} style={{ borderBottom: '1px solid #e3e6f0' }}>
              <td style={{ padding: 10 }}>{o.id}</td>
              <td style={{ padding: 10 }}>{o.name}</td>
              <td style={{ padding: 10 }}>{o.phone}</td>
              <td style={{ padding: 10 }}>{o.address}</td>
              <td style={{ padding: 10 }}>{o.created_at}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Placeholder({ title }: { title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <p style={{ color: '#999', fontSize: 16 }}>{title} — 开发中</p>
    </div>
  )
}
