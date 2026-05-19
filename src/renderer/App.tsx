import { useState } from 'react'
import { HashRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, Breadcrumb, ConfigProvider } from 'antd'
import {
  DashboardOutlined,
  CalendarOutlined,
  UserOutlined,
  MedicineBoxOutlined,
  DollarOutlined,
} from '@ant-design/icons'
import zhCN from 'antd/locale/zh_CN'
import Dashboard from './pages/Dashboard'
import Owners from './pages/Owners'
import OwnerDetail from './pages/OwnerDetail'
import Appointments from './pages/Appointments'
import MedicalRecords from './pages/MedicalRecords'
import Medicines from './pages/Medicines'
import Bills from './pages/Bills'

const { Sider, Content } = Layout

const navItems = [
  { key: '/', label: '工作台', icon: <DashboardOutlined /> },
  { key: '/appointments', label: '预约就诊', icon: <CalendarOutlined /> },
  { key: '/owners', label: '客户管理', icon: <UserOutlined /> },
  { key: '/medicines', label: '药品库存', icon: <MedicineBoxOutlined /> },
  { key: '/bills', label: '收费结算', icon: <DollarOutlined /> },
]

const breadcrumbMap: Record<string, string> = {
  '/': '工作台',
  '/appointments': '预约就诊',
  '/owners': '客户管理',
  '/medicines': '药品库存',
  '/bills': '收费结算',
}

function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)

  const selectedKey = '/' + location.pathname.split('/')[1]

  const breadcrumbItems: { title: string }[] = [{ title: '首页' }]
  const segments = location.pathname.split('/').filter(Boolean)
  const current = segments[0] ? `/${segments[0]}` : '/'
  if (breadcrumbMap[current]) {
    breadcrumbItems.push({ title: breadcrumbMap[current] })
  }
  if (segments.length > 1 && segments[1] !== 'new') {
    breadcrumbItems.push({ title: `详情: ${segments[1]}` })
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed} theme="dark">
        <div style={{
          height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#e94560', fontWeight: 'bold', fontSize: collapsed ? 14 : 16,
          whiteSpace: 'nowrap', overflow: 'hidden',
        }}>
          {collapsed ? '宠' : '宠物医院管理'}
        </div>
        <Menu theme="dark" mode="inline" selectedKeys={[selectedKey]} items={navItems}
          onClick={({ key }) => navigate(key)} />
      </Sider>
      <Layout>
        <Content style={{ margin: 16 }}>
          <Breadcrumb items={breadcrumbItems} style={{ marginBottom: 16 }} />
          <div style={{ background: '#fff', borderRadius: 8, padding: 24, minHeight: 'calc(100vh - 120px)' }}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/appointments" element={<Appointments />} />
              <Route path="/owners" element={<Owners />} />
              <Route path="/owners/:id" element={<OwnerDetail />} />
              <Route path="/records/:petId" element={<MedicalRecords />} />
              <Route path="/medicines" element={<Medicines />} />
              <Route path="/bills" element={<Bills />} />
            </Routes>
          </div>
        </Content>
      </Layout>
    </Layout>
  )
}

export default function App() {
  return (
    <ConfigProvider locale={zhCN} theme={{ token: { colorPrimary: '#4e73df' } }}>
      <HashRouter>
        <AppLayout />
      </HashRouter>
    </ConfigProvider>
  )
}
