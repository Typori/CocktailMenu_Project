import { Recipe, RecipeIngredient, Ingredient, Unit, FlavorTag, DrinkDuration, GlassType } from '@/types';
import { db } from '@/db/database';
import { getConfigLabel } from './systemConfig';

// 单位转换为ml
export function convertToMl(quantity: number, unit: Unit): number {
  const conversionRates: Record<Unit, number> = {
    ml: 1,
    oz: 30, // 1 oz = 30 ml (标准调酒用量)
    cl: 10, // 1 cl = 10 ml
    g: 1, // 假设液体密度接近水
    piece: 0, // 无法直接转换
    dash: 1, // 1 dash ≈ 1 ml
    drop: 0.05, // 1 drop ≈ 0.05 ml
    barspoon: 5, // 1 barspoon ≈ 5 ml
    part: 30, // 1 part ≈ 30 ml (可调整的比例单位)
  };

  return quantity * (conversionRates[unit] || 0);
}

// 单位转换
export function convertUnit(quantity: number, fromUnit: Unit, toUnit: Unit): number {
  // 检查是否可以转换
  if (!canConvertUnits(fromUnit, toUnit)) {
    return quantity; // 不能转换则保持原数量
  }
  
  const mlValue = convertToMl(quantity, fromUnit);
  const conversionRates: Record<Unit, number> = {
    ml: 1,
    oz: 30, // 1 oz = 30 ml (标准调酒用量)
    cl: 10,
    g: 1,
    piece: 1,
    dash: 1,
    drop: 0.05,
    barspoon: 5,
    part: 30,
  };

  return Math.round((mlValue / (conversionRates[toUnit] || 1)) * 100) / 100;
}

// 检查两个单位是否可以相互转换
export function canConvertUnits(fromUnit: Unit, toUnit: Unit): boolean {
  // 只支持这些单位的转换
  const volumeUnits = ['ml', 'oz', 'cl', 'dash'];
  const countUnits = ['piece'];
  
  const isFromVolume = volumeUnits.includes(fromUnit);
  const isToVolume = volumeUnits.includes(toUnit);
  const isFromCount = countUnits.includes(fromUnit);
  const isToCount = countUnits.includes(toUnit);
  
  // 只有同类型的单位才能转换
  return (isFromVolume && isToVolume) || (isFromCount && isToCount);
}

// 计算原料的单位价格（考虑损耗率）
// 损耗率定义：原料总数量会被损耗的比例，实际可用数量 = 数量 × (1 - 损耗率%)
// 单价 = 价格 ÷ (数量 × (1 - 损耗率%))
export function calculateUnitPrice(ingredient: Ingredient): number {
  if (ingredient.quantity === 0) return 0;
  const wastageRate = ingredient.wastageRate ?? 0; // 默认0%，不设置损耗率
  const usableQuantity = ingredient.quantity * (1 - wastageRate / 100);
  if (usableQuantity === 0) return 0; // 防止损耗率为100%时除以0
  return ingredient.price / usableQuantity;
}

// 计算配方的总成本
export async function calculateRecipeCost(recipe: Recipe): Promise<number> {
  let totalCost = 0;

  for (const recipeIngredient of recipe.ingredients) {
    const ingredient = await db.ingredientMaster.get(recipeIngredient.ingredientId);
    if (ingredient) {
      const unitPrice = calculateUnitPrice(ingredient);
      // 转换为相同单位进行计算
      const quantityInSameUnit = recipeIngredient.unit === ingredient.unit
        ? recipeIngredient.quantity
        : convertUnit(recipeIngredient.quantity, recipeIngredient.unit, ingredient.unit);
      
      totalCost += unitPrice * quantityInSameUnit;
    }
  }

  return Math.round(totalCost * 100) / 100; // 保留两位小数
}

// 计算配方的酒精度 (ABV)
export async function calculateRecipeAbv(recipe: Recipe): Promise<number> {
  let totalAlcoholVolume = 0;
  let totalVolume = 0;

  for (const recipeIngredient of recipe.ingredients) {
    const ingredient = await db.ingredientMaster.get(recipeIngredient.ingredientId);
    if (ingredient) {
      const volumeInMl = convertToMl(recipeIngredient.quantity, recipeIngredient.unit);
      totalVolume += volumeInMl;
      
      if (ingredient.alcoholContent) {
        totalAlcoholVolume += volumeInMl * (ingredient.alcoholContent / 100);
      }
    }
  }

  if (totalVolume === 0) return 0;
  return Math.round((totalAlcoholVolume / totalVolume) * 100 * 10) / 10; // 保留一位小数
}

// 计算配方的总容量
export async function calculateRecipeVolume(recipe: Recipe): Promise<number> {
  let totalVolume = 0;

  for (const recipeIngredient of recipe.ingredients) {
    const volumeInMl = convertToMl(recipeIngredient.quantity, recipeIngredient.unit);
    totalVolume += volumeInMl;
  }

  return Math.round(totalVolume * 10) / 10;
}

// 计算利润率
export function calculateProfitMargin(cost: number, price: number): number {
  if (price === 0) return 0;
  return Math.round(((price - cost) / price) * 100 * 10) / 10;
}

// 批量调整配方用量
export function scaleRecipe(recipe: Recipe, multiplier: number): Recipe {
  return {
    ...recipe,
    ingredients: recipe.ingredients.map(ing => ({
      ...ing,
      quantity: Math.round(ing.quantity * multiplier * 100) / 100,
    })),
  };
}

// 检查是否有足够库存制作配方
export async function checkRecipeStock(recipe: Recipe): Promise<{
  canMake: boolean;
  missingIngredients: Array<{ id: number; name: string; needed: number; available: number }>;
}> {
  const missingIngredients: Array<{ id: number; name: string; needed: number; available: number }> = [];

  for (const recipeIngredient of recipe.ingredients) {
    const ingredient = await db.ingredientMaster.get(recipeIngredient.ingredientId);
    if (ingredient) {
      const currentStock = ingredient.currentStock || 0;
      const neededQuantity = recipeIngredient.unit === ingredient.unit
        ? recipeIngredient.quantity
        : convertUnit(recipeIngredient.quantity, recipeIngredient.unit, ingredient.unit);

      if (currentStock < neededQuantity) {
        missingIngredients.push({
          id: ingredient.id!,
          name: ingredient.name,
          needed: neededQuantity,
          available: currentStock,
        });
      }
    }
  }

  return {
    canMake: missingIngredients.length === 0,
    missingIngredients,
  };
}

// 更新配方的计算字段
export async function updateRecipeCalculations(recipeId: number): Promise<void> {
  const recipe = await db.recipes.get(recipeId);
  if (!recipe) return;

  const cost = await calculateRecipeCost(recipe);
  const abv = await calculateRecipeAbv(recipe);
  const volume = await calculateRecipeVolume(recipe);

  await db.recipes.update(recipeId, {
    calculatedCost: cost,
    calculatedAbv: abv,
    totalVolume: volume,
    updatedAt: new Date(),
  });
}

// 格式化货币
export function formatCurrency(amount: number, currency: string = '¥'): string {
  return `${currency}${amount.toFixed(2)}`;
}

// 格式化单位
export function formatUnit(unit: Unit): string {
  const unitLabels: Record<Unit, string> = {
    ml: 'ml',
    oz: 'oz',
    cl: 'cl',
    dash: '滴',
    piece: '个',
  };
  return unitLabels[unit] || unit;
}

// 获取单位的中文标签（用于下拉菜单）- 使用动态配置
export async function getUnitLabel(unit: Unit): Promise<string> {
  return await getConfigLabel('unit', unit);
}

// 获取风味标签的中文标签 - 使用动态配置
export async function getFlavorTagLabel(tag: FlavorTag): Promise<string> {
  return await getConfigLabel('flavorTag', tag);
}

// 获取饮用时长的中文标签 - 使用动态配置
export async function getDrinkDurationLabel(duration: DrinkDuration): Promise<string> {
  return await getConfigLabel('drinkDuration', duration);
}

// 获取杯型的中文标签 - 使用动态配置
export async function getGlassTypeLabel(glassType: GlassType): Promise<string> {
  return await getConfigLabel('glassType', glassType);
}

// 获取原料分类的中文标签 - 使用动态配置
export async function getSpiritTypeLabel(spiritType: string): Promise<string> {
  return await getConfigLabel('spiritType', spiritType);
}

// 获取调制技法的中文标签 - 使用动态配置
export async function getTechniqueLabel(technique: string): Promise<string> {
  return await getConfigLabel('technique', technique);
}
