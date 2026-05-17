# 宠物医院管理系统

## 技术栈

| 层 | 技术 |
|----|------|
| 桌面壳 | Electron |
| 前端 | React 19 + TypeScript + Vite |
| UI 库 | Ant Design |
| 状态管理 | zustand |
| 路由 | React Router |
| 本地数据库 | SQLite (better-sqlite3) |
| ORM | drizzle-orm |
| 打包 | electron-builder |

## 架构

```
React 组件
   ↓ 调用 Repository 接口
Repository 实现
   ↓ (当前) local.ts → IPC → SQLite
   ↓ (将来) remote.ts → fetch → Node.js 服务端
```

Repository 模式：前端只依赖接口约定，底层实现可随时切换。

## 数据库表

| 表名 | 用途 | 状态 |
|------|------|------|
| owners | 客户 | 已完成 |
| pets | 宠物档案 | 已完成 |
| appointments | 预约挂号 | 已完成 |
| medical_records | 诊疗记录 | 已完成 |
| medicines | 药品库存 | 已完成 |
| bills | 账单 | 已完成 |
| bill_items | 账单明细 | 已完成 |
| vaccines | 疫苗接种记录 | 待添加 |
| reminders | 回访提醒 | 待添加 |

## 业务模块

| 模块 | 说明 | 交互方式 |
|------|------|---------|
| 工作台 | 今日概览 + 到期提醒 | 只读 |
| 客户管理 | 客户增删改查，详情汇总宠物+预约+账单 | Modal 弹窗 |
| 宠物档案 | 按客户展示宠物列表，就诊时间线 | 客户页内嵌 + Modal |
| 预约挂号 | 治疗/美容/洗澡/疫苗 多类型预约 | 页面跳转 |
| 诊疗记录 | 诊断/处方/费用，按宠物查看 | Drawer 右侧面板 |
| 药品库存 | 入库/出库/低库存预警 | Modal 弹窗 |
| 收费结算 | 账单创建/收款 | Modal 弹窗 |

## 预约类型

- 治疗 (treatment)
- 宠物美容 (grooming)
- 洗澡 (bath)
- 疫苗接种 (vaccination)
- 其他 (other)

## TODO: 待办事项

### 即将完成

- [ ] 重构 App.tsx — React Router + Ant Design 布局 + 面包屑 + 左侧导航
- [ ] 创建 zustand store（currentOwner、currentPet）
- [ ] 工作台页面（真实数据驱动）
- [ ] 客户管理完整页面（Table + Modal + 详情汇总）
- [ ] 宠物档案页面（按客户筛选 + 就诊时间线）
- [ ] 预约挂号页面（日期选择 + 类型选择 + 选客户→宠物）
- [ ] 诊疗记录页面（Drawer 详情）
- [ ] 药品库存页面（Table + 低库存报警色）
- [ ] 收费结算页面

### 数据库扩展

- [ ] appointments 表增加 type 字段（treatment/grooming/bath/vaccination/other）
- [ ] 新建 vaccines 表（pet_id, vaccine_name, administered_date, next_due_date, batch_number）
- [ ] 新建 reminders 表（pet_id, owner_id, type, title, due_date, status）

### 回访提醒功能

- [ ] 工作台展示「即将到期提醒」列表
- [ ] 录入疫苗后自动创建回访提醒（如狂犬疫苗一年后提醒）
- [ ] 一键复制客户手机号 + 生成短信模板文案
- [ ] 手动创建自定义提醒（如术后7天复诊）
- [ ] 提醒状态管理（待处理 / 已完成 / 已忽略）

### 将来扩展（服务器版）

- [ ] Node.js 服务端 + PostgreSQL（drizzle-orm 同份 schema，无缝迁移）
- [ ] 新增 `remote.ts` — Repository 的 HTTP 实现
- [ ] 自动短信发送（阿里云/腾讯云 SMS API + 服务端定时任务）
- [ ] A/B 电脑数据同步（在线 remote 模式 + 离线 local 模式 + 同步协议）
- [ ] 数据从 SQLite 导出迁移到 PostgreSQL

## 命令

```bash
npm run dev       # 开发模式
npm run build     # 编译
npm run package   # 打包 AppImage
```
