import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { db } from '@/db/database';
import { VenueIngredient, IngredientMaster } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Search } from 'lucide-react';
import { calculateUnitPrice } from '@/utils/calculations';

interface AddVenueIngredientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  venueId: number;
  editingIngredient?: VenueIngredient;
}

const categoryLabels: Record<string, string> = {
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

export default function AddVenueIngredientDialog({
  open,
  onOpenChange,
  venueId,
  editingIngredient,
}: AddVenueIngredientDialogProps) {
  const [formData, setFormData] = useState<Partial<VenueIngredient>>({
    ingredientMasterId: undefined,
    price: 0,
    quantity: 0,
    wastageRate: 5,
    currentStock: 0,
    minStock: 0,
    supplier: '',
    notes: '',
  });
  const [selectedIngredients, setSelectedIngredients] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const ingredientMasters = useLiveQuery(() => db.ingredientMaster.toArray(), []);
  const existingVenueIngredients = useLiveQuery(
    () => db.venueIngredients.where('venueId').equals(venueId).toArray(),
    [venueId]
  );

  useEffect(() => {
    if (editingIngredient) {
      setFormData(editingIngredient);
      setSelectedIngredients(new Set());
    } else {
      setFormData({
        ingredientMasterId: undefined,
        price: 0,
        quantity: 0,
        wastageRate: 5,
        currentStock: 0,
        minStock: 0,
        supplier: '',
        notes: '',
      });
      setSelectedIngredients(new Set());
    }
    setSearchQuery('');
  }, [editingIngredient, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingIngredient) {
      // 编辑模式
      if (!formData.price || formData.price <= 0) {
        alert('请输入有效的价格');
        return;
      }

      if (!formData.quantity || formData.quantity <= 0) {
        alert('请输入有效的数量');
        return;
      }

      setIsSubmitting(true);

      try {
        const selectedMaster = ingredientMasters?.find(m => m.id === formData.ingredientMasterId);
        const unitPrice = calculateUnitPrice({
          price: formData.price,
          quantity: formData.quantity,
          wastageRate: formData.wastageRate,
        } as IngredientMaster);

        await db.venueIngredients.update(editingIngredient.id!, {
          ...formData,
          ingredientName: selectedMaster?.name,
          unitPrice,
          updatedAt: new Date(),
        });

        onOpenChange(false);
      } catch (error) {
        console.error('更新原料失败:', error);
        alert('更新失败，请稍后重试');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // 批量添加模式
      if (selectedIngredients.size === 0) {
        alert('请至少选择一个原料');
        return;
      }

      setIsSubmitting(true);

      try {
        const maxOrder = await db.venueIngredients
          .where('venueId')
          .equals(venueId)
          .toArray()
          .then(items => Math.max(0, ...items.map(i => i.displayOrder || 0)));

        let addedCount = 0;
        let skippedCount = 0;

        for (const masterId of selectedIngredients) {
          // 检查是否已添加
          const existing = await db.venueIngredients
            .where({ venueId, ingredientMasterId: masterId })
            .first();

          if (existing) {
            skippedCount++;
            continue;
          }

          const master = ingredientMasters?.find(m => m.id === masterId);
          if (!master) continue;

          // 使用原料的默认数量作为初始库存
          const defaultQuantity = master.quantity || 750;
          const defaultPrice = master.price || 0;
          const unitPrice = calculateUnitPrice({
            price: defaultPrice,
            quantity: defaultQuantity,
            wastageRate: master.wastageRate,
          } as IngredientMaster);

          // 使用默认值添加
          await db.venueIngredients.add({
            venueId,
            ingredientMasterId: masterId,
            ingredientName: master.name,
            price: defaultPrice,
            quantity: defaultQuantity,
            wastageRate: master.wastageRate || 5,
            unitPrice: unitPrice,
            currentStock: defaultQuantity, // 使用原料的默认数量作为初始库存
            minStock: Math.floor(defaultQuantity * 0.3), // 最低库存为默认数量的30%
            supplier: '',
            notes: '',
            displayOrder: maxOrder + addedCount + 1,
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          addedCount++;
        }

        // 移除成功提示弹窗，直接关闭对话框
        onOpenChange(false);
      } catch (error) {
        console.error('添加原料失败:', error);
        alert('添加失败，请稍后重试');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  // 计算单位价格（仅编辑模式使用）
  const unitPrice = formData.price && formData.quantity 
    ? (formData.price / formData.quantity).toFixed(2)
    : '0.00';

  // 过滤可用的原料（排除已添加的）
  const availableIngredients = ingredientMasters?.filter(master => {
    // 搜索过滤
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchName = master.name.toLowerCase().includes(query);
      const matchNameEn = master.nameEn?.toLowerCase().includes(query);
      if (!matchName && !matchNameEn) return false;
    }
    
    // 排除已添加的原料
    const isExisting = existingVenueIngredients?.some(
      vi => vi.ingredientMasterId === master.id
    );
    return !isExisting;
  }) || [];

  // 切换选择
  const toggleIngredient = (id: number) => {
    const newSet = new Set(selectedIngredients);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIngredients(newSet);
  };

  // 全选/取消全选
  const toggleAll = () => {
    if (selectedIngredients.size === availableIngredients.length) {
      setSelectedIngredients(new Set());
    } else {
      setSelectedIngredients(new Set(availableIngredients.map(m => m.id!)));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingIngredient ? '编辑原料' : '批量添加原料'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {editingIngredient ? (
            // 编辑模式 - 显示详细表单
            <>
              <div className="p-3 bg-muted rounded-md space-y-2">
                <div className="flex items-baseline gap-2">
                  <div className="font-medium text-lg">{formData.ingredientName}</div>
                  {(() => {
                    const master = ingredientMasters?.find(m => m.id === formData.ingredientMasterId);
                    return master?.nameEn ? (
                      <div className="text-sm text-muted-foreground font-normal">{master.nameEn}</div>
                    ) : null;
                  })()}
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  {(() => {
                    const master = ingredientMasters?.find(m => m.id === formData.ingredientMasterId);
                    return (
                      <>
                        <div>
                          <span className="inline-block w-14">分类:</span>
                          <span className="font-medium text-foreground">{categoryLabels[master?.category || 'other']}</span>
                        </div>
                        {master?.alcoholContent !== undefined && master.alcoholContent > 0 && (
                          <div>
                            <span className="inline-block w-16">酒精度:</span>
                            <span className="font-medium text-foreground">{master.alcoholContent}%</span>
                          </div>
                        )}
                        <div>
                          <span className="inline-block w-14">价格:</span>
                          <span className="font-medium text-foreground">¥{formData.price || 0}</span>
                        </div>
                        <div>
                          <span className="inline-block w-16">容量:</span>
                          <span className="font-medium text-foreground">{formData.quantity || 0} {master?.unit || 'ml'}</span>
                        </div>
                        <div>
                          <span className="inline-block w-14">单价:</span>
                          <span className="font-medium text-foreground">¥{unitPrice}/{master?.unit || 'ml'}</span>
                        </div>
                        <div>
                          <span className="inline-block w-16">损耗率:</span>
                          <span className="font-medium text-foreground">{formData.wastageRate || 5}%</span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="currentStock">当前库存 ({(() => {
                    const master = ingredientMasters?.find(m => m.id === formData.ingredientMasterId);
                    return master?.unit || 'ml';
                  })()})</Label>
                  <Input
                    id="currentStock"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.currentStock || ''}
                    onChange={(e) => setFormData({ ...formData, currentStock: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                    placeholder="例如: 750"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="minStock">最低库存预警 ({(() => {
                    const master = ingredientMasters?.find(m => m.id === formData.ingredientMasterId);
                    return master?.unit || 'ml';
                  })()})</Label>
                  <Input
                    id="minStock"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.minStock || ''}
                    onChange={(e) => setFormData({ ...formData, minStock: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                    placeholder="例如: 200"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="supplier">供应商（可选）</Label>
                <Input
                  id="supplier"
                  value={formData.supplier || ''}
                  onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                  placeholder="供应商名称或联系方式"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">备注</Label>
                <textarea
                  id="notes"
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="添加备注信息..."
                  rows={3}
                />
              </div>
            </>
          ) : (
            // 批量添加模式 - 显示多选列表
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>选择要添加的原料</Label>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      已选 {selectedIngredients.size} 个
                    </Badge>
                    {availableIngredients.length > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={toggleAll}
                      >
                        {selectedIngredients.size === availableIngredients.length ? '取消全选' : '全选'}
                      </Button>
                    )}
                  </div>
                </div>
                
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="搜索原料名称..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="border rounded-md max-h-[400px] overflow-y-auto">
                {availableIngredients.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    {searchQuery ? '没有找到符合条件的原料' : '所有原料都已添加到当前店面'}
                  </div>
                ) : (
                  <div className="divide-y">
                    {availableIngredients.map((master) => (
                      <label
                        key={master.id}
                        className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer"
                      >
                        <Checkbox
                          checked={selectedIngredients.has(master.id!)}
                          onCheckedChange={() => toggleIngredient(master.id!)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate">
                              {master.name}
                            </p>
                            {master.nameEn && (
                              <span className="text-sm text-muted-foreground">
                                ({master.nameEn})
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {categoryLabels[master.category]}
                            </Badge>
                            {master.alcoholContent && (
                              <span className="text-xs text-muted-foreground">
                                {master.alcoholContent}%
                              </span>
                            )}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-md border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  💡 <strong>默认设置：</strong>每个原料将使用原料库中的默认值添加
                </p>
                <ul className="text-xs text-blue-800 dark:text-blue-200 mt-2 space-y-1 ml-4">
                  <li>• 价格、容量、损耗率：继承原料库设置</li>
                  <li>• 初始库存：等于原料的默认容量</li>
                  <li>• 最低库存：默认容量的30%</li>
                  <li>• 添加后可在列表中编辑修改</li>
                </ul>
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              取消
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? '处理中...' : editingIngredient ? '更新' : `添加 ${selectedIngredients.size} 个原料`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
