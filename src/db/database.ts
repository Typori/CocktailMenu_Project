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
