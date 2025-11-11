import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  getPDFConfig, 
  updatePDFConfig, 
  resetPDFConfig, 
  applyPDFPreset,
  PDF_PRESETS,
  type PDFExportConfig 
} from '@/utils/pdfConfig';
import { exportRecipeToPDF } from '@/utils/pdfExport';
import { FileText, Download, RotateCcw, Settings2, Zap } from 'lucide-react';

export default function PDFDebug() {
  const [config, setConfig] = useState<PDFExportConfig>(getPDFConfig());
  const [selectedRecipeId, setSelectedRecipeId] = useState<number | null>(null);
  const [estimatedSize, setEstimatedSize] = useState<string>('');

  // 获取所有配方
  const recipes = useLiveQuery(() => db.recipes.toArray());
  const ingredients = useLiveQuery(() => db.ingredients.toArray()) || [];

  // 更新配置
  const handleConfigChange = (key: keyof PDFExportConfig, value: any) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    updatePDFConfig({ [key]: value });
    calculateEstimatedSize(newConfig);
  };

  // 应用预设
  const handleApplyPreset = (presetName: keyof typeof PDF_PRESETS) => {
    applyPDFPreset(presetName);
    const newConfig = getPDFConfig();
    setConfig(newConfig);
    calculateEstimatedSize(newConfig);
  };

  // 重置配置
  const handleReset = () => {
    resetPDFConfig();
    const newConfig = getPDFConfig();
    setConfig(newConfig);
    calculateEstimatedSize(newConfig);
  };

  // 测试导出
  const handleTestExport = async () => {
    if (!selectedRecipeId) {
      alert('请先选择一个配方');
      return;
    }

    const recipe = recipes?.find(r => r.id === selectedRecipeId);
    if (!recipe) {
      alert('配方不存在');
      return;
    }

    try {
      await exportRecipeToPDF(recipe, recipe.menuInfo || null, ingredients);
    } catch (error) {
      console.error('Export failed:', error);
      alert('导出失败，请查看控制台');
    }
  };

  // 计算预估文件大小
  const calculateEstimatedSize = (cfg: PDFExportConfig) => {
    // 粗略估算：基于canvas尺寸和质量
    const pixelCount = (cfg.canvasWidth * cfg.canvasScale) * (cfg.canvasWidth * cfg.canvasScale * 1.4); // 假设高度是宽度的1.4倍
    const bytesPerPixel = cfg.imageFormat === 'png' ? 4 : 3;
    const compressionRatio = cfg.imageFormat === 'png' ? 0.5 : (1 - cfg.imageQuality) * 0.3 + 0.1;
    const estimatedBytes = pixelCount * bytesPerPixel * compressionRatio;
    
    if (estimatedBytes < 1024 * 1024) {
      setEstimatedSize(`${(estimatedBytes / 1024).toFixed(0)} KB`);
    } else {
      setEstimatedSize(`${(estimatedBytes / 1024 / 1024).toFixed(2)} MB`);
    }
  };

  useEffect(() => {
    calculateEstimatedSize(config);
  }, []);

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Settings2 className="w-8 h-8" />
          PDF导出调试工具
        </h1>
        <p className="text-muted-foreground mt-2">
          调整PDF导出参数，实时测试效果
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：配置面板 */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">基础设置</TabsTrigger>
              <TabsTrigger value="advanced">高级设置</TabsTrigger>
              <TabsTrigger value="presets">预设方案</TabsTrigger>
            </TabsList>

            {/* 基础设置 */}
            <TabsContent value="basic" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>图片质量</CardTitle>
                  <CardDescription>影响清晰度和文件大小的关键参数</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Canvas缩放 */}
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>Canvas缩放倍数</Label>
                      <span className="text-sm text-muted-foreground">{config.canvasScale.toFixed(1)}x</span>
                    </div>
                    <Slider
                      value={[config.canvasScale]}
                      onValueChange={([value]) => handleConfigChange('canvasScale', value)}
                      min={1}
                      max={3}
                      step={0.1}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                      越高越清晰，但文件越大。推荐: 1.5-2.0
                    </p>
                  </div>

                  {/* 图片格式 */}
                  <div className="space-y-2">
                    <Label>图片格式</Label>
                    <Select
                      value={config.imageFormat}
                      onValueChange={(value: 'png' | 'jpeg') => handleConfigChange('imageFormat', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="jpeg">JPEG (推荐，文件小)</SelectItem>
                        <SelectItem value="png">PNG (无损，文件大)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 图片质量 */}
                  {config.imageFormat === 'jpeg' && (
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label>JPEG质量</Label>
                        <span className="text-sm text-muted-foreground">{(config.imageQuality * 100).toFixed(0)}%</span>
                      </div>
                      <Slider
                        value={[config.imageQuality]}
                        onValueChange={([value]) => handleConfigChange('imageQuality', value)}
                        min={0.5}
                        max={1}
                        step={0.01}
                        className="w-full"
                      />
                      <p className="text-xs text-muted-foreground">
                        推荐: 85-95%。低于80%会明显降低质量
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>页面设置</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* 页边距 */}
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>页边距</Label>
                      <span className="text-sm text-muted-foreground">{config.margin} mm</span>
                    </div>
                    <Slider
                      value={[config.margin]}
                      onValueChange={([value]) => handleConfigChange('margin', value)}
                      min={10}
                      max={40}
                      step={5}
                      className="w-full"
                    />
                  </div>

                  {/* Canvas宽度 */}
                  <div className="space-y-2">
                    <Label>Canvas宽度 (像素)</Label>
                    <Input
                      type="number"
                      value={config.canvasWidth}
                      onChange={(e) => handleConfigChange('canvasWidth', parseInt(e.target.value))}
                      min={600}
                      max={1200}
                      step={10}
                    />
                    <p className="text-xs text-muted-foreground">
                      默认794px对应A4纸宽度
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 高级设置 */}
            <TabsContent value="advanced" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>渲染选项</CardTitle>
                  <CardDescription>html2canvas渲染参数</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* CORS */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>启用CORS</Label>
                      <p className="text-xs text-muted-foreground">允许跨域加载图片</p>
                    </div>
                    <Switch
                      checked={config.useCORS}
                      onCheckedChange={(checked) => handleConfigChange('useCORS', checked)}
                    />
                  </div>

                  {/* Allow Taint */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>允许污染</Label>
                      <p className="text-xs text-muted-foreground">允许跨域图片污染canvas</p>
                    </div>
                    <Switch
                      checked={config.allowTaint}
                      onCheckedChange={(checked) => handleConfigChange('allowTaint', checked)}
                    />
                  </div>

                  {/* 背景色 */}
                  <div className="space-y-2">
                    <Label>背景颜色</Label>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        value={config.backgroundColor}
                        onChange={(e) => handleConfigChange('backgroundColor', e.target.value)}
                        placeholder="#ffffff"
                      />
                      <Input
                        type="color"
                        value={config.backgroundColor}
                        onChange={(e) => handleConfigChange('backgroundColor', e.target.value)}
                        className="w-20"
                      />
                    </div>
                  </div>

                  {/* 图片超时 */}
                  <div className="space-y-2">
                    <Label>图片加载超时 (毫秒)</Label>
                    <Input
                      type="number"
                      value={config.imageTimeout}
                      onChange={(e) => handleConfigChange('imageTimeout', parseInt(e.target.value))}
                      min={0}
                      max={10000}
                      step={1000}
                    />
                    <p className="text-xs text-muted-foreground">
                      0表示无限等待
                    </p>
                  </div>

                  {/* 渲染延迟 */}
                  <div className="space-y-2">
                    <Label>渲染延迟 (毫秒)</Label>
                    <Input
                      type="number"
                      value={config.renderDelay}
                      onChange={(e) => handleConfigChange('renderDelay', parseInt(e.target.value))}
                      min={0}
                      max={2000}
                      step={100}
                    />
                    <p className="text-xs text-muted-foreground">
                      等待DOM渲染完成的时间
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 预设方案 */}
            <TabsContent value="presets" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>快速预设</CardTitle>
                  <CardDescription>一键应用常用配置</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => handleApplyPreset('ultraHD')}
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    <div className="text-left flex-1">
                      <div className="font-semibold">超高清 (Ultra HD)</div>
                      <div className="text-xs text-muted-foreground">3x缩放 + PNG格式，文件很大</div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => handleApplyPreset('highQuality')}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    <div className="text-left flex-1">
                      <div className="font-semibold">高质量</div>
                      <div className="text-xs text-muted-foreground">2x缩放 + PNG格式，文件较大</div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full justify-start border-primary"
                    onClick={() => handleApplyPreset('balanced')}
                  >
                    <Settings2 className="w-4 h-4 mr-2" />
                    <div className="text-left flex-1">
                      <div className="font-semibold">平衡 (推荐)</div>
                      <div className="text-xs text-muted-foreground">1.5x缩放 + JPEG 92%，平衡质量和大小</div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => handleApplyPreset('compact')}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    <div className="text-left flex-1">
                      <div className="font-semibold">小文件</div>
                      <div className="text-xs text-muted-foreground">1.2x缩放 + JPEG 75%，文件最小</div>
                    </div>
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* 右侧：测试面板 */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>测试导出</CardTitle>
              <CardDescription>选择配方进行测试</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 选择配方 */}
              <div className="space-y-2">
                <Label>选择配方</Label>
                <Select
                  value={selectedRecipeId?.toString()}
                  onValueChange={(value) => setSelectedRecipeId(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择一个配方..." />
                  </SelectTrigger>
                  <SelectContent>
                    {recipes?.map((recipe) => (
                      <SelectItem key={recipe.id} value={recipe.id!.toString()}>
                        {recipe.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 导出按钮 */}
              <Button
                className="w-full"
                onClick={handleTestExport}
                disabled={!selectedRecipeId}
              >
                <Download className="w-4 h-4 mr-2" />
                测试导出PDF
              </Button>

              {/* 重置按钮 */}
              <Button
                variant="outline"
                className="w-full"
                onClick={handleReset}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                重置为默认配置
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>当前配置信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Canvas缩放:</span>
                <span className="font-mono">{config.canvasScale}x</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">图片格式:</span>
                <span className="font-mono uppercase">{config.imageFormat}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">图片质量:</span>
                <span className="font-mono">{(config.imageQuality * 100).toFixed(0)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Canvas宽度:</span>
                <span className="font-mono">{config.canvasWidth}px</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">实际分辨率:</span>
                <span className="font-mono">{Math.round(config.canvasWidth * config.canvasScale)}px</span>
              </div>
              <div className="border-t pt-3 flex justify-between font-semibold">
                <span>预估单页大小:</span>
                <span className="text-primary">{estimatedSize}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle className="text-sm">💡 调试建议</CardTitle>
            </CardHeader>
            <CardContent className="text-xs space-y-2 text-muted-foreground">
              <p>• 图片模糊：提高Canvas缩放或使用PNG格式</p>
              <p>• 文件过大：降低质量或使用JPEG格式</p>
              <p>• 图片加载失败：启用CORS或增加超时时间</p>
              <p>• 推荐配置：1.8-2.0x缩放 + JPEG 90-95%</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
