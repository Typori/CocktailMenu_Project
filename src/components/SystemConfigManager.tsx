import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import { SystemConfig, SystemConfigType } from '@/types';
import {
  checkConfigUsage,
  deleteConfig,
  disableConfig,
  enableConfig,
  addConfig,
  updateConfig,
  updateConfigOrders,
} from '@/utils/systemConfig';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Plus, Edit, Trash2, GripVertical, AlertTriangle, ArrowRight } from 'lucide-react';
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

interface ConfigItemProps {
  config: SystemConfig;
  onEdit: (config: SystemConfig) => void;
  onDelete: (config: SystemConfig) => void;
  onToggle: (config: SystemConfig) => void;
}

function ConfigItem({ config, onEdit, onDelete, onToggle }: ConfigItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: config.id! });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  const [usageCount, setUsageCount] = useState(0);

  useEffect(() => {
    checkConfigUsage(config).then(setUsageCount);
  }, [config]);

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors bg-background"
    >
      <div className="flex items-center gap-3 flex-1">
        <div {...attributes} {...listeners} className="cursor-move">
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="flex-1">
          <div className="font-medium flex items-center gap-2">
            {config.label}
            {config.labelEn && (
              <span className="text-sm text-muted-foreground">({config.labelEn})</span>
            )}
          </div>
          <div className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
            <span>值: {config.value}</span>
            {usageCount > 0 && (
              <span className="text-orange-600">• 使用中: {usageCount}处</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Switch
          checked={config.isActive}
          onCheckedChange={() => onToggle(config)}
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(config)}
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(config)}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function SystemConfigManager() {
  const [selectedType, setSelectedType] = useState<SystemConfigType>('spiritType');
  const [editingConfig, setEditingConfig] = useState<SystemConfig | null>(null);
  const [deletingConfig, setDeletingConfig] = useState<SystemConfig | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isMigrateDialogOpen, setIsMigrateDialogOpen] = useState(false);
  const [usageCount, setUsageCount] = useState(0);
  const [migrateTarget, setMigrateTarget] = useState<string | null>(null); // null表示未选择，''表示置空，其他值表示迁移目标

  const [formData, setFormData] = useState({
    value: '',
    label: '',
    labelEn: '',
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const configTypes: Array<{ value: SystemConfigType; label: string }> = [
    { value: 'spiritType', label: '原料分类' },
    { value: 'unit', label: '单位' },
    { value: 'flavorTag', label: '风味标签' },
    { value: 'drinkDuration', label: '饮用类型' },
    { value: 'glassType', label: '杯型' },
    { value: 'technique', label: '调制技法' },
  ];

  const configs = useLiveQuery(
    () =>
      db.systemConfigs
        .where('configType')
        .equals(selectedType)
        .sortBy('displayOrder'),
    [selectedType]
  );

  const handleAdd = () => {
    setFormData({ value: '', label: '', labelEn: '' });
    setIsAddDialogOpen(true);
  };

  const handleEdit = (config: SystemConfig) => {
    setEditingConfig(config);
    setFormData({
      value: config.value,
      label: config.label,
      labelEn: config.labelEn || '',
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = async (config: SystemConfig) => {
    setDeletingConfig(config);
    
    // 先检查使用情况
    const count = await checkConfigUsage(config);
    setUsageCount(count);
    
    if (count > 0) {
      // 有数据在使用，打开迁移对话框
      setMigrateTarget(null); // 重置为未选择状态
      setIsMigrateDialogOpen(true);
    } else {
      // 没有数据使用，直接确认删除
      setIsDeleteDialogOpen(true);
    }
  };

  const handleToggle = async (config: SystemConfig) => {
    const result = config.isActive
      ? await disableConfig(config.id!)
      : await enableConfig(config.id!);

    if (result.success) {
      // 操作成功，无需提示
    } else {
      alert(`操作失败: ${result.message}`);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id || !configs) {
      return;
    }

    const oldIndex = configs.findIndex((c) => c.id === active.id);
    const newIndex = configs.findIndex((c) => c.id === over.id);

    const newConfigs = arrayMove(configs, oldIndex, newIndex);

    // 更新显示顺序
    const updates = newConfigs.map((config, index) => ({
      id: config.id!,
      displayOrder: index,
    }));

    await updateConfigOrders(updates);
  };

  const handleAddSubmit = async () => {
    if (!formData.value || !formData.label) {
      alert('请填写必填字段');
      return;
    }

    const maxOrder = configs?.reduce((max, c) => Math.max(max, c.displayOrder), 0) || 0;

    const result = await addConfig({
      configType: selectedType,
      value: formData.value,
      label: formData.label,
      labelEn: formData.labelEn || undefined,
      isActive: true,
      displayOrder: maxOrder + 1,
    });

    if (result.success) {
      setIsAddDialogOpen(false);
    } else {
      alert(`添加失败: ${result.message}`);
    }
  };

  const handleEditSubmit = async () => {
    if (!editingConfig || !formData.label) {
      alert('请填写必填字段');
      return;
    }

    const result = await updateConfig(editingConfig.id!, {
      label: formData.label,
      labelEn: formData.labelEn || undefined,
      // value不允许修改（太危险）
    });

    if (result.success) {
      setIsEditDialogOpen(false);
    } else {
      alert(`更新失败: ${result.message}`);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingConfig) return;

    const result = await deleteConfig(deletingConfig.id!);

    if (result.success) {
      setIsDeleteDialogOpen(false);
    } else {
      alert(`操作失败: ${result.message}`);
      setIsDeleteDialogOpen(false);
    }
  };

  const handleMigrateAndDelete = async () => {
    if (!deletingConfig || migrateTarget === null) {
      alert('请选择迁移目标或选择清空数据');
      return;
    }

    // 对于必填字段（如unit），不允许置空
    const requiredTypes: SystemConfigType[] = ['unit'];
    if (migrateTarget === '' && requiredTypes.includes(deletingConfig.configType)) {
      alert('单位是必填字段，不能清空！请选择迁移到其他单位。');
      return;
    }

    // migrateTarget为空字符串表示置空，否则迁移到指定值
    const targetValue = migrateTarget === '' ? null : migrateTarget;
    
    const result = await deleteConfig(deletingConfig.id!, targetValue);

    if (result.success) {
      setIsMigrateDialogOpen(false);
      alert(result.message);
    } else {
      alert(`操作失败: ${result.message}`);
    }
  };

  // 获取可迁移的目标配置（排除当前要删除的）
  const availableTargets = configs?.filter(c => c.id !== deletingConfig?.id && c.isActive) || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>下拉菜单配置</CardTitle>
        <CardDescription>
          管理系统中所有下拉菜单的选项。可以拖拽调整顺序。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 配置类型选择 */}
        <div className="space-y-2">
          <Label>配置类型</Label>
          <Select value={selectedType} onValueChange={(v) => setSelectedType(v as SystemConfigType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {configTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 配置列表 */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={configs?.map((c) => c.id!) || []}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {configs?.map((config) => (
                <ConfigItem
                  key={config.id}
                  config={config}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onToggle={handleToggle}
                />
              ))}
              {configs?.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  暂无配置项
                </div>
              )}
            </div>
          </SortableContext>
        </DndContext>

        {/* 添加按钮 */}
        <Button onClick={handleAdd} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          添加新选项
        </Button>
      </CardContent>

      {/* 添加对话框 */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加新配置</DialogTitle>
            <DialogDescription>
              为 {configTypes.find((t) => t.value === selectedType)?.label} 添加新选项
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="value">
                配置值 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="value"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                placeholder="例如: custom_type"
              />
              <p className="text-sm text-muted-foreground">
                唯一标识，建议使用英文小写和下划线
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="label">
                显示名称 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="label"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                placeholder="例如: 自定义类型"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="labelEn">英文名称</Label>
              <Input
                id="labelEn"
                value={formData.labelEn}
                onChange={(e) => setFormData({ ...formData, labelEn: e.target.value })}
                placeholder="例如: Custom Type"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleAddSubmit}>添加</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑对话框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑配置</DialogTitle>
            <DialogDescription>修改配置的显示名称</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>配置值</Label>
              <Input value={formData.value} disabled />
              <p className="text-sm text-muted-foreground">
                配置值不可修改，以保护数据完整性
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-label">
                显示名称 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-label"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-labelEn">英文名称</Label>
              <Input
                id="edit-labelEn"
                value={formData.labelEn}
                onChange={(e) => setFormData({ ...formData, labelEn: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleEditSubmit}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框（无数据使用时） */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              删除确认
            </AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除 <strong>{deletingConfig?.label}</strong> 吗？此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 数据迁移对话框（有数据使用时） */}
      <Dialog open={isMigrateDialogOpen} onOpenChange={setIsMigrateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              删除配置 - 数据迁移
            </DialogTitle>
            <DialogDescription className="space-y-3 pt-2">
              <div className="rounded-lg bg-orange-50 border border-orange-200 p-3">
                <p className="text-sm text-orange-800">
                  <strong>{deletingConfig?.label}</strong> 正在被 <strong className="text-orange-600">{usageCount}</strong> 处数据使用
                </p>
              </div>
              <p className="text-sm">
                删除前需要处理这些数据，请选择以下操作之一：
              </p>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* 选项1: 迁移到其他配置 */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-600 text-sm font-medium">
                  1
                </div>
                <Label className="text-base font-medium">迁移到其他配置（推荐）</Label>
              </div>
              <div className="ml-8 space-y-2">
                <p className="text-sm text-muted-foreground">
                  将所有使用 <strong>{deletingConfig?.label}</strong> 的数据自动更新为：
                </p>
                <Select 
                  value={migrateTarget === null ? undefined : migrateTarget} 
                  onValueChange={setMigrateTarget}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择目标配置..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTargets.map((config) => (
                      <SelectItem key={config.id} value={config.value}>
                        <div className="flex items-center gap-2">
                          <span>{config.label}</span>
                          {config.labelEn && (
                            <span className="text-xs text-muted-foreground">({config.labelEn})</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 分隔线 */}
            {deletingConfig && !['unit'].includes(deletingConfig.configType) && (
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">或</span>
                </div>
              </div>
            )}

            {/* 选项2: 直接删除并置空 - 仅对非必填字段显示 */}
            {deletingConfig && !['unit'].includes(deletingConfig.configType) && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-red-600 text-sm font-medium">
                    2
                  </div>
                  <Label className="text-base font-medium text-destructive">直接删除并清空数据</Label>
                </div>
                <div className="ml-8 space-y-2">
                  <p className="text-sm text-muted-foreground">
                    删除配置，并将所有使用该配置的数据字段置空
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setMigrateTarget('')}
                    className={migrateTarget === '' ? 'border-red-500 bg-red-50' : ''}
                  >
                    {migrateTarget === '' ? '✓ 已选择清空数据' : '选择此选项'}
                  </Button>
                </div>
              </div>
            )}

            {/* 单位类型的特别提示 */}
            {deletingConfig && deletingConfig.configType === 'unit' && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-amber-900">
                      单位是必填字段
                    </p>
                    <p className="text-sm text-amber-700">
                      由于单位是原料的必填字段，删除时必须迁移到其他单位，不能清空数据。
                      请在上方选择一个目标单位来迁移现有数据。
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsMigrateDialogOpen(false)}>
              取消
            </Button>
            <Button
              variant="default"
              onClick={handleMigrateAndDelete}
              disabled={migrateTarget === null}
              className="gap-2"
            >
              {migrateTarget && migrateTarget !== '' ? (
                <>
                  <ArrowRight className="h-4 w-4" />
                  迁移并删除
                </>
              ) : migrateTarget === '' ? (
                <>
                  <Trash2 className="h-4 w-4" />
                  清空并删除
                </>
              ) : (
                <>请先选择操作</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
