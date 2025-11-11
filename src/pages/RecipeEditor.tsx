import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import { Recipe, RecipeIngredient, MenuInfo, Unit, GlassType, FlavorTag, DrinkDuration } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MultiSelect } from '@/components/ui/multi-select';
import { ImagePreviewDialog } from '@/components/ImagePreviewDialog';
import { Combobox } from '@/components/ui/combobox';
import { ArrowLeft, Save, Plus, Trash2, X, Upload, ImageIcon, GripVertical } from 'lucide-react';
import { updateRecipeCalculations, convertUnit, canConvertUnits, convertToMl } from '@/utils/calculations';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
import { useAllSystemConfigOptions } from '@/hooks/useSystemConfig';
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

// 可排序原料项组件
function SortableIngredientItem({
  ingredient,
  index,
  ingredients,
  unitOptions,
  onIngredientChange,
  onRemove,
}: {
  ingredient: RecipeIngredient;
  index: number;
  ingredients?: any[];
  unitOptions?: Array<{ value: string; label: string }>;
  onIngredientChange: (index: number, field: keyof RecipeIngredient, value: any) => void;
  onRemove: (index: number) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `ingredient-${index}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex gap-3 items-center p-4 border rounded-lg bg-muted/30"
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="flex-1">
        <Combobox
          options={ingredients?.map((ing) => ({
            value: String(ing.id),
            label: `${ing.name}${ing.nameEn ? ` (${ing.nameEn})` : ''}`,
          })) || []}
          value={String(ingredient.ingredientId || '')}
          onValueChange={(value) =>
            onIngredientChange(index, 'ingredientId', Number(value))
          }
          placeholder="选择原料"
          searchPlaceholder="搜索原料..."
          emptyText="未找到原料"
        />
      </div>
      <div className="w-32">
        <Input
          type="number"
          value={ingredient.quantity || ''}
          onChange={(e) =>
            onIngredientChange(index, 'quantity', e.target.value === '' ? undefined : Number(e.target.value))
          }
          onClick={(e) => (e.target as HTMLInputElement).select()}
          placeholder="0"
          min="0"
          step="0.1"
        />
      </div>
      <div className="w-40">
        <Select
          value={ingredient.unit}
          onValueChange={(value) =>
            onIngredientChange(index, 'unit', value as Unit)
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {unitOptions?.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            )) || <SelectItem value="loading" disabled>加载中...</SelectItem>}
          </SelectContent>
        </Select>
      </div>
      <Button
        size="icon"
        variant="destructive"
        onClick={() => onRemove(index)}
        className="touch-feedback"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

export default function RecipeEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  // 加载所有系统配置选项
  const configOptions = useAllSystemConfigOptions();
  
  const [recipe, setRecipe] = useState<Partial<Recipe>>({
    name: '',
    nameEn: '',
    ingredients: [],
    steps: [],
    instructions: '',
    glassType: 'rocks',
    notes: '',
    tags: [],
  });
  const [menuInfo, setMenuInfo] = useState<Partial<MenuInfo>>({
    menuNames: [{ id: '1', name: '', isDefault: true }],
    description: '',
    color: '',
    flavorTags: [],
    drinkDuration: 'short',
    price: 0,
  });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const initialDataRef = useRef<{ recipe: Partial<Recipe>; menuInfo: Partial<MenuInfo> } | null>(null);

  const ingredients = useLiveQuery(() => db.ingredientMaster.toArray(), []);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 处理原料拖拽结束
  const handleIngredientDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = Number(String(active.id).replace('ingredient-', ''));
      const newIndex = Number(String(over.id).replace('ingredient-', ''));
      
      setRecipe({
        ...recipe,
        ingredients: arrayMove(recipe.ingredients || [], oldIndex, newIndex),
      });
    }
  };

  useEffect(() => {
    if (id) {
      db.recipes.get(Number(id)).then((r) => {
        if (r) {
          setRecipe(r);
          initialDataRef.current = { recipe: r, menuInfo: menuInfo };
        }
      });
      db.menuInfo.where('recipeId').equals(Number(id)).first().then((m) => {
        if (m) {
          setMenuInfo(m);
          if (initialDataRef.current) {
            initialDataRef.current.menuInfo = m;
          }
        }
      });
    } else {
      // 新建配方时，保存初始状态
      initialDataRef.current = { recipe, menuInfo };
    }
  }, [id]);

  // 检测是否有未保存的更改
  useEffect(() => {
    if (!initialDataRef.current || isSaving) return;
    
    const hasChanges = 
      JSON.stringify(recipe) !== JSON.stringify(initialDataRef.current.recipe) ||
      JSON.stringify(menuInfo) !== JSON.stringify(initialDataRef.current.menuInfo);
    
    setHasUnsavedChanges(hasChanges);
  }, [recipe, menuInfo, isSaving]);

  // 自动计算容量和酒精度
  useEffect(() => {
    const calculateVolumeAndAbv = async () => {
      if (!recipe.ingredients || recipe.ingredients.length === 0) {
        setRecipe(prev => ({ ...prev, totalVolume: 0, calculatedAbv: 0 }));
        return;
      }

      let totalVolumeMl = 0;
      let totalAlcoholVolume = 0;

      for (const recipeIng of recipe.ingredients) {
        const ingredient = ingredients?.find(ing => ing.id === recipeIng.ingredientId);
        if (!ingredient) continue;

        // 只计算容量类型的单位
        if (['ml', 'oz', 'cl'].includes(recipeIng.unit)) {
          const volumeInMl = convertToMl(recipeIng.quantity, recipeIng.unit);
          totalVolumeMl += volumeInMl;

          // 计算酒精含量
          if (ingredient.alcoholContent) {
            totalAlcoholVolume += volumeInMl * (ingredient.alcoholContent / 100);
          }
        }
      }

      const abv = totalVolumeMl > 0 ? (totalAlcoholVolume / totalVolumeMl) * 100 : 0;

      setRecipe(prev => ({
        ...prev,
        totalVolume: Math.round(totalVolumeMl * 10) / 10,
        calculatedAbv: Math.round(abv * 10) / 10
      }));
    };

    calculateVolumeAndAbv();
  }, [recipe.ingredients, ingredients]);

  const handleAddIngredient = () => {
    setRecipe({
      ...recipe,
      ingredients: [
        ...(recipe.ingredients || []),
        { ingredientId: 0, quantity: 0, unit: 'ml' },
      ],
    });
  };

  const handleRemoveIngredient = (index: number) => {
    const newIngredients = [...(recipe.ingredients || [])];
    newIngredients.splice(index, 1);
    setRecipe({ ...recipe, ingredients: newIngredients });
  };

  const handleIngredientChange = (
    index: number,
    field: keyof RecipeIngredient,
    value: any
  ) => {
    const newIngredients = [...(recipe.ingredients || [])];
    const currentIngredient = newIngredients[index];
    
    // 如果改变了单位，尝试自动转换数量
    if (field === 'unit' && currentIngredient.quantity && currentIngredient.unit) {
      const oldUnit = currentIngredient.unit;
      const newUnit = value as Unit;
      
      if (canConvertUnits(oldUnit, newUnit)) {
        const convertedQuantity = convertUnit(currentIngredient.quantity, oldUnit, newUnit);
        newIngredients[index] = { 
          ...currentIngredient, 
          unit: newUnit,
          quantity: convertedQuantity
        };
      } else {
        newIngredients[index] = { ...currentIngredient, [field]: value };
      }
    } else {
      newIngredients[index] = { ...currentIngredient, [field]: value };
    }
    
    // 如果改变了ingredientId，同时更新ingredientName并使用原料库中的单位
    if (field === 'ingredientId') {
      const ingredient = ingredients?.find(ing => ing.id === Number(value));
      if (ingredient) {
        newIngredients[index].ingredientName = ingredient.name;
        // 自动使用原料库中的单位
        newIngredients[index].unit = ingredient.unit;
      }
    }
    
    setRecipe({ ...recipe, ingredients: newIngredients });
  };

  // 添加制作步骤
  const handleAddStep = () => {
    const newSteps = [...(recipe.steps || [])];
    newSteps.push({
      stepNumber: newSteps.length + 1,
      instruction: ''
    });
    setRecipe({ ...recipe, steps: newSteps });
  };

  // 删除制作步骤
  const handleRemoveStep = (index: number) => {
    const newSteps = [...(recipe.steps || [])];
    newSteps.splice(index, 1);
    // 重新编号
    newSteps.forEach((step, i) => {
      step.stepNumber = i + 1;
    });
    setRecipe({ ...recipe, steps: newSteps });
  };

  // 更新制作步骤
  const handleStepChange = (index: number, instruction: string) => {
    const newSteps = [...(recipe.steps || [])];
    newSteps[index] = { ...newSteps[index], instruction };
    setRecipe({ ...recipe, steps: newSteps });
  };

  // 添加菜单名称版本
  const handleAddMenuName = () => {
    const newMenuNames = [...(menuInfo.menuNames || [])];
    newMenuNames.push({
      id: Date.now().toString(),
      name: '',
      isDefault: false
    });
    setMenuInfo({ ...menuInfo, menuNames: newMenuNames });
  };

  // 删除菜单名称版本
  const handleRemoveMenuName = (id: string) => {
    const newMenuNames = (menuInfo.menuNames || []).filter(name => name.id !== id);
    // 如果删除的是默认名称，将第一个设为默认
    if (newMenuNames.length > 0 && !newMenuNames.some(name => name.isDefault)) {
      newMenuNames[0].isDefault = true;
    }
    setMenuInfo({ ...menuInfo, menuNames: newMenuNames });
  };

  // 更新菜单名称
  const handleMenuNameChange = (id: string, name: string) => {
    const newMenuNames = (menuInfo.menuNames || []).map(menuName =>
      menuName.id === id ? { ...menuName, name } : menuName
    );
    setMenuInfo({ ...menuInfo, menuNames: newMenuNames });
  };

  // 设置默认菜单名称
  const handleSetDefaultMenuName = (id: string) => {
    const newMenuNames = (menuInfo.menuNames || []).map(menuName => ({
      ...menuName,
      isDefault: menuName.id === id
    }));
    setMenuInfo({ ...menuInfo, menuNames: newMenuNames });
  };

  const handleSave = async (skipNavigation = false) => {
    try {
      setIsSaving(true);
      
      if (!recipe.name) {
        alert('请输入配方名称');
        setIsSaving(false);
        return;
      }

      const recipeData: Recipe = {
        ...recipe as Recipe,
        updatedAt: new Date(),
        createdAt: recipe.createdAt || new Date(),
      };

      let recipeId: number;
      if (id) {
        await db.recipes.update(Number(id), recipeData);
        recipeId = Number(id);
      } else {
        recipeId = await db.recipes.add(recipeData) as number;
      }

      // 保存菜单信息
      const existingMenuInfo = await db.menuInfo.where('recipeId').equals(recipeId).first();
      const menuData: MenuInfo = {
        ...menuInfo as MenuInfo,
        recipeId,
        updatedAt: new Date(),
      };

      if (existingMenuInfo) {
        await db.menuInfo.update(existingMenuInfo.id!, menuData);
      } else {
        await db.menuInfo.add(menuData);
      }

      await updateRecipeCalculations(recipeId);
      
      // 更新初始数据引用，标记为已保存
      initialDataRef.current = { recipe: recipeData, menuInfo: menuData };
      setHasUnsavedChanges(false);
      setIsSaving(false);
      
      // 只在不跳过导航时才导航
      if (!skipNavigation) {
        // 如果有来源页面，返回来源页面，否则返回配方列表
        const from = location.state?.from;
        if (from && typeof from === 'string') {
          navigate(from);
        } else {
          navigate('/recipes');
        }
      }
    } catch (error) {
      console.error('Failed to save recipe:', error);
      alert('保存失败，请重试');
      setIsSaving(false);
    }
  };

  // 使用自定义Hook处理未保存更改
  const {
    showDialog,
    handleSaveAndNavigate,
    handleDiscardAndNavigate,
    handleCancelNavigation,
    allowNavigation,
    resetNavigation,
  } = useUnsavedChanges(hasUnsavedChanges, async () => {
    await handleSave(true); // 传入true跳过导航，让hook处理导航
  });

  // 阻止表单的Enter键默认提交行为
  const handleFormKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
      // 只在非textarea元素上阻止Enter键
      const target = e.target as HTMLElement;
      // 如果是在Combobox的输入框中，让Combobox自己处理
      if (target.getAttribute('role') === 'combobox' || target.closest('[role="combobox"]')) {
        return;
      }
      e.preventDefault();
    }
  };

  // 直接保存并导航的处理函数
  const handleDirectSave = async () => {
    try {
      allowNavigation(); // 允许导航，不触发拦截
      await handleSave(false); // 直接保存并导航
    } catch (error) {
      resetNavigation(); // 如果保存失败，重置导航标志
      throw error;
    }
  };

  return (
    <div className="relative" onKeyDown={handleFormKeyDown}>
      {/* 固定的保存按钮 */}
      <div className="fixed top-4 right-4 z-50">
        <Button onClick={handleDirectSave} disabled={isSaving} className="touch-feedback shadow-lg">
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? '保存中...' : '保存'}
        </Button>
      </div>

      <div className="space-y-6 max-w-4xl mx-auto pb-20">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/recipes')}
            className="touch-feedback"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h2 className="text-3xl font-bold tracking-tight">
              {id ? '编辑配方' : '创建配方'}
            </h2>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>基本信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 配方名称 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">配方名称 (中文) *</Label>
                <Input
                  id="name"
                  value={recipe.name}
                  onChange={(e) => setRecipe({ ...recipe, name: e.target.value })}
                  placeholder="例如: 莫吉托"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nameEn">配方名称 (英文)</Label>
                <Input
                  id="nameEn"
                  value={recipe.nameEn || ''}
                  onChange={(e) => setRecipe({ ...recipe, nameEn: e.target.value })}
                  placeholder="例如: Mojito"
                />
              </div>
            </div>

            {/* 风味标签 - 下拉多选 */}
            <div className="space-y-2">
              <Label>风味标签</Label>
              <MultiSelect
                options={configOptions.flavorTags?.map(tag => ({
                  label: tag.label,
                  value: tag.value
                })) || []}
                selected={menuInfo.flavorTags || []}
                onChange={(selected) => setMenuInfo({ ...menuInfo, flavorTags: selected as FlavorTag[] })}
                placeholder="选择风味标签..."
              />
            </div>

            {/* 饮用类型、颜色、杯型 */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="drinkDuration">饮用类型</Label>
                <Select
                  value={menuInfo.drinkDuration}
                  onValueChange={(value) => setMenuInfo({ ...menuInfo, drinkDuration: value as DrinkDuration })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {configOptions.drinkDurations?.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    )) || <SelectItem value="loading" disabled>加载中...</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="color">颜色</Label>
                <Input
                  id="color"
                  value={menuInfo.color || ''}
                  onChange={(e) => setMenuInfo({ ...menuInfo, color: e.target.value })}
                  placeholder="例如: 琥珀色"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="glassType">使用杯型</Label>
                <Select
                  value={recipe.glassType}
                  onValueChange={(value) => setRecipe({ ...recipe, glassType: value as GlassType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {configOptions.glassTypes?.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    )) || <SelectItem value="loading" disabled>加载中...</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 容量和酒精度 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>容量</Label>
                <Input
                  value={`${recipe.totalVolume || 0} ml`}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label>酒精度</Label>
                <Input
                  value={`${recipe.calculatedAbv || 0}%`}
                  disabled
                  className="bg-muted"
                />
              </div>
            </div>

            {/* 图片上传 */}
            <div className="space-y-3">
              <Label>成品图片</Label>
              <div className="space-y-3">
                {/* 图片预览网格 */}
                {recipe.images && recipe.images.length > 0 && (
                  <div className="grid grid-cols-4 gap-3">
                    {recipe.images.map((image, index) => (
                      <ImagePreviewDialog
                        key={index}
                        src={image}
                        alt={`成品图 ${index + 1}`}
                        trigger={
                          <div className="relative group cursor-pointer aspect-square rounded-lg overflow-hidden border-2 border-border hover:border-primary transition-colors">
                            <img
                              src={image}
                              alt={`成品图 ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <ImageIcon className="h-6 w-6 text-white" />
                            </div>
                            <Button
                              size="icon"
                              variant="destructive"
                              className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                const newImages = [...(recipe.images || [])];
                                newImages.splice(index, 1);
                                setRecipe({ ...recipe, images: newImages });
                              }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        }
                      />
                    ))}
                  </div>
                )}
                
                {/* 上传按钮 */}
                <div className="flex items-center gap-3">
                  <Input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const files = e.target.files;
                      if (files) {
                        Array.from(files).forEach((file) => {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            const base64String = reader.result as string;
                            setRecipe({
                              ...recipe,
                              images: [...(recipe.images || []), base64String],
                            });
                          };
                          reader.readAsDataURL(file);
                        });
                      }
                      e.target.value = '';
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('image-upload')?.click()}
                    className="touch-feedback"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    上传图片
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {recipe.images?.length || 0} 张图片
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>配料列表</CardTitle>
          </CardHeader>
          <CardContent>
            {recipe.ingredients && recipe.ingredients.length > 0 ? (
              <div className="space-y-2">
                {/* 表头 */}
                <div className="flex gap-3 items-center px-4 py-2 bg-muted/50 rounded-lg font-medium text-sm">
                  <div className="w-5"></div>
                  <div className="flex-1">原料</div>
                  <div className="w-32">数量</div>
                  <div className="w-40">单位</div>
                  <div className="w-10"></div>
                </div>
                {/* 配料列表 - 支持拖拽排序 */}
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleIngredientDragEnd}
                >
                  <SortableContext
                    items={recipe.ingredients.map((_, index) => `ingredient-${index}`)}
                    strategy={verticalListSortingStrategy}
                  >
                    {recipe.ingredients.map((ing, index) => (
                      <SortableIngredientItem
                        key={`ingredient-${index}`}
                        ingredient={ing}
                        index={index}
                        ingredients={ingredients}
                        unitOptions={configOptions.units}
                        onIngredientChange={handleIngredientChange}
                        onRemove={handleRemoveIngredient}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
                {/* 添加配料按钮 */}
                <Button
                  variant="outline"
                  onClick={handleAddIngredient}
                  className="w-full touch-feedback mt-2"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  添加配料
                </Button>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>还没有添加配料</p>
                <Button
                  variant="link"
                  onClick={handleAddIngredient}
                  className="mt-2"
                >
                  添加第一个配料
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>制作步骤</CardTitle>
          </CardHeader>
          <CardContent>
            {recipe.steps && recipe.steps.length > 0 ? (
              <div className="space-y-2">
                {/* 表头 */}
                <div className="flex gap-3 items-center px-4 py-2 bg-muted/50 rounded-lg font-medium text-sm">
                  <div className="w-12 text-center">步骤</div>
                  <div className="flex-1">操作说明</div>
                  <div className="w-10"></div>
                </div>
                {/* 步骤列表 */}
                {recipe.steps.map((step, index) => (
                  <div
                    key={index}
                    className="flex gap-3 items-center p-4 border rounded-lg bg-muted/30"
                  >
                    <div className="flex-shrink-0 w-12 h-10 bg-primary text-primary-foreground rounded-md flex items-center justify-center text-sm font-medium">
                      {step.stepNumber}
                    </div>
                    <div className="flex-1">
                      <Input
                        value={step.instruction}
                        onChange={(e) => handleStepChange(index, e.target.value)}
                        placeholder={`第${step.stepNumber}步操作说明...`}
                        className="h-10"
                      />
                    </div>
                    <Button
                      size="icon"
                      variant="destructive"
                      onClick={() => handleRemoveStep(index)}
                      className="touch-feedback flex-shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {/* 添加步骤按钮 */}
                <Button
                  variant="outline"
                  onClick={handleAddStep}
                  className="w-full touch-feedback mt-2"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  添加步骤
                </Button>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>还没有添加制作步骤</p>
                <Button
                  variant="link"
                  onClick={handleAddStep}
                  className="mt-2"
                >
                  添加第一个步骤
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>菜单信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 菜单名称版本 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>菜单名称</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAddMenuName}
                  className="touch-feedback"
                >
                  <Plus className="mr-2 h-3 w-3" />
                  添加版本
                </Button>
              </div>
              <div className="space-y-2">
                {menuInfo.menuNames?.map((menuName, index) => (
                  <div key={menuName.id} className="flex gap-2 items-center">
                    <Input
                      value={menuName.name}
                      onChange={(e) => handleMenuNameChange(menuName.id, e.target.value)}
                      placeholder={`菜单名称 ${index + 1}`}
                      className="flex-1"
                    />
                    <Button
                      size="sm"
                      variant={menuName.isDefault ? "default" : "outline"}
                      onClick={() => handleSetDefaultMenuName(menuName.id)}
                      className="touch-feedback"
                    >
                      {menuName.isDefault ? "默认" : "设为默认"}
                    </Button>
                    {menuInfo.menuNames!.length > 1 && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleRemoveMenuName(menuName.id)}
                        className="touch-feedback"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 建议售价和酒精度 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">建议售价 (¥)</Label>
                <Input
                  id="price"
                  type="number"
                  value={menuInfo.price ?? ''}
                  onChange={(e) => setMenuInfo({ ...menuInfo, price: e.target.value === '' ? undefined : Number(e.target.value) })}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  placeholder="0"
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="space-y-2">
                <Label>酒精度</Label>
                <Input
                  value={`${recipe.calculatedAbv || 0}%`}
                  disabled
                  className="bg-muted"
                />
              </div>
            </div>

            {/* 酒款描述 */}
            <div className="space-y-2">
              <Label htmlFor="description">酒款描述</Label>
              <textarea
                id="description"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={menuInfo.description || ''}
                onChange={(e) => setMenuInfo({ ...menuInfo, description: e.target.value })}
                placeholder="描述这款酒的特点、口感、适合场合等..."
              />
            </div>
          </CardContent>
        </Card>

        {/* 备注区域 */}
        <Card>
          <CardHeader>
            <CardTitle>备注</CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={recipe.notes || ''}
              onChange={(e) => setRecipe({ ...recipe, notes: e.target.value })}
              placeholder="记录制作心得、调整建议、特殊注意事项等..."
            />
          </CardContent>
        </Card>
      </div>

      {/* 未保存更改提示对话框 */}
      <AlertDialog open={showDialog} onOpenChange={(open) => !open && handleCancelNavigation()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>保存更改？</AlertDialogTitle>
            <AlertDialogDescription>
              您有未保存的更改。是否要在离开前保存这些更改？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelNavigation}>
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDiscardAndNavigate}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              不保存
            </AlertDialogAction>
            <AlertDialogAction onClick={handleSaveAndNavigate}>
              保存
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
