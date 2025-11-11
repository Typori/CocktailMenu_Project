import { useState, useEffect } from 'react';
import { Plus, Search, Pencil, Trash2, GripVertical, Wine, Copy } from 'lucide-react';
import { useScrollRestoration } from '@/hooks/useScrollRestoration';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { db } from '@/db/database';
import { Ingredient } from '@/types';
import AddIngredientDialog from '@/components/AddIngredientDialog';
import { getConfigOptions } from '@/utils/systemConfig';
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


interface SortableIngredientProps {
  ingredient: Ingredient;
  onEdit: (ingredient: Ingredient) => void;
  onCopy: (ingredient: Ingredient) => void;
  onDelete: (id: number) => void;
  categoryLabel: string;
  categoryColor: string;
}

function SortableIngredient({ ingredient, onEdit, onCopy, onDelete, categoryLabel, categoryColor }: SortableIngredientProps) {
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
              <Badge className={categoryColor}>
                {categoryLabel}
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
                  ¥{(ingredient.unitPrice || 0).toFixed(2)}/{ingredient.unit}
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
              title="编辑"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onCopy(ingredient)}
              className="touch-feedback"
              title="复制"
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(ingredient.id!)}
              className="text-destructive hover:text-destructive touch-feedback"
              title="删除"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default function IngredientsPage() {
  // 滚动位置恢复
  useScrollRestoration();
  
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [filteredIngredients, setFilteredIngredients] = useState<Ingredient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | undefined>();
  const [categories, setCategories] = useState<Array<{ value: string; label: string }>>([
    { value: 'all', label: '全部' }
  ]);
  const [categoryLabels, setCategoryLabels] = useState<Record<string, string>>({});
  const [categoryColors, setCategoryColors] = useState<Record<string, string>>({});

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

  // 加载分类配置
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const configs = await getConfigOptions('spiritType');
        console.log('加载的分类配置:', configs);
        const cats = [
          { value: 'all', label: '全部' },
          ...configs.map(c => ({ value: c.value, label: c.label }))
        ];
        setCategories(cats);
        
        // 构建标签映射
        const labels: Record<string, string> = {};
        configs.forEach(c => {
          labels[c.value] = c.label;
        });
        setCategoryLabels(labels);
        
        // 构建颜色映射
        const colors: Record<string, string> = {};
        const colorPalette = [
          'bg-blue-500',
          'bg-purple-500',
          'bg-indigo-500',
          'bg-pink-500',
          'bg-orange-500',
          'bg-cyan-500',
          'bg-amber-500',
          'bg-green-500',
          'bg-red-500',
          'bg-teal-500',
          'bg-violet-500',
          'bg-lime-500',
        ];
        configs.forEach((c, index) => {
          colors[c.value] = colorPalette[index % colorPalette.length];
        });
        setCategoryColors(colors);
      } catch (error) {
        console.error('加载分类配置失败:', error);
      }
    };
    loadCategories();
  }, []);

  const loadIngredients = async () => {
    const data = await db.ingredients.orderBy('displayOrder').toArray();
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
        await db.ingredients.update(newOrder[i].id!, { displayOrder: i });
      }

      await loadIngredients();
    }
  };

  const handleEdit = (ingredient: Ingredient) => {
    setEditingIngredient(ingredient);
    setIsAddDialogOpen(true);
  };

  const handleCopy = async (ingredient: Ingredient) => {
    try {
      // 创建副本，移除id和时间戳，添加"副本"标识
      const copy: Omit<Ingredient, 'id'> = {
        name: `${ingredient.name} (副本)`,
        nameEn: ingredient.nameEn ? `${ingredient.nameEn} (Copy)` : undefined,
        category: ingredient.category,
        price: ingredient.price,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        alcoholContent: ingredient.alcoholContent,
        wastageRate: ingredient.wastageRate,
        unitPrice: ingredient.unitPrice,
        displayOrder: ingredients.length, // 放到最后
        notes: ingredient.notes,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.ingredients.add(copy);
      await loadIngredients();
    } catch (error) {
      console.error('复制原料失败:', error);
      alert('复制失败，请稍后重试');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个原料吗？此操作不可恢复。')) {
      return;
    }

    try {
      // 检查是否有配方在使用这个原料
      const recipes = await db.recipes.toArray();
      const usedInRecipes = recipes.filter(recipe => 
        recipe.ingredients?.some(ing => ing.ingredientId === id)
      );

      if (usedInRecipes.length > 0) {
        const recipeNames = usedInRecipes.map(r => r.name).join('、');
        alert(`无法删除：以下配方正在使用这个原料：\n${recipeNames}`);
        return;
      }

      // 检查是否有店面在使用这个原料
      try {
        const venueIngredientsCount = await db.venueIngredients
          .where('ingredientId')
          .equals(id)
          .count();

        if (venueIngredientsCount > 0) {
          alert(`无法删除：有 ${venueIngredientsCount} 个店面正在使用这个原料`);
          return;
        }
      } catch (venueError) {
        // 如果店面原料表不存在或查询失败，继续删除
        console.warn('检查店面原料时出错，继续删除:', venueError);
      }

      await db.ingredients.delete(id);
      await loadIngredients();
    } catch (error) {
      console.error('删除原料失败:', error);
      alert(`删除失败：${error instanceof Error ? error.message : '请稍后重试'}`);
    }
  };

  const handleDialogClose = () => {
    setIsAddDialogOpen(false);
    setEditingIngredient(undefined);
    loadIngredients();
  };

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
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="选择分类..." />
          </SelectTrigger>
          <SelectContent>
            {categories.map(cat => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
            {filteredIngredients.map((ingredient) => (
              <SortableIngredient
                key={ingredient.id}
                ingredient={ingredient}
                onEdit={handleEdit}
                onCopy={handleCopy}
                onDelete={handleDelete}
                categoryLabel={categoryLabels[ingredient.category] || ingredient.category}
                categoryColor={categoryColors[ingredient.category] || 'bg-gray-500'}
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

      <AddIngredientDialog
        open={isAddDialogOpen}
        onOpenChange={handleDialogClose}
        editingIngredient={editingIngredient}
      />
    </div>
  );
}
