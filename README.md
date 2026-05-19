# 宠物医院管理系统

桌面版宠物医院管理软件，Electron + React + SQLite。

## 技术栈

| 层 | 技术 |
|----|------|
| 桌面壳 | Electron |
| 前端 | React 19 + TypeScript + Vite |
| UI | Ant Design |
| 状态 | zustand |
| 路由 | React Router (HashRouter) |
| 数据库 | SQLite (better-sqlite3) |
| ORM | drizzle-orm |
| PDF | pdfjs-dist |
| 打包 | electron-builder |
| CI/CD | GitHub Actions |

## 导航

| 菜单 | 功能 |
|------|------|
| 工作台 | 统计卡片（可点击跳转） + 回访提醒列表 + 医院设置 |
| 预约就诊 | 日历视图 + 当日预约列表 + 就诊工作区（诊断/处方/附件/费用） |
| 客户管理 | 客户 CRUD + 搜索 + 内嵌宠物档案 + 就诊时间线 + 账单 + 回访提醒 |
| 药品库存 | 药品/服务管理 + 入库/流水 + 库存追溯 |
| 收费结算 | 按日期分组 + 收款/撤销 + 点击追溯到就诊详情 |

## 数据库（12 张表）

| 表 | 用途 |
|----|------|
| owners | 客户（电话唯一） |
| pets | 宠物档案 |
| appointments | 预约（5 种类型 + 状态流转） |
| medical_records | 诊疗记录（诊断/处方 JSON/费用） |
| medicines | 药品 + 服务（is_service 无限库存） |
| bills | 账单 |
| bill_items | 账单明细 |
| vaccines | 疫苗接种（自动创建回访提醒） |
| reminders | 回访提醒 |
| attachments | 附件（标题 + 缩略图 + 原图） |
| inventory_logs | 库存流水（可追溯） |
| settings | 医院设置（名称/电话/地址） |

## 核心功能

### 就诊工作流
```
日历 → 点预约 → 就诊 Drawer
                  ├── 诊断
                  ├── 处方（搜索药品自动补全 / 自定义药品）
                  ├── 附件（拖入图片/PDF → 自动转 JPEG + 缩略图）
                  ├── 费用（自动合计 → 生成账单）
                  └── 新建回访提醒
```

### 处方
- 药品搜索 AutoComplete，库存药品选中后规格/单价自动填
- 自定义药品可手动输入名称/规格/单位/单价
- 上次处方自动加载为模板，可一键清空
- 库存药品自动扣减，服务类型不扣

### 附件
- 拖入图片 → Canvas 生成缩略图 → 存磁盘 + DB 记录
- 拖入 PDF → pdfjs-dist 逐页渲染 JPEG → 每页独立保存
- 上传时可选输入标题（默认取文件名）
- 缩略图网格展示，点击放大原图，可删除

### 回访提醒
- 工作台 / 客户详情 / 就诊工作区 均可创建
- 填**天数**代替选日期（如「7 天后」）
- 仅到期前 3 天内显示在工作台
- 疫苗录入时自动创建到期提醒
- 一键复制短信文案（使用医院设置中的名称/电话）

### 库存追溯
- 库存流水每行可点击
- 开药出库 → 追溯到关联病历 + 预约 + 账单
- 入库/盘调 → 显示流水详情 + 药品信息

### 账单
- 完成就诊自动生成账单
- 收款支持部分/全额
- 撤销账单同步取消关联预约
- 点击账单 → 当前页展开就诊详情（含客户/宠物/病历/附件）

### 时间管理
- 所有 `created_at` 统一为 INTEGER 毫秒时间戳
- 用户日期字段（预约时间/接种日期等）保持 TEXT 可读格式
- 启动时自动迁移旧 TEXT 数据

## 路由

| 路由 | 页面 |
|------|------|
| `/` | 工作台 |
| `/appointments` | 预约就诊 |
| `/owners` | 客户列表 |
| `/owners/:id` | 客户详情 |
| `/medicines` | 药品库存 |
| `/bills` | 收费结算 |
| `/records/:petId` | 诊疗记录（客户详情内进入） |

## 命令

```bash
npm run dev       # 开发模式
npm run build     # 编译
npm run package   # 打包 (electron-builder)
```

## 发布

推送 `v*` 标签自动触发 GitHub Actions：

```bash
git tag v1.0.0
git push origin v1.0.0
```

自动构建 Linux AppImage / Windows exe / macOS dmg，创建 GitHub Release。

## 将来扩展

- [ ] 办卡业务
- [ ] 用药回访pipline
- [ ] Node.js 服务端 + PostgreSQL
- [ ] 自动短信发送（阿里云/腾讯云 SMS）
- [ ] A/B 电脑数据同步
- [ ] 微信小程序用户端
