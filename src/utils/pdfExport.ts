import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Recipe, MenuInfo, Ingredient, VenueRecipe, Venue } from '@/types';
import { formatCurrency } from './calculations';
import { getPDFConfig } from './pdfConfig';
import { db } from '@/db/database';

/**
 * 将Blob转换为base64
 */
async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert blob to base64'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * 获取配方的图片base64数据
 */
async function getRecipeImagesBase64(imageIds?: number[]): Promise<string[]> {
  if (!imageIds || imageIds.length === 0) {
    return [];
  }

  try {
    const images = await db.imageStore.bulkGet(imageIds);
    const base64List: string[] = [];

    for (const img of images) {
      if (img && img.data) {
        const base64 = await blobToBase64(img.data);
        base64List.push(base64);
      }
    }

    return base64List;
  } catch (error) {
    console.error('Failed to get recipe images:', error);
    return [];
  }
}

function generateRecipeHTML(
  recipe: Recipe,
  menuInfo: MenuInfo | null,
  ingredients: Ingredient[],
  displayPrice?: number,
  imageBase64List?: string[]
): string {
  const ingredientsList = recipe.ingredients?.map(ing => {
    const ingredient = ingredients.find(i => i.id === ing.ingredientId);
    return `<tr><td style="border: 1px solid #ddd; padding: 8px;">${ingredient?.name || '未知原料'}</td><td style="border: 1px solid #ddd; padding: 8px;">${ingredient?.nameEn || ''}</td><td style="border: 1px solid #ddd; padding: 8px;">${ing.quantity || 0} ${ing.unit || ''}</td></tr>`;
  }).join('') || '<tr><td colspan="3" style="border: 1px solid #ddd; padding: 8px; text-align: center; color: #999;">暂无配料信息</td></tr>';

  const stepsList = recipe.steps?.map(step => `<tr><td style="border: 1px solid #ddd; padding: 8px; vertical-align: top;">${step.stepNumber || '1'}</td><td style="border: 1px solid #ddd; padding: 8px;">${step.instruction || '-'}</td></tr>`).join('') || '';

  return `
    <div style="text-align: center; margin-bottom: 20px;">
      <div style="font-size: 24px; font-weight: bold; margin-bottom: 5px;">${recipe.name || '未命名配方'}</div>
      ${recipe.nameEn ? `<div style="font-size: 14px; color: #666;">${recipe.nameEn}</div>` : ''}
    </div>

    ${imageBase64List && imageBase64List.length > 0 ? `
      <div style="margin-bottom: 15px;">
        <div style="display: flex; gap: 12px; overflow-x: auto; padding: 8px 0;">
          ${imageBase64List.map(imgBase64 => `
            <div style="flex-shrink: 0; display: flex; align-items: center; justify-content: center; width: 180px; height: 240px; background-color: #f5f5f5; border: 1px solid #ddd; border-radius: 4px; overflow: hidden;">
              <img src="${imgBase64}" style="max-width: 100%; max-height: 100%; object-fit: contain;" />
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}
    <div style="margin-bottom: 15px;">
      <div style="font-size: 14px; font-weight: bold; margin-bottom: 8px;">基本信息</div>
      <table style="width: 100%; border-collapse: collapse; border: 1px solid #ddd;">
        <tr style="background-color: #f5f5f5;">
          <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">中文名</th>
          <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">英文名</th>
          <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">容量</th>
          <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">酒精度</th>
        </tr>
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px;">${recipe.name || '-'}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${recipe.nameEn || '-'}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${recipe.totalVolume || 0} ml</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${recipe.calculatedAbv || 0}%</td>
        </tr>
      </table>
    </div>
    <div style="margin-bottom: 15px;">
      <div style="font-size: 14px; font-weight: bold; margin-bottom: 8px;">配料列表</div>
      <table style="width: 100%; border-collapse: collapse; border: 1px solid #ddd;">
        <tr style="background-color: #f5f5f5;">
          <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">原料</th>
          <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">英文</th>
          <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">用量</th>
        </tr>
        ${ingredientsList}
      </table>
    </div>
    ${stepsList ? `<div style="margin-bottom: 15px;"><div style="font-size: 14px; font-weight: bold; margin-bottom: 8px;">制作步骤</div><table style="width: 100%; border-collapse: collapse; border: 1px solid #ddd;"><tr style="background-color: #f5f5f5;"><th style="border: 1px solid #ddd; padding: 8px; text-align: left; width: 50px;">步骤</th><th style="border: 1px solid #ddd; padding: 8px; text-align: left;">操作说明</th></tr>${stepsList}</table></div>` : ''}
    <div style="margin-bottom: 15px;">
      <div style="font-size: 14px; font-weight: bold; margin-bottom: 8px;">详细信息</div>
      <table style="width: 100%; border-collapse: collapse; border: 1px solid #ddd;">
        <tr><td style="border: 1px solid #ddd; padding: 8px; font-weight: bold; width: 20%;">杯型</td><td style="border: 1px solid #ddd; padding: 8px;">${recipe.glassType || '-'}</td></tr>
        <tr style="background-color: #f9f9f9;"><td style="border: 1px solid #ddd; padding: 8px; font-weight: bold;">颜色</td><td style="border: 1px solid #ddd; padding: 8px;">${menuInfo?.color || '-'}</td></tr>
        ${displayPrice ? `<tr><td style="border: 1px solid #ddd; padding: 8px; font-weight: bold;">售价</td><td style="border: 1px solid #ddd; padding: 8px;">${formatCurrency(displayPrice)}</td></tr>` : ''}
        <tr style="background-color: #f9f9f9;"><td style="border: 1px solid #ddd; padding: 8px; font-weight: bold;">成本</td><td style="border: 1px solid #ddd; padding: 8px;">${formatCurrency(recipe.calculatedCost || 0)}</td></tr>
        ${menuInfo?.description ? `<tr><td style="border: 1px solid #ddd; padding: 8px; font-weight: bold;">描述</td><td style="border: 1px solid #ddd; padding: 8px;">${menuInfo.description}</td></tr>` : ''}
        ${menuInfo?.descriptionEn ? `<tr style="background-color: #f9f9f9;"><td style="border: 1px solid #ddd; padding: 8px; font-weight: bold;">英文描述</td><td style="border: 1px solid #ddd; padding: 8px;">${menuInfo.descriptionEn}</td></tr>` : ''}
        ${recipe.technique ? `<tr><td style="border: 1px solid #ddd; padding: 8px; font-weight: bold;">调制技法</td><td style="border: 1px solid #ddd; padding: 8px;">${recipe.technique}</td></tr>` : ''}
        ${recipe.garnish ? `<tr style="background-color: #f9f9f9;"><td style="border: 1px solid #ddd; padding: 8px; font-weight: bold;">装饰物</td><td style="border: 1px solid #ddd; padding: 8px;">${recipe.garnish}</td></tr>` : ''}
        ${menuInfo?.flavorTags && menuInfo.flavorTags.length > 0 ? `<tr><td style="border: 1px solid #ddd; padding: 8px; font-weight: bold;">风味标签</td><td style="border: 1px solid #ddd; padding: 8px;">${menuInfo.flavorTags.join(', ')}</td></tr>` : ''}
        ${menuInfo?.drinkDuration ? `<tr style="background-color: #f9f9f9;"><td style="border: 1px solid #ddd; padding: 8px; font-weight: bold;">饮用时长</td><td style="border: 1px solid #ddd; padding: 8px;">${menuInfo.drinkDuration}</td></tr>` : ''}
        ${menuInfo?.profitMargin ? `<tr><td style="border: 1px solid #ddd; padding: 8px; font-weight: bold;">利润率</td><td style="border: 1px solid #ddd; padding: 8px;">${menuInfo.profitMargin}%</td></tr>` : ''}
        ${recipe.tags && recipe.tags.length > 0 ? `<tr style="background-color: #f9f9f9;"><td style="border: 1px solid #ddd; padding: 8px; font-weight: bold;">配方标签</td><td style="border: 1px solid #ddd; padding: 8px;">${recipe.tags.join(', ')}</td></tr>` : ''}
        ${recipe.notes ? `<tr><td style="border: 1px solid #ddd; padding: 8px; font-weight: bold;">备注</td><td style="border: 1px solid #ddd; padding: 8px;">${recipe.notes}</td></tr>` : ''}
      </table>
    </div>
  `;
}

async function renderHTMLToPDF(
  pdf: jsPDF,
  html: string,
  pdfWidth: number,
  pdfHeight: number,
  addNewPage: boolean = false
): Promise<void> {
  const config = getPDFConfig();
  const totalPdfWidth = pdfWidth; // A4 width in mm
  const totalPdfHeight = pdfHeight; // A4 height in mm
  const margin = config.margin; // 获取边距 (mm)

  // 计算内容区域的宽度和高度
  const pageContentWidth = totalPdfWidth - 2 * margin;
  const pageContentHeight = totalPdfHeight - 2 * margin;

  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '-9999px';
  container.style.width = `${pageContentWidth}mm`; // html2canvas 渲染的宽度应为内容宽度
  container.style.backgroundColor = config.backgroundColor;
  // container.style.padding = `${margin}mm`; // 移除 padding，由 jspdf 处理
  container.style.fontFamily = '"Noto Sans SC", "Microsoft YaHei", Arial, sans-serif';
  container.style.fontSize = '12px';
  container.style.lineHeight = '1.6';
  container.style.color = '#000000';
  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    // 等待指定的渲染延迟
    if (config.renderDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, config.renderDelay));
    }

    // 使用配置中的参数进行渲染
    const canvas = await html2canvas(container, {
      scale: config.canvasScale,
      useCORS: config.useCORS,
      logging: false,
      backgroundColor: config.backgroundColor,
      windowWidth: pageContentWidth * (config.canvasScale || 1), // 使用内容宽度
      windowHeight: Math.round(pageContentWidth * (config.canvasScale || 1) * 1.4), // 根据内容宽度调整
      allowTaint: config.allowTaint,
      removeContainer: false,
      imageTimeout: config.imageTimeout
    });

    // 根据配置选择图片格式和质量
    const mimeType = config.imageFormat === 'png' ? 'image/png' : 'image/jpeg';
    const imgData = canvas.toDataURL(mimeType, config.imageQuality);

    // 计算实际图片在 PDF 中的尺寸
    const imgWidth = pageContentWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let yPosition = 0; // 图像在 canvas 上的当前Y坐标
    let pdfPageY = 0; // 图像在 PDF 页面上的当前Y坐标
    let isFirstPage = true;

    while (yPosition < imgHeight) {
      if (!isFirstPage || addNewPage) {
        pdf.addPage();
        pdfPageY = 0; // 新页面从顶部开始
      }
      isFirstPage = false;

      // 计算当前页可以绘制的高度
      const currentPageRemainingHeight = pageContentHeight - pdfPageY;
      const pageDrawHeight = Math.min(imgHeight - yPosition, currentPageRemainingHeight);

      if (pageDrawHeight <= 0) {
        // 如果当前页已经没有空间，但图像还没画完，就添加新页
        pdf.addPage();
        pdfPageY = 0;
        continue;
      }
      
      const sourceY = (yPosition / imgHeight) * canvas.height;
      const sourceHeight = (pageDrawHeight / imgHeight) * canvas.height;
      
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = canvas.width;
      pageCanvas.height = sourceHeight;
      const ctx = pageCanvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(canvas, 0, sourceY, canvas.width, sourceHeight, 0, 0, canvas.width, sourceHeight);
        const pageImgData = pageCanvas.toDataURL(mimeType, config.imageQuality);
        const imgFormat = config.imageFormat === 'png' ? 'PNG' : 'JPEG';
        
        pdf.addImage(pageImgData, imgFormat, margin, margin + pdfPageY, imgWidth, pageDrawHeight); // 考虑边距和当前页面Y偏移
      }

      yPosition += pageDrawHeight;
      pdfPageY += pageDrawHeight; // 更新 PDF 页面上的Y坐标
    }
  } finally {
    document.body.removeChild(container);
  }
}

export async function exportRecipeToPDF(
  recipe: Recipe,
  menuInfo: MenuInfo | null,
  ingredients: Ingredient[]
) {
  try {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    // 获取图片base64数据
    const imageBase64List = await getRecipeImagesBase64(recipe.imageIds);
    
    const html = generateRecipeHTML(recipe, menuInfo, ingredients, menuInfo?.price, imageBase64List);
    await renderHTMLToPDF(pdf, html, pdfWidth, pdfHeight);
    const sanitizedName = (recipe.name || '未命名配方')
      .replace(/[<>:"/\\|?*]/g, '_') // 替换文件名中不允许的特殊字符
      .trim(); // 移除首尾空格
    const fileName = `${sanitizedName}.pdf`;
    pdf.save(fileName);
  } catch (error) {
    console.error('Failed to export PDF:', error);
    alert('导出PDF失败，请重试。错误信息：' + (error instanceof Error ? error.message : '未知错误'));
  }
}

export async function exportVenueMenuToPDF(
  venue: Venue,
  venueRecipes: Array<VenueRecipe & { recipe: any }>,
  ingredients: Ingredient[]
) {
  try {
    const availableRecipes = venueRecipes.filter(vr => vr.isAvailable);
    if (availableRecipes.length === 0) {
      alert('没有可导出的上架酒款');
      return;
    }
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    for (let i = 0; i < availableRecipes.length; i++) {
      const vr = availableRecipes[i];
      const recipe = vr.recipe;
      if (!recipe) continue;
      const displayPrice = vr.customPrice ?? recipe.menuInfo?.price ?? 0;
      
      // 获取图片base64数据
      const imageBase64List = await getRecipeImagesBase64(recipe.imageIds);
      
      const html = generateRecipeHTML(recipe, recipe.menuInfo, ingredients, displayPrice, imageBase64List);
      await renderHTMLToPDF(pdf, html, pdfWidth, pdfHeight, i > 0);
    }

    const ingredientSet = new Set<number>();
    availableRecipes.forEach(vr => {
      const recipe = vr.recipe;
      if (!recipe || !recipe.ingredients) return;
      recipe.ingredients.forEach((ing: any) => {
        ingredientSet.add(ing.ingredientId);
      });
    });
    const sortedIngredients = Array.from(ingredientSet)
      .map(id => ingredients.find(i => i.id === id))
      .filter(ing => ing !== undefined)
      .sort((a, b) => a!.name.localeCompare(b!.name, 'zh-CN'));

    const summaryHTML = `<div style="text-align: center; margin-bottom: 20px;"><div style="font-size: 24px; font-weight: bold;">原料汇总清单</div></div><div style="column-count: 2; column-gap: 30px;">${sortedIngredients.map(ingredient => `<div style="margin-bottom: 10px; word-break: break-word;">• ${ingredient!.name}${ingredient!.nameEn ? ` (${ingredient!.nameEn})` : ''}</div>`).join('')}</div>`;
    await renderHTMLToPDF(pdf, summaryHTML, pdfWidth, pdfHeight, true);

    const fileName = `${(venue.name || '未命名店面').replace(/[^a-zA-Z0-9\\u4e00-\\u9fa5]/g, '_')}_酒单.pdf`;
    pdf.save(fileName);
  } catch (error) {
    console.error('Failed to export PDF:', error);
    alert('导出PDF失败，请重试。错误信息：' + (error instanceof Error ? error.message : '未知错误'));
  }
}
