import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useScrollRestoration } from '@/hooks/useScrollRestoration';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Settings as SettingsIcon, Palette, Database, Bell, Download, Upload, AlertCircle, CheckCircle2, RefreshCw, Wrench } from 'lucide-react';
import { exportToJson, importFromJson, exportImageGallery, exportToJsonWithoutImages } from '@/utils/export';
import { runFullDataRepair } from '@/utils/dataRepair';
import { recalculateAllRecipes } from '@/utils/recalculateAllRecipes';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { db } from '@/db/database';
import { useTheme } from '@/contexts/ThemeContext';
import { useNotificationSettings } from '@/hooks/useNotificationSettings';
import { SystemConfigManager } from '@/components/SystemConfigManager';
import { getAppVersion, getDbVersion } from '@/config/version';
import { Link } from 'react-router-dom';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function Settings() {
  // 滚动位置恢复
  useScrollRestoration();
  
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [isExportingImages, setIsExportingImages] = useState(false); // 新增图片导出状态
  const [isExportingWithoutImages, setIsExportingWithoutImages] = useState(false); // 新增不含图片导出状态
  const [isRepairing, setIsRepairing] = useState(false); // 新增数据修复状态
  const [isRecalculating, setIsRecalculating] = useState(false); // 新增重新计算状态
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { theme, setTheme } = useTheme();
  const { settings: notificationSettings, updateSettings: updateNotificationSettings } = useNotificationSettings();

  const handleExport = async () => {
    try {
      setIsExporting(true);
      setMessage(null);
      await exportToJson();
      setMessage({ type: 'success', text: '数据导出成功！文件已下载到您的下载文件夹。' });
    } catch (error) {
      console.error('Export failed:', error);
      setMessage({ type: 'error', text: '导出失败，请重试。' });
    } finally {
      setIsExporting(false);
    }
  };

  // 新增图片导出处理函数
  const handleExportImages = async () => {
    try {
      setIsExportingImages(true);
      setMessage(null);
      await exportImageGallery();
      setMessage({ type: 'success', text: '图片导出成功！图片已下载到您的下载文件夹。' });
    } catch (error) {
      console.error('Export images failed:', error);
      setMessage({ type: 'error', text: '图片导出失败，请重试。' });
    } finally {
      setIsExportingImages(false);
    }
  };

  const handleExportWithoutImages = async () => {
    try {
      setIsExportingWithoutImages(true);
      setMessage(null);
      await exportToJsonWithoutImages();
      setMessage({ type: 'success', text: '数据导出成功（不含图片）！文件已下载到您的下载文件夹。' });
    } catch (error) {
      console.error('Export without images failed:', error);
      setMessage({ type: 'error', text: '导出失败（不含图片），请重试。' });
    } finally {
      setIsExportingWithoutImages(false);
    }
  };

  const handleRepairData = async () => {
    if (!confirm('确定要运行数据修复工具吗？\n\n此操作将：\n1. 清理重复原料\n2. 修复配方中的原料ID引用\n3. 迁移旧的Base64图片到图片库\n\n建议在遇到数据异常时运行此工具。\n')) {
      return;
    }
    try {
      setIsRepairing(true);
      setMessage(null);
      await runFullDataRepair();
      setMessage({ type: 'success', text: '数据修复完成！请检查控制台输出获取详细信息。' });
    } catch (error) {
      console.error('Data repair failed:', error);
      setMessage({ type: 'error', text: '数据修复失败，请检查控制台。' });
    } finally {
      setIsRepairing(false);
    }
  };

  const handleRecalculateRecipes = async () => {
    if (!confirm('确定要重新计算所有配方的酒精度和成本吗？\\n\\n此操作将更新所有配方的计算字段，确保数据一致性。\\n')) {
      return;
    }
    try {
      setIsRecalculating(true);
      setMessage(null);
      await recalculateAllRecipes();
      setMessage({ type: 'success', text: '所有配方重新计算完成！酒精度和成本已更新。' });
    } catch (error) {
      console.error('Recalculation failed:', error);
      setMessage({ type: 'error', text: '重新计算失败，请检查控制台。' });
    } finally {
      setIsRecalculating(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      setMessage(null);
      await importFromJson(file);
      setMessage({ type: 'success', text: '数据导入成功！页面将刷新以显示新数据。' });
      
      // 刷新页面以显示导入的数据
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('Import failed:', error);
      setMessage({ type: 'error', text: '导入失败，请确保文件格式正确。' });
    } finally {
      setIsImporting(false);
      // 重置文件输入
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleClearDatabase = async () => {
    if (!confirm('确定要清空数据库吗？\n\n此操作将：\n1. 删除所有数据（配方、原料、场所等）\n2. 保留系统配置\n3. 刷新页面\n\n⚠️ 请确保您已经导出备份数据！')) {
      return;
    }

    try {
      setIsUpgrading(true);
      setMessage(null);

      // 清空所有表（保留 systemConfigs）
      await db.transaction('rw', [
        db.ingredients,
        db.recipes,
        db.menuInfo,
        db.tags,
        db.inventoryLogs,
        db.makingNotes,
        db.settings,
        db.venues,
        db.venueRecipes,
        db.venueIngredients,
      ], async () => {
        await db.ingredients.clear();
        await db.recipes.clear();
        await db.menuInfo.clear();
        await db.tags.clear();
        await db.inventoryLogs.clear();
        await db.makingNotes.clear();
        await db.settings.clear();
        await db.venues.clear();
        await db.venueRecipes.clear();
        await db.venueIngredients.clear();
      });

      setMessage({ type: 'success', text: '数据库已清空！页面将刷新...' });

      // 刷新页面
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('Clear database failed:', error);
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : '清空数据库失败，请重试。' 
      });
      setIsUpgrading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <SettingsIcon className="h-8 w-8" />
          设置
        </h2>
        <p className="text-muted-foreground mt-2">
          管理系统配置和偏好设置
        </p>
      </div>

      {message && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
          {message.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6">
        {/* 外观设置 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              外观设置
            </CardTitle>
            <CardDescription>
              自定义界面主题和显示选项
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Label htmlFor="theme-select">主题模式</Label>
              <Select value={theme} onValueChange={(value) => setTheme(value as 'light' | 'dark' | 'auto')}>
                <SelectTrigger id="theme-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">浅色模式</SelectItem>
                  <SelectItem value="dark">深色模式</SelectItem>
                  <SelectItem value="auto">跟随系统</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {theme === 'auto' ? '当前跟随系统主题设置' : `当前使用${theme === 'light' ? '浅色' : '深色'}主题`}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 数据管理 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              数据管理
            </CardTitle>
            <CardDescription>
              备份、导入和导出数据
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Button 
                onClick={handleImportClick}
                disabled={isImporting}
                variant="outline"
                className="flex-1"
              >
                <Upload className="h-4 w-4 mr-2" />
                {isImporting ? '导入中...' : '导入数据'}
              </Button>

              <Button 
                onClick={handleExport} 
                disabled={isExporting}
                className="flex-1"
              >
                <Download className="h-4 w-4 mr-2" />
                {isExporting ? '导出中...' : '导出数据'}
              </Button>

              <Button 
                onClick={handleExportWithoutImages} 
                disabled={isExportingWithoutImages}
                variant="outline"
                className="flex-1"
              >
                <Download className="h-4 w-4 mr-2" />
                {isExportingWithoutImages ? '导出中...' : '导出数据（不含图片）'}
              </Button>

              <Button 
                onClick={handleExportImages} 
                disabled={isExportingImages}
                variant="outline"
                className="flex-1"
              >
                <Download className="h-4 w-4 mr-2" />
                {isExportingImages ? '导出图片中...' : '导出图片库'}
              </Button>
              <Button
                onClick={handleRecalculateRecipes}
                disabled={isRecalculating}
                variant="outline"
                className="flex-1"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {isRecalculating ? '计算中...' : '重新计算配方'}
              </Button>
            </div>
            
            <div className="flex gap-3 mt-4">
              <Button 
                onClick={handleClearDatabase}
                disabled={isUpgrading}
                variant="destructive"
                className="flex-1"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {isUpgrading ? '清空中...' : '清空数据库'}
              </Button>
              <Button 
                onClick={handleRepairData}
                disabled={isRepairing}
                variant="outline"
                className="flex-1"
              >
                <Wrench className="h-4 w-4 mr-2" />
                {isRepairing ? '修复中...' : '运行数据修复'}
              </Button>
              <Button
                onClick={handleRecalculateRecipes}
                disabled={isRecalculating}
                variant="outline"
                className="flex-1"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {isRecalculating ? '计算中...' : '重新计算配方'}
              </Button>
            </div>
            
            <p className="text-sm text-muted-foreground mt-2 pt-4 border-t">
              如果导入数据后出现原料ID不匹配问题，或者图片显示异常，可以尝试运行数据修复工具。<br/>
              如果配方的酒精度或成本显示不一致，可以使用重新计算功能更新所有配方的计算字段。
            </p>
            
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />
          </CardContent>
        </Card>

        {/* 通知设置 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              通知设置
            </CardTitle>
            <CardDescription>
              管理库存警告和提醒
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="low-stock-alert">库存警告</Label>
                <p className="text-sm text-muted-foreground">
                  当原料库存低于设定阈值时显示警告
                </p>
              </div>
              <Switch
                id="low-stock-alert"
                checked={notificationSettings.lowStockAlert}
                onCheckedChange={(checked) => 
                  updateNotificationSettings({ lowStockAlert: checked })
                }
              />
            </div>
            
            {notificationSettings.lowStockAlert && (
              <div className="space-y-2 pt-2 border-t">
                <Label htmlFor="stock-threshold">库存警告阈值 (%)</Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="stock-threshold"
                    type="number"
                    min="0"
                    max="100"
                    value={notificationSettings.lowStockThreshold || ''}
                    onChange={(e) => 
                      updateNotificationSettings({ 
                        lowStockThreshold: e.target.value === '' ? 0 : Number(e.target.value)
                      })
                    }
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">
                    当库存低于最低库存的 {notificationSettings.lowStockThreshold}% 时提醒
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 关于 */}
        <Card>
          <CardHeader>
            <CardTitle>关于</CardTitle>
            <CardDescription>
              应用信息和版本
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">鸡尾酒配方管理系统</p>
              <p className="text-sm text-muted-foreground">
                版本 {getAppVersion()}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                数据库版本：{getDbVersion()}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 系统配置管理 - 放在最下面 */}
        <SystemConfigManager />
      </div>
    </div>
  );
}
