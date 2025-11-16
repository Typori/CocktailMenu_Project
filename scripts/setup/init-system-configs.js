// 初始化系统配置数据的脚本
// 在浏览器控制台中运行此脚本

async function initSystemConfigs() {
  console.log('开始初始化系统配置...');
  
  // 检查是否已有配置
  const existingConfigs = await db.systemConfigs.count();
  if (existingConfigs > 0) {
    console.log(`已存在 ${existingConfigs} 个配置`);
    const confirm = window.confirm(`数据库中已有 ${existingConfigs} 个系统配置。\n是否清空并重新初始化？`);
    if (!confirm) {
      console.log('取消初始化');
      return;
    }
    await db.systemConfigs.clear();
    console.log('已清空现有配置');
  }
  
  const defaultConfigs = [
    // 原料分类 (9项)
    { configType: 'spiritType', value: 'spirit', label: '基酒', labelEn: 'Spirit', isSystem: true, isActive: true, displayOrder: 1, createdAt: new Date(), updatedAt: new Date() },
    { configType: 'spiritType', value: 'liqueur', label: '利口酒', labelEn: 'Liqueur', isSystem: true, isActive: true, displayOrder: 2, createdAt: new Date(), updatedAt: new Date() },
    { configType: 'spiritType', value: 'other_alcohol', label: '其他酒类', labelEn: 'Other Alcohol', isSystem: true, isActive: true, displayOrder: 3, createdAt: new Date(), updatedAt: new Date() },
    { configType: 'spiritType', value: 'essence', label: '香精/苦精', labelEn: 'Essence/Bitters', isSystem: true, isActive: true, displayOrder: 4, createdAt: new Date(), updatedAt: new Date() },
    { configType: 'spiritType', value: 'juice', label: '果汁', labelEn: 'Juice', isSystem: true, isActive: true, displayOrder: 5, createdAt: new Date(), updatedAt: new Date() },
    { configType: 'spiritType', value: 'soda', label: '汽水', labelEn: 'Soda', isSystem: true, isActive: true, displayOrder: 6, createdAt: new Date(), updatedAt: new Date() },
    { configType: 'spiritType', value: 'syrup', label: '糖浆', labelEn: 'Syrup', isSystem: true, isActive: true, displayOrder: 7, createdAt: new Date(), updatedAt: new Date() },
    { configType: 'spiritType', value: 'garnish', label: '装饰物', labelEn: 'Garnish', isSystem: true, isActive: true, displayOrder: 8, createdAt: new Date(), updatedAt: new Date() },
    { configType: 'spiritType', value: 'other', label: '其他', labelEn: 'Other', isSystem: true, isActive: true, displayOrder: 9, createdAt: new Date(), updatedAt: new Date() },
    
    // 单位 (5项)
    { configType: 'unit', value: 'ml', label: '毫升 (ml)', labelEn: 'Milliliter (ml)', isSystem: true, isActive: true, displayOrder: 1, metadata: { conversionRate: 1 }, createdAt: new Date(), updatedAt: new Date() },
    { configType: 'unit', value: 'oz', label: '盎司 (oz)', labelEn: 'Ounce (oz)', isSystem: true, isActive: true, displayOrder: 2, metadata: { conversionRate: 30 }, createdAt: new Date(), updatedAt: new Date() },
    { configType: 'unit', value: 'cl', label: '厘升 (cl)', labelEn: 'Centiliter (cl)', isSystem: true, isActive: true, displayOrder: 3, metadata: { conversionRate: 10 }, createdAt: new Date(), updatedAt: new Date() },
    { configType: 'unit', value: 'dash', label: '滴 (dash)', labelEn: 'Dash', isSystem: true, isActive: true, displayOrder: 4, metadata: { conversionRate: 1 }, createdAt: new Date(), updatedAt: new Date() },
    { configType: 'unit', value: 'piece', label: '个 (piece)', labelEn: 'Piece', isSystem: true, isActive: true, displayOrder: 5, metadata: { conversionRate: 1 }, createdAt: new Date(), updatedAt: new Date() },
    
    // 风味标签 (5项)
    { configType: 'flavorTag', value: 'sour', label: '酸', labelEn: 'Sour', isSystem: true, isActive: true, displayOrder: 1, createdAt: new Date(), updatedAt: new Date() },
    { configType: 'flavorTag', value: 'sweet', label: '甜/果香', labelEn: 'Sweet/Fruity', isSystem: true, isActive: true, displayOrder: 2, createdAt: new Date(), updatedAt: new Date() },
    { configType: 'flavorTag', value: 'dry', label: '干', labelEn: 'Dry', isSystem: true, isActive: true, displayOrder: 3, createdAt: new Date(), updatedAt: new Date() },
    { configType: 'flavorTag', value: 'aromatic', label: '芳香', labelEn: 'Aromatic', isSystem: true, isActive: true, displayOrder: 4, createdAt: new Date(), updatedAt: new Date() },
    { configType: 'flavorTag', value: 'highball', label: '嗨棒', labelEn: 'Highball', isSystem: true, isActive: true, displayOrder: 5, createdAt: new Date(), updatedAt: new Date() },
    
    // 饮用类型 (2项)
    { configType: 'drinkDuration', value: 'short', label: '短饮', labelEn: 'Short Drink', isSystem: true, isActive: true, displayOrder: 1, createdAt: new Date(), updatedAt: new Date() },
    { configType: 'drinkDuration', value: 'long', label: '长饮', labelEn: 'Long Drink', isSystem: true, isActive: true, displayOrder: 2, createdAt: new Date(), updatedAt: new Date() },
    
    // 杯型 (11项)
    { configType: 'glassType', value: 'rocks', label: '古典杯', labelEn: 'Rocks Glass', isSystem: true, isActive: true, displayOrder: 1, createdAt: new Date(), updatedAt: new Date() },
    { configType: 'glassType', value: 'highball', label: '海波杯', labelEn: 'Highball Glass', isSystem: true, isActive: true, displayOrder: 2, createdAt: new Date(), updatedAt: new Date() },
    { configType: 'glassType', value: 'martini', label: '马天尼杯', labelEn: 'Martini Glass', isSystem: true, isActive: true, displayOrder: 3, createdAt: new Date(), updatedAt: new Date() },
    { configType: 'glassType', value: 'coupe', label: '碟形香槟杯', labelEn: 'Coupe Glass', isSystem: true, isActive: true, displayOrder: 4, createdAt: new Date(), updatedAt: new Date() },
    { configType: 'glassType', value: 'flute', label: '笛形香槟杯', labelEn: 'Flute Glass', isSystem: true, isActive: true, displayOrder: 5, createdAt: new Date(), updatedAt: new Date() },
    { configType: 'glassType', value: 'wine', label: '红酒杯', labelEn: 'Wine Glass', isSystem: true, isActive: true, displayOrder: 6, createdAt: new Date(), updatedAt: new Date() },
    { configType: 'glassType', value: 'shot', label: '子弹杯', labelEn: 'Shot Glass', isSystem: true, isActive: true, displayOrder: 7, createdAt: new Date(), updatedAt: new Date() },
    { configType: 'glassType', value: 'margarita', label: '玛格丽特杯', labelEn: 'Margarita Glass', isSystem: true, isActive: true, displayOrder: 8, createdAt: new Date(), updatedAt: new Date() },
    { configType: 'glassType', value: 'hurricane', label: '飓风杯', labelEn: 'Hurricane Glass', isSystem: true, isActive: true, displayOrder: 9, createdAt: new Date(), updatedAt: new Date() },
    { configType: 'glassType', value: 'tiki', label: 'Tiki杯', labelEn: 'Tiki Mug', isSystem: true, isActive: true, displayOrder: 10, createdAt: new Date(), updatedAt: new Date() },
    { configType: 'glassType', value: 'julep', label: '朱利普杯', labelEn: 'Julep Cup', isSystem: true, isActive: true, displayOrder: 11, createdAt: new Date(), updatedAt: new Date() },
    
    // 调制技法 (6项)
    { configType: 'technique', value: 'shake', label: '摇和', labelEn: 'Shake', isSystem: true, isActive: true, displayOrder: 1, createdAt: new Date(), updatedAt: new Date() },
    { configType: 'technique', value: 'stir', label: '搅拌', labelEn: 'Stir', isSystem: true, isActive: true, displayOrder: 2, createdAt: new Date(), updatedAt: new Date() },
    { configType: 'technique', value: 'build', label: '直调', labelEn: 'Build', isSystem: true, isActive: true, displayOrder: 3, createdAt: new Date(), updatedAt: new Date() },
    { configType: 'technique', value: 'blend', label: '搅拌机', labelEn: 'Blend', isSystem: true, isActive: true, displayOrder: 4, createdAt: new Date(), updatedAt: new Date() },
    { configType: 'technique', value: 'muddle', label: '捣碎', labelEn: 'Muddle', isSystem: true, isActive: true, displayOrder: 5, createdAt: new Date(), updatedAt: new Date() },
    { configType: 'technique', value: 'layer', label: '分层', labelEn: 'Layer', isSystem: true, isActive: true, displayOrder: 6, createdAt: new Date(), updatedAt: new Date() },
  ];
  
  console.log(`准备添加 ${defaultConfigs.length} 个配置...`);
  await db.systemConfigs.bulkAdd(defaultConfigs);
  
  const count = await db.systemConfigs.count();
  console.log(`✅ 初始化完成！共添加 ${count} 个系统配置`);
  
  // 显示统计
  const stats = {
    spiritType: await db.systemConfigs.where('configType').equals('spiritType').count(),
    unit: await db.systemConfigs.where('configType').equals('unit').count(),
    flavorTag: await db.systemConfigs.where('configType').equals('flavorTag').count(),
    drinkDuration: await db.systemConfigs.where('configType').equals('drinkDuration').count(),
    glassType: await db.systemConfigs.where('configType').equals('glassType').count(),
    technique: await db.systemConfigs.where('configType').equals('technique').count(),
  };
  
  console.log('配置统计:', stats);
  alert('系统配置初始化完成！\n\n' + 
    `原料分类: ${stats.spiritType} 项\n` +
    `单位: ${stats.unit} 项\n` +
    `风味标签: ${stats.flavorTag} 项\n` +
    `饮用类型: ${stats.drinkDuration} 项\n` +
    `杯型: ${stats.glassType} 项\n` +
    `调制技法: ${stats.technique} 项\n\n` +
    '请刷新页面查看效果！');
}

// 执行初始化
initSystemConfigs().catch(err => {
  console.error('初始化失败:', err);
  alert('初始化失败: ' + err.message);
});
