import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { db } from '@/db/database';
import { Ingredient, SpiritType, Unit } from '@/types';
import { calculateUnitPrice } from '@/utils/calculations';
import { useSystemConfigOptions } from '@/hooks/useSystemConfig';

interface AddIngredientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingIngredient?: Ingredient;
}

export default function AddIngredientDialog({
  open,
  onOpenChange,
  editingIngredient,
}: AddIngredientDialogProps) {
  // 使用自定义 Hook 动态加载配置
  const categoryOptions = useSystemConfigOptions('spiritType');
  const unitOptions = useSystemConfigOptions('unit');
  const [formData, setFormData] = useState<Partial<Ingredient>>({
    name: '',
    nameEn: '',
    category: 'spirit',
    price: 0,
    quantity: 750,
    unit: 'ml',
    alcoholContent: 0,
    wastageRate: 5,
    notes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingIngredient) {
      setFormData(editingIngredient);
    } else {
      setFormData({
        name: '',
        nameEn: '',
        category: 'spirit',
        price: 0,
        quantity: 750,
        unit: 'ml',
        alcoholContent: 0,
        wastageRate: 5,
        notes: '',
      });
    }
  }, [editingIngredient, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name?.trim()) {
      alert('请填写原料名称');
      return;
    }

    setIsSubmitting(true);

    try {
      // 计算单价并保存到数据库
      const unitPrice = calculateUnitPrice({
        price: formData.price || 0,
        quantity: formData.quantity || 750,
        wastageRate: formData.wastageRate,
      } as Ingredient);

      const dataToSave = {
        ...formData,
        unitPrice, // 保存计算好的单价
        updatedAt: new Date(),
      };

      if (editingIngredient?.id) {
        // 更新现有原料
        await db.ingredients.update(editingIngredient.id, dataToSave);
      } else {
        // 添加新原料
        const maxOrder = await db.ingredients
          .orderBy('displayOrder')
          .reverse()
          .first();
        
        await db.ingredients.add({
          ...dataToSave as Ingredient,
          displayOrder: (maxOrder?.displayOrder || 0) + 1,
          createdAt: new Date(),
        });
      }

      onOpenChange(false);
    } catch (error) {
      console.error('保存原料失败:', error);
      alert('保存失败，请稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingIngredient ? '编辑原料' : '添加原料'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">原料名称 *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="例如: 金酒"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nameEn">英文名称</Label>
              <Input
                id="nameEn"
                value={formData.nameEn || ''}
                onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                placeholder="例如: Gin"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">分类 *</Label>
              <Select
                value={formData.category}
                onValueChange={(value: SpiritType) =>
                  setFormData({ ...formData, category: value })
                }
              >
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions?.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  )) || <SelectItem value="loading" disabled>加载中...</SelectItem>}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit">默认单位 *</Label>
              <Select
                value={formData.unit}
                onValueChange={(value: Unit) =>
                  setFormData({ ...formData, unit: value })
                }
              >
                <SelectTrigger id="unit">
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
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">总价格 (¥)</Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="0.01"
                value={formData.price || ''}
                onChange={(e) =>
                  setFormData({ ...formData, price: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })
                }
                onClick={(e) => (e.target as HTMLInputElement).select()}
                placeholder="例如: 180"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">数量</Label>
              <Input
                id="quantity"
                type="number"
                min="0"
                step="0.01"
                value={formData.quantity || ''}
                onChange={(e) =>
                  setFormData({ ...formData, quantity: e.target.value === '' ? 0 : parseFloat(e.target.value) || 750 })
                }
                onClick={(e) => (e.target as HTMLInputElement).select()}
                placeholder="例如: 750"
              />
            </div>
          </div>

          {formData.price && formData.quantity ? (
            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm">
                <span className="text-muted-foreground">单位价格: </span>
                <span className="font-medium">
                  ¥{(() => {
                    const usableQuantity = formData.quantity * (1 - (formData.wastageRate || 0) / 100);
                    return usableQuantity > 0 ? (formData.price / usableQuantity).toFixed(2) : '0.00';
                  })()}/{formData.unit}
                </span>
              </p>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="alcoholContent">酒精度 (%)</Label>
              <Input
                id="alcoholContent"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={formData.alcoholContent || ''}
                onChange={(e) =>
                  setFormData({ ...formData, alcoholContent: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })
                }
                onClick={(e) => (e.target as HTMLInputElement).select()}
                placeholder="0-100"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="wastageRate">损耗率 (%)</Label>
              <Input
                id="wastageRate"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={formData.wastageRate || ''}
                onChange={(e) =>
                  setFormData({ ...formData, wastageRate: e.target.value === '' ? 0 : parseFloat(e.target.value) || 5 })
                }
                onClick={(e) => (e.target as HTMLInputElement).select()}
                placeholder="默认 5%"
              />
            </div>
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
              {isSubmitting ? '保存中...' : editingIngredient ? '更新' : '添加'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
