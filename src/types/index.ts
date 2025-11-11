// 单位类型 - 改为动态类型，支持用户自定义
export type Unit = string;

// 原料分类类型 - 改为动态类型，支持用户自定义
export type SpiritType = string;

// 口味类型 - 改为动态类型，支持用户自定义
export type FlavorTag = string;

// 饮用时长类型 - 改为动态类型，支持用户自定义
export type DrinkDuration = string;

// 调制技法 - 改为动态类型，支持用户自定义
export type Technique = string;

// 杯具类型 - 改为动态类型，支持用户自定义
export type GlassType = string;

// 系统配置类型
export type SystemConfigType = 'spiritType' | 'unit' | 'flavorTag' | 'drinkDuration' | 'glassType' | 'technique';

// 系统配置接口
export interface SystemConfig {
  id?: number;
  configType: SystemConfigType;
  value: string;           // 配置值（唯一标识）
  label: string;           // 显示名称
  labelEn?: string;        // 英文名称
  isSystem: boolean;       // 是否系统预设（不可删除）
  isActive: boolean;       // 是否启用
  displayOrder: number;    // 显示顺序
  metadata?: {             // 扩展元数据
    conversionRate?: number;  // 单位转换率（仅Unit类型）
    icon?: string;            // 图标
    color?: string;           // 颜色
    description?: string;     // 描述
  };
  createdAt?: Date;
  updatedAt?: Date;
}

// 原料接口
export interface Ingredient {
  id?: number;
  name: string;
  nameEn?: string;
  category: SpiritType;
  price: number; // 总价格
  quantity: number; // 数量
  unit: Unit; // 单位
  alcoholContent?: number; // 酒精度 (0-100)
  wastageRate?: number; // 损耗率 (0-100)，默认5%
  unitPrice?: number; // 单位价格 (自动计算)
  currentStock?: number; // 当前库存
  minStock?: number; // 最低库存阈值
  displayOrder?: number; // 展示顺序
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// 配方配料项
export interface RecipeIngredient {
  ingredientId: number;
  ingredientName?: string; // 冗余字段，方便显示
  quantity: number;
  unit: Unit;
}

// 制作步骤接口
export interface RecipeStep {
  stepNumber: number;
  instruction: string;
}

// 配方接口
export interface Recipe {
  id?: number;
  name: string;
  nameEn?: string;
  parentRecipeId?: number; // 父配方ID（衍生配方）
  ingredients: RecipeIngredient[];
  steps: RecipeStep[]; // 制作步骤（替换原来的instructions字符串）
  instructions?: string; // 保留兼容性
  technique?: Technique;
  glassType?: GlassType;
  garnish?: string; // 装饰物
  images?: string[]; // 预览图（base64或URL）
  totalVolume?: number; // 总容量 (ml)
  calculatedAbv?: number; // 计算的酒精度
  calculatedCost?: number; // 计算的成本
  displayOrder?: number; // 展示顺序
  tags?: string[]; // 标签
  isFavorite?: boolean; // 是否收藏
  notes?: string; // 制作笔记
  versionHistory?: RecipeVersion[]; // 版本历史
  createdAt?: Date;
  updatedAt?: Date;
}

// 配方版本历史
export interface RecipeVersion {
  version: number;
  timestamp: Date;
  changes: string;
  snapshot: Partial<Recipe>;
}

// 菜单名称版本接口
export interface MenuNameVersion {
  id: string;
  name: string;
  isDefault?: boolean;
}

// 菜单信息接口
export interface MenuInfo {
  id?: number;
  recipeId: number;
  menuNames: MenuNameVersion[]; // 多个菜单名称版本
  description: string; // 酒款描述（原风味描述）
  descriptionEn?: string;
  flavorTags: FlavorTag[]; // 风味标签
  drinkDuration?: DrinkDuration; // 饮用时长
  color?: string; // 颜色
  price: number; // 售价
  profitMargin?: number; // 利润率 (自动计算)
  isAvailable?: boolean; // 是否可售
  displayOrder?: number; // 展示顺序
  createdAt?: Date;
  updatedAt?: Date;
}

// 标签接口
export interface Tag {
  id?: number;
  name: string;
  color?: string;
  icon?: string;
  createdAt?: Date;
}

// 库存记录
export interface InventoryLog {
  id?: number;
  ingredientId: number;
  type: 'in' | 'out' | 'adjust'; // 入库/出库/调整
  quantity: number;
  reason?: string;
  timestamp: Date;
}

// 制作笔记
export interface MakingNote {
  id?: number;
  recipeId: number;
  content: string;
  rating?: number; // 1-5星
  adjustments?: string; // 调整建议
  timestamp: Date;
}

// 搜索筛选条件
export interface SearchFilters {
  keyword?: string;
  spiritTypes?: SpiritType[];
  flavorProfiles?: FlavorProfile[];
  tags?: string[];
  abvRange?: [number, number];
  priceRange?: [number, number];
  isFavorite?: boolean;
  hasStock?: boolean; // 是否有足够库存可制作
}

// 导出配置
export interface ExportConfig {
  format: 'pdf' | 'json' | 'image';
  includeImages?: boolean;
  includeCost?: boolean;
  includeInstructions?: boolean;
  language?: 'zh' | 'en' | 'both';
}

// 应用设置
export interface AppSettings {
  theme: 'light' | 'dark' | 'auto';
  language: 'zh' | 'en';
  defaultUnit: Unit;
  currency: string;
  lowStockAlert: boolean;
  autoBackup: boolean;
  displayMode: 'list' | 'grid' | 'single';
}

// 统计数据
export interface Statistics {
  totalRecipes: number;
  totalIngredients: number;
  averageCost: number;
  averageProfit: number;
  mostUsedIngredients: Array<{ id: number; name: string; count: number }>;
  popularRecipes: Array<{ id: number; name: string; views: number }>;
  lowStockItems: Array<{ id: number; name: string; stock: number }>;
}

// 店面接口
export interface Venue {
  id?: number;
  name: string;
  description?: string;
  address?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// 上架酒款接口
export interface VenueRecipe {
  id?: number;
  venueId: number;
  recipeId: number;
  displayOrder?: number;
  isAvailable?: boolean;
  customPrice?: number; // 可以为不同店面设置不同价格
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// 全局原料主数据接口
export interface IngredientMaster {
  id?: number;
  name: string;
  nameEn?: string;
  category: SpiritType;
  price: number; // 总价格
  quantity: number; // 数量
  unit: Unit; // 单位
  alcoholContent?: number; // 酒精度 (0-100)
  wastageRate?: number; // 损耗率 (0-100)，默认5%
  unitPrice?: number; // 单位价格 (自动计算)
  displayOrder?: number; // 展示顺序
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// 店面原料库接口（含价格、库存、供应商等店面特定信息）
export interface VenueIngredient {
  id?: number;
  venueId: number;
  ingredientMasterId: number;
  ingredientName?: string; // 冗余字段，方便显示
  price: number; // 总价格
  quantity: number; // 数量
  wastageRate?: number; // 损耗率 (0-100)，默认5%
  unitPrice?: number; // 单位价格 (自动计算)
  currentStock?: number; // 当前库存
  minStock?: number; // 最低库存阈值
  supplier?: string; // 供应商
  displayOrder?: number; // 展示顺序
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
