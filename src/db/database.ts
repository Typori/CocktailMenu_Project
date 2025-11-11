import Dexie, { Table } from 'dexie';
import {
  Ingredient,
  Recipe,
  MenuInfo,
  Tag,
  InventoryLog,
  MakingNote,
  AppSettings,
  Venue,
  VenueRecipe,
  VenueIngredient,
  SystemConfig,
} from '@/types';

export class CocktailDatabase extends Dexie {
  ingredients!: Table<Ingredient, number>;
  recipes!: Table<Recipe, number>;
  menuInfo!: Table<MenuInfo, number>;
  tags!: Table<Tag, number>;
  inventoryLogs!: Table<InventoryLog, number>;
  makingNotes!: Table<MakingNote, number>;
  settings!: Table<AppSettings & { id: number }, number>;
  venues!: Table<Venue, number>;
  venueRecipes!: Table<VenueRecipe, number>;
  venueIngredients!: Table<VenueIngredient, number>;
  systemConfigs!: Table<SystemConfig, number>;

  constructor() {
    super('CocktailMenuDB');
    
    // 版本1-3：旧版本保留用于兼容性（已废弃）
    this.version(1).stores({
      oldIngredients: '++id, name, category, currentStock, createdAt',
      recipes: '++id, name, parentRecipeId, isFavorite, createdAt, *tags',
      menuInfo: '++id, recipeId, isAvailable, displayOrder',
      tags: '++id, name',
      inventoryLogs: '++id, ingredientId, timestamp',
      makingNotes: '++id, recipeId, timestamp',
      settings: '++id',
    });

    // 版本2：添加新字段支持
    this.version(2).stores({
      oldIngredients: '++id, name, category, currentStock, createdAt',
      recipes: '++id, name, parentRecipeId, isFavorite, createdAt, *tags, glassType',
      menuInfo: '++id, recipeId, isAvailable, displayOrder, *flavorTags, drinkDuration',
      tags: '++id, name',
      inventoryLogs: '++id, ingredientId, timestamp',
      makingNotes: '++id, recipeId, timestamp',
      settings: '++id',
      venues: '++id, name, createdAt',
      venueRecipes: '++id, venueId, recipeId, displayOrder, isAvailable',
    }).upgrade(tx => {
      // 迁移现有数据
      return tx.table('recipes').toCollection().modify(recipe => {
        if (!recipe.steps && recipe.instructions) {
          // 将旧的instructions转换为steps
          recipe.steps = [{
            stepNumber: 1,
            instruction: recipe.instructions
          }];
        }
        if (!recipe.glassType) {
          recipe.glassType = 'rocks';
        }
      }).then(() => {
        return tx.table('menuInfo').toCollection().modify(menuInfo => {
          if (!menuInfo.menuNames) {
            menuInfo.menuNames = [{
              id: '1',
              name: menuInfo.menuName || '',
              isDefault: true
            }];
          }
          if (!menuInfo.description && menuInfo.flavorDescription) {
            menuInfo.description = menuInfo.flavorDescription;
          }
          if (!menuInfo.flavorTags) {
            menuInfo.flavorTags = [];
          }
          if (!menuInfo.drinkDuration) {
            menuInfo.drinkDuration = 'short';
          }
        });
      });
    });

    // 版本3：添加displayOrder索引支持排序功能
    this.version(3).stores({
      oldIngredients: '++id, name, category, currentStock, createdAt, displayOrder',
      recipes: '++id, name, parentRecipeId, isFavorite, createdAt, displayOrder, *tags, glassType',
      menuInfo: '++id, recipeId, isAvailable, displayOrder, *flavorTags, drinkDuration',
      tags: '++id, name',
      inventoryLogs: '++id, ingredientId, timestamp',
      makingNotes: '++id, recipeId, timestamp',
      settings: '++id',
      venues: '++id, name, createdAt',
      venueRecipes: '++id, venueId, recipeId, displayOrder, isAvailable',
    }).upgrade(async tx => {
      // 为现有数据初始化displayOrder
      console.log('开始数据库升级到Version 3...');
      
      // 升级recipes表
      const recipes = await tx.table('recipes').toArray();
      console.log(`找到 ${recipes.length} 个配方`);
      for (let i = 0; i < recipes.length; i++) {
        if (recipes[i].displayOrder === undefined) {
          await tx.table('recipes').update(recipes[i].id!, { displayOrder: recipes[i].id });
        }
      }
      
      // 升级oldIngredients表
      const oldIngredients = await tx.table('oldIngredients').toArray();
      console.log(`找到 ${oldIngredients.length} 个原料`);
      for (let i = 0; i < oldIngredients.length; i++) {
        if (oldIngredients[i].displayOrder === undefined) {
          await tx.table('oldIngredients').update(oldIngredients[i].id!, { displayOrder: oldIngredients[i].id });
        }
      }
      
      console.log('数据库升级完成！');
    });

    // 版本4：添加全局原料主数据和店面原料库
    this.version(4).stores({
      oldIngredients: '++id, name, category, currentStock, createdAt, displayOrder',
      recipes: '++id, name, parentRecipeId, isFavorite, createdAt, displayOrder, *tags, glassType',
      menuInfo: '++id, recipeId, isAvailable, displayOrder, *flavorTags, drinkDuration',
      tags: '++id, name',
      inventoryLogs: '++id, ingredientId, timestamp',
      makingNotes: '++id, recipeId, timestamp',
      settings: '++id',
      venues: '++id, name, createdAt',
      venueRecipes: '++id, venueId, recipeId, displayOrder, isAvailable',
      ingredients: '++id, name, category, displayOrder, createdAt',
      venueIngredients: '++id, venueId, ingredientId, displayOrder, [venueId+ingredientId]',
    }).upgrade(async tx => {
      console.log('开始数据库升级到Version 4...');
      
      // 从旧的oldIngredients表迁移数据到ingredients
      const oldIngredients = await tx.table('oldIngredients').toArray();
      console.log(`找到 ${oldIngredients.length} 个旧原料，开始迁移...`);
      
      for (const oldIng of oldIngredients) {
        // 创建全局原料主数据 - 不包含库存字段
        const masterId = await tx.table('ingredients').add({
          name: oldIng.name,
          nameEn: oldIng.nameEn,
          category: oldIng.category,
          price: oldIng.price || 0,
          quantity: oldIng.quantity || 750,
          unit: oldIng.unit,
          alcoholContent: oldIng.alcoholContent,
          wastageRate: oldIng.wastageRate || 5,
          unitPrice: oldIng.unitPrice || (oldIng.price && oldIng.quantity ? 
            oldIng.price / (oldIng.quantity * (1 - (oldIng.wastageRate || 5) / 100)) : 0),
          displayOrder: oldIng.displayOrder || oldIng.id,
          notes: oldIng.notes,
          createdAt: oldIng.createdAt || new Date(),
          updatedAt: new Date(),
        });
        
        console.log(`已创建原料主数据: ${oldIng.name} (ID: ${masterId})，库存数据将在店面原料中管理`);
      }
      
      console.log('数据库升级到Version 4完成！');
      console.log('注意：旧的oldIngredients表保留用于兼容，新数据请使用ingredients和venueIngredients');
    });

    // 版本5：修复ingredients缺失字段问题
    this.version(5).stores({
      oldIngredients: '++id, name, category, currentStock, createdAt, displayOrder',
      recipes: '++id, name, parentRecipeId, isFavorite, createdAt, displayOrder, *tags, glassType',
      menuInfo: '++id, recipeId, isAvailable, displayOrder, *flavorTags, drinkDuration',
      tags: '++id, name',
      inventoryLogs: '++id, ingredientId, timestamp',
      makingNotes: '++id, recipeId, timestamp',
      settings: '++id',
      venues: '++id, name, createdAt',
      venueRecipes: '++id, venueId, recipeId, displayOrder, isAvailable',
      ingredients: '++id, name, category, displayOrder, createdAt, price, quantity',
      venueIngredients: '++id, venueId, ingredientId, displayOrder, [venueId+ingredientId]',
    }).upgrade(async tx => {
      console.log('开始数据库升级到Version 5 - 修复ingredients缺失字段...');
      
      // 检查并修复现有的ingredients数据
      const masters = await tx.table('ingredients').toArray();
      console.log(`找到 ${masters.length} 个原料主数据，检查缺失字段...`);
      
      for (const master of masters) {
        const updates: any = {};
        let needsUpdate = false;
        
        // 如果缺少price或quantity，从oldIngredients表查找原始数据
        if (master.price === undefined || master.quantity === undefined) {
          const oldIng = await tx.table('oldIngredients')
            .where('name')
            .equals(master.name)
            .first();
          
          if (oldIng) {
            if (master.price === undefined) {
              updates.price = oldIng.price || 0;
              needsUpdate = true;
            }
            if (master.quantity === undefined) {
              updates.quantity = oldIng.quantity || 750;
              needsUpdate = true;
            }
            if (master.wastageRate === undefined) {
              updates.wastageRate = oldIng.wastageRate || 5;
              needsUpdate = true;
            }
            if (master.unitPrice === undefined && oldIng.price && oldIng.quantity) {
              const wastageRate = oldIng.wastageRate || 5;
              updates.unitPrice = oldIng.price / (oldIng.quantity * (1 - wastageRate / 100));
              needsUpdate = true;
            }
          }
        }
        
        if (needsUpdate) {
          await tx.table('ingredients').update(master.id!, updates);
          console.log(`已修复原料: ${master.name}，补充缺失字段`);
        }
      }
      
      console.log('数据库升级到Version 5完成！所有原料数据已修复');
    });

    // 版本6：修复配方中的ingredientId映射问题
    this.version(6).stores({
      oldIngredients: '++id, name, category, currentStock, createdAt, displayOrder',
      recipes: '++id, name, parentRecipeId, isFavorite, createdAt, displayOrder, *tags, glassType',
      menuInfo: '++id, recipeId, isAvailable, displayOrder, *flavorTags, drinkDuration',
      tags: '++id, name',
      inventoryLogs: '++id, ingredientId, timestamp',
      makingNotes: '++id, recipeId, timestamp',
      settings: '++id',
      venues: '++id, name, createdAt',
      venueRecipes: '++id, venueId, recipeId, displayOrder, isAvailable',
      ingredients: '++id, name, category, displayOrder, createdAt, price, quantity',
      venueIngredients: '++id, venueId, ingredientId, displayOrder, [venueId+ingredientId]',
    }).upgrade(async tx => {
      console.log('开始数据库升级到Version 6 - 修复配方中的ingredientId映射...');
      
      // 建立旧ID到新ID的映射
      const oldIngredients = await tx.table('oldIngredients').toArray();
      const newIngredients = await tx.table('ingredients').toArray();
      const idMapping = new Map<number, number>();
      
      // 通过名称匹配建立映射关系
      for (const oldIng of oldIngredients) {
        const matchedNew = newIngredients.find(newIng => 
          newIng.name === oldIng.name && newIng.nameEn === oldIng.nameEn
        );
        if (matchedNew) {
          idMapping.set(oldIng.id!, matchedNew.id!);
          console.log(`映射: 旧ID ${oldIng.id} (${oldIng.name}) -> 新ID ${matchedNew.id}`);
        }
      }
      
      // 更新所有配方中的ingredientId
      const recipes = await tx.table('recipes').toArray();
      let updatedCount = 0;
      
      for (const recipe of recipes) {
        if (!recipe.ingredients || recipe.ingredients.length === 0) continue;
        
        let hasChanges = false;
        const updatedIngredients = recipe.ingredients.map((ing: any) => {
          const newId = idMapping.get(ing.ingredientId);
          if (newId && newId !== ing.ingredientId) {
            hasChanges = true;
            console.log(`  配方 \"${recipe.name}\" 中的原料ID: ${ing.ingredientId} -> ${newId}`);
            return { ...ing, ingredientId: newId };
          }
          return ing;
        });
        
        if (hasChanges) {
          await tx.table('recipes').update(recipe.id!, { 
            ingredients: updatedIngredients,
            updatedAt: new Date()
          });
          updatedCount++;
        }
      }
      
      console.log(`数据库升级到Version 6完成！已更新 ${updatedCount} 个配方的原料ID映射`);
    });

    // 版本7：添加系统配置表，支持下拉菜单配置化
    this.version(7).stores({
      oldIngredients: null, // 删除旧表
      recipes: '++id, name, parentRecipeId, isFavorite, createdAt, displayOrder, *tags, glassType',
      menuInfo: '++id, recipeId, isAvailable, displayOrder, *flavorTags, drinkDuration',
      tags: '++id, name',
      inventoryLogs: '++id, ingredientId, timestamp',
      makingNotes: '++id, recipeId, timestamp',
      settings: '++id',
      venues: '++id, name, createdAt',
      venueRecipes: '++id, venueId, recipeId, displayOrder, isAvailable',
      ingredients: '++id, name, category, displayOrder, createdAt, price, quantity',
      venueIngredients: '++id, venueId, ingredientId, displayOrder, [venueId+ingredientId]',
      systemConfigs: '++id, [configType+value], [configType+isActive], configType, isActive, displayOrder',
    }).upgrade(async tx => {
      console.log('开始数据库升级到Version 7 - 初始化系统配置...');
      
      // 初始化系统配置数据
      const defaultConfigs: Omit<SystemConfig, 'id'>[] = [
        // 原料分类
        { configType: 'spiritType', value: 'spirit', label: '基酒', labelEn: 'Spirit', isActive: true, displayOrder: 1, createdAt: new Date(), updatedAt: new Date() },
        { configType: 'spiritType', value: 'liqueur', label: '利口酒', labelEn: 'Liqueur', isActive: true, displayOrder: 2, createdAt: new Date(), updatedAt: new Date() },
        { configType: 'spiritType', value: 'other_alcohol', label: '其他酒类', labelEn: 'Other Alcohol', isActive: true, displayOrder: 3, createdAt: new Date(), updatedAt: new Date() },
        { configType: 'spiritType', value: 'essence', label: '香精/苦精', labelEn: 'Essence/Bitters', isActive: true, displayOrder: 4, createdAt: new Date(), updatedAt: new Date() },
        { configType: 'spiritType', value: 'juice', label: '果汁', labelEn: 'Juice', isActive: true, displayOrder: 5, createdAt: new Date(), updatedAt: new Date() },
        { configType: 'spiritType', value: 'soda', label: '汽水', labelEn: 'Soda', isActive: true, displayOrder: 6, createdAt: new Date(), updatedAt: new Date() },
        { configType: 'spiritType', value: 'syrup', label: '糖浆', labelEn: 'Syrup', isActive: true, displayOrder: 7, createdAt: new Date(), updatedAt: new Date() },
        { configType: 'spiritType', value: 'garnish', label: '装饰物', labelEn: 'Garnish', isActive: true, displayOrder: 8, createdAt: new Date(), updatedAt: new Date() },
        { configType: 'spiritType', value: 'other', label: '其他', labelEn: 'Other', isActive: true, displayOrder: 9, createdAt: new Date(), updatedAt: new Date() },
        
        // 单位
        { configType: 'unit', value: 'ml', label: '毫升 (ml)', labelEn: 'Milliliter (ml)', isActive: true, displayOrder: 1, metadata: { conversionRate: 1 }, createdAt: new Date(), updatedAt: new Date() },
        { configType: 'unit', value: 'oz', label: '盎司 (oz)', labelEn: 'Ounce (oz)', isActive: true, displayOrder: 2, metadata: { conversionRate: 30 }, createdAt: new Date(), updatedAt: new Date() },
        { configType: 'unit', value: 'cl', label: '厘升 (cl)', labelEn: 'Centiliter (cl)', isActive: true, displayOrder: 3, metadata: { conversionRate: 10 }, createdAt: new Date(), updatedAt: new Date() },
        { configType: 'unit', value: 'dash', label: '滴 (dash)', labelEn: 'Dash', isActive: true, displayOrder: 4, metadata: { conversionRate: 1 }, createdAt: new Date(), updatedAt: new Date() },
        { configType: 'unit', value: 'piece', label: '个 (piece)', labelEn: 'Piece', isActive: true, displayOrder: 5, metadata: { conversionRate: 1 }, createdAt: new Date(), updatedAt: new Date() },
        
        // 风味标签
        { configType: 'flavorTag', value: 'sour', label: '酸', labelEn: 'Sour', isActive: true, displayOrder: 1, createdAt: new Date(), updatedAt: new Date() },
        { configType: 'flavorTag', value: 'sweet', label: '甜/果香', labelEn: 'Sweet/Fruity', isActive: true, displayOrder: 2, createdAt: new Date(), updatedAt: new Date() },
        { configType: 'flavorTag', value: 'dry', label: '干', labelEn: 'Dry', isActive: true, displayOrder: 3, createdAt: new Date(), updatedAt: new Date() },
        { configType: 'flavorTag', value: 'aromatic', label: '芳香', labelEn: 'Aromatic', isActive: true, displayOrder: 4, createdAt: new Date(), updatedAt: new Date() },
        { configType: 'flavorTag', value: 'highball', label: '嗨棒', labelEn: 'Highball', isActive: true, displayOrder: 5, createdAt: new Date(), updatedAt: new Date() },
        
        // 饮用类型
        { configType: 'drinkDuration', value: 'short', label: '短饮', labelEn: 'Short Drink', isActive: true, displayOrder: 1, createdAt: new Date(), updatedAt: new Date() },
        { configType: 'drinkDuration', value: 'long', label: '长饮', labelEn: 'Long Drink', isActive: true, displayOrder: 2, createdAt: new Date(), updatedAt: new Date() },
        
        // 杯型
        { configType: 'glassType', value: 'rocks', label: '古典杯', labelEn: 'Rocks Glass', isActive: true, displayOrder: 1, createdAt: new Date(), updatedAt: new Date() },
        { configType: 'glassType', value: 'highball', label: '海波杯', labelEn: 'Highball Glass', isActive: true, displayOrder: 2, createdAt: new Date(), updatedAt: new Date() },
        { configType: 'glassType', value: 'martini', label: '马天尼杯', labelEn: 'Martini Glass', isActive: true, displayOrder: 3, createdAt: new Date(), updatedAt: new Date() },
        { configType: 'glassType', value: 'coupe', label: '碟形香槟杯', labelEn: 'Coupe Glass', isActive: true, displayOrder: 4, createdAt: new Date(), updatedAt: new Date() },
        { configType: 'glassType', value: 'flute', label: '笛形香槟杯', labelEn: 'Flute Glass', isActive: true, displayOrder: 5, createdAt: new Date(), updatedAt: new Date() },
        { configType: 'glassType', value: 'wine', label: '红酒杯', labelEn: 'Wine Glass', isActive: true, displayOrder: 6, createdAt: new Date(), updatedAt: new Date() },
        { configType: 'glassType', value: 'shot', label: '子弹杯', labelEn: 'Shot Glass', isActive: true, displayOrder: 7, createdAt: new Date(), updatedAt: new Date() },
        { configType: 'glassType', value: 'margarita', label: '玛格丽特杯', labelEn: 'Margarita Glass', isActive: true, displayOrder: 8, createdAt: new Date(), updatedAt: new Date() },
        { configType: 'glassType', value: 'hurricane', label: '飓风杯', labelEn: 'Hurricane Glass', isActive: true, displayOrder: 9, createdAt: new Date(), updatedAt: new Date() },
        { configType: 'glassType', value: 'tiki', label: 'Tiki杯', labelEn: 'Tiki Mug', isActive: true, displayOrder: 10, createdAt: new Date(), updatedAt: new Date() },
        { configType: 'glassType', value: 'julep', label: '朱利普杯', labelEn: 'Julep Cup', isActive: true, displayOrder: 11, createdAt: new Date(), updatedAt: new Date() },
        
        // 调制技法
        { configType: 'technique', value: 'shake', label: '摇和', labelEn: 'Shake', isActive: true, displayOrder: 1, createdAt: new Date(), updatedAt: new Date() },
        { configType: 'technique', value: 'stir', label: '搅拌', labelEn: 'Stir', isActive: true, displayOrder: 2, createdAt: new Date(), updatedAt: new Date() },
        { configType: 'technique', value: 'build', label: '直调', labelEn: 'Build', isActive: true, displayOrder: 3, createdAt: new Date(), updatedAt: new Date() },
        { configType: 'technique', value: 'blend', label: '搅拌机', labelEn: 'Blend', isActive: true, displayOrder: 4, createdAt: new Date(), updatedAt: new Date() },
        { configType: 'technique', value: 'muddle', label: '捣碎', labelEn: 'Muddle', isActive: true, displayOrder: 5, createdAt: new Date(), updatedAt: new Date() },
        { configType: 'technique', value: 'layer', label: '分层', labelEn: 'Layer', isActive: true, displayOrder: 6, createdAt: new Date(), updatedAt: new Date() },
      ];
      
      // 批量添加配置
      await tx.table('systemConfigs').bulkAdd(defaultConfigs);
      
      console.log(`数据库升级到Version 7完成！已初始化 ${defaultConfigs.length} 个系统配置`);
    });
  }
}

export const db = new CocktailDatabase();

// 初始化默认设置
export async function initializeDefaultSettings() {
  try {
    const settingsCount = await db.settings.count();
    if (settingsCount === 0) {
      await db.settings.add({
        id: 1,
        theme: 'auto',
        language: 'zh',
        defaultUnit: 'ml',
        currency: '¥',
        lowStockAlert: true,
        autoBackup: false,
        displayMode: 'list',
      });
    }
  } catch (error) {
    console.error('Failed to initialize default settings:', error);
    throw error;
  }
}

// 初始化示例数据
export async function initializeSampleData() {
  try {
    // 不再自动添加示例原料,用户可以自行添加或导入数据
    // 如果需要示例数据,请在设置页面手动触发
    
    const ingredientsCount = await db.ingredients.count();
    
    // 仅初始化标签数据(如果为空)
    const tagsCount = await db.tags.count();
    if (tagsCount === 0) {
      const sampleTags: Tag[] = [
        { name: '经典款', color: '#3b82f6', createdAt: new Date() },
        { name: '夏季特饮', color: '#10b981', createdAt: new Date() },
        { name: '低酒精', color: '#f59e0b', createdAt: new Date() },
        { name: '热门', color: '#ef4444', createdAt: new Date() },
      ];
      await db.tags.bulkAdd(sampleTags);
    }
    
    // 以下代码已禁用 - 不再自动添加示例原料
    if (false && ingredientsCount === 0) {
    // 添加示例原料到全局原料库
    const sampleIngredients: Omit<Ingredient, 'id'>[] = [
      {
        name: '金酒',
        nameEn: 'Gin',
        category: 'spirit',
        price: 180,
        quantity: 700,
        unit: 'ml',
        alcoholContent: 40,
        wastageRate: 5,
        unitPrice: 180 / (700 * 0.95),
        displayOrder: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: '伏特加',
        nameEn: 'Vodka',
        category: 'spirit',
        price: 150,
        quantity: 700,
        unit: 'ml',
        alcoholContent: 40,
        wastageRate: 5,
        unitPrice: 150 / (700 * 0.95),
        displayOrder: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: '白朗姆酒',
        nameEn: 'White Rum',
        category: 'spirit',
        price: 160,
        quantity: 700,
        unit: 'ml',
        alcoholContent: 40,
        wastageRate: 5,
        unitPrice: 160 / (700 * 0.95),
        displayOrder: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: '龙舌兰',
        nameEn: 'Tequila',
        category: 'spirit',
        price: 200,
        quantity: 700,
        unit: 'ml',
        alcoholContent: 40,
        wastageRate: 5,
        unitPrice: 200 / (700 * 0.95),
        displayOrder: 4,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: '君度橙酒',
        nameEn: 'Cointreau',
        category: 'liqueur',
        price: 220,
        quantity: 700,
        unit: 'ml',
        alcoholContent: 40,
        wastageRate: 5,
        unitPrice: 220 / (700 * 0.95),
        displayOrder: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: '青柠汁',
        nameEn: 'Lime Juice',
        category: 'juice',
        price: 30,
        quantity: 500,
        unit: 'ml',
        alcoholContent: 0,
        wastageRate: 5,
        unitPrice: 30 / (500 * 0.95),
        displayOrder: 6,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: '柠檬汁',
        nameEn: 'Lemon Juice',
        category: 'juice',
        price: 30,
        quantity: 500,
        unit: 'ml',
        alcoholContent: 0,
        wastageRate: 5,
        unitPrice: 30 / (500 * 0.95),
        displayOrder: 7,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: '糖浆',
        nameEn: 'Simple Syrup',
        category: 'syrup',
        price: 20,
        quantity: 500,
        unit: 'ml',
        alcoholContent: 0,
        wastageRate: 5,
        unitPrice: 20 / (500 * 0.95),
        displayOrder: 8,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    await db.ingredients.bulkAdd(sampleIngredients);
    }
  } catch (error) {
    console.error('Failed to initialize sample data:', error);
    throw error;
  }
}
