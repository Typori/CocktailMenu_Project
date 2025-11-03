# 📚 API 文档

> 本文档列出了项目中所有可用的API、工具函数和数据库操作方法。

## 数据库 API

### 数据库实例

```typescript
import { db } from '@/db/database';
```

### 表操作

#### ingredients - 原料表

```typescript
// 查询所有原料
const ingredients = await db.ingredients.toArray();

// 根据ID查询
const ingredient = await db.ingredients.get(id);

// 添加原料
const id = await db.ingredients.add({
  name: '金酒',
  category: 'spirit',
  price: 180,
  quantity: 700,
  unit: 'ml',
  alcoholContent: 40,
  currentStock: 700,
  minStock: 200,
});

// 更新原料
await db.ingredients.update(id, {
  currentStock: 650,
});

// 删除原料
await db.ingredients.delete(id);

// 条件查询
const lowStock = await db.ingredients
  .filter(ing => ing.currentStock < ing.minStock)
  .toArray();

// 按分类查询
const spirits = await db.ingredients
  .where('category')
  .equals('spirit')
  .toArray();
```

#### recipes - 配方表

```typescript
// 查询所有配方
const recipes = await db.recipes.toArray();

// 根据ID查询
const recipe = await db.recipes.get(id);

// 添加配方
const id = await db.recipes.add({
  name: '莫吉托',
  ingredients: [
    { ingredientId: 1, quantity: 50, unit: 'ml' },
    { ingredientId: 2, quantity: 20, unit: 'ml' },
  ],
  steps: [
    { stepNumber: 1, instruction: '在杯中加入冰块' },
    { stepNumber: 2, instruction: '倒入金酒和青柠汁' },
  ],
  glassType: 'highball',
});

// 更新配方
await db.recipes.update(id, {
  name: '经典莫吉托',
  isFavorite: true,
});

// 删除配方
await db.recipes.delete(id);

// 查询收藏的配方
const favorites = await db.recipes
  .filter(r => r.isFavorite)
  .toArray();
```

#### menuInfo - 菜单信息表

```typescript
// 查询所有菜单信息
const menuInfos = await db.menuInfo.toArray();

// 根据配方ID查询
const menuInfo = await db.menuInfo
  .where('recipeId')
  .equals(recipeId)
  .first();

// 添加菜单信息
await db.menuInfo.add({
  recipeId: 1,
  menuNames: [
    { id: '1', name: '莫吉托', isDefault: true }
  ],
  description: '清爽的薄荷鸡尾酒',
  flavorTags: ['sour', 'sweet'],
  drinkDuration: 'long',
  price: 68,
});

// 更新菜单信息
await db.menuInfo.update(id, {
  price: 78,
  isAvailable: true,
});
```

#### venues - 店面表

```typescript
// 查询所有店面
const venues = await db.venues.toArray();

// 添加店面
const id = await db.venues.add({
  name: '主店',
  description: '市中心旗舰店',
  address: '北京市朝阳区xxx',
});

// 更新店面
await db.venues.update(id, {
  name: '旗舰店',
});

// 删除店面
await db.venues.delete(id);
```

#### venueRecipes - 上架酒款表

```typescript
// 查询店面的所有酒款
const venueRecipes = await db.venueRecipes
  .where('venueId')
  .equals(venueId)
  .toArray();

// 添加酒款到店面
await db.venueRecipes.add({
  venueId: 1,
  recipeId: 5,
  displayOrder: 1,
  isAvailable: true,
  customPrice: 88,
});

// 更新酒款
await db.venueRecipes.update(id, {
  isAvailable: false,
});

// 删除酒款
await db.venueRecipes.delete(id);
```

---

## 计算工具 API

### 导入

```typescript
import {
  calculateRecipeCost,
  calculateRecipeAbv,
  convertToMl,
  convertUnit,
  calculateUnitPrice,
  formatUnit,
  formatCurrency,
} from '@/utils/calculations';
```

### calculateRecipeCost

计算配方的总成本

```typescript
/**
 * @param recipe - 配方对象
 * @param ingredients - 原料列表
 * @returns 总成本(元)
 */
const cost = await calculateRecipeCost(recipe, ingredients);
// 返回: 14.5
```

### calculateRecipeAbv

计算配方的酒精度

```typescript
/**
 * @param recipe - 配方对象
 * @param ingredients - 原料列表
 * @returns 酒精度(%)
 */
const abv = await calculateRecipeAbv(recipe, ingredients);
// 返回: 25.7
```

### convertToMl

将任意单位转换为毫升

```typescript
/**
 * @param quantity - 数量
 * @param unit - 单位
 * @returns 毫升数
 */
const ml = convertToMl(1, 'oz');
// 返回: 30

const ml2 = convertToMl(2, 'cl');
// 返回: 20
```

### convertUnit

在两个单位之间转换

```typescript
/**
 * @param quantity - 数量
 * @param fromUnit - 源单位
 * @param toUnit - 目标单位
 * @returns 转换后的数量
 */
const oz = convertUnit(30, 'ml', 'oz');
// 返回: 1

const cl = convertUnit(100, 'ml', 'cl');
// 返回: 10
```

### calculateUnitPrice

计算原料的单位价格

```typescript
/**
 * @param price - 总价格
 * @param quantity - 数量
 * @param wastageRate - 损耗率(%)，默认0
 * @returns 单位价格
 */
const unitPrice = calculateUnitPrice(180, 700, 5);
// 返回: 0.27 (考虑5%损耗)

const unitPrice2 = calculateUnitPrice(180, 700);
// 返回: 0.26 (无损耗)
```

### formatUnit

格式化单位显示

```typescript
/**
 * @param unit - 单位
 * @returns 中文标签
 */
const label = formatUnit('ml');
// 返回: "毫升 (ml)"

const label2 = formatUnit('oz');
// 返回: "盎司 (oz)"
```

### formatCurrency

格式化货币显示

```typescript
/**
 * @param amount - 金额
 * @param currency - 货币符号，默认'¥'
 * @returns 格式化的货币字符串
 */
const formatted = formatCurrency(14.5);
// 返回: "¥14.50"

const formatted2 = formatCurrency(14.5, '$');
// 返回: "$14.50"
```

---

## 导出工具 API

### 导入

```typescript
import {
  exportToJSON,
  exportToPDF,
  importFromJSON,
} from '@/utils/export';
```

### exportToJSON

导出数据为JSON文件

```typescript
/**
 * @param data - 要导出的数据
 * @param filename - 文件名
 */
await exportToJSON({
  recipes: await db.recipes.toArray(),
  ingredients: await db.ingredients.toArray(),
  menuInfo: await db.menuInfo.toArray(),
}, 'backup.json');
```

### exportToPDF

导出菜单为PDF

```typescript
/**
 * @param recipes - 配方列表
 * @param filename - 文件名
 */
await exportToPDF(recipes, 'menu.pdf');
```

### importFromJSON

从JSON文件导入数据

```typescript
/**
 * @param file - JSON文件
 */
const file = event.target.files[0];
await importFromJSON(file);
```

---

## React Hooks

### useLiveQuery

Dexie提供的Hook，自动响应数据库变化

```typescript
import { useLiveQuery } from 'dexie-react-hooks';

// 查询所有配方，数据变化时自动更新
const recipes = useLiveQuery(() => db.recipes.toArray());

// 查询特定配方
const recipe = useLiveQuery(
  () => db.recipes.get(id),
  [id]  // 依赖项
);

// 复杂查询
const lowStockIngredients = useLiveQuery(() =>
  db.ingredients
    .filter(ing => ing.currentStock < ing.minStock)
    .toArray()
);
```

### useTheme

主题管理Hook

```typescript
import { useTheme } from '@/contexts/ThemeContext';

function Component() {
  const { theme, setTheme } = useTheme();
  
  return (
    <button onClick={() => setTheme('dark')}>
      当前主题: {theme}
    </button>
  );
}
```

---

## 工具函数

### cn

合并Tailwind类名

```typescript
import { cn } from '@/lib/utils';

<div className={cn(
  'base-class',
  isActive && 'active-class',
  isDisabled && 'disabled-class',
  className
)} />
```

---

## 类型定义

### 核心类型

```typescript
import {
  Ingredient,
  Recipe,
  MenuInfo,
  Venue,
  VenueRecipe,
  Unit,
  SpiritType,
  FlavorTag,
  DrinkDuration,
  GlassType,
} from '@/types';
```

### Unit - 单位类型

```typescript
type Unit = 'ml' | 'oz' | 'cl' | 'dash' | 'piece';
```

### SpiritType - 原料分类

```typescript
type SpiritType = 
  | 'spirit'        // 烈酒
  | 'liqueur'       // 利口酒
  | 'other_alcohol' // 其他酒类
  | 'essence'       // 香精
  | 'juice'         // 果汁
  | 'soda'          // 汽水
  | 'syrup'         // 糖浆
  | 'garnish'       // 装饰品
  | 'other';        // 其他
```

### FlavorTag - 风味标签

```typescript
type FlavorTag = 
  | 'sour'      // 酸
  | 'sweet'     // 甜/果香
  | 'dry'       // 干
  | 'aromatic'  // 芳香
  | 'highball'; // 嗨棒
```

### DrinkDuration - 饮用类型

```typescript
type DrinkDuration = 'long' | 'short';
```

### GlassType - 杯型

```typescript
type GlassType = 
  | 'rocks'      // 古典杯
  | 'highball'   // 嗨棒杯
  | 'martini'    // 马天尼杯
  | 'flute'      // 笛型杯
  | 'wine'       // 葡萄酒杯
  | 'shot'       // 一口杯
  | 'margarita'  // 玛格丽特杯
  | 'hurricane'  // 飓风杯
  | 'tiki'       // 迈泰杯
  | 'julep'      // 圆柱形金属杯
  | 'coupe';     // 平底杯
```

---

## 常量配置

### 单位转换率

```typescript
// src/utils/calculations.ts
const conversionRates: Record<Unit, number> = {
  ml: 1,
  oz: 30,
  cl: 10,
  dash: 1,
  piece: 0,  // 不参与容量计算
};
```

### 分类配置

```typescript
// src/pages/Ingredients.tsx
const categoryConfig: Record<SpiritType, { label: string; color: string }> = {
  spirit: { label: '烈酒', color: 'bg-red-500' },
  liqueur: { label: '利口酒', color: 'bg-orange-500' },
  other_alcohol: { label: '其他酒类', color: 'bg-purple-500' },
  essence: { label: '香精', color: 'bg-pink-500' },
  juice: { label: '果汁', color: 'bg-yellow-500' },
  soda: { label: '汽水', color: 'bg-blue-500' },
  syrup: { label: '糖浆', color: 'bg-amber-500' },
  garnish: { label: '装饰品', color: 'bg-green-500' },
  other: { label: '其他', color: 'bg-gray-500' },
};
```

---

## 示例代码

### 完整的CRUD操作

```typescript
import { db } from '@/db/database';
import { useLiveQuery } from 'dexie-react-hooks';
import { Recipe } from '@/types';

export default function RecipeManager() {
  // 查询
  const recipes = useLiveQuery(() => db.recipes.toArray());
  
  // 添加
  const handleAdd = async (recipe: Recipe) => {
    try {
      const id = await db.recipes.add(recipe);
      console.log('Added recipe with id:', id);
    } catch (error) {
      console.error('Failed to add recipe:', error);
    }
  };
  
  // 更新
  const handleUpdate = async (id: number, changes: Partial<Recipe>) => {
    try {
      await db.recipes.update(id, changes);
      console.log('Updated recipe');
    } catch (error) {
      console.error('Failed to update recipe:', error);
    }
  };
  
  // 删除
  const handleDelete = async (id: number) => {
    try {
      await db.recipes.delete(id);
      console.log('Deleted recipe');
    } catch (error) {
      console.error('Failed to delete recipe:', error);
    }
  };
  
  return <div>{/* UI */}</div>;
}
```

### 关联查询

```typescript
// 查询配方及其菜单信息
const getRecipeWithMenu = async (recipeId: number) => {
  const recipe = await db.recipes.get(recipeId);
  const menuInfo = await db.menuInfo
    .where('recipeId')
    .equals(recipeId)
    .first();
  
  return { recipe, menuInfo };
};

// 查询店面的所有酒款（含配方信息）
const getVenueRecipes = async (venueId: number) => {
  const venueRecipes = await db.venueRecipes
    .where('venueId')
    .equals(venueId)
    .toArray();
  
  const recipesWithDetails = await Promise.all(
    venueRecipes.map(async (vr) => {
      const recipe = await db.recipes.get(vr.recipeId);
      const menuInfo = await db.menuInfo
        .where('recipeId')
        .equals(vr.recipeId)
        .first();
      return { ...vr, recipe, menuInfo };
    })
  );
  
  return recipesWithDetails;
};
```

---

*最后更新: 2025-11-02*
