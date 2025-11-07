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
  IngredientMaster,
  VenueIngredient,
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
  ingredientMaster!: Table<IngredientMaster, number>;
  venueIngredients!: Table<VenueIngredient, number>;

  constructor() {
    super('CocktailMenuDB');
    
    this.version(1).stores({
      ingredients: '++id, name, category, currentStock, createdAt',
      recipes: '++id, name, parentRecipeId, isFavorite, createdAt, *tags',
      menuInfo: '++id, recipeId, isAvailable, displayOrder',
      tags: '++id, name',
      inventoryLogs: '++id, ingredientId, timestamp',
      makingNotes: '++id, recipeId, timestamp',
      settings: '++id',
    });

    // 版本2：添加新字段支持
    this.version(2).stores({
      ingredients: '++id, name, category, currentStock, createdAt',
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
      ingredients: '++id, name, category, currentStock, createdAt, displayOrder',
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
      
      // 升级ingredients表
      const ingredients = await tx.table('ingredients').toArray();
      console.log(`找到 ${ingredients.length} 个原料`);
      for (let i = 0; i < ingredients.length; i++) {
        if (ingredients[i].displayOrder === undefined) {
          await tx.table('ingredients').update(ingredients[i].id!, { displayOrder: ingredients[i].id });
        }
      }
      
      console.log('数据库升级完成！');
    });

    // 版本4：添加全局原料主数据和店面原料库
    this.version(4).stores({
      ingredients: '++id, name, category, currentStock, createdAt, displayOrder',
      recipes: '++id, name, parentRecipeId, isFavorite, createdAt, displayOrder, *tags, glassType',
      menuInfo: '++id, recipeId, isAvailable, displayOrder, *flavorTags, drinkDuration',
      tags: '++id, name',
      inventoryLogs: '++id, ingredientId, timestamp',
      makingNotes: '++id, recipeId, timestamp',
      settings: '++id',
      venues: '++id, name, createdAt',
      venueRecipes: '++id, venueId, recipeId, displayOrder, isAvailable',
      ingredientMaster: '++id, name, category, displayOrder, createdAt',
      venueIngredients: '++id, venueId, ingredientMasterId, displayOrder, [venueId+ingredientMasterId]',
    }).upgrade(async tx => {
      console.log('开始数据库升级到Version 4...');
      
      // 从旧的ingredients表迁移数据到ingredientMaster
      const oldIngredients = await tx.table('ingredients').toArray();
      console.log(`找到 ${oldIngredients.length} 个旧原料，开始迁移...`);
      
      for (const oldIng of oldIngredients) {
        // 创建全局原料主数据 - 不包含库存字段
        const masterId = await tx.table('ingredientMaster').add({
          name: oldIng.name,
          nameEn: oldIng.nameEn,
          category: oldIng.category,
          price: oldIng.price || 0,
          quantity: oldIng.quantity || 750,
          unit: oldIng.unit,
          alcoholContent: oldIng.alcoholContent,
          wastageRate: oldIng.wastageRate || 5,
          unitPrice: oldIng.unitPrice || (oldIng.price && oldIng.quantity ? oldIng.price / oldIng.quantity : 0),
          displayOrder: oldIng.displayOrder || oldIng.id,
          notes: oldIng.notes,
          createdAt: oldIng.createdAt || new Date(),
          updatedAt: new Date(),
        });
        
        console.log(`已创建原料主数据: ${oldIng.name} (ID: ${masterId})，库存数据将在店面原料中管理`);
      }
      
      console.log('数据库升级到Version 4完成！');
      console.log('注意：旧的ingredients表保留用于兼容，新数据请使用ingredientMaster和venueIngredients');
    });

    // 版本5：修复ingredientMaster缺失字段问题
    this.version(5).stores({
      ingredients: '++id, name, category, currentStock, createdAt, displayOrder',
      recipes: '++id, name, parentRecipeId, isFavorite, createdAt, displayOrder, *tags, glassType',
      menuInfo: '++id, recipeId, isAvailable, displayOrder, *flavorTags, drinkDuration',
      tags: '++id, name',
      inventoryLogs: '++id, ingredientId, timestamp',
      makingNotes: '++id, recipeId, timestamp',
      settings: '++id',
      venues: '++id, name, createdAt',
      venueRecipes: '++id, venueId, recipeId, displayOrder, isAvailable',
      ingredientMaster: '++id, name, category, displayOrder, createdAt, price, quantity',
      venueIngredients: '++id, venueId, ingredientMasterId, displayOrder, [venueId+ingredientMasterId]',
    }).upgrade(async tx => {
      console.log('开始数据库升级到Version 5 - 修复ingredientMaster缺失字段...');
      
      // 检查并修复现有的ingredientMaster数据
      const masters = await tx.table('ingredientMaster').toArray();
      console.log(`找到 ${masters.length} 个原料主数据，检查缺失字段...`);
      
      for (const master of masters) {
        const updates: any = {};
        let needsUpdate = false;
        
        // 如果缺少price或quantity，从ingredients表查找原始数据
        if (master.price === undefined || master.quantity === undefined) {
          const oldIng = await tx.table('ingredients')
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
              updates.unitPrice = oldIng.price / oldIng.quantity;
              needsUpdate = true;
            }
          }
        }
        
        if (needsUpdate) {
          await tx.table('ingredientMaster').update(master.id!, updates);
          console.log(`已修复原料: ${master.name}，补充缺失字段`);
        }
      }
      
      console.log('数据库升级到Version 5完成！所有原料数据已修复');
    });

    // 版本6：修复配方中的ingredientId映射问题
    this.version(6).stores({
      ingredients: '++id, name, category, currentStock, createdAt, displayOrder',
      recipes: '++id, name, parentRecipeId, isFavorite, createdAt, displayOrder, *tags, glassType',
      menuInfo: '++id, recipeId, isAvailable, displayOrder, *flavorTags, drinkDuration',
      tags: '++id, name',
      inventoryLogs: '++id, ingredientId, timestamp',
      makingNotes: '++id, recipeId, timestamp',
      settings: '++id',
      venues: '++id, name, createdAt',
      venueRecipes: '++id, venueId, recipeId, displayOrder, isAvailable',
      ingredientMaster: '++id, name, category, displayOrder, createdAt, price, quantity',
      venueIngredients: '++id, venueId, ingredientMasterId, displayOrder, [venueId+ingredientMasterId]',
    }).upgrade(async tx => {
      console.log('开始数据库升级到Version 6 - 修复配方中的ingredientId映射...');
      
      // 建立旧ID到新ID的映射
      const oldIngredients = await tx.table('ingredients').toArray();
      const newIngredients = await tx.table('ingredientMaster').toArray();
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
    const ingredientsCount = await db.ingredients.count();
    
    if (ingredientsCount === 0) {
    // 添加示例原料
    const sampleIngredients: Ingredient[] = [
      {
        name: '金酒',
        nameEn: 'Gin',
        category: 'spirit',
        price: 180,
        quantity: 700,
        unit: 'ml',
        alcoholContent: 40,
        currentStock: 700,
        minStock: 200,
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
        currentStock: 700,
        minStock: 200,
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
        currentStock: 700,
        minStock: 200,
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
        currentStock: 700,
        minStock: 200,
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
        currentStock: 700,
        minStock: 100,
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
        currentStock: 500,
        minStock: 100,
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
        currentStock: 500,
        minStock: 100,
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
        currentStock: 500,
        minStock: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    await db.ingredients.bulkAdd(sampleIngredients);

    // 添加示例标签
    const sampleTags: Tag[] = [
      { name: '经典款', color: '#3b82f6', createdAt: new Date() },
      { name: '夏季特饮', color: '#10b981', createdAt: new Date() },
      { name: '低酒精', color: '#f59e0b', createdAt: new Date() },
      { name: '热门', color: '#ef4444', createdAt: new Date() },
    ];

    await db.tags.bulkAdd(sampleTags);
    }
  } catch (error) {
    console.error('Failed to initialize sample data:', error);
    throw error;
  }
}
