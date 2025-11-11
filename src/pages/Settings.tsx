import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useScrollRestoration } from '@/hooks/useScrollRestoration';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Settings as SettingsIcon, Palette, Database, Bell, Download, Upload, AlertCircle, CheckCircle2, RefreshCw, Archive } from 'lucide-react';
import { exportToJson, importFromJson } from '@/utils/export';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { db } from '@/db/database';
import { useTheme } from '@/contexts/ThemeContext';
import { useNotificationSettings } from '@/hooks/useNotificationSettings';
import { SystemConfigManager } from '@/components/SystemConfigManager';
import { getAppVersion, getDbVersion } from '@/config/version';
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
        db.ingredientMaster,
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
        await db.ingredientMaster.clear();
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
                onClick={handleClearDatabase}
                disabled={isUpgrading}
                variant="destructive"
                className="flex-1"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {isUpgrading ? '清空中...' : '清空数据库'}
              </Button>
            </div>
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

        {/* 备份页面 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Archive className="h-5 w-5" />
              备份页面
            </CardTitle>
            <CardDescription>
              访问旧版本的功能页面（仅供开发和测试使用）
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link to="/ingredients">
              <Button variant="outline" className="w-full justify-start">
                原料管理（旧版本）
              </Button>
            </Link>
            <Link to="/inventory">
              <Button variant="outline" className="w-full justify-start">
                库存管理（旧版本）
              </Button>
            </Link>
            <p className="text-xs text-muted-foreground">
              注意：备份页面可能包含过时的功能或界面，仅用于数据恢复或功能对比。
            </p>
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
