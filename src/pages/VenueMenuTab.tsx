import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, X, GripVertical, Check, FileDown, Edit, Trash2, Star, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { db } from '@/db/database';
import { VenueRecipe, FlavorTag, DrinkDuration, GlassType } from '@/types';
import { formatCurrency, getConfigLabelFromMap } from '@/utils/calculations';
import { exportVenueMenuToPDF } from '@/utils/pdfExport';
import { useConfigLabelMap } from '@/hooks/useSystemConfig';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface VenueMenuTabProps {
  venueId: number;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

// 可排序酒款卡片组件
function SortableVenueRecipeCard({
  recipe,
  venueRecipe,
  isSortMode,
  onToggleAvailable,
  onRemove,
  onEditPrice,
  onViewRecipe,
  flavorTagMap,
}: {
  recipe: any;
  venueRecipe: VenueRecipe;
  isSortMode: boolean;
  onToggleAvailable: (id: number, currentStatus: boolean | undefined) => void;
  onRemove: (id: number) => void;
  onEditPrice: (venueRecipe: VenueRecipe) => void;
  onViewRecipe: (recipeId: number) => void;
  flavorTagMap: Map<string, string> | undefined;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: venueRecipe.id!, disabled: !isSortMode });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const displayPrice = venueRecipe.customPrice ?? recipe.menuInfo?.price ?? 0;

  return (
    <div ref={setNodeRef} style={style} className="touch-none">
      <Card 
        className={`relative ${isSortMode ? 'cursor-move select-none' : ''} ${!venueRecipe.isAvailable ? 'opacity-60' : ''}`}
        {...(isSortMode ? { ...attributes, ...listeners } : {})}
      >
        {isSortMode && (
          <div className="absolute top-4 left-4 z-10 pointer-events-none">
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
        
        {/* 可点击的CardHeader区域 */}
        {isSortMode ? (
          <CardHeader className="pb-2 pl-12">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-xl flex items-center gap-2">
                  <span className="truncate">{recipe.name}</span>
                  {recipe.isFavorite && (
                    <Star className="h-4 w-4 fill-yellow-500 text-yellow-500 flex-shrink-0" />
                  )}
                </CardTitle>
                {recipe.nameEn && (
                  <p className="text-sm text-muted-foreground mt-0.5">{recipe.nameEn}</p>
                )}
              </div>
              {/* 风味标签在右上角 */}
              <div className="flex flex-col items-end gap-1">
                {!venueRecipe.isAvailable && (
                  <Badge variant="secondary">已下架</Badge>
                )}
                {recipe.menuInfo?.flavorTags && recipe.menuInfo.flavorTags.length > 0 && (
                  <div className="flex flex-wrap gap-1 justify-end">
                    {recipe.menuInfo.flavorTags.map((tag: FlavorTag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {getConfigLabelFromMap(flavorTagMap, tag)}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
        ) : (
          <div onClick={() => onViewRecipe(recipe.id)}>
            <CardHeader className="pb-2 cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <span className="truncate">{recipe.name}</span>
                    {recipe.isFavorite && (
                      <Star className="h-4 w-4 fill-yellow-500 text-yellow-500 flex-shrink-0" />
                    )}
                  </CardTitle>
                  {recipe.nameEn && (
                    <p className="text-sm text-muted-foreground mt-0.5">{recipe.nameEn}</p>
                  )}
                </div>
                {/* 风味标签在右上角 */}
                <div className="flex flex-col items-end gap-1">
                  {!venueRecipe.isAvailable && (
                    <Badge variant="secondary">已下架</Badge>
                  )}
                  {recipe.menuInfo?.flavorTags && recipe.menuInfo.flavorTags.length > 0 && (
                    <div className="flex flex-wrap gap-1 justify-end">
                      {recipe.menuInfo.flavorTags.map((tag: FlavorTag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {getConfigLabelFromMap(flavorTagMap, tag)}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
          </div>
        )}
        
        <CardContent className={`space-y-2.5 ${isSortMode ? 'pointer-events-none' : ''}`}>
          {/* 配方信息 */}
          <div className="flex items-center gap-3 text-sm border-t pt-2.5">
            <span className="text-muted-foreground">{recipe.ingredients?.length || 0}种</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground">{recipe.totalVolume || 0}ml</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground">{formatCurrency(recipe.calculatedCost || 0)}</span>
            <span className="text-muted-foreground">•</span>
            <span className="font-medium text-primary">{formatCurrency(displayPrice)}</span>
          </div>

          {/* 操作按钮 */}
          {!isSortMode && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={venueRecipe.isAvailable ? "default" : "outline"}
                className="flex-1 touch-feedback"
                onClick={() => onToggleAvailable(venueRecipe.id!, venueRecipe.isAvailable)}
              >
                {venueRecipe.isAvailable ? '上架中' : '已下架'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="touch-feedback"
                onClick={() => onEditPrice(venueRecipe)}
              >
                <Edit className="h-3 w-3 mr-1" />
                价格
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="touch-feedback"
                onClick={() => onRemove(venueRecipe.id!)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function VenueMenuTab({ venueId, activeTab, onTabChange }: VenueMenuTabProps) {
  const navigate = useNavigate();
  
  // 获取配置标签映射
  const flavorTagMap = useConfigLabelMap('flavorTag');
  
  const [isAddRecipeDialogOpen, setIsAddRecipeDialogOpen] = useState(false);
  const [isPriceDialogOpen, setIsPriceDialogOpen] = useState(false);
  const [editingVenueRecipe, setEditingVenueRecipe] = useState<VenueRecipe | null>(null);
  const [isSortMode, setIsSortMode] = useState(false);
  const [sortedVenueRecipes, setSortedVenueRecipes] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<{
    flavorTag?: FlavorTag;
    drinkDuration?: DrinkDuration;
    glassType?: GlassType;
  }>({});
  const [customPrice, setCustomPrice] = useState<number>(0);
  const [addRecipeSearchTerm, setAddRecipeSearchTerm] = useState('');

  const allRecipes = useLiveQuery(() => db.recipes.toArray(), []);
  const allMenuInfos = useLiveQuery(() => db.menuInfo.toArray(), []);
  const ingredients = useLiveQuery(() => db.ingredients.toArray(), []);
  const venue = useLiveQuery(() => db.venues.get(venueId), [venueId]);
  
  const venueRecipes = useLiveQuery(
    async () => {
      const recipes = await db.venueRecipes.where('venueId').equals(venueId).toArray();
      return recipes.sort((a, b) => {
        const orderA = a.displayOrder ?? a.id ?? 0;
        const orderB = b.displayOrder ?? b.id ?? 0;
        return orderA - orderB;
      });
    },
    [venueId]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 合并配方和菜单信息
  const recipesWithMenuInfo = allRecipes?.map(recipe => {
    const menuInfo = allMenuInfos?.find(m => m.recipeId === recipe.id);
    return { ...recipe, menuInfo };
  });

  // 获取当前店面的酒款（带完整配方信息）
  const venueRecipesWithInfo = venueRecipes?.map(vr => {
    const recipe = recipesWithMenuInfo?.find(r => r.id === vr.recipeId);
    return { ...vr, recipe };
  }).filter(vr => vr.recipe);

  // 进入排序模式
  const handleEnterSortMode = () => {
    if (venueRecipesWithInfo) {
      setSortedVenueRecipes([...venueRecipesWithInfo]);
      setSearchTerm('');
      setFilters({});
      setShowFilters(false);
      setIsSortMode(true);
    }
  };

  // 退出排序模式并保存
  const handleExitSortMode = async () => {
    for (let i = 0; i < sortedVenueRecipes.length; i++) {
      await db.venueRecipes.update(sortedVenueRecipes[i].id!, { displayOrder: i });
    }
    setIsSortMode(false);
    setSortedVenueRecipes([]);
  };

  // 取消排序
  const handleCancelSort = () => {
    setIsSortMode(false);
    setSortedVenueRecipes([]);
  };

  // 处理拖拽结束
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setSortedVenueRecipes((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // 筛选酒款
  const filteredVenueRecipes = isSortMode
    ? sortedVenueRecipes
    : venueRecipesWithInfo?.filter(vr => {
        const recipe = vr.recipe;
        if (!recipe) return false;

        const matchesSearch = recipe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          recipe.nameEn?.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesFlavorTag = !filters.flavorTag || 
          recipe.menuInfo?.flavorTags?.includes(filters.flavorTag);
        
        const matchesDrinkDuration = !filters.drinkDuration || 
          recipe.menuInfo?.drinkDuration === filters.drinkDuration;
        
        const matchesGlassType = !filters.glassType || 
          recipe.glassType === filters.glassType;
        
        return matchesSearch && matchesFlavorTag && matchesDrinkDuration && matchesGlassType;
      });

  const hasActiveFilters = searchTerm !== '' || filters.flavorTag || filters.drinkDuration || filters.glassType;

  // 计算各筛选项的数量
  const getFlavorTagCount = (tag: FlavorTag) => {
    return venueRecipesWithInfo?.filter(vr => vr.recipe?.menuInfo?.flavorTags?.includes(tag)).length || 0;
  };

  const getDrinkDurationCount = (duration: DrinkDuration) => {
    return venueRecipesWithInfo?.filter(vr => vr.recipe?.menuInfo?.drinkDuration === duration).length || 0;
  };

  const getGlassTypeCount = (glassType: GlassType) => {
    return venueRecipesWithInfo?.filter(vr => vr.recipe?.glassType === glassType).length || 0;
  };

  // 酒款操作
  const handleAddRecipe = async (recipeId: number) => {
    const existing = await db.venueRecipes
      .where({ venueId, recipeId })
      .first();

    if (existing) {
      alert('该酒款已在当前店面中');
      return;
    }

    await db.venueRecipes.add({
      venueId,
      recipeId,
      isAvailable: true,
      displayOrder: venueRecipes?.length || 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  };

  // 全部添加
  const handleAddAllRecipes = async () => {
    const filteredRecipes = recipesWithMenuInfo?.filter(recipe => {
      if (!addRecipeSearchTerm) return true;
      const searchLower = addRecipeSearchTerm.toLowerCase();
      return recipe.name.toLowerCase().includes(searchLower) ||
             recipe.nameEn?.toLowerCase().includes(searchLower);
    }) || [];

    let addedCount = 0;
    let skippedCount = 0;

    for (const recipe of filteredRecipes) {
      const existing = await db.venueRecipes
        .where({ venueId, recipeId: recipe.id })
        .first();

      if (existing) {
        skippedCount++;
        continue;
      }

      await db.venueRecipes.add({
        venueId,
        recipeId: recipe.id!,
        isAvailable: true,
        displayOrder: (venueRecipes?.length || 0) + addedCount,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      addedCount++;
    }

    if (addedCount > 0) {
      alert(`成功添加 ${addedCount} 款酒${skippedCount > 0 ? `，跳过 ${skippedCount} 款已存在的酒` : ''}`);
    } else {
      alert('没有可添加的酒款');
    }
  };

  const handleToggleAvailable = async (id: number, currentStatus: boolean | undefined) => {
    await db.venueRecipes.update(id, {
      isAvailable: !currentStatus,
      updatedAt: new Date(),
    });
  };

  const handleRemoveRecipe = async (id: number) => {
    await db.venueRecipes.delete(id);
  };

  const handleOpenPriceDialog = (venueRecipe: VenueRecipe) => {
    setEditingVenueRecipe(venueRecipe);
    const recipe = recipesWithMenuInfo?.find(r => r.id === venueRecipe.recipeId);
    setCustomPrice(venueRecipe.customPrice ?? recipe?.menuInfo?.price ?? 0);
    setIsPriceDialogOpen(true);
  };

  const handleSavePrice = async () => {
    if (!editingVenueRecipe?.id) return;

    await db.venueRecipes.update(editingVenueRecipe.id, {
      customPrice: customPrice,
      updatedAt: new Date(),
    });

    setIsPriceDialogOpen(false);
    setEditingVenueRecipe(null);
  };

  const handleExportVenueMenu = async () => {
    if (!venue || !venueRecipesWithInfo || !ingredients || venueRecipesWithInfo.length === 0) {
      alert('没有可导出的酒款');
      return;
    }
    try {
      await exportVenueMenuToPDF(venue, venueRecipesWithInfo, ingredients);
    } catch (error) {
      console.error('Failed to export venue menu:', error);
      alert('导出酒单失败，请重试');
    }
  };

  // 根据库存刷新酒款状态
  const handleRefreshByStock = async () => {
    if (!venueRecipesWithInfo || !allRecipes) {
      return;
    }

    // 获取当前店面的所有原料库存
    const venueIngredients = await db.venueIngredients.where('venueId').equals(venueId).toArray();
    
    // 创建一个库存映射表（原料主数据ID -> 当前库存）
    const stockMap = new Map<number, number>();
    venueIngredients.forEach(vi => {
      stockMap.set(vi.ingredientId, vi.currentStock || 0);
    });

    let updatedCount = 0;
    let availableCount = 0;
    let unavailableCount = 0;

    // 遍历所有店面酒款
    for (const vr of venueRecipesWithInfo) {
      const recipe = vr.recipe;
      if (!recipe || !recipe.ingredients) continue;

      // 检查该配方的所有原料是否都有库存
      let canMake = true;
      for (const recipeIng of recipe.ingredients) {
        const stock = stockMap.get(recipeIng.ingredientId) || 0;
        if (stock <= 0) {
          canMake = false;
          break;
        }
      }

      // 更新酒款状态
      const newStatus = canMake;
      if (vr.isAvailable !== newStatus) {
        await db.venueRecipes.update(vr.id!, {
          isAvailable: newStatus,
          updatedAt: new Date(),
        });
        updatedCount++;
        if (newStatus) {
          availableCount++;
        } else {
          unavailableCount++;
        }
      }
    }

    if (updatedCount > 0) {
      alert(`已更新 ${updatedCount} 款酒的状态\n上架: ${availableCount} 款\n下架: ${unavailableCount} 款`);
    } else {
      alert('所有酒款状态已是最新，无需更新');
    }
  };

  return (
    <div className="space-y-3">
      {/* 操作栏 */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          {/* 标签页切换 */}
          <div className="flex gap-1 bg-muted p-1 rounded-md">
            <Button
              variant={activeTab === 'menu' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => {
                onTabChange('menu');
                localStorage.setItem('venueManagement_activeTab', 'menu');
              }}
              className="h-8"
            >
              酒款管理
            </Button>
            <Button
              variant={activeTab === 'ingredients' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => {
                onTabChange('ingredients');
                localStorage.setItem('venueManagement_activeTab', 'ingredients');
              }}
              className="h-8"
            >
              原料库存
            </Button>
          </div>
          <span className="text-sm text-muted-foreground">
            {filteredVenueRecipes?.length || 0} 款酒
          </span>
        </div>
        <div className="flex gap-2">
          {isSortMode ? (
            <>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleCancelSort} 
                className="touch-feedback"
              >
                <X className="mr-2 h-4 w-4" />
                取消
              </Button>
              <Button 
                size="sm"
                onClick={handleExitSortMode} 
                className="touch-feedback"
              >
                <Check className="mr-2 h-4 w-4" />
                完成排序
              </Button>
            </>
          ) : (
            <>
              <Button 
                variant="outline"
                size="sm"
                onClick={handleRefreshByStock}
                className="touch-feedback"
                disabled={!venueRecipesWithInfo || venueRecipesWithInfo.length === 0}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                根据库存刷新
              </Button>
              <Button 
                variant="outline"
                size="sm"
                onClick={handleEnterSortMode}
                className="touch-feedback"
                disabled={hasActiveFilters}
              >
                <GripVertical className="mr-2 h-4 w-4" />
                排序
              </Button>
              <Button 
                variant="outline"
                size="sm"
                onClick={handleExportVenueMenu}
                className="touch-feedback"
                disabled={!venueRecipesWithInfo || venueRecipesWithInfo.length === 0}
              >
                <FileDown className="mr-2 h-4 w-4" />
                导出
              </Button>
              <Button size="sm" onClick={() => setIsAddRecipeDialogOpen(true)} className="touch-feedback">
                <Plus className="mr-2 h-4 w-4" />
                添加酒款
              </Button>
            </>
          )}
        </div>
      </div>

      {/* 搜索和筛选栏 */}
      {!isSortMode && (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="搜索酒款名称..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant={showFilters || hasActiveFilters ? "default" : "outline"}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="touch-feedback"
          >
            <Filter className="mr-2 h-4 w-4" />
            筛选
            {hasActiveFilters && <Badge variant="secondary" className="ml-2">•</Badge>}
          </Button>
        </div>
      )}

      {/* 筛选器 */}
      {!isSortMode && showFilters && (
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>风味标签</Label>
                <Select
                  value={filters.flavorTag || 'all'}
                  onValueChange={(value) => setFilters({ ...filters, flavorTag: value === 'all' ? undefined : value as FlavorTag })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="全部" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部 ({venueRecipesWithInfo?.length || 0})</SelectItem>
                    <SelectItem value="sour">酸 (Sour) ({getFlavorTagCount('sour')})</SelectItem>
                    <SelectItem value="sweet">甜/果香 (Sweet) ({getFlavorTagCount('sweet')})</SelectItem>
                    <SelectItem value="dry">干 (Dry) ({getFlavorTagCount('dry')})</SelectItem>
                    <SelectItem value="aromatic">芳香 (Aromatic) ({getFlavorTagCount('aromatic')})</SelectItem>
                    <SelectItem value="highball">嗨棒 (Highball) ({getFlavorTagCount('highball')})</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>饮用类型</Label>
                <Select
                  value={filters.drinkDuration || 'all'}
                  onValueChange={(value) => setFilters({ ...filters, drinkDuration: value === 'all' ? undefined : value as DrinkDuration })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="全部" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部 ({venueRecipesWithInfo?.length || 0})</SelectItem>
                    <SelectItem value="short">短饮 ({getDrinkDurationCount('short')})</SelectItem>
                    <SelectItem value="long">长饮 ({getDrinkDurationCount('long')})</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>使用杯型</Label>
                <Select
                  value={filters.glassType || 'all'}
                  onValueChange={(value) => setFilters({ ...filters, glassType: value === 'all' ? undefined : value as GlassType })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="全部" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部 ({venueRecipesWithInfo?.length || 0})</SelectItem>
                    <SelectItem value="rocks">古典杯 ({getGlassTypeCount('rocks')})</SelectItem>
                    <SelectItem value="highball">嗨棒杯 ({getGlassTypeCount('highball')})</SelectItem>
                    <SelectItem value="martini">马天尼杯 ({getGlassTypeCount('martini')})</SelectItem>
                    <SelectItem value="coupe">平底杯 ({getGlassTypeCount('coupe')})</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {hasActiveFilters && (
              <div className="mt-4 flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFilters({})}
                  className="touch-feedback"
                >
                  <X className="mr-2 h-3 w-3" />
                  清除筛选
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 酒款列表 */}
      {filteredVenueRecipes && filteredVenueRecipes.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={filteredVenueRecipes.map(vr => vr.id!) || []}
            strategy={verticalListSortingStrategy}
          >
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredVenueRecipes.map((vr) => (
                <SortableVenueRecipeCard
                  key={vr.id}
                  recipe={vr.recipe}
                  venueRecipe={vr}
                  isSortMode={isSortMode}
                  onToggleAvailable={handleToggleAvailable}
                  onRemove={handleRemoveRecipe}
                  onEditPrice={handleOpenPriceDialog}
                  onViewRecipe={(recipeId) => navigate(`/recipes/${recipeId}`, { state: { from: '/venues' } })}
                  flavorTagMap={flavorTagMap}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">
              {searchTerm || hasActiveFilters ? '没有找到符合条件的酒款' : '还没有添加酒款'}
            </p>
            {searchTerm || hasActiveFilters ? (
              <Button
                variant="link"
                onClick={() => {
                  setSearchTerm('');
                  setFilters({});
                }}
              >
                清除筛选
              </Button>
            ) : (
              <Button onClick={() => setIsAddRecipeDialogOpen(true)} className="touch-feedback">
                <Plus className="mr-2 h-4 w-4" />
                添加第一款酒
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* 添加酒款对话框 */}
      <Dialog open={isAddRecipeDialogOpen} onOpenChange={(open) => {
        setIsAddRecipeDialogOpen(open);
        if (!open) setAddRecipeSearchTerm('');
      }}>
        <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>添加酒款</DialogTitle>
            <DialogDescription>从配方库中选择要添加的酒款</DialogDescription>
          </DialogHeader>
          
          {/* 搜索框和全部添加按钮 */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索酒款名称..."
                value={addRecipeSearchTerm}
                onChange={(e) => setAddRecipeSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              variant="outline"
              onClick={handleAddAllRecipes}
              className="touch-feedback"
            >
              全部添加
            </Button>
          </div>

          <div className="grid gap-3 overflow-y-auto flex-1 pr-2">
            {recipesWithMenuInfo
              ?.filter(recipe => {
                if (!addRecipeSearchTerm) return true;
                const searchLower = addRecipeSearchTerm.toLowerCase();
                return recipe.name.toLowerCase().includes(searchLower) ||
                       recipe.nameEn?.toLowerCase().includes(searchLower);
              })
              .map((recipe) => {
                const isAdded = venueRecipes?.some(vr => vr.recipeId === recipe.id);
                return (
                  <Card key={recipe.id} className={isAdded ? 'opacity-50' : ''}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{recipe.name}</CardTitle>
                          {recipe.nameEn && (
                            <p className="text-sm text-muted-foreground mt-1">{recipe.nameEn}</p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleAddRecipe(recipe.id!)}
                          disabled={isAdded}
                          className="touch-feedback"
                        >
                          {isAdded ? '已添加' : '添加'}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-4 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">成本: </span>
                          <span className="font-medium">{formatCurrency(recipe.calculatedCost || 0)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">售价: </span>
                          <span className="font-medium">{formatCurrency(recipe.menuInfo?.price || 0)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">容量: </span>
                          <span>{recipe.totalVolume || 0} ml</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">酒精度: </span>
                          <span>{recipe.calculatedAbv || 0}%</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            {recipesWithMenuInfo?.filter(recipe => {
              if (!addRecipeSearchTerm) return true;
              const searchLower = addRecipeSearchTerm.toLowerCase();
              return recipe.name.toLowerCase().includes(searchLower) ||
                     recipe.nameEn?.toLowerCase().includes(searchLower);
            }).length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                没有找到符合条件的酒款
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 编辑价格对话框 */}
      <Dialog open={isPriceDialogOpen} onOpenChange={setIsPriceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>设置售价</DialogTitle>
            <DialogDescription>
              为该酒款在当前店面设置自定义售价
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="custom-price">售价 (¥)</Label>
              <Input
                id="custom-price"
                type="number"
                value={customPrice || ''}
                onChange={(e) => setCustomPrice(e.target.value === '' ? 0 : Number(e.target.value))}
                onClick={(e) => (e.target as HTMLInputElement).select()}
                placeholder="0"
                min="0"
                step="0.01"
              />
              <p className="text-xs text-muted-foreground">
                留空则使用配方默认售价
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPriceDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSavePrice}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
