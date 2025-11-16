import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Recipe, MenuInfo, Ingredient, VenueRecipe, Venue } from '@/types';
import { formatCurrency, getFlavorTagLabel, getDrinkDurationLabel, getGlassTypeLabel } from './calculations';

/**
 * 创建HTML内容用于PDF导出
 */
function createRecipeHTML(
  recipe: Recipe,
  menuInfo: MenuInfo | null,
  ingredients: Ingredient[]
): string {
  const basicInfo = [
    `<div><strong>杯型：</strong>${getGlassTypeLabel(recipe.glassType)}</div>`,
    `<div><strong>容量：</strong>${recipe.totalVolume || 0} ml</div>`,
    `<div><strong>酒精度：</strong>${recipe.calculatedAbv || 0}%</div>`,
    `<div><strong>成本：</strong>${formatCurrency(recipe.calculatedCost || 0)}</div>`,
  ];

  if (menuInfo?.drinkDuration) {
    basicInfo.push(`<div><strong>饮用时长：</strong>${getDrinkDurationLabel(menuInfo.drinkDuration)}</div>`);
  }

  if (menuInfo?.price !== undefined && menuInfo.price > 0) {
    basicInfo.push(`<div><strong>售价：</strong>${formatCurrency(menuInfo.price)}</div>`);
  }

  const flavorTags = menuInfo?.flavorTags && menuInfo.flavorTags.length > 0
    ? `<div style="margin-top: 10px;"><strong>风味标签：</strong>${menuInfo.flavorTags.map(tag => getFlavorTagLabel(tag)).join(', ')}</div>`
    : '';

  const description = menuInfo?.description
    ? `<div style="margin-top: 20px;">
         <h3 style="font-size: 18px; font-weight: bold; margin-bottom: 10px;">酒款描述</h3>
         <p style="line-height: 1.6;">${menuInfo.description}</p>
       </div>`
    : '';

  const ingredientsList = recipe.ingredients && recipe.ingredients.length > 0
    ? recipe.ingredients.map(ing => {
        const ingredient = ingredients.find(i => i.id === ing.ingredientId);
        const name = ingredient?.name || '未知';
        const nameEn = ingredient?.nameEn || '';
        const quantity = `${ing.quantity} ${ing.unit}`;
        const abv = ingredient?.alcoholContent ? ` (酒精度 ${ingredient.alcoholContent}%)` : '';
        return `<li style="margin-bottom: 8px;">
          ${name}${nameEn ? ` (${nameEn})` : ''}: ${quantity}${abv}
        </li>`;
      }).join('')
    : '<li>暂无配料</li>';

  const stepsList = recipe.steps && recipe.steps.length > 0
    ? recipe.steps.map(step => 
        `<div style="margin-bottom: 12px; line-height: 1.6; display: flex;">
          <span style="font-weight: bold; margin-right: 8px; min-width: 24px;">${step.stepNumber}.</span>
          <span style="flex: 1;">${step.instruction}</span>
        </div>`
      ).join('')
    : '';

  const stepsSection = stepsList
    ? `<div style="margin-top: 20px;">
         <h3 style="font-size: 18px; font-weight: bold; margin-bottom: 10px;">制作步骤</h3>
         <div style="padding-left: 10px;">${stepsList}</div>
       </div>`
    : '';

  const notesSection = recipe.notes
    ? `<div style="margin-top: 20px;">
         <h3 style="font-size: 18px; font-weight: bold; margin-bottom: 10px;">备注</h3>
         <p style="line-height: 1.6;">${recipe.notes}</p>
       </div>`
    : '';

  const imageSection = recipe.images && recipe.images.length > 0
    ? `<div style="text-align: center; margin: 20px 0;">
         <img src="${recipe.images[0]}" alt="${recipe.name}" 
              style="max-width: 300px; max-height: 300px; border-radius: 8px; display: inline-block;" 
              crossorigin="anonymous" />
       </div>`
    : '';

  return `
    <div style="font-family: Arial, sans-serif; padding: 40px; max-width: 800px; background: white;">
      <h1 style="font-size: 32px; font-weight: bold; text-align: center; margin-bottom: 10px;">
        ${recipe.name}
      </h1>
      ${recipe.nameEn ? `<p style="font-size: 18px; font-style: italic; text-align: center; color: #666; margin-bottom: 20px;">${recipe.nameEn}</p>` : ''}
      
      ${imageSection}
      
      <div style="border-top: 2px solid #333; margin: 20px 0;"></div>
      
      <div style="margin-top: 20px;">
        <h3 style="font-size: 18px; font-weight: bold; margin-bottom: 10px;">基本信息</h3>
        <div style="line-height: 1.8;">
          ${basicInfo.join('')}
          ${flavorTags}
        </div>
      </div>
      
      ${description}
      
      <div style="margin-top: 20px;">
        <h3 style="font-size: 18px; font-weight: bold; margin-bottom: 10px;">配料清单</h3>
        <ul style="padding-left: 20px; line-height: 1.8;">
          ${ingredientsList}
        </ul>
      </div>
      
      ${stepsSection}
      ${notesSection}
      
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ccc; text-align: center; color: #666; font-size: 12px;">
        导出日期：${new Date().toLocaleDateString('zh-CN')}
      </div>
    </div>
  `;
}

/**
 * 导出单个配方为PDF
 */
export async function exportRecipeToPDF(
  recipe: Recipe,
  menuInfo: MenuInfo | null,
  ingredients: Ingredient[]
) {
  try {
    // 创建临时容器
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.innerHTML = createRecipeHTML(recipe, menuInfo, ingredients);
    document.body.appendChild(container);

    // 等待图片加载
    const images = container.querySelectorAll('img');
    console.log('Found images:', images.length);
    
    await Promise.all(
      Array.from(images).map((img, index) => {
        return new Promise((resolve) => {
          const imgElement = img as HTMLImageElement;
          console.log(`Image ${index}:`, imgElement.src, 'complete:', imgElement.complete);
          
          if (imgElement.complete && imgElement.naturalHeight !== 0) {
            console.log(`Image ${index} already loaded`);
            resolve(true);
          } else {
            imgElement.onload = () => {
              console.log(`Image ${index} loaded successfully`);
              resolve(true);
            };
            imgElement.onerror = (e) => {
              console.error(`Image ${index} failed to load:`, e);
              resolve(true); // 即使失败也继续
            };
            
            // 强制重新加载图片
            const originalSrc = imgElement.src;
            imgElement.src = '';
            imgElement.src = originalSrc;
          }
        });
      })
    );

    // 给图片一点额外的时间渲染
    await new Promise(resolve => setTimeout(resolve, 500));

    // 转换为canvas
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#ffffff',
      logging: true,
      imageTimeout: 15000,
    });

    // 移除临时容器
    document.body.removeChild(container);

    // 创建PDF
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    // 添加第一页
    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
    heightLeft -= pdfHeight;

    // 如果内容超过一页，添加更多页
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;
    }

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
  ingredients: Ingredient[]
) {
  try {
    const availableRecipes = venueRecipes.filter(vr => vr.isAvailable);
    
    if (availableRecipes.length === 0) {
      alert('没有可导出的上架酒款');
      return;
    }

    // 创建PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const margin = 15; // 页边距
    const headerHeight = 10; // 页眉高度
    const footerHeight = 10; // 页脚高度
    const contentWidth = pdfWidth - 2 * margin;
    const contentHeight = pdfHeight - 2 * margin - headerHeight - footerHeight;

    let currentPage = 0;
    const totalPages = availableRecipes.length + 1; // 配方页 + 原料清单页

    // 添加页眉页脚
    const addHeaderFooter = (pageNum: number) => {
      // 页眉 - 店面名称
      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      pdf.text(venue.name, pdfWidth / 2, margin / 2, { align: 'center' });
      
      // 页脚 - 页码
      pdf.setFontSize(9);
      pdf.text(`${pageNum} / ${totalPages}`, pdfWidth / 2, pdfHeight - margin / 2, { align: 'center' });
    };

    // 渲染每个配方
    for (let i = 0; i < availableRecipes.length; i++) {
      const vr = availableRecipes[i];
      const recipe = vr.recipe;
      if (!recipe) continue;

      currentPage++;
      
      if (i > 0) {
        pdf.addPage();
      }

      // 创建单个配方的HTML
      const displayPrice = vr.customPrice ?? recipe.menuInfo?.price ?? 0;
      const recipeHTML = createSingleRecipeHTML(recipe, displayPrice, ingredients);
      
      // 创建临时容器
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.style.width = `${contentWidth * 3.78}px`; // mm转px (1mm ≈ 3.78px)
      container.innerHTML = recipeHTML;
      document.body.appendChild(container);

      // 等待图片加载
      const images = container.querySelectorAll('img');
      await Promise.all(
        Array.from(images).map((img) => {
          return new Promise((resolve) => {
            const imgElement = img as HTMLImageElement;
            if (imgElement.complete && imgElement.naturalHeight !== 0) {
              resolve(true);
            } else {
              imgElement.onload = () => resolve(true);
              imgElement.onerror = () => resolve(true);
              const originalSrc = imgElement.src;
              imgElement.src = '';
              imgElement.src = originalSrc;
            }
          });
        })
      );

      await new Promise(resolve => setTimeout(resolve, 300));

      // 转换为canvas
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false,
        imageTimeout: 15000,
      });

      document.body.removeChild(container);

      // 计算图片尺寸
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const imgWidth = contentWidth;
      const imgHeight = (canvas.height * contentWidth) / canvas.width;

      // 如果内容高度超过可用高度，需要缩放
      if (imgHeight > contentHeight) {
        const scale = contentHeight / imgHeight;
        const scaledWidth = imgWidth * scale;
        const scaledHeight = contentHeight;
        const xOffset = margin + (contentWidth - scaledWidth) / 2;
        pdf.addImage(imgData, 'JPEG', xOffset, margin + headerHeight, scaledWidth, scaledHeight);
      } else {
        pdf.addImage(imgData, 'JPEG', margin, margin + headerHeight, imgWidth, imgHeight);
      }

      // 添加页眉页脚
      addHeaderFooter(currentPage);
    }

    // 添加原料汇总清单页
    currentPage++;
    pdf.addPage();
    
    const ingredientHTML = createIngredientSummaryHTML(availableRecipes, ingredients);
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = `${contentWidth * 3.78}px`;
    container.innerHTML = ingredientHTML;
    document.body.appendChild(container);

    await new Promise(resolve => setTimeout(resolve, 300));

    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#ffffff',
      logging: false,
    });

    document.body.removeChild(container);

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const imgWidth = contentWidth;
    const imgHeight = (canvas.height * contentWidth) / canvas.width;

    if (imgHeight > contentHeight) {
      const scale = contentHeight / imgHeight;
      const scaledWidth = imgWidth * scale;
      const scaledHeight = contentHeight;
      const xOffset = margin + (contentWidth - scaledWidth) / 2;
      pdf.addImage(imgData, 'JPEG', xOffset, margin + headerHeight, scaledWidth, scaledHeight);
    } else {
      pdf.addImage(imgData, 'JPEG', margin, margin + headerHeight, imgWidth, imgHeight);
    }

    addHeaderFooter(currentPage);

    // 保存PDF
    const fileName = `${venue.name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}_酒单.pdf`;
    pdf.save(fileName);
  } catch (error) {
    console.error('Failed to export PDF:', error);
    alert('导出PDF失败，请重试');
  }
}

/**
 * 创建单个配方的HTML（用于PDF单页渲染）
 */
function createSingleRecipeHTML(
  recipe: any,
  displayPrice: number,
  ingredients: Ingredient[]
): string {
  const basicInfo = [
    `<div><strong>杯型：</strong>${getGlassTypeLabel(recipe.glassType)}</div>`,
    `<div><strong>容量：</strong>${recipe.totalVolume || 0} ml</div>`,
    `<div><strong>酒精度：</strong>${recipe.calculatedAbv || 0}%</div>`,
    `<div><strong>成本：</strong>${formatCurrency(recipe.calculatedCost || 0)}</div>`,
    `<div><strong>售价：</strong>${formatCurrency(displayPrice)}</div>`,
  ];

  if (recipe.menuInfo?.drinkDuration) {
    basicInfo.push(`<div><strong>饮用时长：</strong>${getDrinkDurationLabel(recipe.menuInfo.drinkDuration)}</div>`);
  }

  const flavorTags = recipe.menuInfo?.flavorTags && recipe.menuInfo.flavorTags.length > 0
    ? `<div style="margin-top: 10px;"><strong>风味标签：</strong>${recipe.menuInfo.flavorTags.map((tag: any) => getFlavorTagLabel(tag)).join(', ')}</div>`
    : '';

  const description = recipe.menuInfo?.description
    ? `<div style="margin-top: 20px;">
         <h4 style="font-size: 16px; font-weight: bold; margin-bottom: 8px;">酒款描述</h4>
         <p style="line-height: 1.6;">${recipe.menuInfo.description}</p>
       </div>`
    : '';

  const ingredientsList = recipe.ingredients && recipe.ingredients.length > 0
    ? recipe.ingredients.map((ing: any) => {
        const ingredient = ingredients.find(i => i.id === ing.ingredientId);
        const name = ingredient?.name || '未知';
        const nameEn = ingredient?.nameEn || '';
        const quantity = `${ing.quantity} ${ing.unit}`;
        const abv = ingredient?.alcoholContent ? ` (酒精度 ${ingredient.alcoholContent}%)` : '';
        return `<li style="margin-bottom: 6px;">${name}${nameEn ? ` (${nameEn})` : ''}: ${quantity}${abv}</li>`;
      }).join('')
    : '<li>暂无配料</li>';

  const stepsList = recipe.steps && recipe.steps.length > 0
    ? recipe.steps.map((step: any) => 
        `<div style="margin-bottom: 10px; line-height: 1.6; display: flex;">
          <span style="font-weight: bold; margin-right: 8px; min-width: 24px;">${step.stepNumber}.</span>
          <span style="flex: 1;">${step.instruction}</span>
        </div>`
      ).join('')
    : '';

  const stepsSection = stepsList
    ? `<div style="margin-top: 20px;">
         <h4 style="font-size: 16px; font-weight: bold; margin-bottom: 8px;">制作步骤</h4>
         <div style="padding-left: 10px;">${stepsList}</div>
       </div>`
    : '';

  const notesSection = recipe.notes
    ? `<div style="margin-top: 20px;">
         <h4 style="font-size: 16px; font-weight: bold; margin-bottom: 8px;">备注</h4>
         <p style="line-height: 1.6;">${recipe.notes}</p>
       </div>`
    : '';

  const imageSection = recipe.images && recipe.images.length > 0
    ? `<div style="text-align: center; margin: 20px 0;">
         <img src="${recipe.images[0]}" alt="${recipe.name}" 
              style="max-width: 250px; max-height: 250px; border-radius: 8px; display: inline-block;" 
              crossorigin="anonymous" />
       </div>`
    : '';

  return `
    <div style="font-family: Arial, sans-serif; padding: 20px; background: white;">
      <h2 style="font-size: 28px; font-weight: bold; text-align: center; margin-bottom: 10px;">
        ${recipe.name}
      </h2>
      ${recipe.nameEn ? `<p style="font-size: 16px; font-style: italic; text-align: center; color: #666; margin-bottom: 20px;">${recipe.nameEn}</p>` : ''}
      
      ${imageSection}
      
      <div style="border-top: 2px solid #333; margin: 20px 0;"></div>
      
      <div style="margin-top: 15px;">
        <h4 style="font-size: 16px; font-weight: bold; margin-bottom: 8px;">基本信息</h4>
        <div style="line-height: 1.8;">
          ${basicInfo.join('')}
          ${flavorTags}
        </div>
      </div>
      
      ${description}
      
      <div style="margin-top: 15px;">
        <h4 style="font-size: 16px; font-weight: bold; margin-bottom: 8px;">配料清单</h4>
        <ul style="padding-left: 20px; line-height: 1.8;">
          ${ingredientsList}
        </ul>
      </div>
      
      ${stepsSection}
      ${notesSection}
    </div>
  `;
}

/**
 * 创建原料汇总清单HTML
 */
function createIngredientSummaryHTML(
  availableRecipes: Array<VenueRecipe & { recipe: any }>,
  ingredients: Ingredient[]
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
      return `<li style="margin-bottom: 8px;">${ingredient!.name}${nameEn}</li>`;
    }).join('');

  return `
    <div style="font-family: Arial, sans-serif; padding: 20px; background: white;">
      <h2 style="font-size: 28px; font-weight: bold; text-align: center; margin-bottom: 20px;">
        原料汇总清单
      </h2>
      <div style="border-top: 3px solid #333; margin: 20px 0;"></div>
      <ul style="padding-left: 20px; line-height: 2; column-count: 2; column-gap: 40px;">
        ${ingredientsList}
      </ul>
    </div>
  `;
}
