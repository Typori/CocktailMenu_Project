# 🛠️ 开发指南 - 新开发者必读

> 本文档是新开发者的完整上手指南，涵盖从环境搭建到功能开发的全流程。

## 📋 目录

1. [快速开始](#快速开始)
2. [项目架构](#项目架构)
3. [核心概念](#核心概念)
4. [开发流程](#开发流程)
5. [代码规范](#代码规范)
6. [常用操作](#常用操作)
7. [扩展开发](#扩展开发)
8. [调试技巧](#调试技巧)
9. [常见问题](#常见问题)

---

## 快速开始

### 环境要求

```bash
Node.js >= 16.0.0
npm >= 8.0.0
```

### 安装和启动

```bash
# 1. 克隆项目
git clone <repository-url>
cd CocktailMenu_Project

# 2. 安装依赖
npm install

# 3. 启动开发服务器
npm run dev

# 4. 访问应用
# 浏览器打开 http://localhost:5173
```

### 推荐工具

- **编辑器**: VS Code
- **浏览器**: Chrome (配合 React DevTools)
- **数据库查看**: Chrome DevTools -> Application -> IndexedDB

---

## 项目架构

### 技术栈

```
前端框架: React 18 + TypeScript
构建工具: Vite 5
UI组件: shadcn/ui + Tailwind CSS
数据库: IndexedDB (Dexie.js)
路由: React Router 6
状态管理: React Hooks + Context
```

### 目录结构

```
src/
├── components/              # UI组件
│   ├── ui/                 # shadcn/ui基础组件
│   ├── Layout.tsx          # 应用布局
│   └── ImagePreviewDialog.tsx  # 图片预览组件
├── pages/                  # 页面组件
│   ├── Dashboard.tsx       # 仪表盘
│   ├── Ingredients.tsx     # 原料库存
│   ├── Recipes.tsx         # 配方管理
│   ├── RecipeEditor.tsx    # 配方编辑器
│   ├── RecipeViewer.tsx    # 配方查看
│   ├── MenuDisplay.tsx     # 酒单展示
│   ├── SingleRecipeView.tsx # 单页视图
│   ├── VenueManagement.tsx # 上架酒款
│   ├── Analytics.tsx       # 数据分析
│   └── Settings.tsx        # 系统设置
├── db/                     # 数据库
│   └── database.ts         # Dexie配置和初始化
├── types/                  # TypeScript类型定义
│   └── index.ts            # 所有接口定义
├── utils/                  # 工具函数
│   ├── calculations.ts     # 计算引擎
│   └── export.ts           # 导出功能
├── contexts/               # React Context
│   └── ThemeContext.tsx    # 主题管理
├── lib/                    # 库函数
│   └── utils.ts            # 通用工具(cn等)
├── App.tsx                 # 主应用
├── App.css                 # 全局样式
└── main.tsx                # 入口文件
```

---

## 核心概念

### 数据模型

项目使用 IndexedDB 存储数据，主要包含以下表：

#### 1. **ingredients** - 原料表
```typescript
interface Ingredient {
  id?: number;
  name: string;              // 原料名称
  category: SpiritType;      // 分类
  price: number;             // 价格
  quantity: number;          // 数量
  unit: Unit;                // 单位
  alcoholContent?: number;   // 酒精度
  wastageRate?: number;      // 损耗率
  currentStock?: number;     // 当前库存
  minStock?: number;         // 最低库存
}
```

#### 2. **recipes** - 配方表
```typescript
interface Recipe {
  id?: number;
  name: string;              // 配方名称
  ingredients: RecipeIngredient[];  // 配料列表
  steps: RecipeStep[];       // 制作步骤
  glassType?: GlassType;     // 杯型
  totalVolume?: number;      // 总容量(自动计算)
  calculatedAbv?: number;    // 酒精度(自动计算)
  calculatedCost?: number;   // 成本(自动计算)
}
```

#### 3. **menuInfo** - 菜单信息表
```typescript
interface MenuInfo {
  id?: number;
  recipeId: number;          // 关联配方ID
  menuNames: MenuNameVersion[];  // 菜单名称(支持多版本)
  description: string;       // 酒款描述
  flavorTags: FlavorTag[];   // 风味标签
  drinkDuration?: DrinkDuration;  // 饮用类型
  price: number;             // 售价
  profitMargin?: number;     // 利润率(自动计算)
}
```

#### 4. **venues** - 店面表
```typescript
interface Venue {
  id?: number;
  name: string;              // 店面名称
  description?: string;      // 描述
  address?: string;          // 地址
}
```

#### 5. **venueRecipes** - 上架酒款表
```typescript
interface VenueRecipe {
  id?: number;
  venueId: number;           // 店面ID
  recipeId: number;          // 配方ID
  displayOrder?: number;     // 显示顺序
  isAvailable?: boolean;     // 是否上架
  customPrice?: number;      // 自定义价格
}
```

### 核心功能模块

1. **原料管理** (`Ingredients.tsx`)
   - 原料CRUD
   - 库存管理
   - 单价自动计算

2. **配方管理** (`Recipes.tsx` + `RecipeEditor.tsx`)
   - 配方CRUD
   - 配料管理
   - 成本/酒精度自动计算

3. **酒单展示** (`MenuDisplay.tsx` + `SingleRecipeView.tsx`)
   - 列表/网格视图
   - 单页大字体展示
   - 筛选和搜索

4. **上架酒款** (`VenueManagement.tsx`)
   - 多店面管理
   - 酒款上架/下架
   - 自定义价格

5. **数据分析** (`Analytics.tsx`)
   - 成本统计
   - 利润分析
   - 数据导出

---

## 开发流程

### 1. 创建新功能的标准流程

#### Step 1: 定义类型
```typescript
// src/types/index.ts
export interface NewFeature {
  id?: number;
  name: string;
  // ... 其他字段
}
```

#### Step 2: 扩展数据库
```typescript
// src/db/database.ts
export class CocktailDatabase extends Dexie {
  newFeatures!: Table<NewFeature, number>;

  constructor() {
    super('CocktailMenuDB');
    
    this.version(3).stores({
      // ... 现有表
      newFeatures: '++id, name, createdAt',
    });
  }
}
```

#### Step 3: 创建页面组件
```typescript
// src/pages/NewFeaturePage.tsx
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';

export default function NewFeaturePage() {
  const items = useLiveQuery(() => db.newFeatures.toArray());
  
  return (
    <div>
      {/* 你的UI */}
    </div>
  );
}
```

#### Step 4: 添加路由
```typescript
// src/App.tsx
import NewFeaturePage from '@/pages/NewFeaturePage';

<Route path=\"new-feature\" element={<NewFeaturePage />} />
```

#### Step 5: 添加导航
```typescript
// src/components/Layout.tsx
const navigation = [
  // ... 现有导航
  { name: '新功能', href: '/new-feature', icon: Icon },
];
```

### 2. 修改现有功能

1. **找到对应的页面组件** (在 `src/pages/` 目录)
2. **查看数据模型** (在 `src/types/index.ts`)
3. **修改UI或逻辑**
4. **测试功能**

---

## 代码规范

### TypeScript

```typescript
// ✅ 好的实践
interface Props {
  name: string;
  onSave: (data: Recipe) => void;
  isLoading?: boolean;
}

export function Component({ name, onSave, isLoading = false }: Props) {
  // ...
}

// ❌ 避免
export function Component(props: any) {
  // ...
}
```

### React组件

```typescript
// ✅ 使用函数组件 + Hooks
export default function RecipeList() {
  const [search, setSearch] = useState('');
  const recipes = useLiveQuery(() => db.recipes.toArray());
  
  return <div>{/* ... */}</div>;
}

// ❌ 避免使用class组件
```

### 样式

```typescript
// ✅ 使用Tailwind + cn工具
import { cn } from '@/lib/utils';

<div className={cn(
  'base-class',
  isActive && 'active-class',
  className
)} />

// ❌ 避免内联样式
<div style={{ color: 'red' }} />
```

### 数据库操作

```typescript
// ✅ 使用useLiveQuery自动响应数据变化
const recipes = useLiveQuery(() => db.recipes.toArray());

// ✅ 使用async/await
const handleSave = async () => {
  await db.recipes.add(newRecipe);
};

// ❌ 避免直接操作DOM
```

---

## 常用操作

### 数据库操作

```typescript
// 查询所有
const items = await db.recipes.toArray();

// 根据ID查询
const item = await db.recipes.get(id);

// 添加
const id = await db.recipes.add(newRecipe);

// 更新
await db.recipes.update(id, { name: 'New Name' });

// 删除
await db.recipes.delete(id);

// 条件查询
const filtered = await db.recipes
  .filter(r => r.isFavorite)
  .toArray();

// 关联查询
const recipeWithMenu = await db.recipes.get(id);
const menuInfo = await db.menuInfo
  .where('recipeId')
  .equals(id)
  .first();
```

### 计算函数

```typescript
// 导入计算工具
import {
  calculateRecipeCost,
  calculateRecipeAbv,
  convertToMl,
  calculateUnitPrice,
} from '@/utils/calculations';

// 计算成本
const cost = await calculateRecipeCost(recipe, ingredients);

// 计算酒精度
const abv = await calculateRecipeAbv(recipe, ingredients);

// 单位转换
const ml = convertToMl(30, 'oz'); // 30oz转为ml
```

### 导出功能

```typescript
import { exportToJSON, exportToPDF } from '@/utils/export';

// 导出JSON
await exportToJSON(data, 'backup.json');

// 导出PDF
await exportToPDF(recipes, 'menu.pdf');
```

---

## 扩展开发

### 添加新的原料分类

```typescript
// 1. 更新类型定义
// src/types/index.ts
export type SpiritType = 
  | 'spirit' 
  | 'liqueur' 
  | 'new_category'  // 新增
  | ...;

// 2. 更新分类配置
// src/pages/Ingredients.tsx
const categoryConfig = {
  // ...
  new_category: { label: '新分类', color: 'bg-purple-500' },
};
```

### 添加新的单位

```typescript
// 1. 更新类型
// src/types/index.ts
export type Unit = 'ml' | 'oz' | 'new_unit';

// 2. 更新转换率
// src/utils/calculations.ts
const conversionRates: Record<Unit, number> = {
  ml: 1,
  oz: 30,
  new_unit: 15,  // 新单位转ml的比率
};

// 3. 更新显示标签
export function formatUnit(unit: Unit): string {
  const labels: Record<Unit, string> = {
    ml: '毫升',
    oz: '盎司',
    new_unit: '新单位',
  };
  return labels[unit] || unit;
}
```

### 添加新的筛选条件

```typescript
// 在页面组件中添加筛选状态
const [filters, setFilters] = useState({
  category: undefined,
  newFilter: undefined,  // 新筛选条件
});

// 在筛选逻辑中应用
const filtered = items?.filter(item => {
  const matchesCategory = !filters.category || item.category === filters.category;
  const matchesNew = !filters.newFilter || item.newField === filters.newFilter;
  return matchesCategory && matchesNew;
});
```

---

## 调试技巧

### 1. React DevTools

```typescript
// 在组件中添加调试日志
useEffect(() => {
  console.log('Component mounted', { props, state });
}, []);

// 查看组件树和props
// Chrome扩展: React Developer Tools
```

### 2. IndexedDB调试

```
Chrome DevTools -> Application -> Storage -> IndexedDB -> CocktailMenuDB
```

可以直接查看和修改数据库内容。

### 3. 数据库查询调试

```typescript
// 在浏览器控制台
import { db } from '@/db/database';

// 查看所有配方
await db.recipes.toArray()

// 查看特定配方
await db.recipes.get(1)

// 清空数据库
await db.delete()
await db.open()
```

### 4. 性能分析

```typescript
// 使用React Profiler
import { Profiler } from 'react';

<Profiler id=\"RecipeList\" onRender={(id, phase, actualDuration) => {
  console.log({ id, phase, actualDuration });
}}>
  <RecipeList />
</Profiler>
```

---

## 常见问题

### Q: 如何重置数据库？

```typescript
// 在浏览器控制台执行
await db.delete();
window.location.reload();
```

### Q: 数据库版本升级失败怎么办？

检查 `src/db/database.ts` 中的版本号是否递增，确保 `upgrade` 函数正确处理数据迁移。

### Q: 如何添加新的页面？

参考 [开发流程 - 创建新功能](#开发流程)

### Q: 如何修改现有功能？

1. 找到对应的页面组件 (`src/pages/`)
2. 查看数据模型 (`src/types/index.ts`)
3. 修改代码并测试

### Q: 如何处理图片？

```typescript
// 使用ImagePreviewDialog组件
import ImagePreviewDialog from '@/components/ImagePreviewDialog';

<ImagePreviewDialog
  imageUrl={imageUrl}
  open={isOpen}
  onOpenChange={setIsOpen}
/>
```

### Q: 如何实现拖拽排序？

```typescript
// 使用@dnd-kit库
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, arrayMove } from '@dnd-kit/sortable';

// 参考 VenueManagement.tsx 的实现
```

---

## 下一步

1. ✅ 阅读 [项目总览](./overview.md) 了解整体架构
2. ✅ 查看 [代码规范](./coding-standards.md) 保持代码质量
3. ✅ 参考 [API文档](./api.md) 查阅具体API
4. ✅ 开始开发你的第一个功能！

---

## 资源链接

- [React文档](https://react.dev/)
- [TypeScript文档](https://www.typescriptlang.org/)
- [Dexie.js文档](https://dexie.org/)
- [Tailwind CSS文档](https://tailwindcss.com/)
- [shadcn/ui文档](https://ui.shadcn.com/)

---

**Happy Coding! 🚀**

*最后更新: 2025-11-02*
