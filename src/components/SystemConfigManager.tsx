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
import { Plus, Edit, Trash2, GripVertical, AlertTriangle } from 'lucide-react';

interface ConfigItemProps {
  config: SystemConfig;
  onEdit: (config: SystemConfig) => void;
  onDelete: (config: SystemConfig) => void;
  onToggle: (config: SystemConfig) => void;
}

function ConfigItem({ config, onEdit, onDelete, onToggle }: ConfigItemProps) {
  const [usageCount, setUsageCount] = useState(0);

  useEffect(() => {
    checkConfigUsage(config).then(setUsageCount);
  }, [config]);

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors">
      <div className="flex items-center gap-3 flex-1">
        <GripVertical className="h-5 w-5 text-muted-foreground cursor-move" />
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
            {config.isSystem && (
              <span className="text-blue-600">• 系统预设</span>
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
          disabled={config.isSystem}
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

  const [formData, setFormData] = useState({
    value: '',
    label: '',
    labelEn: '',
  });

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

  const handleDelete = (config: SystemConfig) => {
    setDeletingConfig(config);
    setIsDeleteDialogOpen(true);
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
      isSystem: false,
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
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>下拉菜单配置</CardTitle>
        <CardDescription>
          管理系统中所有下拉菜单的选项。系统预设配置不可删除，但可以禁用。
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

      {/* 删除确认对话框 */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              删除确认
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              {deletingConfig?.isSystem ? (
                <div className="space-y-2">
                  <p>
                    <strong>{deletingConfig.label}</strong> 是系统预设配置，不能删除。
                  </p>
                  <p>你可以选择禁用它，这样新建时就不会显示此选项，但已有数据仍然保留。</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p>
                    确定要删除 <strong>{deletingConfig?.label}</strong> 吗？
                  </p>
                  <p className="text-sm">
                    如果有数据正在使用此配置，系统会自动禁用而不是删除，以保护数据完整性。
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            {deletingConfig?.isSystem ? (
              <AlertDialogAction
                onClick={async () => {
                  if (deletingConfig) {
                    await handleToggle(deletingConfig);
                    setIsDeleteDialogOpen(false);
                  }
                }}
              >
                禁用配置
              </AlertDialogAction>
            ) : (
              <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                确认删除
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
