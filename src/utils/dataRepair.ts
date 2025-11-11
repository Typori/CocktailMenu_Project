import { db } from '@/db/database';
import { ImageRecord } from '@/types';

/**
 * 计算两个字符串的相似度(使用简化的编辑距离算法)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 1.0;
  
  const len1 = s1.length;
  const len2 = s2.length;
  
  if (len1 === 0 || len2 === 0) return 0;
  
  // 使用Levenshtein距离
  const matrix: number[][] = [];
  
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // 删除
        matrix[i][j - 1] + 1,      // 插入
        matrix[i - 1][j - 1] + cost // 替换
      );
    }
  }
  
  const distance = matrix[len1][len2];
  const maxLen = Math.max(len1, len2);
  return 1 - distance / maxLen;
}

/**
 * 迁移旧配方中的Base64图片到imageStore
 * 
 * 这个问题背景：
 * 1. 数据库升级V8之前，配方图片以Base64字符串形式直接存储在recipes表中。
 * 2. 升级V8时，会尝试将这些图片迁移到imageStore，但如果用户在V8之前导入了旧数据，
 *    或者升级过程中出现问题，可能导致部分图片未迁移。
 * 3. 此函数用于手动触发，扫描recipes表中仍存在的Base64图片，并将其迁移。
 */
export async function migrateOldRecipeImagesToImageStore(): Promise<{
  success: boolean;
  migratedImages: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let migratedImages = 0;

  try {
    console.log('🔧 开始迁移旧配方中的Base64图片到imageStore...');

    // 获取所有配方，然后过滤出包含旧图片的配方
    const allRecipes = await db.recipes.toArray();
    const recipesWithOldImages = allRecipes.filter(r => r.images && r.images.length > 0);

    console.log(`📋 找到 ${recipesWithOldImages.length} 个可能包含旧图片的配方`);

    for (const recipe of recipesWithOldImages) {
      if (recipe.images && recipe.images.length > 0) {
        const newImageIds: number[] = recipe.imageIds || [];
        
        for (const base64Image of recipe.images) {
          try {
            // 提取 MIME 类型
            const mimeMatch = base64Image.match(/^data:(image\/[a-zA-Z0-9-.+]+);base64,/);
            let mimeType = 'application/octet-stream'; // 默认MIME类型
            if (mimeMatch && mimeMatch[1]) {
              mimeType = mimeMatch[1];
            }

            // 将 Base64 字符串转换为 Blob
            const byteString = atob(base64Image.split(',')[1]);
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let i = 0; i < byteString.length; i++) {
              ia[i] = byteString.charCodeAt(i);
            }
            const blob = new Blob([ab], { type: mimeType });

            // 直接存储 Blob 到 imageStore 表（不检查重复，因为这是修复旧数据）
            const imageId = await db.imageStore.add({
              data: blob,
              mimeType: mimeType,
              createdAt: new Date(),
            } as ImageRecord);
            
            newImageIds.push(imageId);
            migratedImages++;
            console.log(`   ✅ 已迁移配方 "${recipe.name}" 的图片，新ID: ${imageId}`);
          } catch (error) {
            console.error(`迁移配方 ${recipe.name} 的图片失败:`, error);
            errors.push(`配方 "${recipe.name}" 的图片迁移失败: ${String(error)}`);
          }
        }
        
        // 更新 recipes 表，移除旧的 images 字段，添加新的 imageIds 字段
        await db.recipes.update(recipe.id!, {
          images: undefined, // 移除旧字段
          imageIds: newImageIds,
          updatedAt: new Date(),
        });
        console.log(`✅ 已更新配方 ${recipe.name} 的图片ID引用`);
      }
    }

    console.log(`\n✅ 旧图片迁移完成！`);
    console.log(`   - 迁移的图片数: ${migratedImages}`);
    console.log(`   - 错误数: ${errors.length}`);

    return {
      success: true,
      migratedImages,
      errors,
    };
  } catch (error) {
    console.error('❌ 旧图片迁移过程中出错:', error);
    return {
      success: false,
      migratedImages,
      errors: [...errors, String(error)],
    };
  }
}

/**
 * 修复配方中的原料ID引用
 * 

/**
 * 查找最匹配的原料
 */
function findBestMatch(
  targetName: string,
  ingredients: Array<{ id: number; name: string; nameEn?: string }>,
  threshold: number = 0.6
): { id: number; name: string; similarity: number } | null {
  let bestMatch: { id: number; name: string; similarity: number } | null = null;
  let bestSimilarity = threshold;
  
  for (const ing of ingredients) {
    // 计算中文名相似度
    const nameSimilarity = calculateSimilarity(targetName, ing.name);
    
    // 如果有英文名，也计算英文名相似度
    let enSimilarity = 0;
    if (ing.nameEn) {
      enSimilarity = calculateSimilarity(targetName, ing.nameEn);
    }
    
    // 取最高相似度
    const similarity = Math.max(nameSimilarity, enSimilarity);
    
    if (similarity > bestSimilarity) {
      bestSimilarity = similarity;
      bestMatch = {
        id: ing.id,
        name: ing.name,
        similarity: similarity,
      };
    }
  }
  
  return bestMatch;
}

/**
 * 修复配方中的原料ID引用
 * 
 * 问题背景：
 * 1. 旧数据导出时，ingredients数组中包含currentStock/minStock字段（来自旧的oldIngredients表）
 * 2. 导入时这些数据被写入ingredients表，但ID可能与配方中引用的ingredientId不匹配
 * 3. 需要通过名称匹配来重建正确的ID映射关系
 * 
 * 优化：
 * - 支持模糊匹配（处理名称略有差异的情况，如"波士蛋奶酒"vs"波士蛋黄酒"）
 * - 使用相似度算法找到最佳匹配
 */
export async function repairRecipeIngredientIds(): Promise<{
  success: boolean;
  repairedRecipes: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let repairedRecipes = 0;

  try {
    console.log('🔧 开始修复配方中的原料ID引用...');

    // 1. 获取所有原料
    const allIngredients = await db.ingredients.toArray();
    console.log(`📋 找到 ${allIngredients.length} 个原料`);
    
    // 建立精确匹配映射（优先使用）
    const exactMatchMap = new Map<string, number>();
    allIngredients.forEach(ing => {
      const key = `${ing.name}|${ing.nameEn || ''}`;
      exactMatchMap.set(key, ing.id!);
      exactMatchMap.set(ing.name, ing.id!);
      if (ing.nameEn) {
        exactMatchMap.set(ing.nameEn, ing.id!);
      }
    });

    console.log(`📋 已建立 ${exactMatchMap.size} 个精确匹配映射`);

    // 2. 获取所有配方
    const allRecipes = await db.recipes.toArray();
    console.log(`📋 找到 ${allRecipes.length} 个配方需要检查`);

    // 3. 检查并修复每个配方
    for (const recipe of allRecipes) {
      if (!recipe.ingredients || recipe.ingredients.length === 0) {
        continue;
      }

      let hasChanges = false;
      const repairedIngredients = [];

      for (const recipeIng of recipe.ingredients) {
        // 尝试通过当前ID查找原料
        const currentIngredient = await db.ingredients.get(recipeIng.ingredientId);
        
        if (currentIngredient) {
          // ID有效，保持不变
          repairedIngredients.push(recipeIng);
        } else {
          // ID无效，尝试修复
          console.warn(`⚠️  配方 "${recipe.name}" 中的原料ID ${recipeIng.ingredientId} 无效`);
          
          if (recipeIng.ingredientName) {
            // 1. 先尝试精确匹配
            let correctId = exactMatchMap.get(recipeIng.ingredientName);
            
            // 2. 如果精确匹配失败，尝试模糊匹配
            if (!correctId) {
              console.log(`   尝试模糊匹配: "${recipeIng.ingredientName}"`);
              const bestMatch = findBestMatch(recipeIng.ingredientName, allIngredients, 0.6);
              
              if (bestMatch) {
                correctId = bestMatch.id;
                console.log(`   ✅ 模糊匹配成功: "${recipeIng.ingredientName}" -> "${bestMatch.name}" (相似度: ${(bestMatch.similarity * 100).toFixed(1)}%)`);
              }
            }
            
            if (correctId) {
              console.log(`✅ 修复: "${recipeIng.ingredientName}" ${recipeIng.ingredientId} -> ${correctId}`);
              repairedIngredients.push({
                ...recipeIng,
                ingredientId: correctId,
              });
              hasChanges = true;
            } else {
              // 无法找到匹配的原料
              errors.push(`配方 "${recipe.name}" 中的原料 "${recipeIng.ingredientName}" 在原料库中不存在（无法找到相似匹配）`);
              // 保留原数据，但标记为问题
              repairedIngredients.push(recipeIng);
            }
          } else {
            errors.push(`配方 "${recipe.name}" 中的原料ID ${recipeIng.ingredientId} 无效且缺少名称信息`);
            repairedIngredients.push(recipeIng);
          }
        }
      }

      // 如果有修改，更新配方
      if (hasChanges) {
        await db.recipes.update(recipe.id!, {
          ingredients: repairedIngredients,
          updatedAt: new Date(),
        });
        repairedRecipes++;
        console.log(`✅ 已修复配方: ${recipe.name}`);
      }
    }

    console.log(`\n✅ 修复完成！`);
    console.log(`   - 修复的配方数: ${repairedRecipes}`);
    console.log(`   - 错误数: ${errors.length}`);

    return {
      success: true,
      repairedRecipes,
      errors,
    };
  } catch (error) {
    console.error('❌ 修复过程中出错:', error);
    return {
      success: false,
      repairedRecipes,
      errors: [...errors, String(error)],
    };
  }
}

/**
 * 清理重复的原料数据
 * 
 * 如果导入时产生了重复的原料（相同名称但不同ID），此函数会合并它们
 */
export async function deduplicateIngredients(): Promise<{
  success: boolean;
  removedCount: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let removedCount = 0;

  try {
    console.log('🔧 开始清理重复的原料数据...');

    const allIngredients = await db.ingredients.toArray();
    const nameMap = new Map<string, number[]>();

    // 按名称分组
    allIngredients.forEach(ing => {
      const key = `${ing.name}|${ing.nameEn || ''}`;
      if (!nameMap.has(key)) {
        nameMap.set(key, []);
      }
      nameMap.get(key)!.push(ing.id!);
    });

    // 找出重复项
    for (const [name, ids] of nameMap.entries()) {
      if (ids.length > 1) {
        console.log(`⚠️  发现重复原料: ${name.split('|')[0]} (${ids.length}个)`);
        
        // 保留第一个，删除其他
        const keepId = ids[0];
        const removeIds = ids.slice(1);

        // 更新所有引用了被删除ID的配方
        const recipes = await db.recipes.toArray();
        for (const recipe of recipes) {
          if (!recipe.ingredients) continue;

          let hasChanges = false;
          const updatedIngredients = recipe.ingredients.map(ing => {
            if (removeIds.includes(ing.ingredientId)) {
              hasChanges = true;
              return { ...ing, ingredientId: keepId };
            }
            return ing;
          });

          if (hasChanges) {
            await db.recipes.update(recipe.id!, {
              ingredients: updatedIngredients,
              updatedAt: new Date(),
            });
          }
        }

        // 删除重复的原料
        await db.ingredients.bulkDelete(removeIds);
        removedCount += removeIds.length;
        console.log(`✅ 已删除 ${removeIds.length} 个重复项，保留ID: ${keepId}`);
      }
    }

    console.log(`\n✅ 清理完成！删除了 ${removedCount} 个重复原料`);

    return {
      success: true,
      removedCount,
      errors,
    };
  } catch (error) {
    console.error('❌ 清理过程中出错:', error);
    return {
      success: false,
      removedCount,
      errors: [...errors, String(error)],
    };
  }
}

/**
 * 完整的数据修复流程
 */
export async function runFullDataRepair(): Promise<void> {
  console.log('🚀 开始完整数据修复流程...\n');

  // 1. 清理重复原料
  const dedupeResult = await deduplicateIngredients();
  
  // 2. 修复配方中的原料ID
  const repairResult = await repairRecipeIngredientIds();

  // 3. 迁移旧图片
  const imageMigrationResult = await migrateOldRecipeImagesToImageStore();

  // 4. 输出总结
  console.log('\n' + '='.repeat(50));
  console.log('📊 数据修复总结');
  console.log('='.repeat(50));
  console.log(`清理重复原料: ${dedupeResult.removedCount} 个`);
  console.log(`修复配方数量: ${repairResult.repairedRecipes} 个`);
  console.log(`迁移旧图片数量: ${imageMigrationResult.migratedImages} 个`);
  console.log(`错误数量: ${repairResult.errors.length + imageMigrationResult.errors.length} 个`);
  
  if (repairResult.errors.length > 0 || imageMigrationResult.errors.length > 0) {
    console.log('\n⚠️  错误详情:');
    repairResult.errors.forEach((err, i) => {
      console.log(`  ${i + 1}. ${err}`);
    });
    imageMigrationResult.errors.forEach((err, i) => {
      console.log(`  ${repairResult.errors.length + i + 1}. ${err}`);
    });
  }
  
  console.log('='.repeat(50));
}
