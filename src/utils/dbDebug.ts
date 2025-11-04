import { db } from '@/db/database';

/**
 * 数据库调试工具
 * 用于检查和修复数据库问题
 */

// 检查数据库状态
export async function checkDatabaseStatus() {
  try {
    console.log('=== 数据库状态检查 ===');
    
    // 检查配方
    const recipes = await db.recipes.toArray();
    console.log(`配方数量: ${recipes.length}`);
    console.log('配方示例:', recipes[0]);
    
    // 检查原料
    const ingredients = await db.ingredients.toArray();
    console.log(`原料数量: ${ingredients.length}`);
    console.log('原料示例:', ingredients[0]);
    
    // 检查菜单信息
    const menuInfos = await db.menuInfo.toArray();
    console.log(`菜单信息数量: ${menuInfos.length}`);
    
    // 检查店面
    const venues = await db.venues.toArray();
    console.log(`店面数量: ${venues.length}`);
    
    // 检查displayOrder字段
    const recipesWithoutOrder = recipes.filter(r => r.displayOrder === undefined);
    const ingredientsWithoutOrder = ingredients.filter(i => i.displayOrder === undefined);
    
    console.log(`缺少displayOrder的配方: ${recipesWithoutOrder.length}`);
    console.log(`缺少displayOrder的原料: ${ingredientsWithoutOrder.length}`);
    
    return {
      recipes: recipes.length,
      ingredients: ingredients.length,
      menuInfos: menuInfos.length,
      venues: venues.length,
      recipesWithoutOrder: recipesWithoutOrder.length,
      ingredientsWithoutOrder: ingredientsWithoutOrder.length,
    };
  } catch (error) {
    console.error('数据库检查失败:', error);
    throw error;
  }
}

// 修复缺失的displayOrder字段
export async function fixDisplayOrder() {
  try {
    console.log('=== 开始修复displayOrder字段 ===');
    
    // 修复配方
    const recipes = await db.recipes.toArray();
    let fixedRecipes = 0;
    for (const recipe of recipes) {
      if (recipe.displayOrder === undefined && recipe.id) {
        await db.recipes.update(recipe.id, { displayOrder: recipe.id });
        fixedRecipes++;
      }
    }
    console.log(`修复了 ${fixedRecipes} 个配方的displayOrder`);
    
    // 修复原料
    const ingredients = await db.ingredients.toArray();
    let fixedIngredients = 0;
    for (const ingredient of ingredients) {
      if (ingredient.displayOrder === undefined && ingredient.id) {
        await db.ingredients.update(ingredient.id, { displayOrder: ingredient.id });
        fixedIngredients++;
      }
    }
    console.log(`修复了 ${fixedIngredients} 个原料的displayOrder`);
    
    console.log('=== 修复完成 ===');
    
    return {
      fixedRecipes,
      fixedIngredients,
    };
  } catch (error) {
    console.error('修复失败:', error);
    throw error;
  }
}

// 导出所有数据（备份）
export async function exportAllData() {
  try {
    const data = {
      recipes: await db.recipes.toArray(),
      ingredients: await db.ingredients.toArray(),
      menuInfo: await db.menuInfo.toArray(),
      venues: await db.venues.toArray(),
      venueRecipes: await db.venueRecipes.toArray(),
      tags: await db.tags.toArray(),
      settings: await db.settings.toArray(),
      exportDate: new Date().toISOString(),
    };
    
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cocktail-menu-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    console.log('数据导出成功');
    return data;
  } catch (error) {
    console.error('导出失败:', error);
    throw error;
  }
}

// 在浏览器控制台中使用这些函数
if (typeof window !== 'undefined') {
  (window as any).dbDebug = {
    checkStatus: checkDatabaseStatus,
    fixDisplayOrder: fixDisplayOrder,
    exportData: exportAllData,
  };
  console.log('数据库调试工具已加载。使用方法:');
  console.log('  dbDebug.checkStatus() - 检查数据库状态');
  console.log('  dbDebug.fixDisplayOrder() - 修复displayOrder字段');
  console.log('  dbDebug.exportData() - 导出所有数据');
}
