import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Search, Star, Edit, Trash2, Copy, Filter, X, GripVertical, Check } from 'lucide-react';
import { formatCurrency, getFlavorTagLabel, getDrinkDurationLabel, getGlassTypeLabel } from '@/utils/calculations';
import { FlavorTag, DrinkDuration, GlassType } from '@/types';
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

// 可排序配方卡片组件
function SortableRecipeCard({
  recipe,
  isSortMode,
  onToggleFavorite,
  onDuplicate,
  onDelete,
}: {
  recipe: any;
  isSortMode: boolean;
  onToggleFavorite: (id: number, currentStatus: boolean | undefined) => void;
  onDuplicate: (recipe: any) => void;
  onDelete: (id: number) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: recipe.id!, disabled: !isSortMode });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card className={`card-hover relative ${isSortMode ? 'cursor-move' : ''}`}>
        {isSortMode && (
          <div 
            {...attributes} 
            {...listeners} 
            className="absolute top-4 left-4 cursor-grab active:cursor-grabbing z-10"
          >
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
        <Link to={`/recipes/${recipe.id}`}>
          <CardHeader className={`pb-3 cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg ${isSortMode ? 'pl-12' : ''}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-xl flex items-center gap-2">
                  <span className="truncate">{recipe.name}</span>
                  {recipe.isFavorite && (
                    <Star className="h-4 w-4 fill-yellow-500 text-yellow-500 flex-shrink-0" />
                  )}
                </CardTitle>
              </div>
            </div>
            
            {/* 风味标签 */}
            {recipe.menuInfo?.flavorTags && recipe.menuInfo.flavorTags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {recipe.menuInfo.flavorTags.map((tag: FlavorTag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {getFlavorTagLabel(tag)}
                  </Badge>
                ))}
              </div>
            )}
          </CardHeader>
        </Link>
        
        <CardContent className="space-y-3">
          {/* 配方信息 */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">配料:</span>
              <span className="font-medium">{recipe.ingredients.length} 种</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">容量:</span>
              <span className="font-medium">{recipe.totalVolume || 0} ml</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">成本:</span>
              <span className="font-medium">{formatCurrency(recipe.calculatedCost || 0)}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">酒精度:</span>
              <span className="font-medium">{recipe.calculatedAbv || 0}%</span>
            </div>
          </div>

          {/* 操作按钮 */}
          {!isSortMode && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                className="touch-feedback"
                onClick={() => onToggleFavorite(recipe.id!, recipe.isFavorite || false)}
              >
                <Star className={`h-4 w-4 ${recipe.isFavorite ? 'fill-yellow-500 text-yellow-500' : ''}`} />
              </Button>
              <Link to={`/recipes/${recipe.id}/edit`} className="flex-1">
                <Button size="sm" variant="outline" className="w-full touch-feedback">
                  <Edit className="mr-1 h-3 w-3" />
                  编辑
                </Button>
              </Link>
              <Button
                size="sm"
                variant="outline"
                className="touch-feedback"
                onClick={() => onDuplicate(recipe)}
              >
                <Copy className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="touch-feedback"
                onClick={() => onDelete(recipe.id!)}
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

export default function Recipes() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [isSortMode, setIsSortMode] = useState(false);
  const [sortedRecipes, setSortedRecipes] = useState<any[]>([]);
  const [filters, setFilters] = useState<{
    flavorTag?: FlavorTag;
    drinkDuration?: DrinkDuration;
    glassType?: GlassType;
  }>({});
  
  const recipes = useLiveQuery(() => db.recipes.toArray());
  const menuInfos = useLiveQuery(() => db.menuInfo.toArray());

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 合并配方和菜单信息
  const recipesWithMenuInfo = recipes?.map(recipe => {
    const menuInfo = menuInfos?.find(m => m.recipeId === recipe.id);
    return { ...recipe, menuInfo };
  });

  // 进入排序模式
  const handleEnterSortMode = () => {
    if (recipesWithMenuInfo) {
      setSortedRecipes([...recipesWithMenuInfo]);
      setSearchTerm('');
      setFilters({});
      setShowFilters(false);
      setIsSortMode(true);
    }
  };

  // 退出排序模式
  const handleExitSortMode = () => {
    setIsSortMode(false);
  };

  // 取消排序
  const handleCancelSort = () => {
    setIsSortMode(false);
    setSortedRecipes([]);
  };

  // 处理拖拽结束
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setSortedRecipes((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const filteredRecipes = isSortMode
    ? sortedRecipes
    : recipesWithMenuInfo?.filter(recipe => {
        // 搜索过滤
        const matchesSearch = recipe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          recipe.nameEn?.toLowerCase().includes(searchTerm.toLowerCase());
        
        // 风味标签过滤
        const matchesFlavorTag = !filters.flavorTag || 
          recipe.menuInfo?.flavorTags?.includes(filters.flavorTag);
        
        // 饮用类型过滤
        const matchesDrinkDuration = !filters.drinkDuration || 
          recipe.menuInfo?.drinkDuration === filters.drinkDuration;
        
        // 杯型过滤
        const matchesGlassType = !filters.glassType || 
          recipe.glassType === filters.glassType;
        
        return matchesSearch && matchesFlavorTag && matchesDrinkDuration && matchesGlassType;
      });

  // 计算各筛选项的数量
  const getFlavorTagCount = (tag: FlavorTag) => {
    return recipesWithMenuInfo?.filter(r => r.menuInfo?.flavorTags?.includes(tag)).length || 0;
  };

  const getDrinkDurationCount = (duration: DrinkDuration) => {
    return recipesWithMenuInfo?.filter(r => r.menuInfo?.drinkDuration === duration).length || 0;
  };

  const getGlassTypeCount = (glassType: GlassType) => {
    return recipesWithMenuInfo?.filter(r => r.glassType === glassType).length || 0;
  };

  const hasActiveFilters = searchTerm !== '' || filters.flavorTag || filters.drinkDuration || filters.glassType;

  const clearFilters = () => {
    setFilters({});
  };

  const handleDelete = async (id: number) => {
    if (confirm('确定要删除这个配方吗？')) {
      await db.recipes.delete(id);
      await db.menuInfo.where('recipeId').equals(id).delete();
    }
  };

  const handleToggleFavorite = async (id: number, currentStatus: boolean | undefined) => {
    await db.recipes.update(id, { 
      isFavorite: !currentStatus,
      updatedAt: new Date(),
    });
  };

  const handleDuplicate = async (recipe: any) => {
    const newRecipe = {
      ...recipe,
      id: undefined,
      name: `${recipe.name} (副本)`,
      isFavorite: false, // 复制的配方默认不收藏
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const newId = await db.recipes.add(newRecipe);
    
    // 如果有菜单信息，也复制一份
    if (recipe.menuInfo) {
      await db.menuInfo.add({
        ...recipe.menuInfo,
        id: undefined,
        recipeId: newId as number,
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">配方管理</h2>
          <p className="text-muted-foreground">
            {isSortMode ? '拖动卡片重新排序' : '创建和管理你的调酒配方'}
          </p>
        </div>
        <div className="flex gap-2">
          {isSortMode ? (
            <>
              <Button 
                variant="outline" 
                onClick={handleCancelSort} 
                className="touch-feedback"
              >
                <X className="mr-2 h-4 w-4" />
                取消
              </Button>
              <Button 
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
                onClick={handleEnterSortMode}
                className="touch-feedback"
                disabled={hasActiveFilters}
              >
                <GripVertical className="mr-2 h-4 w-4" />
                排序
              </Button>
              <Link to="/recipes/new">
                <Button className="touch-feedback">
                  <Plus className="mr-2 h-4 w-4" />
                  创建配方
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* 排序模式提示 */}
      {hasActiveFilters && !isSortMode && (
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-900">
          <CardContent className="py-3">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              💡 提示：清除搜索和筛选条件后可以使用拖拽排序功能
            </p>
          </CardContent>
        </Card>
      )}

      {/* 搜索和筛选栏 - 排序模式下隐藏 */}
      {!isSortMode && (
        <div className="space-y-3">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索配方名称..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant={showFilters || hasActiveFilters ? "default" : "outline"}
              onClick={() => setShowFilters(!showFilters)}
              className="touch-feedback"
            >
              <Filter className="mr-2 h-4 w-4" />
              筛选
              {hasActiveFilters && <Badge variant="secondary" className="ml-2">•</Badge>}
            </Button>
          </div>

        {/* 筛选器 */}
        {showFilters && (
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-3 gap-4">
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
                      <SelectItem value="all">全部 ({recipesWithMenuInfo?.length || 0})</SelectItem>
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
                      <SelectItem value="all">全部 ({recipesWithMenuInfo?.length || 0})</SelectItem>
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
                      <SelectItem value="all">全部 ({recipesWithMenuInfo?.length || 0})</SelectItem>
                      <SelectItem value="rocks">古典杯 ({getGlassTypeCount('rocks')})</SelectItem>
                      <SelectItem value="highball">嗨棒杯 ({getGlassTypeCount('highball')})</SelectItem>
                      <SelectItem value="martini">马天尼杯 ({getGlassTypeCount('martini')})</SelectItem>
                      <SelectItem value="flute">笛型杯 ({getGlassTypeCount('flute')})</SelectItem>
                      <SelectItem value="wine">葡萄酒杯 ({getGlassTypeCount('wine')})</SelectItem>
                      <SelectItem value="shot">一口杯 ({getGlassTypeCount('shot')})</SelectItem>
                      <SelectItem value="margarita">玛格丽特杯 ({getGlassTypeCount('margarita')})</SelectItem>
                      <SelectItem value="hurricane">飓风杯 ({getGlassTypeCount('hurricane')})</SelectItem>
                      <SelectItem value="tiki">迈泰杯 ({getGlassTypeCount('tiki')})</SelectItem>
                      <SelectItem value="julep">圆柱形金属杯 ({getGlassTypeCount('julep')})</SelectItem>
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
                    onClick={clearFilters}
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
        </div>
      )}

      {/* 配方列表 */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={filteredRecipes?.map(r => r.id!) || []}
          strategy={verticalListSortingStrategy}
        >
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredRecipes?.map((recipe) => (
              <SortableRecipeCard
                key={recipe.id}
                recipe={recipe}
                isSortMode={isSortMode}
                onToggleFavorite={handleToggleFavorite}
                onDuplicate={handleDuplicate}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {filteredRecipes?.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {searchTerm ? '没有找到配方' : '还没有配方'}
          </p>
          {searchTerm ? (
            <Button
              variant="link"
              onClick={() => setSearchTerm('')}
              className="mt-2"
            >
              清除搜索
            </Button>
          ) : (
            <Link to="/recipes/new">
              <Button variant="link" className="mt-2">
                创建第一个配方
              </Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
