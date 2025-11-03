// 批量更新酒类原料的损耗率为5%
import { db } from '@/db/database';

export async function updateAlcoholWastageRate() {
  try {
    // 获取所有酒类原料（spirit, liqueur, wine, beer）
    const alcoholCategories = ['spirit', 'liqueur', 'wine', 'beer'];
    const ingredients = await db.ingredients.toArray();
    
    let updatedCount = 0;
    
    for (const ingredient of ingredients) {
      if (alcoholCategories.includes(ingredient.category)) {
        await db.ingredients.update(ingredient.id!, {
          wastageRate: 5,
          updatedAt: new Date(),
        });
        updatedCount++;
      }
    }
    
    console.log(`已更新 ${updatedCount} 个酒类原料的损耗率为 5%`);
    return updatedCount;
  } catch (error) {
    console.error('更新损耗率失败:', error);
    throw error;
  }
}
