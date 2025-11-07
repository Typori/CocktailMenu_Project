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

  const handleUpgradeDatabase = async () => {
    if (!confirm('确定要升级数据库吗？\n\n此操作将：\n1. 关闭当前数据库连接\n2. 删除旧数据库\n3. 创建新版本数据库（包含场所管理功能）\n4. 刷新页面\n\n请确保您已经导出备份数据！')) {
      return;
    }

    try {
      setIsUpgrading(true);
      setMessage(null);

      // 关闭数据库连接
      db.close();

      // 删除旧数据库
      await new Promise<void>((resolve, reject) => {
        const deleteRequest = indexedDB.deleteDatabase('CocktailMenuDB');
        deleteRequest.onsuccess = () => resolve();
        deleteRequest.onerror = () => reject(deleteRequest.error);
        deleteRequest.onblocked = () => {
          console.warn('Database deletion blocked');
          reject(new Error('数据库删除被阻止，请关闭所有其他标签页'));
        };
      });

      setMessage({ type: 'success', text: '数据库升级成功！页面将刷新...' });

      // 刷新页面，自动创建新版本数据库
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('Database upgrade failed:', error);
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : '数据库升级失败，请重试。' 
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

      <div className="grid gap-6 md:grid-cols-2">
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
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium mb-2">数据备份</p>
                <p className="text-sm text-muted-foreground mb-3">
                  导出所有配方、原料和标签数据为 JSON 文件
                </p>
                <Button 
                  onClick={handleExport} 
                  disabled={isExporting}
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {isExporting ? '导出中...' : '导出数据'}
                </Button>
              </div>

              <div className="pt-3 border-t">
                <p className="text-sm font-medium mb-2">数据恢复</p>
                <p className="text-sm text-muted-foreground mb-3">
                  从备份文件导入数据（会合并到现有数据）
                </p>
                <Button 
                  onClick={handleImportClick}
                  disabled={isImporting}
                  variant="outline"
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {isImporting ? '导入中...' : '导入数据'}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              <div className="pt-3 border-t">
                <p className="text-sm font-medium mb-2">数据库升级</p>
                <p className="text-sm text-muted-foreground mb-3">
                  升级到最新数据库版本（支持场所管理功能）
                </p>
                <Button 
                  onClick={handleUpgradeDatabase}
                  disabled={isUpgrading}
                  variant="destructive"
                  className="w-full"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {isUpgrading ? '升级中...' : '升级数据库'}
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  ⚠️ 升级前请先导出数据备份
                </p>
              </div>
            </div>
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
                    value={notificationSettings.lowStockThreshold}
                    onChange={(e) => 
                      updateNotificationSettings({ 
                        lowStockThreshold: Number(e.target.value) 
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
                版本 2.0.0
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                数据库版本：2
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
