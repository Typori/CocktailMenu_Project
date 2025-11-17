import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link, useLocation } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import { Recipe, MenuInfo, ImageRecord } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ImagePreviewDialog } from '@/components/ImagePreviewDialog';
import { ScrollButtons } from '@/components/ScrollButtons';
import { RecipeRatings } from '@/components/RecipeRatings';
import { PageNavigation, NavigationSection } from '@/components/PageNavigation';
import { ArrowLeft, Edit, Star, Copy, ImageIcon, FileDown } from 'lucide-react';
import { formatCurrency, getConfigLabelFromMap } from '@/utils/calculations';
import { exportRecipeToPDF } from '@/utils/pdfExport';
import { useAllConfigLabelMaps } from '@/hooks/useSystemConfig';

export default function RecipeViewer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [menuInfo, setMenuInfo] = useState<MenuInfo | null>(null);

  const [imageUrls, setImageUrls] = useState<string[]>([]); // 新增：用于存储图片预览URL

  const ingredients = useLiveQuery(() => db.ingredients.toArray(), []);
  
  // 获取配置标签映射
  const { flavorTagMap, glassTypeMap, drinkDurationMap, techniqueMap } = useAllConfigLabelMaps();

  // 定义页面导航区域
  const navigationSections: NavigationSection[] = [
    { id: 'section-basic', label: '基本信息', key: '1' },
    { id: 'section-ingredients', label: '配料列表', key: '2' },
    { id: 'section-steps', label: '制作步骤', key: '3' },
    { id: 'section-details', label: '详细信息', key: '4' },
    ...(recipe?.notes ? [{ id: 'section-notes', label: '备注', key: '5' }] : []),
    ...(id ? [{ id: 'section-ratings', label: '评分', key: '6' }] : []),
  ];

  // 处理返回按钮 - 返回上一页
  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/recipes');
    }
  };

  useEffect(() => {
    if (id) {
      db.recipes.get(Number(id)).then((r) => {
        if (r) {
          setRecipe(r);
          // 获取图片URL
          if (r.imageIds && r.imageIds.length > 0) {
            db.imageStore.bulkGet(r.imageIds).then(images => {
              const urls = images.filter(img => img && img.data).map(img => URL.createObjectURL(img!.data));
              setImageUrls(urls);
            });
          } else {
            setImageUrls([]);
          }
        }
      });
      db.menuInfo.where('recipeId').equals(Number(id)).first().then((m) => {
        if (m) setMenuInfo(m);
      });
    }

    // 清理函数：在组件卸载或 id 变化时撤销 URL
    return () => {
      imageUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [id]); // 依赖于 id 和 imageUrls（用于清理）

  const handleToggleFavorite = async () => {
    if (!recipe) return;
    await db.recipes.update(recipe.id!, { 
      isFavorite: !recipe.isFavorite,
      updatedAt: new Date(),
    });
    setRecipe({ ...recipe, isFavorite: !recipe.isFavorite });
  };

  const handleDuplicate = async () => {
    if (!recipe) return;
    const newRecipe = {
      ...recipe,
      id: undefined,
      name: `${recipe.name} (副本)`,
      isFavorite: false, // 复制的配方默认不收藏
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await db.recipes.add(newRecipe);
    navigate('/recipes');
  };

  const handleExportPDF = async () => {
    if (!recipe || !ingredients) return;
    try {
      await exportRecipeToPDF(recipe, menuInfo, ingredients);
    } catch (error) {
      console.error('Failed to export PDF:', error);
      alert('导出PDF失败，请重试');
    }
  };



  if (!recipe) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative pb-6">
      {/* 固定的操作按钮组 - 右上角 */}
      <div className="fixed top-4 right-4 z-50 flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportPDF}
          className="touch-feedback shadow-lg bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
        >
          <FileDown className="mr-1 h-4 w-4" />
          <span className="hidden sm:inline">导出</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleToggleFavorite}
          className="touch-feedback shadow-lg bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
        >
          <Star className={`mr-1 h-4 w-4 ${recipe.isFavorite ? 'fill-yellow-500 text-yellow-500' : ''}`} />
          <span className="hidden sm:inline">{recipe.isFavorite ? '取消收藏' : '收藏'}</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDuplicate}
          className="touch-feedback shadow-lg bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
        >
          <Copy className="mr-1 h-4 w-4" />
          <span className="hidden sm:inline">复制</span>
        </Button>
        <Link to={`/recipes/${id}/edit`} state={{ from: location.state?.from || location.pathname }}>
          <Button size="sm" className="touch-feedback shadow-lg">
            <Edit className="mr-1 h-4 w-4" />
            <span className="hidden sm:inline">编辑</span>
          </Button>
        </Link>
      </div>

      {/* 主要内容区域 - 单栏流式布局 */}
      <div className="space-y-6 px-4 pt-6">
        {/* 标题区域 - 包含返回按钮和配方名称 */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleGoBack}
            className="touch-feedback shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2 flex-wrap">
              {recipe.name}
              {recipe.isFavorite && (
                <Star className="h-5 w-5 fill-yellow-500 text-yellow-500 shrink-0" />
              )}
            </h2>
            {recipe.nameEn && (
              <p className="text-sm text-muted-foreground">{recipe.nameEn}</p>
            )}
          </div>
        </div>
        {/* 图片展示区域 - 竖向布局 */}
        <Card>
          <CardContent className="p-0">
            <div className="flex gap-3 p-4 overflow-x-auto">
              {imageUrls && imageUrls.length > 0 ? (
                imageUrls.map((url, index) => (
                  <div key={index} className="flex-shrink-0">
                    <ImagePreviewDialog
                      src={url}
                      alt={`${recipe.name} - 附图 ${index + 1}`}
                      trigger={
                        <div className="cursor-pointer group relative w-48 h-64 rounded-lg overflow-hidden bg-muted border-2 border-border hover:border-primary transition-colors flex items-center justify-center">
                          <img
                            src={url}
                            alt={`${recipe.name} - 附图 ${index + 1}`}
                            className="max-w-full max-h-full object-contain transition-transform group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <ImageIcon className="h-8 w-8 text-white" />
                          </div>
                        </div>
                      }
                    />
                  </div>
                ))
              ) : (
                <div className="flex-shrink-0">
                  <div className="w-48 h-64 rounded-lg bg-gradient-to-br from-muted to-muted/50 border-2 border-dashed border-border flex items-center justify-center">
                    <div className="text-center">
                      <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                      <span className="text-sm text-muted-foreground font-medium">待添加</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 基本信息 */}
        <Card id="section-basic">
          <CardHeader>
            <CardTitle>基本信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 配方名称 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">配方名称 (中文)</div>
                <div className="text-base">{recipe.name}</div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">配方名称 (英文)</div>
                <div className="text-base">{recipe.nameEn || '-'}</div>
              </div>
            </div>

            {/* 容量和酒精度 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">容量</div>
                <div className="text-base">{recipe.totalVolume || 0} ml</div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">酒精度</div>
                <div className="text-base">{recipe.calculatedAbv || 0}%</div>
              </div>
            </div>

            {/* 当前评分 */}
            {recipe.currentRating !== undefined && recipe.currentRating > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">当前评分</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-primary">{recipe.currentRating.toFixed(1)}</span>
                  <span className="text-sm text-muted-foreground">/ 5.0</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 配料列表 */}
        <Card id="section-ingredients">
          <CardHeader>
            <CardTitle>配料列表</CardTitle>
          </CardHeader>
          <CardContent>
            {recipe.ingredients && recipe.ingredients.length > 0 ? (
              <div className="space-y-2">
                {/* 表头 */}
                <div className="flex gap-3 items-center px-4 py-2 bg-muted/50 rounded-lg font-medium text-sm">
                  <div className="flex-1">原料名称</div>
                  <div className="w-32 text-center">用量</div>
                  <div className="w-40 text-center">单位</div>
                </div>
                {/* 配料列表 */}
                {recipe.ingredients.map((ing, index) => {
                  const ingredient = ingredients?.find(i => i.id === ing.ingredientId);
                  return (
                    <div
                      key={index}
                      className="flex gap-3 items-center p-4 border rounded-lg bg-muted/30"
                    >
                      <div className="flex-1">
                        <div className="font-medium">{ingredient?.name || '未知原料'}</div>
                        {ingredient?.nameEn && (
                          <div className="text-sm text-muted-foreground">{ingredient.nameEn}</div>
                        )}
                      </div>
                      <div className="w-32 text-center">
                        <div className="text-base">{ing.quantity || 0}</div>
                      </div>
                      <div className="w-40 text-center">
                        <div className="text-base">{ing.unit}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>暂无配料信息</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 制作步骤 */}
        <Card id="section-steps">
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
                      <div className="text-base">{step.instruction}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>暂无制作步骤</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 详细信息 */}
        <Card id="section-details">
          <CardHeader>
            <CardTitle>详细信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 调制技法 */}
            {recipe.technique && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">调制技法</div>
                <div className="text-base">{getConfigLabelFromMap(techniqueMap, recipe.technique)}</div>
              </div>
            )}

            {/* 风味标签 */}
            {menuInfo?.flavorTags && menuInfo.flavorTags.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">风味标签</div>
                <div className="flex flex-wrap gap-2">
                  {menuInfo.flavorTags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {getConfigLabelFromMap(flavorTagMap, tag)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* 饮用类型、颜色、使用杯型 */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">饮用类型</div>
                <div className="text-base">
                  {menuInfo?.drinkDuration ? getConfigLabelFromMap(drinkDurationMap, menuInfo.drinkDuration) : '-'}
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">颜色</div>
                <div className="text-base">{menuInfo?.color || '-'}</div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">使用杯型</div>
                <div className="text-base">{getConfigLabelFromMap(glassTypeMap, recipe.glassType)}</div>
              </div>
            </div>

            {/* 建议售价、成本计算、利润率 */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">建议售价</div>
                <div className="text-base">
                  {menuInfo?.price !== undefined && menuInfo.price > 0 ? formatCurrency(menuInfo.price) : '-'}
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">成本计算</div>
                <div className="text-base">{formatCurrency(recipe.calculatedCost || 0)}</div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">利润率</div>
                <div className="text-base">
                  {menuInfo?.price && recipe.calculatedCost 
                    ? `${(((menuInfo.price - recipe.calculatedCost) / menuInfo.price) * 100).toFixed(1)}%`
                    : '-'
                  }
                </div>
              </div>
            </div>

            {/* 酒款描述 */}
            {menuInfo?.description && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">酒款描述</div>
                <div className="text-base leading-relaxed">{menuInfo.description}</div>
              </div>
            )}

            {/* 菜单名称 */}
            {menuInfo?.menuNames && menuInfo.menuNames.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">菜单名称</div>
                <div className="space-y-2">
                  {menuInfo.menuNames.map((menuName) => (
                    <div key={menuName.id} className="flex items-center gap-2">
                      <div className="text-base">{menuName.name}</div>
                      {menuName.isDefault && (
                        <Badge variant="default" className="text-xs">
                          默认
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 备注 */}
        {recipe.notes && (
          <Card id="section-notes">
            <CardHeader>
              <CardTitle>备注</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-base leading-relaxed whitespace-pre-wrap">{recipe.notes}</div>
            </CardContent>
          </Card>
        )}

        {/* 评分系统 - 只读模式 */}
        {id && (
          <div id="section-ratings">
            <RecipeRatings 
              recipeId={Number(id)}
              onRatingsChange={(avgRating) => {
                // 更新本地状态中的评分
                setRecipe(prev => prev ? { ...prev, currentRating: avgRating } : null);
              }}
            />
          </div>
        )}
      </div>

      {/* 页面导航 */}
      <PageNavigation sections={navigationSections} />

      {/* 滚动按钮 */}
      <ScrollButtons />
    </div>
  );
}
