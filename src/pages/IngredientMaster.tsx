import { useState, useEffect } from 'react';
import { Plus, Search, Pencil, Trash2, GripVertical, Wine } from 'lucide-react';
import { useScrollRestoration } from '@/hooks/useScrollRestoration';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { db } from '@/db/database';
import { IngredientMaster, SpiritType } from '@/types';
import AddIngredientMasterDialog from '@/components/AddIngredientMasterDialog';
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
  ingredient: IngredientMaster;
  onEdit: (ingredient: IngredientMaster) => void;
  onDelete: (id: number) => void;
}

function SortableIngredient({ ingredient, onEdit, onDelete }: SortableIngredientProps) {
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

  return (
    <div ref={setNodeRef} style={style} className="touch-none">
      <Card className="p-4 hover:shadow-md transition-shadow">
        <div className="flex items-center gap-3">
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing touch-feedback">
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium truncate">{ingredient.name}</h3>
              {ingredient.nameEn && (
                <span className="text-sm text-muted-foreground truncate">{ingredient.nameEn}</span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <Badge className={categoryColors[ingredient.category]}>
                {categoryLabels[ingredient.category]}
              </Badge>
              {ingredient.alcoholContent !== undefined && ingredient.alcoholContent > 0 && (
                <span className="text-sm text-muted-foreground">
                  {ingredient.alcoholContent}%
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">价格: </span>
                <span className="font-medium">¥{ingredient.price || 0}</span>
              </div>
              <div>
                <span className="text-muted-foreground">规格: </span>
                <span className="font-medium">{ingredient.quantity || 0} {ingredient.unit}</span>
              </div>
              <div>
                <span className="text-muted-foreground">单价: </span>
                <span className="font-medium">
                  ¥{ingredient.unitPrice ? ingredient.unitPrice.toFixed(2) : (ingredient.price && ingredient.quantity ? (ingredient.price / ingredient.quantity).toFixed(2) : '0.00')}/{ingredient.unit}
                </span>
              </div>
            </div>
            {ingredient.notes && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{ingredient.notes}</p>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(ingredient)}
              className="touch-feedback"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(ingredient.id!)}
              className="text-destructive hover:text-destructive touch-feedback"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default function IngredientMasterPage() {
  // 滚动位置恢复
  useScrollRestoration();
  
  const [ingredients, setIngredients] = useState<IngredientMaster[]>([]);
  const [filteredIngredients, setFilteredIngredients] = useState<IngredientMaster[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<SpiritType | 'all'>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<IngredientMaster | undefined>();

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

  const loadIngredients = async () => {
    const data = await db.ingredientMaster.orderBy('displayOrder').toArray();
    setIngredients(data);
  };

  useEffect(() => {
    loadIngredients();
  }, []);

  useEffect(() => {
    let filtered = ingredients;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(ing => ing.category === selectedCategory);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(ing =>
        ing.name.toLowerCase().includes(query) ||
        ing.nameEn?.toLowerCase().includes(query)
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
        await db.ingredientMaster.update(newOrder[i].id!, { displayOrder: i });
      }

      await loadIngredients();
    }
  };

  const handleEdit = (ingredient: IngredientMaster) => {
    setEditingIngredient(ingredient);
    setIsAddDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个原料吗？此操作不可恢复。')) {
      return;
    }

    try {
      // 检查是否有店面在使用这个原料
      const venueIngredientsCount = await db.venueIngredients
        .where('ingredientMasterId')
        .equals(id)
        .count();

      if (venueIngredientsCount > 0) {
        alert(`无法删除：有 ${venueIngredientsCount} 个店面正在使用这个原料`);
        return;
      }

      await db.ingredientMaster.delete(id);
      await loadIngredients();
    } catch (error) {
      console.error('删除原料失败:', error);
      alert('删除失败，请稍后重试');
    }
  };

  const handleDialogClose = () => {
    setIsAddDialogOpen(false);
    setEditingIngredient(undefined);
    loadIngredients();
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Wine className="h-8 w-8" />
            原料库
          </h1>
          <p className="text-muted-foreground mt-1">
            管理全局原料主数据（库存在各店面中管理）
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)} className="touch-feedback">
          <Plus className="mr-2 h-4 w-4" />
          添加原料
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索原料名称..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2">
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

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>共 {filteredIngredients.length} 个原料</span>
        <span>拖拽可调整顺序</span>
      </div>

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
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {filteredIngredients.length === 0 && (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">
            {searchQuery || selectedCategory !== 'all'
              ? '没有找到符合条件的原料'
              : '还没有添加任何原料'}
          </p>
        </Card>
      )}

      <AddIngredientMasterDialog
        open={isAddDialogOpen}
        onOpenChange={handleDialogClose}
        editingIngredient={editingIngredient}
      />
    </div>
  );
}
