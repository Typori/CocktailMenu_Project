import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Recipe, MenuInfo, ExportConfig } from '@/types';
import { db } from '@/db/database';

// 导出为JSON（兼容不同数据库版本）
export async function exportToJson(): Promise<void> {
  const data: any = {
    exportDate: new Date().toISOString(),
    version: '2.0',
  };

  // 安全地导出每个表，如果表不存在则跳过
  try {
    data.ingredients = await db.ingredients.toArray();
  } catch (e) {
    console.warn('Failed to export ingredients:', e);
  }

  try {
    data.recipes = await db.recipes.toArray();
  } catch (e) {
    console.warn('Failed to export recipes:', e);
  }

  try {
    data.menuInfo = await db.menuInfo.toArray();
  } catch (e) {
    console.warn('Failed to export menuInfo:', e);
  }

  try {
    data.tags = await db.tags.toArray();
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

  // 新表（可能不存在于旧版本数据库）
  try {
    data.venues = await db.venues.toArray();
  } catch (e) {
    console.warn('Venues table not found (old database version)');
    data.venues = [];
  }

  try {
    data.venueRecipes = await db.venueRecipes.toArray();
  } catch (e) {
    console.warn('VenueRecipes table not found (old database version)');
    data.venueRecipes = [];
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  downloadBlob(blob, `cocktail-menu-backup-${formatDate(new Date())}.json`);
}

// 从JSON导入
export async function importFromJson(file: File): Promise<void> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        
        // 导入数据（使用 bulkPut 会合并/更新现有数据）
        if (data.ingredients) await db.ingredients.bulkPut(data.ingredients);
        if (data.recipes) await db.recipes.bulkPut(data.recipes);
        if (data.menuInfo) await db.menuInfo.bulkPut(data.menuInfo);
        if (data.tags) await db.tags.bulkPut(data.tags);
        if (data.inventoryLogs) await db.inventoryLogs.bulkPut(data.inventoryLogs);
        if (data.makingNotes) await db.makingNotes.bulkPut(data.makingNotes);
        if (data.settings) await db.settings.bulkPut(data.settings);
        if (data.venues) await db.venues.bulkPut(data.venues);
        if (data.venueRecipes) await db.venueRecipes.bulkPut(data.venueRecipes);
        
        resolve();
      } catch (error) {
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
    pdf.text(menuInfo?.menuName || recipe.name, 20, yPosition);
    yPosition += 8;

    if (menuInfo?.menuNameEn) {
      pdf.setFontSize(12);
      pdf.setTextColor(100);
      pdf.text(menuInfo.menuNameEn, 20, yPosition);
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
        const ingredient = await db.ingredientMaster.get(ing.ingredientId);
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
export async function generateShoppingList(recipeIds: number[]): Promise<string> {
  const ingredientMap = new Map<number, { name: string; quantity: number; unit: string }>();

  for (const recipeId of recipeIds) {
    const recipe = await db.recipes.get(recipeId);
    if (!recipe) continue;

    for (const recipeIng of recipe.ingredients) {
      const ingredient = await db.ingredientMaster.get(recipeIng.ingredientId);
      if (!ingredient) continue;

      const currentStock = ingredient.currentStock || 0;
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
  ingredientMap.forEach((item) => {
    shoppingList += `- ${item.name}: ${item.quantity}${item.unit}\n`;
  });

  return shoppingList;
}
