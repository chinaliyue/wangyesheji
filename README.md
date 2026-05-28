# 交易大师控制台 (Alpha Station)

一个专业的交易管理和分析工具，帮助交易者记录、分析和优化交易表现。

## v7.0 重构版说明

本次重构将原有的单文件 HTML 应用改造为模块化架构，提升了代码的可维护性和可扩展性。

### 项目结构

```
/workspace
├── index.html                    # 主页面（重构版）
├── src/
│   ├── css/
│   │   └── styles.css           # 样式表
│   └── js/
│       ├── utils.js             # 工具函数（盈亏计算、日期处理、数据验证）
│       ├── chart.js             # 权益曲线图表模块
│       ├── position.js          # 持仓管理模块
│       ├── history.js           # 历史记录管理模块
│       ├── storage.js           # 本地存储管理模块
│       └── app.js               # 应用入口和初始化
├── 交易大师全栈控制台 v6.0 [持仓平仓一体化].html  # 原始版本（保留）
├── 交易大师全栈控制台 v6.0 [持仓平仓一体化].json  # 示例数据
└── README.md                     # 本文件
```

### 模块说明

#### 1. Utils (utils.js)
- `ProfitCalculator`: 盈亏估算、金额格式化
- `DateTimeUtils`: 日期时间处理、Excel 日期转换
- `Validator`: 数据验证工具

#### 2. ChartManager (chart.js)
- 渲染资产净值曲线
- 计算 KPI 指标（胜率、最大回撤、累计盈亏）
- 图表点击交互

#### 3. PositionManager (position.js)
- 添加/删除持仓行
- 平仓操作（计算盈亏并转入历史记录）
- 持仓数据持久化

#### 4. HistoryManager (history.js)
- 添加交易记录
- 导入 Excel/CSV/TXT 文件
- 历史记录管理

#### 5. StorageManager (storage.js)
- localStorage 持久化
- 数据导出/导入
- 主题面板编辑

#### 6. App (app.js)
- 应用初始化和模块协调
- 全局函数绑定
- 文件导入器

### 功能特性

- 📊 **资产净值曲线**: 动态可视化账户增长
- 📈 **KPI 指标**: 实时显示胜率、最大回撤等关键指标
- 📦 **持仓管理**: 一键平仓并自动记录盈亏
- 📥 **历史导入**: 支持 cTrader/Excel/CSV 等多种格式
- 💾 **本地持久化**: 数据自动保存到浏览器
- 🐢 **海龟法则**: 内置海龟交易法则原则面板

### 使用方法

1. 直接在浏览器中打开 `index.html`
2. 添加持仓记录或导入历史交易数据
3. 平仓时会自动计算盈亏并生成权益曲线
4. 数据会自动保存到浏览器本地存储

### 兼容性

- 现代浏览器（Chrome、Firefox、Safari、Edge）
- 需要启用 JavaScript 和 localStorage

### 从 v6.0 升级

v7.0 完全兼容 v6.0 的数据格式。您可以：
1. 使用 v6.0 的"导出离线安全快照"功能导出 JSON
2. 在 v7.0 中使用"导入离线快照备份"恢复数据

---

**ALPHA STATION** - 专业交易者的选择
