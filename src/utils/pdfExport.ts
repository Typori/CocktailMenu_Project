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
 * 创建店面酒单HTML内容
 */
function createVenueMenuHTML(
  venue: Venue,
  venueRecipes: Array<VenueRecipe & { recipe: any }>,
  ingredients: Ingredient[]
): string {
  const availableRecipes = venueRecipes.filter(vr => vr.isAvailable);

  const recipesHTML = availableRecipes.length === 0
    ? '<p style="text-align: center; color: #666; padding: 40px;">暂无上架酒款</p>'
    : availableRecipes.map((vr, index) => {
        const recipe = vr.recipe;
        if (!recipe) return '';

        const displayPrice = vr.customPrice ?? recipe.menuInfo?.price ?? 0;

        // 基本信息
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

        // 配料清单
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

        // 制作步骤
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
                    style="max-width: 300px; max-height: 300px; border-radius: 8px; display: inline-block;" 
                    crossorigin="anonymous" />
             </div>`
          : '';

        // 每个配方之间添加分页符（除了最后一个）
        const pageBreak = index < availableRecipes.length - 1 
          ? '<div style="page-break-after: always;"></div>' 
          : '';

        return `
          <div style="margin-bottom: 40px;">
            <h2 style="font-size: 28px; font-weight: bold; text-align: center; margin-bottom: 10px;">
              ${recipe.name}
            </h2>
            ${recipe.nameEn ? `<p style="font-size: 16px; font-style: italic; text-align: center; color: #666; margin-bottom: 20px;">${recipe.nameEn}</p>` : ''}
            
            ${imageSection}
            
            <div style="border-top: 2px solid #333; margin: 20px 0;"></div>
            
            <div style="margin-top: 20px;">
              <h4 style="font-size: 16px; font-weight: bold; margin-bottom: 8px;">基本信息</h4>
              <div style="line-height: 1.8;">
                ${basicInfo.join('')}
                ${flavorTags}
              </div>
            </div>
            
            ${description}
            
            <div style="margin-top: 20px;">
              <h4 style="font-size: 16px; font-weight: bold; margin-bottom: 8px;">配料清单</h4>
              <ul style="padding-left: 20px; line-height: 1.8;">
                ${ingredientsList}
              </ul>
            </div>
            
            ${stepsSection}
            ${notesSection}
          </div>
          ${pageBreak}
        `;
      }).join('');

  return `
    <div style="font-family: Arial, sans-serif; padding: 40px; max-width: 800px; background: white;">
      <h1 style="font-size: 36px; font-weight: bold; text-align: center; margin-bottom: 15px;">
        鸡尾酒菜单
      </h1>
      <h2 style="font-size: 24px; text-align: center; margin-bottom: 10px;">
        ${venue.name}
      </h2>
      ${venue.address ? `<p style="text-align: center; color: #666; margin-bottom: 5px;">${venue.address}</p>` : ''}
      ${venue.description ? `<p style="text-align: center; color: #666; font-style: italic; margin-bottom: 20px;">${venue.description}</p>` : ''}
      
      <div style="border-top: 3px solid #333; margin: 30px 0;"></div>
      
      ${recipesHTML}
      
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
    // 创建临时容器
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.innerHTML = createVenueMenuHTML(venue, venueRecipes, ingredients);
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
    const fileName = `${venue.name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}_酒单.pdf`;
    pdf.save(fileName);
  } catch (error) {
    console.error('Failed to export PDF:', error);
    alert('导出PDF失败，请重试');
  }
}
