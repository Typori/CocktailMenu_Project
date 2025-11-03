# 🍸 Cocktail Menu Pro - 项目总览

> 本文档提供项目的整体架构和技术栈概览。

## 🎯 项目简介

**Cocktail Menu Pro** 是一个专业的调酒配方管理与成本核算工具，专为调酒师、酒吧经营者和鸡尾酒爱好者设计。

### 核心价值
- 📝 完整的配方管理系统
- 💰 精确的成本核算功能
- 📦 智能的库存管理
- 🏪 多店面酒款管理
- 📊 数据分析和导出

---

## 🏗️ 技术架构

### 技术栈

```
前端框架: React 18.2.0 + TypeScript 5.2.2
构建工具: Vite 5.0.8
UI组件: shadcn/ui + Tailwind CSS 3.3.6
数据库: IndexedDB (Dexie.js 3.2.4)
路由: React Router 6.20.0
状态管理: React Hooks + Context
拖拽: @dnd-kit
图表: Recharts 2.10.3
导出: jsPDF 2.5.1 + html2canvas 1.4.1
```

### 核心依赖

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "dexie": "^3.2.4",
    "dexie-react-hooks": "^1.1.7",
    "@dnd-kit/core": "^6.3.1",
    "@dnd-kit/sortable": "^10.0.0",
    "@radix-ui/react-tabs": "^1.1.13",
    "tailwindcss": "^3.3.6",
    "jspdf": "^2.5.1",
    "html2canvas": "^1.4.1",
    "recharts": "^2.10.3"
  }
}
```

---

## 📊 数据模型

### 数据库表结构

#### 1. ingredients - 原料表
```typescript
{
  id: number;
  name: string;              // 原料名称
  category: SpiritType;      // 分类（9种）
  price: number;             // 价格
  quantity: number;          // 数量
  unit: Unit;                // 单位（5种）
  alcoholContent: number;    // 酒精度
  wastageRate: number;       // 损耗率
  currentStock: number;      // 当前库存
  minStock: number;          // 最低库存
}
```

#### 2. recipes - 配方表
```typescript
{
  id: number;
  name: string;              // 配方名称
  ingredients: RecipeIngredient[];  // 配料列表
  steps: RecipeStep[];       // 制作步骤
  glassType: GlassType;      // 杯型（11种）
  totalVolume: number;       // 总容量（自动计算）
  calculatedAbv: number;     // 酒精度（自动计算）
  calculatedCost: number;    // 成本（自动计算）
  images: string[];          // 图片
  isFavorite: boolean;       // 是否收藏
}
```

#### 3. menuInfo - 菜单信息表
```typescript
{
  id: number;
  recipeId: number;          // 关联配方ID
  menuNames: MenuNameVersion[];  // 菜单名称（支持多版本）
  description: string;       // 酒款描述
  flavorTags: FlavorTag[];   // 风味标签（5种）
  drinkDuration: DrinkDuration;  // 饮用类型
  price: number;             // 售价
  profitMargin: number;      // 利润率（自动计算）
  isAvailable: boolean;      // 是否可售
}
```

#### 4. venues - 店面表
```typescript
{
  id: number;
  name: string;              // 店面名称
  description: string;       // 描述
  address: string;           // 地址
}
```

#### 5. venueRecipes - 上架酒款表
```typescript
{
  id: number;
  venueId: number;           // 店面ID
  recipeId: number;          // 配方ID
  displayOrder: number;      // 显示顺序
  isAvailable: boolean;      // 是否上架
  customPrice: number;       // 自定义价格
}
```

#### 6. tags - 标签表
```typescript
{
  id: number;
  name: string;              // 标签名称
  color: string;             // 颜色
}
```

#### 7. settings - 设置表
```typescript
{
  id: number;
  theme: 'light' | 'dark' | 'auto';
  language: 'zh' | 'en';
  defaultUnit: Unit;
  currency: string;
  lowStockAlert: boolean;
  autoBackup: boolean;
}
```

---

## 📁 项目结构

```
CocktailMenu_Project/
├── src/
│   ├── components/              # UI组件
│   │   ├── ui/                 # shadcn/ui基础组件
│   │   ├── Layout.tsx          # 应用布局
│   │   └── ImagePreviewDialog.tsx  # 图片预览
│   ├── pages/                  # 页面组件（11个）
│   │   ├── Dashboard.tsx       # 仪表盘
│   │   ├── Ingredients.tsx     # 原料库存
│   │   ├── Recipes.tsx         # 配方管理
│   │   ├── RecipeEditor.tsx    # 配方编辑器
│   │   ├── RecipeViewer.tsx    # 配方查看
│   │   ├── MenuDisplay.tsx     # 酒单展示
│   │   ├── SingleRecipeView.tsx # 单页视图
│   │   ├── VenueManagement.tsx # 上架酒款
│   │   ├── Inventory.tsx       # 库存管理（已废弃）
│   │   ├── Analytics.tsx       # 数据分析
│   │   └── Settings.tsx        # 系统设置
│   ├── db/                     # 数据库
│   │   └── database.ts         # Dexie配置
│   ├── types/                  # TypeScript类型
│   │   └── index.ts            # 所有接口定义
│   ├── utils/                  # 工具函数
│   │   ├── calculations.ts     # 计算引擎
│   │   └── export.ts           # 导出功能
│   ├── contexts/               # React Context
│   │   └── ThemeContext.tsx    # 主题管理
│   ├── lib/                    # 库函数
│   │   └── utils.ts            # 通用工具
│   ├── App.tsx                 # 主应用
│   ├── App.css                 # 全局样式
│   └── main.tsx                # 入口文件
├── docs/                       # 文档目录
│   ├── getting-started/        # 入门指南
│   ├── guides/                 # 使用指南
│   └── development/            # 开发文档
├── public/                     # 静态资源
├── index.html                  # HTML模板
├── package.json                # 依赖配置
├── vite.config.ts              # Vite配置
├── tailwind.config.js          # Tailwind配置
└── tsconfig.json               # TypeScript配置
```

---

## 🎯 功能模块

### 1. 原料库存 (Ingredients)
- 原料CRUD
- 9种分类
- 库存管理
- 单价自动计算
- 筛选和搜索

### 2. 配方管理 (Recipes + RecipeEditor + RecipeViewer)
- 配方CRUD
- 配料管理
- 制作步骤
- 自动计算（容量、酒精度、成本）
- 图片管理
- 筛选功能

### 3. 酒单展示 (MenuDisplay + SingleRecipeView)
- 列表/网格视图
- 单页大字体展示
- 左右滑动切换
- 搜索筛选

### 4. 上架酒款 (VenueManagement)
- 多店面管理
- 酒款上架/下架
- 自定义价格
- 拖拽排序
- 筛选功能

### 5. 数据分析 (Analytics)
- 成本统计
- 利润分析
- 利润排行
- 数据导出（JSON/PDF）

### 6. 系统设置 (Settings)
- 主题切换
- 数据管理
- 导入/导出
- 清空数据

---

## 🔧 核心功能

### 自动计算引擎

#### 1. 容量计算
```typescript
总容量 = Σ(配料体积)
只计算：ml、oz、cl
不计算：dash、piece
```

#### 2. 酒精度计算
```typescript
酒精度 = (总酒精体积 / 总容量) × 100%
总酒精体积 = Σ(配料体积 × 原料酒精度)
```

#### 3. 成本计算
```typescript
总成本 = Σ(配料用量 × 原料单价)
原料单价 = (价格 / 数量) × (1 + 损耗率/100)
```

#### 4. 利润率计算
```typescript
利润率 = (售价 - 成本) / 售价 × 100%
```

### 单位转换

```typescript
const conversionRates = {
  ml: 1,
  oz: 30,      // 调酒行业标准
  cl: 10,
  dash: 1,
  piece: 0,    // 不参与容量计算
};
```

---

## 🎨 UI/UX特性

### 设计系统
- **shadcn/ui** - 高质量React组件
- **Tailwind CSS** - 实用优先的CSS框架
- **Radix UI** - 无障碍的UI基础组件

### 主题系统
- 浅色模式
- 深色模式
- 自动模式（跟随系统）

### 响应式设计
- 移动端：底部导航
- 桌面端：侧边栏导航
- 完美适配各种屏幕尺寸

### 交互特性
- 拖拽排序（@dnd-kit）
- 图片预览（全屏、透明背景）
- 左右滑动切换
- 流畅的动画效果

---

## 📊 数据流

```
用户操作
    ↓
React组件
    ↓
Dexie.js (IndexedDB)
    ↓
useLiveQuery (自动响应)
    ↓
UI更新
```

### 数据持久化
- 所有数据存储在浏览器IndexedDB
- 无需后端服务器
- 完全离线可用
- 支持导入/导出备份

---

## 🔮 技术亮点

### 1. 完全本地化
- 无需联网
- 数据完全私密
- 响应速度快
- 无服务器成本

### 2. 自动计算
- 实时计算容量、酒精度、成本
- 智能单位转换
- 自动更新利润率

### 3. 现代化体验
- APP风格界面
- 流畅的动画
- 触摸优化
- 暗黑模式

### 4. 功能完整
- 配方管理
- 成本核算
- 库存管理
- 多店面支持
- 数据分析

---

## 📈 项目统计

- **代码行数**: ~8000+
- **组件数量**: 30+
- **页面数量**: 11个
- **数据表**: 7个
- **支持单位**: 5种
- **原料分类**: 9种
- **杯型**: 11种
- **风味标签**: 5种

---

## 🔮 未来规划

### 短期计划
- [ ] 完善配方编辑器（拖拽排序）
- [ ] 添加图片上传功能
- [ ] 实现风味轮可视化
- [ ] 添加数据图表

### 中期计划
- [ ] 移动端APP
- [ ] 云端同步
- [ ] 多用户协作
- [ ] 配方分享社区

### 长期计划
- [ ] AI配方推荐
- [ ] 语音控制
- [ ] AR调酒指导
- [ ] 智能库存预测

---

## 📄 许可证

MIT License

---

*最后更新: 2025-11-02*  
*版本: 1.0.0*  
*状态: ✅ 可用*
