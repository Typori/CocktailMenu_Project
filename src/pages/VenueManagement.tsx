import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import { Venue, VenueRecipe, Recipe, FlavorTag, DrinkDuration, GlassType } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Plus, Store, Edit, Trash2, Copy, Star, Search, Filter, X, GripVertical, Check } from 'lucide-react';
import { formatCurrency, getFlavorTagLabel, getDrinkDurationLabel, getGlassTypeLabel } from '@/utils/calculations';
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

// 可排序酒款卡片组件
function SortableVenueRecipeCard({
  recipe,
  venueRecipe,
  isSortMode,
  onToggleAvailable,
  onRemove,
  onEditPrice,
}: {
  recipe: any;
  venueRecipe: VenueRecipe;
  isSortMode: boolean;
  onToggleAvailable: (id: number, currentStatus: boolean | undefined) => void;
  onRemove: (id: number) => void;
  onEditPrice: (venueRecipe: VenueRecipe) => void;
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
    <div ref={setNodeRef} style={style}>
      <Card className={`card-hover relative ${isSortMode ? 'cursor-move' : ''} ${!venueRecipe.isAvailable ? 'opacity-60' : ''}`}>
        {isSortMode && (
          <div 
            {...attributes} 
            {...listeners} 
            className="absolute top-4 left-4 cursor-grab active:cursor-grabbing z-10"
          >
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
        <CardHeader className={`pb-3 ${isSortMode ? 'pl-12' : ''}`}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-xl flex items-center gap-2">
                <span className="truncate">{recipe.name}</span>
                {recipe.isFavorite && (
                  <Star className="h-4 w-4 fill-yellow-500 text-yellow-500 flex-shrink-0" />
                )}
              </CardTitle>
            </div>
            {!venueRecipe.isAvailable && (
              <Badge variant="secondary">已下架</Badge>
            )}
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
        
        <CardContent className="space-y-3">
          {/* 配方信息 */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">配料:</span>
              <span className="font-medium">{recipe.ingredients?.length || 0} 种</span>
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
              <span className="text-muted-foreground">售价:</span>
              <span className="font-medium text-primary">{formatCurrency(displayPrice)}</span>
            </div>
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

export default function VenueManagement() {
  const [selectedVenueId, setSelectedVenueId] = useState<number | null>(null);
  const [isVenueDialogOpen, setIsVenueDialogOpen] = useState(false);
  const [isAddRecipeDialogOpen, setIsAddRecipeDialogOpen] = useState(false);
  const [isPriceDialogOpen, setIsPriceDialogOpen] = useState(false);
  const [editingVenue, setEditingVenue] = useState<Venue | null>(null);
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
  const [venueFormData, setVenueFormData] = useState<Partial<Venue>>({
    name: '',
    description: '',
    address: '',
  });
  const [customPrice, setCustomPrice] = useState<number>(0);

  const venues = useLiveQuery(() => db.venues.toArray(), []);
  const allRecipes = useLiveQuery(() => db.recipes.toArray(), []);
  const allMenuInfos = useLiveQuery(() => db.menuInfo.toArray(), []);
  const venueRecipes = useLiveQuery(
    () => selectedVenueId ? db.venueRecipes.where('venueId').equals(selectedVenueId).toArray() : Promise.resolve([]),
    [selectedVenueId]
  );

  const sensors = useSensors(
    useSensor(PointerSensor),
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
    // 更新displayOrder
    for (let i = 0; i < sortedVenueRecipes.length; i++) {
      await db.venueRecipes.update(sortedVenueRecipes[i].id!, { displayOrder: i });
    }
    setIsSortMode(false);
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

  // 店面操作
  const handleOpenVenueDialog = (venue?: Venue) => {
    if (venue) {
      setEditingVenue(venue);
      setVenueFormData(venue);
    } else {
      setEditingVenue(null);
      setVenueFormData({ name: '', description: '', address: '' });
    }
    setIsVenueDialogOpen(true);
  };

  const handleSaveVenue = async () => {
    if (!venueFormData.name) {
      alert('请输入店面名称');
      return;
    }

    const venueData: Venue = {
      ...venueFormData as Venue,
      updatedAt: new Date(),
      createdAt: venueFormData.createdAt || new Date(),
    };

    if (editingVenue?.id) {
      await db.venues.update(editingVenue.id, venueData);
    } else {
      const newId = await db.venues.add(venueData);
      setSelectedVenueId(newId as number);
    }

    setIsVenueDialogOpen(false);
    setEditingVenue(null);
  };

  const handleDeleteVenue = async (id: number) => {
    if (confirm('确定要删除这个店面吗？这将同时删除该店面的所有上架酒款。')) {
      await db.venues.delete(id);
      await db.venueRecipes.where('venueId').equals(id).delete();
      if (selectedVenueId === id) {
        setSelectedVenueId(null);
      }
    }
  };

  // 酒款操作
  const handleAddRecipe = async (recipeId: number) => {
    if (!selectedVenueId) return;

    // 检查是否已添加
    const existing = await db.venueRecipes
      .where({ venueId: selectedVenueId, recipeId })
      .first();

    if (existing) {
      alert('该酒款已在当前店面中');
      return;
    }

    await db.venueRecipes.add({
      venueId: selectedVenueId,
      recipeId,
      isAvailable: true,
      displayOrder: venueRecipes?.length || 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  };

  const handleToggleAvailable = async (id: number, currentStatus: boolean | undefined) => {
    await db.venueRecipes.update(id, {
      isAvailable: !currentStatus,
      updatedAt: new Date(),
    });
  };

  const handleRemoveRecipe = async (id: number) => {
    if (confirm('确定要从店面移除这款酒吗？')) {
      await db.venueRecipes.delete(id);
    }
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

  // 如果没有店面，显示创建提示
  if (!venues || venues.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Store className="h-8 w-8" />
              上架酒款
            </h2>
            <p className="text-muted-foreground mt-2">
              为不同店面管理上架的酒款
            </p>
          </div>
        </div>

        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Store className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">还没有店面</p>
            <p className="text-sm text-muted-foreground mb-4">
              创建第一个店面来开始管理酒款
            </p>
            <Button onClick={() => handleOpenVenueDialog()} className="touch-feedback">
              <Plus className="mr-2 h-4 w-4" />
              创建店面
            </Button>
          </CardContent>
        </Card>

        {/* 店面对话框 */}
        <Dialog open={isVenueDialogOpen} onOpenChange={setIsVenueDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>创建店面</DialogTitle>
              <DialogDescription>填写店面的基本信息</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="venue-name">店面名称 *</Label>
                <Input
                  id="venue-name"
                  value={venueFormData.name || ''}
                  onChange={(e) => setVenueFormData({ ...venueFormData, name: e.target.value })}
                  placeholder="例如: 市中心店"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="venue-address">地址</Label>
                <Input
                  id="venue-address"
                  value={venueFormData.address || ''}
                  onChange={(e) => setVenueFormData({ ...venueFormData, address: e.target.value })}
                  placeholder="例如: 北京市朝阳区xxx"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="venue-description">描述</Label>
                <textarea
                  id="venue-description"
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={venueFormData.description || ''}
                  onChange={(e) => setVenueFormData({ ...venueFormData, description: e.target.value })}
                  placeholder="店面特色、定位等..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsVenueDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleSaveVenue} disabled={!venueFormData.name}>
                保存
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // 如果没有选中店面，选择第一个
  if (!selectedVenueId && venues.length > 0) {
    setSelectedVenueId(venues[0].id!);
  }

  const selectedVenue = venues.find(v => v.id === selectedVenueId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Store className="h-8 w-8" />
            上架酒款
          </h2>
          <p className="text-muted-foreground mt-2">
            {isSortMode ? '拖动卡片重新排序' : '为不同店面管理上架的酒款'}
          </p>
        </div>
        <Button onClick={() => handleOpenVenueDialog()} variant="outline" className="touch-feedback">
          <Plus className="mr-2 h-4 w-4" />
          新建店面
        </Button>
      </div>

      {/* 店面标签页 */}
      <Tabs value={String(selectedVenueId)} onValueChange={(value) => setSelectedVenueId(Number(value))}>
        <div className="flex items-center gap-3">
          <TabsList className="flex-1 justify-start overflow-x-auto">
            {venues.map((venue) => (
              <TabsTrigger key={venue.id} value={String(venue.id)} className="relative">
                {venue.name}
              </TabsTrigger>
            ))}
          </TabsList>
          {selectedVenue && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleOpenVenueDialog(selectedVenue)}
                className="touch-feedback"
              >
                <Edit className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleDeleteVenue(selectedVenue.id!)}
                className="touch-feedback"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>

        {venues.map((venue) => (
          <TabsContent key={venue.id} value={String(venue.id)} className="space-y-6 mt-6">
            {/* 操作栏 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {filteredVenueRecipes?.length || 0} 款酒
                </Badge>
                {venue.address && (
                  <span className="text-sm text-muted-foreground">{venue.address}</span>
                )}
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
                    <Button onClick={() => setIsAddRecipeDialogOpen(true)} className="touch-feedback">
                      <Plus className="mr-2 h-4 w-4" />
                      添加酒款
                    </Button>
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

            {/* 搜索和筛选栏 */}
            {!isSortMode && (
              <div className="space-y-3">
                <div className="flex gap-3">
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
              </div>
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
          </TabsContent>
        ))}
      </Tabs>

      {/* 店面对话框 */}
      <Dialog open={isVenueDialogOpen} onOpenChange={setIsVenueDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingVenue ? '编辑店面' : '创建店面'}</DialogTitle>
            <DialogDescription>填写店面的基本信息</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="venue-name">店面名称 *</Label>
              <Input
                id="venue-name"
                value={venueFormData.name || ''}
                onChange={(e) => setVenueFormData({ ...venueFormData, name: e.target.value })}
                placeholder="例如: 市中心店"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="venue-address">地址</Label>
              <Input
                id="venue-address"
                value={venueFormData.address || ''}
                onChange={(e) => setVenueFormData({ ...venueFormData, address: e.target.value })}
                placeholder="例如: 北京市朝阳区xxx"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="venue-description">描述</Label>
              <textarea
                id="venue-description"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={venueFormData.description || ''}
                onChange={(e) => setVenueFormData({ ...venueFormData, description: e.target.value })}
                placeholder="店面特色、定位等..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsVenueDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSaveVenue} disabled={!venueFormData.name}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 添加酒款对话框 */}
      <Dialog open={isAddRecipeDialogOpen} onOpenChange={setIsAddRecipeDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>添加酒款</DialogTitle>
            <DialogDescription>从配方库中选择要添加的酒款</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-4">
            {recipesWithMenuInfo?.map((recipe) => {
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
                        onClick={() => {
                          handleAddRecipe(recipe.id!);
                          setIsAddRecipeDialogOpen(false);
                        }}
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
                value={customPrice}
                onChange={(e) => setCustomPrice(Number(e.target.value))}
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
