import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Recipe, MenuInfo, Ingredient, VenueRecipe, Venue } from '@/types';
import { db } from '@/db/database';
import { formatCurrency, getFlavorTagLabel, getDrinkDurationLabel, getGlassTypeLabel } from './calculations';
import { getPDFConfig } from './pdfConfig';

/**
 * 创建配方HTML内容（支持分页）
 */
async function createRecipeHTML(
  recipe: Recipe,
  menuInfo: MenuInfo | null,
  ingredients: Ingredient[],
  displayPrice?: number,
  showHeader?: boolean,
  headerTitle?: string,
  pageNum?: number,
  totalPages?: number,
  showExportDate?: boolean
): Promise<string> {
  const price = displayPrice ?? menuInfo?.price ?? 0;
  
  // 获取杯型标签（异步）
  const glassTypeLabel = await getGlassTypeLabel(recipe.glassType);
  
  const basicInfo = [
    `<div style="margin-bottom: 8px;"><strong>杯型：</strong>${glassTypeLabel}</div>`,
    `<div style="margin-bottom: 8px;"><strong>容量：</strong>${recipe.totalVolume || 0} ml</div>`,
    `<div style="margin-bottom: 8px;"><strong>酒精度：</strong>${recipe.calculatedAbv || 0}%</div>`,
    `<div style="margin-bottom: 8px;"><strong>成本：</strong>${formatCurrency(recipe.calculatedCost || 0)}</div>`,
  ];

  if (price > 0) {
    basicInfo.push(`<div style="margin-bottom: 8px;"><strong>售价：</strong>${formatCurrency(price)}</div>`);
  }

  if (menuInfo?.drinkDuration) {
    const durationLabel = await getDrinkDurationLabel(menuInfo.drinkDuration);
    basicInfo.push(`<div style="margin-bottom: 8px;"><strong>饮用时长：</strong>${durationLabel}</div>`);
  }

  // 获取风味标签（异步）
  let flavorTags = '';
  if (menuInfo?.flavorTags && menuInfo.flavorTags.length > 0) {
    const tagLabels = await Promise.all(menuInfo.flavorTags.map(tag => getFlavorTagLabel(tag)));
    flavorTags = `<div style="margin-top: 12px; margin-bottom: 8px;"><strong>风味标签：</strong>${tagLabels.join('、')}</div>`;
  }

  const description = menuInfo?.description
    ? `<div style="margin-top: 20px;">
         <h3 style="font-size: 16px; font-weight: bold; margin-bottom: 10px; color: #333;">酒款描述</h3>
         <p style="line-height: 1.8; color: #555;">${menuInfo.description}</p>
       </div>`
    : '';

  const ingredientsList = recipe.ingredients && recipe.ingredients.length > 0
    ? recipe.ingredients.map(ing => {
        const ingredient = ingredients.find(i => i.id === ing.ingredientId);
        const name = ingredient?.name || '未知';
        const nameEn = ingredient?.nameEn || '';
        const quantity = `${ing.quantity} ${ing.unit}`;
        const abv = ingredient?.alcoholContent ? ` (${ingredient.alcoholContent}%)` : '';
        return `<li style="margin-bottom: 8px; line-height: 1.6;">
          ${name}${nameEn ? ` (${nameEn})` : ''}: <strong>${quantity}</strong>${abv}
        </li>`;
      }).join('')
    : '<li>暂无配料</li>';

  const stepsList = recipe.steps && recipe.steps.length > 0
    ? recipe.steps.map(step => 
        `<div style="margin-bottom: 12px; line-height: 1.8; display: flex;">
          <span style="font-weight: bold; margin-right: 10px; min-width: 30px; color: #333;">${step.stepNumber}.</span>
          <span style="flex: 1; color: #555;">${step.instruction}</span>
        </div>`
      ).join('')
    : '';

  const stepsSection = stepsList
    ? `<div style="margin-top: 20px;">
         <h3 style="font-size: 16px; font-weight: bold; margin-bottom: 10px; color: #333;">制作步骤</h3>
         <div>${stepsList}</div>
       </div>`
    : '';

  const notesSection = recipe.notes
    ? `<div style="margin-top: 20px;">
         <h3 style="font-size: 16px; font-weight: bold; margin-bottom: 10px; color: #333;">备注</h3>
         <p style="line-height: 1.8; color: #555;">${recipe.notes}</p>
       </div>`
    : '';

  // 添加图片部分
  let imageSection = '';
  if (recipe.imageIds && recipe.imageIds.length > 0) {
    try {
      const firstImageRecord = await db.imageStore.get(recipe.imageIds[0]);
      if (firstImageRecord && firstImageRecord.data) {
        const reader = new FileReader();
        const base64Image: string = await new Promise((resolve, reject) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(firstImageRecord.data);
        });
        imageSection = `<div style="text-align: center; margin: 20px 0;">
                          <img src="${base64Image}" alt="${recipe.name}" 
                               style="max-width: 400px; max-height: 400px; border-radius: 8px; object-fit: cover;" />
                        </div>`;
      }
    } catch (error) {
      console.error('Failed to load image for PDF export:', error);
    }
  }

  // 页眉
  const header = showHeader && headerTitle
    ? `<div style="text-align: center; padding: 8px 0; color: #999; font-size: 11px; border-bottom: 1px solid #eee; margin-bottom: 15px;">
         ${headerTitle}
       </div>`
    : '';

  // 页码
  const pageNumber = showHeader && pageNum && totalPages
    ? `<div style="text-align: right; padding: 8px 0; color: #999; font-size: 10px; margin-top: 20px;">
         ${pageNum} / ${totalPages}
       </div>`
    : '';

  // 导出日期
  const exportDate = showExportDate
    ? `<div style="margin-top: 30px; padding: 15px 0; border-top: 1px solid #ddd; text-align: center; color: #999; font-size: 11px;">
         导出日期: ${new Date().toLocaleDateString('zh-CN')}
       </div>`
    : '';

  return `
    <div style="font-family: 'Microsoft YaHei', 'PingFang SC', 'Hiragino Sans GB', Arial, sans-serif; background: white; color: #333;">
      ${header}
      <div style="padding: 0 30px;">
        <h1 style="font-size: 28px; font-weight: bold; text-align: center; margin-bottom: 8px; color: #000;">
          ${recipe.name}
        </h1>
        ${recipe.nameEn ? `<p style="font-size: 16px; font-style: italic; text-align: center; color: #888; margin-bottom: 20px;">${recipe.nameEn}</p>` : ''}
        
        ${imageSection}
        
        <div style="border-top: 2px solid #333; margin: 20px 0;"></div>
        
        <div style="margin-top: 20px;">
          <h3 style="font-size: 16px; font-weight: bold; margin-bottom: 10px; color: #333;">基本信息</h3>
          <div style="line-height: 1.6; color: #555;">
            ${basicInfo.join('')}
            ${flavorTags}
          </div>
        </div>
        
        ${description}
        
        <div style="margin-top: 20px;">
          <h3 style="font-size: 16px; font-weight: bold; margin-bottom: 10px; color: #333;">配料清单</h3>
          <ul style="padding-left: 20px; list-style-type: disc; color: #555;">
            ${ingredientsList}
          </ul>
        </div>
        
        ${stepsSection}
        ${notesSection}
        ${exportDate}
      </div>
      ${pageNumber}
    </div>
  `;
}

/**
 * 智能分页：检测内容块边界，避免在重要内容中间截断
 */
function findPageBreakPosition(
  canvas: HTMLCanvasElement,
  startY: number,
  maxHeight: number,
  safeZone: number = 50 // 安全区域（像素），用于检测内容块
): number {
  const ctx = canvas.getContext('2d');
  if (!ctx) return startY + maxHeight;

  const endY = Math.min(startY + maxHeight, canvas.height);
  const checkStart = Math.max(startY, endY - safeZone);
  
  // 从理想分页位置向上查找空白区域
  for (let y = endY; y >= checkStart; y -= 5) {
    // 检查这一行是否主要是空白
    const imageData = ctx.getImageData(0, y, canvas.width, 1);
    const pixels = imageData.data;
    
    let whitePixels = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      // 检查是否接近白色（允许一些容差）
      if (r > 250 && g > 250 && b > 250) {
        whitePixels++;
      }
    }
    
    // 如果这一行超过90%是白色，认为是好的分页位置
    const whiteRatio = whitePixels / (canvas.width);
    if (whiteRatio > 0.9) {
      return y;
    }
  }
  
  // 如果找不到好的分页位置，返回原始位置
  return endY;
}

/**
 * 将HTML转换为PDF页面（改进的分页算法）
 */
async function htmlToPdfPage(
  pdf: jsPDF,
  html: string,
  isFirstPage: boolean = false
): Promise<void> {
  const config = getPDFConfig();
  
  // 创建临时容器
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = `${config.canvasWidth}px`;
  container.style.backgroundColor = config.backgroundColor;
  container.innerHTML = html;
  document.body.appendChild(container);

  // 等待图片加载
  const images = container.querySelectorAll('img');
  if (images.length > 0) {
    await Promise.all(
      Array.from(images).map((img) => {
        return new Promise((resolve) => {
          const imgElement = img as HTMLImageElement;
          if (imgElement.complete && imgElement.naturalHeight !== 0) {
            resolve(true);
          } else {
            imgElement.onload = () => resolve(true);
            imgElement.onerror = () => {
              console.warn('Image failed to load:', imgElement.src);
              resolve(true); // 即使失败也继续
            };
            // 设置超时
            setTimeout(() => resolve(true), 3000);
          }
        });
      })
    );
  }

  // 等待渲染
  await new Promise(resolve => setTimeout(resolve, config.renderDelay));

  try {
    // 转换为canvas
    const canvas = await html2canvas(container, {
      scale: config.canvasScale,
      useCORS: config.useCORS,
      allowTaint: config.allowTaint,
      backgroundColor: config.backgroundColor,
      logging: false,
      windowWidth: config.canvasWidth,
      imageTimeout: config.imageTimeout,
    });

    // 移除临时容器
    document.body.removeChild(container);

    // 添加到PDF
    if (!isFirstPage) {
      pdf.addPage();
    }

    const imgWidth = config.pageWidth - 2 * config.margin;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const pageHeight = config.pageHeight - 2 * config.margin;

    // 如果内容高度小于等于一页，直接添加
    if (imgHeight <= pageHeight) {
      const imgData = canvas.toDataURL(`image/${config.imageFormat}`, config.imageQuality);
      const format = config.imageFormat.toUpperCase() as 'PNG' | 'JPEG';
      pdf.addImage(imgData, format, config.margin, config.margin, imgWidth, imgHeight);
    } else {
      // 内容超过一页，需要智能分页处理
      const canvasPageHeight = Math.floor((pageHeight * canvas.width) / imgWidth);
      const safeZone = Math.floor(canvasPageHeight * 0.15); // 安全区域为页面高度的15%
      
      let currentY = 0;
      let pageIndex = 0;
      
      while (currentY < canvas.height) {
        if (pageIndex > 0) {
          pdf.addPage();
        }
        
        // 计算理想的结束位置
        const idealEndY = Math.min(currentY + canvasPageHeight, canvas.height);
        
        // 使用智能算法找到最佳分页位置
        let actualEndY = idealEndY;
        if (idealEndY < canvas.height) {
          // 不是最后一页，需要找最佳分页位置
          actualEndY = findPageBreakPosition(canvas, currentY, canvasPageHeight, safeZone);
        }
        
        const sourceHeight = actualEndY - currentY;
        
        // 创建临时canvas来裁剪当前页的内容
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = sourceHeight;
        const pageCtx = pageCanvas.getContext('2d');
        
        if (pageCtx) {
          // 绘制白色背景
          pageCtx.fillStyle = '#ffffff';
          pageCtx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
          
          // 从原canvas裁剪当前页的内容
          pageCtx.drawImage(
            canvas,
            0, currentY,           // 源起始位置
            canvas.width, sourceHeight,  // 源尺寸
            0, 0,                 // 目标起始位置
            pageCanvas.width, pageCanvas.height  // 目标尺寸
          );
          
          // 转换为图片并添加到PDF
          const pageImgData = pageCanvas.toDataURL(`image/${config.imageFormat}`, config.imageQuality);
          const pageImgHeight = (sourceHeight * imgWidth) / canvas.width;
          const format = config.imageFormat.toUpperCase() as 'PNG' | 'JPEG';
          pdf.addImage(pageImgData, format, config.margin, config.margin, imgWidth, pageImgHeight);
        }
        
        currentY = actualEndY;
        pageIndex++;
        
        // 防止无限循环
        if (pageIndex > 50) {
          console.error('分页次数过多，可能存在问题');
          break;
        }
      }
    }
  } catch (error) {
    document.body.removeChild(container);
    throw error;
  }
}

/**
 * 导出单个配方为PDF
 */
export async function exportRecipeToPDF(
  recipe: Recipe,
  menuInfo: MenuInfo | null,
  ingredients: Ingredient[],
  config: { includeImages?: boolean } = { includeImages: true }
) {
  try {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // 创建HTML（包含导出日期）
    const html = await createRecipeHTML(
      recipe,
      menuInfo,
      ingredients,
      undefined, // displayPrice
      false,     // showHeader
      undefined, // headerTitle
      undefined, // pageNum
      undefined, // totalPages
      true       // showExportDate
    );
    
    await htmlToPdfPage(pdf, html, true);

    // 保存PDF
    const fileName = `${recipe.name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}.pdf`;
    pdf.save(fileName);
  } catch (error) {
    console.error('Failed to export PDF:', error);
    alert('导出PDF失败，请重试');
  }
}

/**
 * 导出店面酒单为PDF
 */
export async function exportVenueMenuToPDF(
  venue: Venue,
  venueRecipes: Array<VenueRecipe & { recipe: any }>,
  ingredients: Ingredient[],
  config: { includeImages?: boolean } = { includeImages: true }
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

    const totalPages = availableRecipes.length + 1; // 配方页 + 原料清单页
    let isFirstPage = true;
    let currentPage = 0;

    // 渲染每个配方
    for (const vr of availableRecipes) {
      const recipe = vr.recipe;
      if (!recipe) continue;

      currentPage++;
      const displayPrice = vr.customPrice ?? recipe.menuInfo?.price ?? 0;
      const html = await createRecipeHTML(
        recipe,
        recipe.menuInfo,
        ingredients,
        displayPrice,
        true, // showHeader
        venue.name || '酒单',
        currentPage,
        totalPages,
        config.includeImages // 传递 includeImages 参数
      );
      
      await htmlToPdfPage(pdf, html, isFirstPage);
      isFirstPage = false;
    }

    // 添加原料汇总清单页
    currentPage++;
    const ingredientHTML = createIngredientSummaryHTML(
      availableRecipes,
      ingredients,
      venue.name || '酒单',
      currentPage,
      totalPages
    );
    await htmlToPdfPage(pdf, ingredientHTML, false);

    // 保存PDF
    const fileName = `${venue.name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}_酒单.pdf`;
    pdf.save(fileName);
  } catch (error) {
    console.error('Failed to export PDF:', error);
    alert('导出PDF失败，请重试');
  }
}

/**
 * 创建原料汇总清单HTML
 */
function createIngredientSummaryHTML(
  availableRecipes: Array<VenueRecipe & { recipe: any }>,
  ingredients: Ingredient[],
  headerTitle: string,
  pageNum: number,
  totalPages: number
): string {
  const ingredientSet = new Set<number>();
  
  availableRecipes.forEach(vr => {
    const recipe = vr.recipe;
    if (!recipe || !recipe.ingredients) return;
    
    recipe.ingredients.forEach((ing: any) => {
      ingredientSet.add(ing.ingredientId);
    });
  });

  const ingredientsList = Array.from(ingredientSet)
    .map(id => ingredients.find(i => i.id === id))
    .filter(ing => ing !== undefined)
    .sort((a, b) => a!.name.localeCompare(b!.name, 'zh-CN'))
    .map(ingredient => {
      const nameEn = ingredient!.nameEn ? ` (${ingredient!.nameEn})` : '';
      return `<li style="margin-bottom: 10px; line-height: 1.6;">${ingredient!.name}${nameEn}</li>`;
    }).join('');

  return `
    <div style="font-family: 'Microsoft YaHei', 'PingFang SC', 'Hiragino Sans GB', Arial, sans-serif; background: white; color: #333;">
      <div style="text-align: center; padding: 8px 0; color: #999; font-size: 11px; border-bottom: 1px solid #eee; margin-bottom: 15px;">
        ${headerTitle}
      </div>
      <div style="padding: 0 30px;">
        <h1 style="font-size: 28px; font-weight: bold; text-align: center; margin-bottom: 20px; color: #000;">
          原料汇总清单
        </h1>
        <div style="border-top: 2px solid #333; margin: 20px 0;"></div>
        <ul style="padding-left: 20px; line-height: 2; column-count: 2; column-gap: 40px; list-style-type: disc; color: #555;">
          ${ingredientsList}
        </ul>
      </div>
      <div style="text-align: right; padding: 8px 30px; color: #999; font-size: 10px; margin-top: 20px;">
        ${pageNum} / ${totalPages}
      </div>
    </div>
  `;
}
