# 📝 代码规范

> 本文档定义了项目的代码风格和最佳实践，所有开发者都应遵循。

## TypeScript 规范

### 类型定义

```typescript
// ✅ 好的实践 - 明确的类型定义
interface User {
  id: number;
  name: string;
  email?: string;
}

const getUser = async (id: number): Promise<User> => {
  return await db.users.get(id);
};

// ❌ 避免 - 使用any
const getUser = async (id: any): Promise<any> => {
  return await db.users.get(id);
};
```

### 接口 vs 类型别名

```typescript
// ✅ 使用interface定义对象结构
interface Recipe {
  id: number;
  name: string;
}

// ✅ 使用type定义联合类型
type Unit = 'ml' | 'oz' | 'cl';

// ✅ 使用type定义函数类型
type OnSave = (data: Recipe) => void;
```

### 可选属性

```typescript
// ✅ 使用?表示可选
interface Ingredient {
  id?: number;  // 可选
  name: string;  // 必需
  notes?: string;  // 可选
}
```

---

## React 组件规范

### 函数组件

```typescript
// ✅ 使用函数组件 + TypeScript
interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

export function Button({ 
  label, 
  onClick, 
  variant = 'primary',
  disabled = false 
}: ButtonProps) {
  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={cn(
        'base-class',
        variant === 'primary' && 'primary-class',
        variant === 'secondary' && 'secondary-class'
      )}
    >
      {label}
    </button>
  );
}

// ❌ 避免 - class组件
class Button extends React.Component {
  // ...
}
```

### Hooks 使用

```typescript
// ✅ 正确的Hooks使用
export default function RecipeList() {
  // 1. 所有Hooks在顶层调用
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({});
  const recipes = useLiveQuery(() => db.recipes.toArray());
  
  // 2. useEffect依赖数组完整
  useEffect(() => {
    console.log('Search changed:', search);
  }, [search]);
  
  // 3. 自定义Hook
  const { isLoading, error } = useRecipes();
  
  return <div>{/* ... */}</div>;
}

// ❌ 避免 - 条件调用Hooks
function Bad() {
  if (condition) {
    const [state, setState] = useState();  // 错误！
  }
}
```

### 组件命名

```typescript
// ✅ PascalCase命名组件
export function RecipeCard() {}
export default function RecipeEditor() {}

// ✅ 文件名与组件名一致
// RecipeCard.tsx -> export function RecipeCard()
// RecipeEditor.tsx -> export default function RecipeEditor()
```

---

## 样式规范

### Tailwind CSS

```typescript
// ✅ 使用Tailwind类名
<div className=\"flex items-center gap-4 p-4 bg-white rounded-lg shadow\">
  <span className=\"text-lg font-semibold\">Title</span>
</div>

// ✅ 使用cn工具合并类名
import { cn } from '@/lib/utils';

<div className={cn(
  'base-class',
  isActive && 'active-class',
  isDisabled && 'disabled-class',
  className  // 允许外部传入className
)} />

// ❌ 避免 - 内联样式
<div style={{ color: 'red', fontSize: '16px' }} />

// ❌ 避免 - 字符串拼接
<div className={`base ${isActive ? 'active' : ''}`} />
```

### 响应式设计

```typescript
// ✅ 移动优先
<div className=\"
  w-full           // 默认(移动端)
  md:w-1/2         // 中等屏幕
  lg:w-1/3         // 大屏幕
  xl:w-1/4         // 超大屏幕
\">
```

---

## 数据库操作规范

### 查询

```typescript
// ✅ 使用useLiveQuery自动响应变化
const recipes = useLiveQuery(() => db.recipes.toArray());

// ✅ 使用async/await
const handleLoad = async () => {
  const recipe = await db.recipes.get(id);
  setRecipe(recipe);
};

// ✅ 错误处理
try {
  await db.recipes.add(newRecipe);
} catch (error) {
  console.error('Failed to add recipe:', error);
  // 显示错误提示
}

// ❌ 避免 - 不处理错误
await db.recipes.add(newRecipe);  // 可能失败
```

### 事务

```typescript
// ✅ 使用事务保证数据一致性
await db.transaction('rw', db.recipes, db.menuInfo, async () => {
  const recipeId = await db.recipes.add(recipe);
  await db.menuInfo.add({ recipeId, ...menuData });
});

// ❌ 避免 - 分开操作
const recipeId = await db.recipes.add(recipe);
await db.menuInfo.add({ recipeId, ...menuData });  // 可能失败导致不一致
```

---

## 命名规范

### 变量和函数

```typescript
// ✅ camelCase
const userName = 'John';
const isLoading = false;
const handleClick = () => {};
const calculateTotal = () => {};

// ❌ 避免
const UserName = 'John';  // 应该是camelCase
const is_loading = false;  // 应该是camelCase
```

### 常量

```typescript
// ✅ UPPER_SNAKE_CASE
const MAX_RECIPES = 100;
const DEFAULT_UNIT = 'ml';
const API_BASE_URL = 'https://api.example.com';

// ✅ 配置对象使用camelCase
const config = {
  maxRetries: 3,
  timeout: 5000,
};
```

### 组件和类

```typescript
// ✅ PascalCase
class CocktailDatabase extends Dexie {}
interface RecipeProps {}
type FlavorTag = 'sour' | 'sweet';
```

### 文件命名

```typescript
// ✅ 组件文件 - PascalCase
RecipeCard.tsx
RecipeEditor.tsx
ImagePreviewDialog.tsx

// ✅ 工具文件 - camelCase
calculations.ts
export.ts
utils.ts

// ✅ 类型文件 - camelCase
index.ts (types目录下)

// ✅ 配置文件 - kebab-case
vite.config.ts
tailwind.config.js
```

---

## 注释规范

### 函数注释

```typescript
/**
 * 计算配方的总成本
 * @param recipe - 配方对象
 * @param ingredients - 原料列表
 * @returns 总成本(元)
 */
export async function calculateRecipeCost(
  recipe: Recipe,
  ingredients: Ingredient[]
): Promise<number> {
  // 实现...
}
```

### 复杂逻辑注释

```typescript
// ✅ 解释为什么这样做
// 使用setTimeout避免在render期间更新状态
setTimeout(() => {
  setIsOpen(false);
}, 0);

// ✅ 标记TODO
// TODO: 添加错误处理
// FIXME: 修复边界情况
// NOTE: 这里需要特别注意性能

// ❌ 避免 - 无用的注释
// 设置name为value
setName(value);
```

---

## 错误处理

### 异步操作

```typescript
// ✅ 完整的错误处理
const handleSave = async () => {
  try {
    setIsLoading(true);
    await db.recipes.add(recipe);
    toast.success('保存成功');
  } catch (error) {
    console.error('Failed to save recipe:', error);
    toast.error('保存失败，请重试');
  } finally {
    setIsLoading(false);
  }
};

// ❌ 避免 - 忽略错误
const handleSave = async () => {
  await db.recipes.add(recipe);
};
```

### 用户输入验证

```typescript
// ✅ 验证用户输入
const handleSubmit = () => {
  if (!recipe.name.trim()) {
    toast.error('请输入配方名称');
    return;
  }
  
  if (recipe.ingredients.length === 0) {
    toast.error('请至少添加一种配料');
    return;
  }
  
  // 继续处理...
};
```

---

## 性能优化

### 避免不必要的渲染

```typescript
// ✅ 使用React.memo
export const RecipeCard = React.memo(({ recipe }: Props) => {
  return <div>{/* ... */}</div>;
});

// ✅ 使用useMemo缓存计算结果
const expensiveValue = useMemo(() => {
  return calculateExpensiveValue(data);
}, [data]);

// ✅ 使用useCallback缓存函数
const handleClick = useCallback(() => {
  doSomething(id);
}, [id]);
```

### 列表渲染

```typescript
// ✅ 使用key
{recipes.map(recipe => (
  <RecipeCard key={recipe.id} recipe={recipe} />
))}

// ❌ 避免 - 使用index作为key
{recipes.map((recipe, index) => (
  <RecipeCard key={index} recipe={recipe} />
))}
```

---

## 代码组织

### 导入顺序

```typescript
// 1. React相关
import { useState, useEffect } from 'react';

// 2. 第三方库
import { useLiveQuery } from 'dexie-react-hooks';
import { toast } from 'sonner';

// 3. 组件
import { Button } from '@/components/ui/button';
import RecipeCard from '@/components/RecipeCard';

// 4. 工具和类型
import { db } from '@/db/database';
import { Recipe, Ingredient } from '@/types';
import { calculateCost } from '@/utils/calculations';

// 5. 样式
import './styles.css';
```

### 组件结构

```typescript
export default function RecipeEditor() {
  // 1. Hooks
  const [recipe, setRecipe] = useState<Recipe>();
  const ingredients = useLiveQuery(() => db.ingredients.toArray());
  
  // 2. 派生状态
  const isValid = recipe?.name && recipe?.ingredients.length > 0;
  
  // 3. 事件处理函数
  const handleSave = async () => {
    // ...
  };
  
  const handleCancel = () => {
    // ...
  };
  
  // 4. useEffect
  useEffect(() => {
    // ...
  }, []);
  
  // 5. 渲染
  return (
    <div>
      {/* ... */}
    </div>
  );
}
```

---

## Git 提交规范

### 提交信息格式

```bash
# ✅ 好的提交信息
feat: 添加配方筛选功能
fix: 修复成本计算错误
docs: 更新开发文档
style: 优化卡片布局
refactor: 重构计算引擎
test: 添加单元测试
chore: 更新依赖

# ❌ 避免
update
fix bug
修改
```

### 提交粒度

```bash
# ✅ 一个提交做一件事
git commit -m "feat: 添加风味标签筛选"
git commit -m "fix: 修复标签选择bug"

# ❌ 避免 - 一个提交做多件事
git commit -m "添加筛选、修复bug、更新文档"
```

---

## 最佳实践

### 1. 保持组件简单

```typescript
// ✅ 单一职责
function RecipeCard({ recipe }: Props) {
  return <div>{/* 只负责显示 */}</div>;
}

// ❌ 避免 - 组件过于复杂
function RecipeManager() {
  // 包含了列表、编辑、删除等所有逻辑
}
```

### 2. 提取可复用逻辑

```typescript
// ✅ 自定义Hook
function useRecipes() {
  const recipes = useLiveQuery(() => db.recipes.toArray());
  const [isLoading, setIsLoading] = useState(false);
  
  const addRecipe = async (recipe: Recipe) => {
    setIsLoading(true);
    try {
      await db.recipes.add(recipe);
    } finally {
      setIsLoading(false);
    }
  };
  
  return { recipes, isLoading, addRecipe };
}
```

### 3. 使用TypeScript严格模式

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

---

## 检查清单

在提交代码前，请确保：

- [ ] 代码符合TypeScript类型要求
- [ ] 组件使用函数式写法
- [ ] 样式使用Tailwind CSS
- [ ] 数据库操作有错误处理
- [ ] 变量和函数命名规范
- [ ] 添加了必要的注释
- [ ] 没有console.log调试代码
- [ ] 测试了功能正常工作
- [ ] Git提交信息清晰

---

*最后更新: 2025-11-02*
