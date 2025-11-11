import { db } from '@/db/database';
import { SystemConfig, SystemConfigType } from '@/types';

/**
 * 获取指定类型的配置选项（仅启用的）
 */
export async function getConfigOptions(
  configType: SystemConfigType
): Promise<Array<{ value: string; label: string; labelEn?: string }>> {
  const configs = await db.systemConfigs
    .where('configType')
    .equals(configType)
    .and(c => c.isActive === true)
    .sortBy('displayOrder');
  
  return configs.map(c => ({
    value: c.value,
    label: c.label,
    labelEn: c.labelEn,
  }));
}

/**
 * 获取配置标签（中文）
 */
export async function getConfigLabel(
  configType: SystemConfigType,
  value: string
): Promise<string> {
  const config = await db.systemConfigs
    .where('[configType+value]')
    .equals([configType as string, value as any])
    .first();
  
  return config?.label || value;
}

/**
 * 获取配置标签（英文）
 */
export async function getConfigLabelEn(
  configType: SystemConfigType,
  value: string
): Promise<string> {
  const config = await db.systemConfigs
    .where('[configType+value]')
    .equals([configType as string, value as any])
    .first();
  
  return config?.labelEn || value;
}

/**
 * 检查配置项的使用量
 */
export async function checkConfigUsage(config: SystemConfig): Promise<number> {
  let count = 0;
  
  switch (config.configType) {
    case 'spiritType':
      // 检查原料主数据
      count += await db.ingredients
        .where('category').equals(config.value)
        .count();
      break;
      
    case 'unit':
      // 检查原料主数据的单位
      count += await db.ingredients
        .where('unit').equals(config.value)
        .count();
      // 检查配方中的配料单位
      const recipes = await db.recipes.toArray();
      recipes.forEach(recipe => {
        recipe.ingredients?.forEach(ing => {
          if (ing.unit === config.value) count++;
        });
      });
      break;
      
    case 'flavorTag':
      // 检查菜单信息中的风味标签
      const menuInfos = await db.menuInfo.toArray();
      menuInfos.forEach(menu => {
        if (menu.flavorTags?.includes(config.value)) count++;
      });
      break;
      
    case 'glassType':
      count += await db.recipes
        .where('glassType').equals(config.value)
        .count();
      break;
      
    case 'drinkDuration':
      const menus = await db.menuInfo.toArray();
      count = menus.filter(m => m.drinkDuration === config.value).length;
      break;
      
    case 'technique':
      count += await db.recipes
        .where('technique').equals(config.value)
        .count();
      break;
  }
  
  return count;
}

/**
 * 删除配置项（带数据迁移）
 * @param configId 要删除的配置ID
 * @param migrateToValue 迁移目标值，null表示置空，undefined表示检查是否需要迁移
 */
export async function deleteConfig(
  configId: number,
  migrateToValue?: string | null
): Promise<{
  success: boolean;
  message: string;
  usageCount?: number;
  configType?: SystemConfigType;
  configLabel?: string;
}> {
  try {
    const config = await db.systemConfigs.get(configId);
    
    if (!config) {
      return {
        success: false,
        message: '配置项不存在'
      };
    }
    
    // 检查是否有数据在使用
    const usageCount = await checkConfigUsage(config);
    
    if (usageCount > 0) {
      // 如果没有指定迁移目标，返回需要用户选择
      if (migrateToValue === undefined) {
        return {
          success: false,
          message: '需要迁移数据',
          usageCount,
          configType: config.configType,
          configLabel: config.label
        };
      }
      
      // 执行数据迁移（可能是迁移到其他值，也可能是置空）
      await migrateConfigValue(config, migrateToValue);
    }
    
    // 删除配置项
    await db.systemConfigs.delete(configId);
    
    return {
      success: true,
      message: usageCount > 0 
        ? `已删除配置并${migrateToValue ? '迁移' : '清空'}了 ${usageCount} 处数据`
        : '删除成功'
    };
  } catch (error) {
    console.error('删除配置失败:', error);
    return {
      success: false,
      message: `删除失败: ${error}`
    };
  }
}

/**
 * 禁用配置项
 */
export async function disableConfig(configId: number): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    await db.systemConfigs.update(configId, { 
      isActive: false,
      updatedAt: new Date() 
    });
    
    return {
      success: true,
      message: '已禁用配置'
    };
  } catch (error) {
    console.error('禁用配置失败:', error);
    return {
      success: false,
      message: `禁用失败: ${error}`
    };
  }
}

/**
 * 启用配置项
 */
export async function enableConfig(configId: number): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    await db.systemConfigs.update(configId, { 
      isActive: true,
      updatedAt: new Date() 
    });
    
    return {
      success: true,
      message: '已启用配置'
    };
  } catch (error) {
    console.error('启用配置失败:', error);
    return {
      success: false,
      message: `启用失败: ${error}`
    };
  }
}

/**
 * 数据迁移：将旧配置值迁移到新配置值（支持置空）
 */
export async function migrateConfigValue(
  oldConfig: SystemConfig, 
  newValue: string | null
): Promise<void> {
  const oldValue = oldConfig.value;
  
  switch (oldConfig.configType) {
    case 'spiritType':
      // 更新所有使用该分类的原料
      await db.ingredients
        .where('category').equals(oldValue)
        .modify({ category: newValue || '' });
      break;
      
    case 'unit':
      // 更新原料主数据
      await db.ingredients
        .where('unit').equals(oldValue)
        .modify({ unit: newValue || '' });
      
      // 更新配方中的配料单位
      const recipes = await db.recipes.toArray();
      for (const recipe of recipes) {
        let modified = false;
        const updatedIngredients = recipe.ingredients?.map(ing => {
          if (ing.unit === oldValue) {
            modified = true;
            return { ...ing, unit: newValue || '' };
          }
          return ing;
        });
        
        if (modified && updatedIngredients) {
          await db.recipes.update(recipe.id!, { 
            ingredients: updatedIngredients,
            updatedAt: new Date()
          });
        }
      }
      break;
      
    case 'flavorTag':
      // 更新菜单信息中的风味标签
      const menuInfos = await db.menuInfo.toArray();
      for (const menu of menuInfos) {
        if (menu.flavorTags?.includes(oldValue)) {
          // 如果是置空，则移除该标签；否则替换
          const updatedTags = newValue 
            ? menu.flavorTags.map(tag => tag === oldValue ? newValue : tag)
            : menu.flavorTags.filter(tag => tag !== oldValue);
          await db.menuInfo.update(menu.id!, { 
            flavorTags: updatedTags,
            updatedAt: new Date()
          });
        }
      }
      break;
      
    case 'glassType':
      await db.recipes
        .where('glassType').equals(oldValue)
        .modify({ 
          glassType: newValue || '',
          updatedAt: new Date()
        });
      break;
      
    case 'drinkDuration':
      const menus = await db.menuInfo.toArray();
      for (const menu of menus) {
        if (menu.drinkDuration === oldValue) {
          await db.menuInfo.update(menu.id!, { 
            drinkDuration: newValue || '',
            updatedAt: new Date()
          });
        }
      }
      break;
      
    case 'technique':
      await db.recipes
        .where('technique').equals(oldValue)
        .modify({ 
          technique: newValue || '',
          updatedAt: new Date()
        });
      break;
  }
}

/**
 * 更新配置项（支持value迁移）
 */
export async function updateConfig(
  configId: number, 
  updates: Partial<SystemConfig>
): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const config = await db.systemConfigs.get(configId);
    
    if (!config) {
      return {
        success: false,
        message: '配置项不存在'
      };
    }
    
    // 如果修改了value，需要迁移数据
    if (updates.value && updates.value !== config.value) {
      // 执行数据迁移
      await migrateConfigValue(config, updates.value);
    }
    
    // 更新配置
    await db.systemConfigs.update(configId, {
      ...updates,
      updatedAt: new Date()
    });
    
    return {
      success: true,
      message: '更新成功'
    };
  } catch (error) {
    console.error('更新配置失败:', error);
    return {
      success: false,
      message: `更新失败: ${error}`
    };
  }
}

/**
 * 添加新配置项
 */
export async function addConfig(
  config: Omit<SystemConfig, 'id' | 'createdAt' | 'updatedAt'>
): Promise<{
  success: boolean;
  message: string;
  id?: number;
}> {
  try {
    // 检查是否已存在相同的value
    const existing = await db.systemConfigs
      .where('[configType+value]')
      .equals([config.configType, config.value])
      .first();
    
    if (existing) {
      return {
        success: false,
        message: '该配置值已存在'
      };
    }
    
    const id = await db.systemConfigs.add({
      ...config,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    return {
      success: true,
      message: '添加成功',
      id
    };
  } catch (error) {
    console.error('添加配置失败:', error);
    return {
      success: false,
      message: `添加失败: ${error}`
    };
  }
}

/**
 * 批量更新配置顺序
 */
export async function updateConfigOrders(
  updates: Array<{ id: number; displayOrder: number }>
): Promise<void> {
  await db.transaction('rw', db.systemConfigs, async () => {
    for (const update of updates) {
      await db.systemConfigs.update(update.id, {
        displayOrder: update.displayOrder,
        updatedAt: new Date()
      });
    }
  });
}
