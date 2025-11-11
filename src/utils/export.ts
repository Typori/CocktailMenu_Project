import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { ExportConfig } from '@/types';
import { db } from '@/db/database';
import { getAppVersion } from '@/config/version';
import { runFullDataRepair } from './dataRepair';

// 导出为JSON（兼容不同数据库版本）
export async function exportToJson(): Promise<void> {
  const data: any = {
    exportDate: new Date().toISOString(),
    version: getAppVersion(),
  };

  // 导出原料数据
  try {
    data.ingredients = await db.ingredients.toArray();
    console.log(`导出 ${data.ingredients.length} 个原料数据`);
  } catch (e) {
    console.warn('Failed to export ingredients:', e);
  }

  try {
    data.recipes = await db.recipes.toArray();
    console.log(`导出 ${data.recipes.length} 个配方`);
  } catch (e) {
    console.warn('Failed to export recipes:', e);
  }

  try {
    data.menuInfo = await db.menuInfo.toArray();
    console.log(`导出 ${data.menuInfo.length} 个菜单信息`);
  } catch (e) {
    console.warn('Failed to export menuInfo:', e);
  }

  try {
    data.tags = await db.tags.toArray();
    console.log(`导出 ${data.tags.length} 个标签`);
  } catch (e) {
    console.warn('Failed to export tags:', e);
  }

  try {
    data.inventoryLogs = await db.inventoryLogs.toArray();
  } catch (e) {
    console.warn('Failed to export inventoryLogs:', e);
  }

  try {
    data.makingNotes = await db.makingNotes.toArray();
  } catch (e) {
    console.warn('Failed to export makingNotes:', e);
  }

  try {
    data.settings = await db.settings.toArray();
  } catch (e) {
    console.warn('Failed to export settings:', e);
  }

  // 新表
  try {
    data.venues = await db.venues.toArray();
    console.log(`导出 ${data.venues.length} 个场所`);
  } catch (e) {
    console.warn('Venues table not found (old database version)');
    data.venues = [];
  }

  try {
    data.venueRecipes = await db.venueRecipes.toArray();
    console.log(`导出 ${data.venueRecipes.length} 个场所配方`);
  } catch (e) {
    console.warn('VenueRecipes table not found (old database version)');
    data.venueRecipes = [];
  }

  try {
    data.venueIngredients = await db.venueIngredients.toArray();
    console.log(`导出 ${data.venueIngredients.length} 个场所原料`);
  } catch (e) {
    console.warn('VenueIngredients table not found');
    data.venueIngredients = [];
  }

  try {
    data.systemConfigs = await db.systemConfigs.toArray();
    console.log(`导出 ${data.systemConfigs.length} 个系统配置`);
  } catch (e) {
    console.warn('SystemConfigs table not found');
    data.systemConfigs = [];
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  downloadBlob(blob, `cocktail-menu-backup-${formatDate(new Date())}.json`);
  console.log('数据导出完成！');
}

// 从JSON导入
export async function importFromJson(file: File): Promise<void> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        
        // 导入数据（使用 bulkPut 会合并/更新现有数据）
        
        // 导入原料数据（兼容旧版本的 ingredientMaster 字段名）
        const ingredientsData = data.ingredients || data.ingredientMaster;
        if (ingredientsData && ingredientsData.length > 0) {
          console.log(`正在导入 ${ingredientsData.length} 个原料数据...`);
          
          // 确保数据格式正确，保留原始ID
          const formattedIngredients = ingredientsData.map((ing: any) => ({
            id: ing.id, // ⚠️ 重要：保留原始ID，确保配方引用正确
            name: ing.name,
            nameEn: ing.nameEn,
            category: ing.category,
            price: ing.price || 0,
            quantity: ing.quantity || 750,
            unit: ing.unit,
            alcoholContent: ing.alcoholContent,
            wastageRate: ing.wastageRate || 5,
            unitPrice: ing.unitPrice || (ing.price && ing.quantity ? 
              ing.price / (ing.quantity * (1 - (ing.wastageRate || 5) / 100)) : 0),
            displayOrder: ing.displayOrder || ing.id,
            notes: ing.notes,
            createdAt: ing.createdAt ? new Date(ing.createdAt) : new Date(),
            updatedAt: ing.updatedAt ? new Date(ing.updatedAt) : new Date(),
          }));
          
          await db.ingredients.bulkPut(formattedIngredients);
          console.log(`✅ 已导入 ${formattedIngredients.length} 个原料`);
          
          // 验证导入结果
          const importedCount = await db.ingredients.count();
          console.log(`📊 当前原料库总数: ${importedCount}`);
        }
        
        // 导入其他表数据
        if (data.recipes && data.recipes.length > 0) {
          console.log(`正在导入 ${data.recipes.length} 个配方...`);
          // 确保日期字段正确转换
          const formattedRecipes = data.recipes.map((recipe: any) => ({
            ...recipe,
            createdAt: recipe.createdAt ? new Date(recipe.createdAt) : new Date(),
            updatedAt: recipe.updatedAt ? new Date(recipe.updatedAt) : new Date(),
          }));
          await db.recipes.bulkPut(formattedRecipes);
          console.log(`✅ 已导入 ${formattedRecipes.length} 个配方`);
        }
        
        if (data.menuInfo && data.menuInfo.length > 0) {
          console.log(`正在导入 ${data.menuInfo.length} 个菜单信息...`);
          await db.menuInfo.bulkPut(data.menuInfo);
          console.log(`✅ 已导入 ${data.menuInfo.length} 个菜单信息`);
        }
        
        if (data.tags && data.tags.length > 0) {
          console.log(`正在导入 ${data.tags.length} 个标签...`);
          const formattedTags = data.tags.map((tag: any) => ({
            ...tag,
            createdAt: tag.createdAt ? new Date(tag.createdAt) : new Date(),
          }));
          await db.tags.bulkPut(formattedTags);
          console.log(`✅ 已导入 ${formattedTags.length} 个标签`);
        }
        
        if (data.inventoryLogs && data.inventoryLogs.length > 0) {
          console.log(`正在导入 ${data.inventoryLogs.length} 个库存日志...`);
          const formattedLogs = data.inventoryLogs.map((log: any) => ({
            ...log,
            timestamp: log.timestamp ? new Date(log.timestamp) : new Date(),
          }));
          await db.inventoryLogs.bulkPut(formattedLogs);
          console.log(`✅ 已导入 ${formattedLogs.length} 个库存日志`);
        }
        
        if (data.makingNotes && data.makingNotes.length > 0) {
          console.log(`正在导入 ${data.makingNotes.length} 个制作笔记...`);
          const formattedNotes = data.makingNotes.map((note: any) => ({
            ...note,
            timestamp: note.timestamp ? new Date(note.timestamp) : new Date(),
          }));
          await db.makingNotes.bulkPut(formattedNotes);
          console.log(`✅ 已导入 ${formattedNotes.length} 个制作笔记`);
        }
        
        if (data.settings && data.settings.length > 0) {
          console.log(`正在导入 ${data.settings.length} 个设置...`);
          await db.settings.bulkPut(data.settings);
          console.log(`✅ 已导入设置`);
        }
        
        if (data.venues && data.venues.length > 0) {
          console.log(`正在导入 ${data.venues.length} 个场所...`);
          const formattedVenues = data.venues.map((venue: any) => ({
            ...venue,
            createdAt: venue.createdAt ? new Date(venue.createdAt) : new Date(),
            updatedAt: venue.updatedAt ? new Date(venue.updatedAt) : new Date(),
          }));
          await db.venues.bulkPut(formattedVenues);
          console.log(`✅ 已导入 ${formattedVenues.length} 个场所`);
        }
        
        if (data.venueRecipes && data.venueRecipes.length > 0) {
          console.log(`正在导入 ${data.venueRecipes.length} 个场所配方...`);
          await db.venueRecipes.bulkPut(data.venueRecipes);
          console.log(`✅ 已导入 ${data.venueRecipes.length} 个场所配方`);
        }
        
        if (data.venueIngredients && data.venueIngredients.length > 0) {
          console.log(`正在导入 ${data.venueIngredients.length} 个场所原料...`);
          const formattedVenueIngs = data.venueIngredients.map((vi: any) => ({
            ...vi,
            createdAt: vi.createdAt ? new Date(vi.createdAt) : new Date(),
            updatedAt: vi.updatedAt ? new Date(vi.updatedAt) : new Date(),
          }));
          await db.venueIngredients.bulkPut(formattedVenueIngs);
          console.log(`✅ 已导入 ${formattedVenueIngs.length} 个场所原料`);
        }
        
        if (data.systemConfigs && data.systemConfigs.length > 0) {
          console.log(`正在导入 ${data.systemConfigs.length} 个系统配置...`);
          const formattedConfigs = data.systemConfigs.map((config: any) => ({
            ...config,
            createdAt: config.createdAt ? new Date(config.createdAt) : new Date(),
            updatedAt: config.updatedAt ? new Date(config.updatedAt) : new Date(),
          }));
          await db.systemConfigs.bulkPut(formattedConfigs);
          console.log(`✅ 已导入 ${formattedConfigs.length} 个系统配置`);
        }
        
        console.log('✅ 所有数据导入完成！');
        
        // 运行数据修复流程
        console.log('\n🔧 开始数据修复流程...');
        await runFullDataRepair();
        
        resolve();
      } catch (error) {
        console.error('导入失败:', error);
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

// 导出菜单为PDF
export async function exportMenuToPdf(
  recipeIds: number[],
  config: ExportConfig = { format: 'pdf', includeImages: true, language: 'zh' }
): Promise<void> {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  let yPosition = 20;

  // 添加中文字体支持（需要额外配置）
  pdf.setFont('helvetica');
  
  // 标题
  pdf.setFontSize(24);
  pdf.text('Cocktail Menu', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 15;

  for (const recipeId of recipeIds) {
    const recipe = await db.recipes.get(recipeId);
    const menuInfo = await db.menuInfo.where('recipeId').equals(recipeId).first();
    
    if (!recipe) continue;

    // 检查是否需要新页面
    if (yPosition > pageHeight - 40) {
      pdf.addPage();
      yPosition = 20;
    }

    // 酒名
    pdf.setFontSize(16);
    const displayName = menuInfo?.menuNames?.[0]?.name || recipe.name;
    pdf.text(displayName, 20, yPosition);
    yPosition += 8;

    if (recipe.nameEn) {
      pdf.setFontSize(12);
      pdf.setTextColor(100);
      pdf.text(recipe.nameEn, 20, yPosition);
      pdf.setTextColor(0);
      yPosition += 8;
    }

    // 描述
    if (menuInfo?.description) {
      pdf.setFontSize(10);
      const lines = pdf.splitTextToSize(menuInfo.description, pageWidth - 40);
      pdf.text(lines, 20, yPosition);
      yPosition += lines.length * 5 + 5;
    }

    // 价格和酒精度
    pdf.setFontSize(10);
    const info = [];
    if (menuInfo?.price) info.push(`Price: ¥${menuInfo.price}`);
    if (recipe.calculatedAbv) info.push(`ABV: ${recipe.calculatedAbv}%`);
    if (info.length > 0) {
      pdf.text(info.join(' | '), 20, yPosition);
      yPosition += 8;
    }

    // 配料（如果配置要求）
    if (config.includeInstructions && recipe.ingredients.length > 0) {
      pdf.setFontSize(9);
      pdf.text('Ingredients:', 20, yPosition);
      yPosition += 5;
      
      for (const ing of recipe.ingredients) {
        const ingredient = await db.ingredients.get(ing.ingredientId);
        if (ingredient) {
          pdf.text(`- ${ingredient.name} ${ing.quantity}${ing.unit}`, 25, yPosition);
          yPosition += 4;
        }
      }
      yPosition += 3;
    }

    yPosition += 10; // 间距
  }

  pdf.save(`cocktail-menu-${formatDate(new Date())}.pdf`);
}

// 导出单个配方为图片卡片
export async function exportRecipeCard(recipeId: number, elementId: string): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) return;

  const canvas = await html2canvas(element, {
    backgroundColor: '#ffffff',
    scale: 2,
  });

  canvas.toBlob((blob) => {
    if (blob) {
      downloadBlob(blob, `recipe-card-${recipeId}-${formatDate(new Date())}.png`);
    }
  });
}

// 辅助函数：下载Blob
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// 辅助函数：格式化日期
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// 生成购物清单
// 生成购物清单（基于店面库存）
export async function generateShoppingList(recipeIds: number[], venueId?: number): Promise<string> {
  const ingredientMap = new Map<number, { name: string; quantity: number; unit: string }>();

  for (const recipeId of recipeIds) {
    const recipe = await db.recipes.get(recipeId);
    if (!recipe) continue;

    for (const recipeIng of recipe.ingredients) {
      const ingredient = await db.ingredients.get(recipeIng.ingredientId);
      if (!ingredient) continue;

      let currentStock = 0;
      
      // 如果指定了店面，从店面库存中获取
      if (venueId) {
        const venueIng = await db.venueIngredients
          .where('[venueId+ingredientId]')
          .equals([venueId, recipeIng.ingredientId])
          .first();
        currentStock = venueIng?.currentStock || 0;
      }

      const needed = recipeIng.quantity;

      if (currentStock < needed) {
        const shortage = needed - currentStock;
        const existing = ingredientMap.get(recipeIng.ingredientId);
        
        if (existing) {
          existing.quantity += shortage;
        } else {
          ingredientMap.set(recipeIng.ingredientId, {
            name: ingredient.name,
            quantity: shortage,
            unit: recipeIng.unit,
          });
        }
      }
    }
  }

  let shoppingList = '购物清单\n\n';
  if (ingredientMap.size === 0) {
    shoppingList += '所有原料库存充足！\n';
  } else {
    ingredientMap.forEach((item) => {
      shoppingList += `- ${item.name}: ${item.quantity}${item.unit}\n`;
    });
  }

  return shoppingList;
}
