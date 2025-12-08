import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Recipe, MenuInfo, Ingredient, VenueRecipe, Venue, SystemConfigType } from '@/types';
import { formatCurrency } from './calculations';
import { getConfigLabel } from './systemConfig';
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

async function generateRecipeHTML(
  recipe: Recipe,
  menuInfo: MenuInfo | null,
  ingredients: Ingredient[],
  displayPrice?: number,
  imageBase64List?: string[]
): Promise<string> {
  const ingredientsList = recipe.ingredients?.map(ing => {
    const ingredient = ingredients.find(i => i.id === ing.ingredientId);
    return `<tr><td style="border: 1px solid #ddd; padding: 8px;">${ingredient?.name || '未知原料'}</td><td style="border: 1px solid #ddd; padding: 8px;">${ingredient?.nameEn || ''}</td><td style="border: 1px solid #ddd; padding: 8px;">${ing.quantity || 0} ${ing.unit || ''}</td></tr>`;
  }).join('') || '<tr><td colspan="3" style="border: 1px solid #ddd; padding: 8px; text-align: center; color: #999;">暂无配料信息</td></tr>';

  const stepsList = recipe.steps?.map(step => `<tr><td style="border: 1px solid #ddd; padding: 8px; vertical-align: top;">${step.stepNumber || '1'}</td><td style="border: 1px solid #ddd; padding: 8px;">${step.instruction || '-'}</td></tr>`).join('') || '';

  return `
    <div style="text-align: center; margin-bottom: 20px;">
      <div style="font-size: 24px; font-weight: bold; margin-bottom: 5px;">${recipe.name || '未命名配方'}</div>
      ${recipe.nameEn ? `<div style="font-size: 12px; color: #666;">${recipe.nameEn}</div>` : ''}
    </div>

    ${imageBase64List && imageBase64List.length > 0 ? `
      <div style="margin-bottom: 15px;">
        <div style="display: flex; flex-wrap: wrap; gap: 12px; padding: 8px 0; justify-content: center;">
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
        <!-- 第一行：调制技法、饮用类型、使用杯型 -->
        <tr style="background-color: #f5f5f5;">
          <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">调制技法</th>
          <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">饮用类型</th>
          <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">使用杯型</th>
        </tr>
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px;">${recipe.technique ? await getConfigLabel('technique', recipe.technique) : '-'}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${menuInfo?.drinkDuration ? await getConfigLabel('drinkDuration', menuInfo.drinkDuration) : '-'}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${recipe.glassType ? await getConfigLabel('glassType', recipe.glassType) : '-'}</td>
        </tr>
        <!-- 第二行：风味标签、颜色 -->
        <tr style="background-color: #f5f5f5;">
          <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">风味标签</th>
          <th style="border: 1px solid #ddd; padding: 8px; text-align: left;" colspan="2">颜色</th>
        </tr>
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px;">${menuInfo?.flavorTags && menuInfo.flavorTags.length > 0 ? (await Promise.all(menuInfo.flavorTags.map(tag => getConfigLabel('flavorTag', tag)))).join(', ') : '-'}</td>
          <td style="border: 1px solid #ddd; padding: 8px;" colspan="2">${menuInfo?.color || '-'}</td>
        </tr>
        <!-- 第三行：建议售价、成本计算、利润率（如果有） -->
        ${displayPrice || menuInfo?.profitMargin ? `
        <tr style="background-color: #f5f5f5;">
          ${displayPrice ? '<th style="border: 1px solid #ddd; padding: 8px; text-align: left;">建议售价</th>' : ''}
          <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">成本计算</th>
          ${menuInfo?.profitMargin ? '<th style="border: 1px solid #ddd; padding: 8px; text-align: left;">利润率</th>' : ''}
          ${!displayPrice && !menuInfo?.profitMargin ? '<th style="border: 1px solid #ddd; padding: 8px; text-align: left;" colspan="2"></th>' : ''}
          ${displayPrice && !menuInfo?.profitMargin ? '<th style="border: 1px solid #ddd; padding: 8px; text-align: left;"></th>' : ''}
        </tr>
        <tr>
          ${displayPrice ? `<td style="border: 1px solid #ddd; padding: 8px;">${formatCurrency(displayPrice)}</td>` : ''}
          <td style="border: 1px solid #ddd; padding: 8px;">${formatCurrency(recipe.calculatedCost || 0)}</td>
          ${menuInfo?.profitMargin ? `<td style="border: 1px solid #ddd; padding: 8px;">${menuInfo.profitMargin}%</td>` : ''}
          ${!displayPrice && !menuInfo?.profitMargin ? '<td style="border: 1px solid #ddd; padding: 8px;" colspan="2"></td>' : ''}
          ${displayPrice && !menuInfo?.profitMargin ? '<td style="border: 1px solid #ddd; padding: 8px;"></td>' : ''}
        </tr>
        ` : `
        <tr style="background-color: #f5f5f5;">
          <th style="border: 1px solid #ddd; padding: 8px; text-align: left;" colspan="3">成本计算</th>
        </tr>
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px;" colspan="3">${formatCurrency(recipe.calculatedCost || 0)}</td>
        </tr>
        `}
        <!-- 酒款描述（如果有） -->
        ${menuInfo?.description ? `
        <tr style="background-color: #f5f5f5;">
          <th style="border: 1px solid #ddd; padding: 8px; text-align: left;" colspan="3">酒款描述</th>
        </tr>
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px;" colspan="3">${menuInfo.description}</td>
        </tr>
        ` : ''}
        <!-- 英文描述（如果有） -->
        ${menuInfo?.descriptionEn ? `
        <tr style="background-color: #f5f5f5;">
          <th style="border: 1px solid #ddd; padding: 8px; text-align: left;" colspan="3">英文描述</th>
        </tr>
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px;" colspan="3">${menuInfo.descriptionEn}</td>
        </tr>
        ` : ''}
        <!-- 备注（如果有） -->
        ${recipe.notes ? `
        <tr style="background-color: #f5f5f5;">
          <th style="border: 1px solid #ddd; padding: 8px; text-align: left;" colspan="3">备注</th>
        </tr>
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px;" colspan="3">${recipe.notes}</td>
        </tr>
        ` : ''}
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
    
    const html = await generateRecipeHTML(recipe, menuInfo, ingredients, menuInfo?.price, imageBase64List);
    await renderHTMLToPDF(pdf, html, pdfWidth, pdfHeight);
    const fileName = `${(recipe.name || '未命名配方').replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}.pdf`;
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
      
      const html = await generateRecipeHTML(recipe, recipe.menuInfo, ingredients, displayPrice, imageBase64List);
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

    // 按类别分组原料
    const ingredientsByCategory = new Map<string, Ingredient[]>();
    sortedIngredients.forEach(ingredient => {
      const category = ingredient!.category || 'other';
      if (!ingredientsByCategory.has(category)) {
        ingredientsByCategory.set(category, []);
      }
      ingredientsByCategory.get(category)!.push(ingredient!);
    });

    // 获取类别的中文标签并排序
    const categoryEntries = await Promise.all(
      Array.from(ingredientsByCategory.entries()).map(async ([category, ings]) => ({
        category,
        label: await getConfigLabel('spiritType', category),
        ingredients: ings
      }))
    );
    
    // 按类别标签排序
    categoryEntries.sort((a, b) => a.label.localeCompare(b.label, 'zh-CN'));

    const summaryHTML = `<div style="text-align: center; margin-bottom: 20px;"><div style="font-size: 24px; font-weight: bold;">原料汇总清单</div></div>${categoryEntries.map(({ label, ingredients }) => `
      <div style="margin-bottom: 20px;">
        <div style="font-size: 16px; font-weight: bold; margin-bottom: 10px; color: #333; border-bottom: 2px solid #666; padding-bottom: 5px;">${label}</div>
        <div style="column-count: 2; column-gap: 30px;">
          ${ingredients.map(ingredient => `<div style="margin-bottom: 8px; word-break: break-word;">• ${ingredient.name}${ingredient.nameEn ? ` (${ingredient.nameEn})` : ''}</div>`).join('')}
        </div>
      </div>
    `).join('')}`;
    await renderHTMLToPDF(pdf, summaryHTML, pdfWidth, pdfHeight, true);

    const fileName = `${(venue.name || '未命名店面').replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}_酒单.pdf`;
    pdf.save(fileName);
  } catch (error) {
    console.error('Failed to export PDF:', error);
    alert('导出PDF失败，请重试。错误信息：' + (error instanceof Error ? error.message : '未知错误'));
  }
}

/**
 * 生成简化版配方HTML（仅原料和步骤）
 * 优化排版以确保内容在一页内显示
 */
async function generateSimpleRecipeHTML(
  recipe: Recipe,
  menuInfo: MenuInfo | null,
  ingredients: Ingredient[]
): Promise<string> {
  // 获取默认菜单名称
  const defaultMenuName = menuInfo?.menuNames?.find(mn => mn.isDefault)?.name;
  
  const ingredientsList = recipe.ingredients?.map(ing => {
    const ingredient = ingredients.find(i => i.id === ing.ingredientId);
    return `<tr><td style="border: 1px solid #ddd; padding: 6px 8px; font-size: 12px;">${ingredient?.name || '未知原料'}</td><td style="border: 1px solid #ddd; padding: 6px 8px; text-align: center; font-size: 12px;">${ing.quantity || 0} ${ing.unit || ''}</td></tr>`;
  }).join('') || '<tr><td colspan="2" style="border: 1px solid #ddd; padding: 6px 8px; text-align: center; color: #999; font-size: 12px;">暂无配料信息</td></tr>';

  const stepsList = recipe.steps?.map(step => `<tr><td style="border: 1px solid #ddd; padding: 6px 8px; vertical-align: top; text-align: center; font-weight: bold; font-size: 12px; width: 50px;">${step.stepNumber || '1'}</td><td style="border: 1px solid #ddd; padding: 6px 8px; font-size: 12px; line-height: 1.4;">${step.instruction || '-'}</td></tr>`).join('') || '';

  return `
    <div style="text-align: center; margin-bottom: 15px;">
      <div style="font-size: 22px; font-weight: bold; margin-bottom: 4px;">${recipe.name || '未命名配方'}</div>
      ${recipe.nameEn ? `<div style="font-size: 13px; color: #666; margin-bottom: 2px;">${recipe.nameEn}</div>` : ''}
      ${defaultMenuName ? `<div style="font-size: 12px; color: #888; font-style: italic;">菜单名称: ${defaultMenuName}</div>` : ''}
    </div>

    <div style="margin-bottom: 12px;">
      <div style="font-size: 15px; font-weight: bold; margin-bottom: 6px; color: #333; border-bottom: 2px solid #333; padding-bottom: 3px;">原料列表</div>
      <table style="width: 100%; border-collapse: collapse; border: 1px solid #ddd;">
        <tr style="background-color: #f5f5f5;">
          <th style="border: 1px solid #ddd; padding: 6px 8px; text-align: left; font-size: 13px;">原料名称</th>
          <th style="border: 1px solid #ddd; padding: 6px 8px; text-align: center; font-size: 13px; width: 120px;">用量</th>
        </tr>
        ${ingredientsList}
      </table>
    </div>

    ${stepsList ? `
    <div style="margin-bottom: 12px;">
      <div style="font-size: 15px; font-weight: bold; margin-bottom: 6px; color: #333; border-bottom: 2px solid #333; padding-bottom: 3px;">制作步骤</div>
      <table style="width: 100%; border-collapse: collapse; border: 1px solid #ddd;">
        <tr style="background-color: #f5f5f5;">
          <th style="border: 1px solid #ddd; padding: 6px 8px; text-align: center; font-size: 13px; width: 50px;">步骤</th>
          <th style="border: 1px solid #ddd; padding: 6px 8px; text-align: left; font-size: 13px;">操作说明</th>
        </tr>
        ${stepsList}
      </table>
    </div>
    ` : ''}
  `;
}

/**
 * 导出单个配方的简化版PDF（仅原料和步骤）
 */
export async function exportSimpleRecipeToPDF(
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
    
    const html = await generateSimpleRecipeHTML(recipe, menuInfo, ingredients);
    await renderHTMLToPDF(pdf, html, pdfWidth, pdfHeight);
    const fileName = `${(recipe.name || '未命名配方').replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}_简化版.pdf`;
    pdf.save(fileName);
  } catch (error) {
    console.error('Failed to export simple PDF:', error);
    alert('导出简化版PDF失败，请重试。错误信息：' + (error instanceof Error ? error.message : '未知错误'));
  }
}

/**
 * 导出店面酒单的简化版PDF（仅原料和步骤）
 */
export async function exportSimpleVenueMenuToPDF(
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
      
      const html = await generateSimpleRecipeHTML(recipe, recipe.menuInfo, ingredients);
      await renderHTMLToPDF(pdf, html, pdfWidth, pdfHeight, i > 0);
    }

    const fileName = `${(venue.name || '未命名店面').replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}_简化版酒单.pdf`;
    pdf.save(fileName);
  } catch (error) {
    console.error('Failed to export simple venue menu:', error);
    alert('导出简化版酒单失败，请重试。错误信息：' + (error instanceof Error ? error.message : '未知错误'));
  }
}
