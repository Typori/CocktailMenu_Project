import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Search, Pencil, Trash2, GripVertical, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { db } from '@/db/database';
import { VenueIngredient, IngredientMaster, SpiritType } from '@/types';
import AddVenueIngredientDialog from '@/components/AddVenueIngredientDialog';
import { formatCurrency } from '@/utils/calculations';
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

interface VenueIngredientsTabProps {
  venueId: number;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const categoryLabels: Record<SpiritType, string> = {
  spirit: '基酒',
  liqueur: '利口酒',
  other_alcohol: '其他酒类',
  essence: '香精',
  juice: '果汁',
  soda: '汽水',
  syrup: '糖浆',
  garnish: '装饰',
  other: '其他',
};

const categoryColors: Record<SpiritType, string> = {
  spirit: 'bg-blue-500',
  liqueur: 'bg-purple-500',
  other_alcohol: 'bg-indigo-500',
  essence: 'bg-pink-500',
  juice: 'bg-orange-500',
  soda: 'bg-cyan-500',
  syrup: 'bg-amber-500',
  garnish: 'bg-green-500',
  other: 'bg-gray-500',
};

interface SortableIngredientProps {
  ingredient: VenueIngredient & { master?: IngredientMaster };
  onEdit: (ingredient: VenueIngredient) => void;
  onDelete: (id: number) => void;
  onFillStock: (id: number, quantity: number) => void;
  onClearStock: (id: number) => void;
}

function SortableIngredient({ ingredient, onEdit, onDelete, onFillStock, onClearStock }: SortableIngredientProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: ingredient.id! });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const unitPrice = ingredient.unitPrice || 0;
  const isLowStock = ingredient.currentStock !== undefined && 
                     ingredient.minStock !== undefined && 
                     ingredient.currentStock <= ingredient.minStock;

  return (
    <div ref={setNodeRef} style={style} className="touch-none">
      <Card className="p-3 hover:shadow-md transition-shadow">
        <div className="flex items-center gap-3">
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing touch-feedback">
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-medium">
                {ingredient.ingredientName || ingredient.master?.name}
              </h3>
              {ingredient.master?.nameEn && (
                <span className="text-sm text-muted-foreground">
                  {ingredient.master.nameEn}
                </span>
              )}
              {isLowStock && (
                <AlertTriangle className="h-4 w-4 text-orange-500 flex-shrink-0 ml-auto" />
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              {ingredient.master && (
                <Badge className={categoryColors[ingredient.master.category]}>
                  {categoryLabels[ingredient.master.category]}
                </Badge>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">当前库存: </span>
                <span className={`font-medium ${isLowStock ? 'text-orange-500' : ''}`}>
                  {ingredient.currentStock ?? '-'} {ingredient.master?.unit || 'ml'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">容量: </span>
                <span className="font-medium">{ingredient.quantity} {ingredient.master?.unit || 'ml'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">价格: </span>
                <span className="font-medium">{formatCurrency(ingredient.price)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">单价: </span>
                <span className="font-medium">{formatCurrency(unitPrice)}/{ingredient.master?.unit || 'ml'}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onFillStock(ingredient.id!, ingredient.quantity)}
              className="touch-feedback h-8 px-2 text-xs"
              title="补满库存"
            >
              补满
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onClearStock(ingredient.id!)}
              className="touch-feedback h-8 px-2 text-xs"
              title="清空库存"
            >
              清空
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(ingredient)}
              className="touch-feedback h-8 w-8"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(ingredient.id!)}
              className="text-destructive hover:text-destructive touch-feedback h-8 w-8"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default function VenueIngredientsTab({ venueId, activeTab, onTabChange }: VenueIngredientsTabProps) {
  const [ingredients, setIngredients] = useState<(VenueIngredient & { master?: IngredientMaster })[]>([]);
  const [filteredIngredients, setFilteredIngredients] = useState<(VenueIngredient & { master?: IngredientMaster })[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<SpiritType | 'all'>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<VenueIngredient | undefined>();

  const venueIngredients = useLiveQuery(
    () => db.venueIngredients.where('venueId').equals(venueId).sortBy('displayOrder'),
    [venueId]
  );

  const ingredientMasters = useLiveQuery(() => db.ingredientMaster.toArray(), []);

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

  // 合并店面原料和主数据
  useEffect(() => {
    if (venueIngredients && ingredientMasters) {
      const merged = venueIngredients.map(vi => {
        const master = ingredientMasters.find(m => m.id === vi.ingredientMasterId);
        return { ...vi, master };
      });
      setIngredients(merged);
    }
  }, [venueIngredients, ingredientMasters]);

  // 筛选
  useEffect(() => {
    let filtered = ingredients;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(ing => ing.master?.category === selectedCategory);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(ing =>
        ing.ingredientName?.toLowerCase().includes(query) ||
        ing.master?.name.toLowerCase().includes(query) ||
        ing.master?.nameEn?.toLowerCase().includes(query)
      );
    }

    setFilteredIngredients(filtered);
  }, [ingredients, searchQuery, selectedCategory]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = filteredIngredients.findIndex(ing => ing.id === active.id);
      const newIndex = filteredIngredients.findIndex(ing => ing.id === over.id);

      const newOrder = arrayMove(filteredIngredients, oldIndex, newIndex);
      setFilteredIngredients(newOrder);

      // 更新数据库中的displayOrder
      for (let i = 0; i < newOrder.length; i++) {
        await db.venueIngredients.update(newOrder[i].id!, { displayOrder: i });
      }
    }
  };

  const handleEdit = (ingredient: VenueIngredient) => {
    setEditingIngredient(ingredient);
    setIsAddDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await db.venueIngredients.delete(id);
    } catch (error) {
      console.error('删除原料失败:', error);
      alert('删除失败，请稍后重试');
    }
  };

  // 补满单个原料库存
  const handleFillStock = async (id: number, quantity: number) => {
    try {
      await db.venueIngredients.update(id, {
        currentStock: quantity,
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error('补满库存失败:', error);
      alert('操作失败，请稍后重试');
    }
  };

  // 清空单个原料库存
  const handleClearStock = async (id: number) => {
    try {
      await db.venueIngredients.update(id, {
        currentStock: 0,
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error('清空库存失败:', error);
      alert('操作失败，请稍后重试');
    }
  };

  // 一键补满库存
  const handleFillAllStock = async () => {
    if (!confirm('确定要将所有原料的库存补满到默认容量吗？')) {
      return;
    }

    try {
      for (const ingredient of ingredients) {
        await db.venueIngredients.update(ingredient.id!, {
          currentStock: ingredient.quantity,
          updatedAt: new Date(),
        });
      }
    } catch (error) {
      console.error('补满库存失败:', error);
      alert('操作失败，请稍后重试');
    }
  };

  // 一键清空库存
  const handleClearAllStock = async () => {
    if (!confirm('确定要清空所有原料的库存吗？此操作不可恢复！')) {
      return;
    }

    try {
      for (const ingredient of ingredients) {
        await db.venueIngredients.update(ingredient.id!, {
          currentStock: 0,
          updatedAt: new Date(),
        });
      }
    } catch (error) {
      console.error('清空库存失败:', error);
      alert('操作失败，请稍后重试');
    }
  };

  const handleDialogClose = () => {
    setIsAddDialogOpen(false);
    setEditingIngredient(undefined);
  };

  const categories: Array<{ value: SpiritType | 'all'; label: string }> = [
    { value: 'all', label: '全部' },
    { value: 'spirit', label: '基酒' },
    { value: 'liqueur', label: '利口酒' },
    { value: 'juice', label: '果汁' },
    { value: 'syrup', label: '糖浆' },
    { value: 'soda', label: '汽水' },
    { value: 'garnish', label: '装饰' },
    { value: 'other', label: '其他' },
  ];

  // 统计低库存数量
  const lowStockCount = ingredients.filter(ing => 
    ing.currentStock !== undefined && 
    ing.minStock !== undefined && 
    ing.currentStock <= ing.minStock
  ).length;

  return (
    <div className="space-y-3">
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
          <span className="text-sm text-muted-foreground">{filteredIngredients.length} 个原料</span>
          {lowStockCount > 0 && (
            <Badge variant="destructive" className="bg-orange-500">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {lowStockCount} 个低库存
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="outline"
            onClick={handleFillAllStock} 
            className="touch-feedback"
            disabled={ingredients.length === 0}
          >
            补满库存
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            onClick={handleClearAllStock} 
            className="touch-feedback"
            disabled={ingredients.length === 0}
          >
            清空库存
          </Button>
          <Button size="sm" onClick={() => setIsAddDialogOpen(true)} className="touch-feedback">
            <Plus className="mr-2 h-4 w-4" />
            添加原料
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索原料名称..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {categories.map(cat => (
            <Button
              key={cat.value}
              variant={selectedCategory === cat.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(cat.value)}
              className="whitespace-nowrap touch-feedback"
            >
              {cat.label}
            </Button>
          ))}
        </div>
      </div>

      {filteredIngredients.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground mb-3">
              {searchQuery || selectedCategory !== 'all'
                ? '没有找到符合条件的原料'
                : '还没有添加任何原料'}
            </p>
            {!searchQuery && selectedCategory === 'all' && (
              <Button 
                onClick={() => setIsAddDialogOpen(true)} 
                size="sm"
                className="touch-feedback"
              >
                <Plus className="mr-2 h-4 w-4" />
                添加第一个原料
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={filteredIngredients.map(ing => ing.id!)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {filteredIngredients.map(ingredient => (
                <SortableIngredient
                  key={ingredient.id}
                  ingredient={ingredient}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onFillStock={handleFillStock}
                  onClearStock={handleClearStock}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <AddVenueIngredientDialog
        open={isAddDialogOpen}
        onOpenChange={handleDialogClose}
        venueId={venueId}
        editingIngredient={editingIngredient}
      />
    </div>
  );
}
