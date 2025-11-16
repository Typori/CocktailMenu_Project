// 重新计算所有配方的工具函数
import { db } from '@/db/database';
import { updateRecipeCalculations, calculateProfitMargin } from './calculations';

export async function recalculateAllRecipes(): Promise<void> {
  console.log('开始重新计算所有配方的酒精度和成本...');
  
  try {
    const allRecipes = await db.recipes.toArray();
    console.log(`找到 ${allRecipes.length} 个配方需要重新计算`);
    
    for (const recipe of allRecipes) {
      if (recipe.id) {
        console.log(`正在重新计算配方: ${recipe.name} (ID: ${recipe.id})`);
        await updateRecipeCalculations(recipe.id);
      }
    }
    
    // 重新计算所有MenuInfo的利润率
    console.log('开始重新计算所有菜单信息的利润率...');
    const allMenuInfos = await db.menuInfo.toArray();
    
    for (const menuInfo of allMenuInfos) {
      if (menuInfo.id && menuInfo.recipeId) {
        const recipe = await db.recipes.get(menuInfo.recipeId);
        if (recipe?.calculatedCost && menuInfo.price > 0) {
          const profitMargin = calculateProfitMargin(recipe.calculatedCost, menuInfo.price);
          await db.menuInfo.update(menuInfo.id, {
            profitMargin,
            updatedAt: new Date(),
          });
          console.log(`更新菜单信息利润率: ${profitMargin.toFixed(1)}% (配方: ${recipe.name})`);
        }
      }
    }
    
    console.log('所有配方和菜单信息重新计算完成！');
  } catch (error) {
    console.error('重新计算配方时出错:', error);
    throw error;
  }
}

// 在浏览器控制台中可以调用这个函数
if (typeof window !== 'undefined') {
  (window as any).recalculateAllRecipes = recalculateAllRecipes;
}