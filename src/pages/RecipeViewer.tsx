import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import { Recipe, MenuInfo } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ImagePreviewDialog } from '@/components/ImagePreviewDialog';
import { ArrowLeft, Edit, Star, Copy, ImageIcon, ChevronLeft, ChevronRight, FileDown } from 'lucide-react';
import { formatCurrency, getFlavorTagLabel, getDrinkDurationLabel, getGlassTypeLabel } from '@/utils/calculations';
import { exportRecipeToPDF } from '@/utils/pdfExport';

export default function RecipeViewer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [menuInfo, setMenuInfo] = useState<MenuInfo | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const ingredients = useLiveQuery(() => db.ingredients.toArray(), []);

  useEffect(() => {
    if (id) {
      db.recipes.get(Number(id)).then((r) => {
        if (r) setRecipe(r);
      });
      db.menuInfo.where('recipeId').equals(Number(id)).first().then((m) => {
        if (m) setMenuInfo(m);
      });
    }
  }, [id]);

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

  const nextImage = () => {
    if (recipe?.images && recipe.images.length > 0) {
      setCurrentImageIndex((prev) => (prev + 1) % recipe.images!.length);
    }
  };

  const prevImage = () => {
    if (recipe?.images && recipe.images.length > 0) {
      setCurrentImageIndex((prev) => (prev - 1 + recipe.images!.length) % recipe.images!.length);
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

  const defaultMenuName = menuInfo?.menuNames?.find(m => m.isDefault)?.name || recipe.name;

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
        <Link to={`/recipes/${id}/edit`}>
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
            onClick={() => navigate('/recipes')}
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
        {/* 图片轮播 */}
        {recipe.images && recipe.images.length > 0 && (
          <Card>
            <CardContent className="p-0">
              <div className="relative aspect-[16/9] max-h-[500px] rounded-lg overflow-hidden bg-muted">
                <ImagePreviewDialog
                  src={recipe.images[currentImageIndex]}
                  alt={`${recipe.name} - 图片 ${currentImageIndex + 1}`}
                  trigger={
                    <div className="cursor-pointer group h-full">
                      <img
                        src={recipe.images[currentImageIndex]}
                        alt={`${recipe.name} - 图片 ${currentImageIndex + 1}`}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <ImageIcon className="h-12 w-12 text-white" />
                      </div>
                    </div>
                  }
                />
                
                {/* 轮播控制 */}
                {recipe.images.length > 1 && (
                  <>
                    <Button
                      size="icon"
                      variant="secondary"
                      className="absolute left-2 top-1/2 -translate-y-1/2 opacity-70 hover:opacity-100"
                      onClick={prevImage}
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="secondary"
                      className="absolute right-2 top-1/2 -translate-y-1/2 opacity-70 hover:opacity-100"
                      onClick={nextImage}
                    >
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {recipe.images.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentImageIndex(index)}
                          className={`w-2 h-2 rounded-full transition-all ${
                            index === currentImageIndex
                              ? 'bg-white w-6'
                              : 'bg-white/50 hover:bg-white/75'
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 基本信息卡片 */}
        <Card>
          <CardHeader>
            <CardTitle>基本信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 风味标签 */}
            {menuInfo?.flavorTags && menuInfo.flavorTags.length > 0 && (
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2">风味标签</div>
                <div className="flex flex-wrap gap-2">
                  {menuInfo.flavorTags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {getFlavorTagLabel(tag)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* 详细信息网格 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
              <div>
                <div className="text-sm font-medium text-muted-foreground">杯型</div>
                <div className="text-base mt-1">{getGlassTypeLabel(recipe.glassType)}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">容量</div>
                <div className="text-base mt-1">{recipe.totalVolume || 0} ml</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">酒精度</div>
                <div className="text-base mt-1">{recipe.calculatedAbv || 0}%</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">饮用类型</div>
                <div className="text-base mt-1">
                  {menuInfo?.drinkDuration ? getDrinkDurationLabel(menuInfo.drinkDuration) : '-'}
                </div>
              </div>
              {menuInfo?.color && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground">颜色</div>
                  <div className="text-base mt-1">{menuInfo.color}</div>
                </div>
              )}
              <div>
                <div className="text-sm font-medium text-muted-foreground">成本</div>
                <div className="text-base mt-1">{formatCurrency(recipe.calculatedCost || 0)}</div>
              </div>
              {menuInfo?.price !== undefined && menuInfo.price > 0 && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground">售价</div>
                  <div className="text-base mt-1">{formatCurrency(menuInfo.price)}</div>
                </div>
              )}
            </div>

            {/* 酒款描述 */}
            {menuInfo?.description && (
              <div className="pt-4 border-t">
                <div className="text-sm font-medium text-muted-foreground mb-2">酒款描述</div>
                <p className="text-sm leading-relaxed">{menuInfo.description}</p>
              </div>
            )}

            {/* 菜单名称版本 */}
            {menuInfo?.menuNames && menuInfo.menuNames.length > 1 && (
              <div className="pt-4 border-t">
                <div className="text-sm font-medium text-muted-foreground mb-2">菜单名称版本</div>
                <div className="flex flex-wrap gap-2">
                  {menuInfo.menuNames.map((menuName) => (
                    <Badge key={menuName.id} variant={menuName.isDefault ? "default" : "outline"}>
                      {menuName.name}
                      {menuName.isDefault && " (默认)"}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 配料清单 */}
        <Card>
          <CardHeader>
            <CardTitle>配料清单</CardTitle>
          </CardHeader>
          <CardContent>
            {recipe.ingredients && recipe.ingredients.length > 0 ? (
              <div className="space-y-2">
                {recipe.ingredients.map((ing, index) => {
                  const ingredient = ingredients?.find(i => i.id === ing.ingredientId);
                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="font-medium">{ingredient?.name || '未知原料'}</div>
                        {ingredient?.nameEn && (
                          <div className="text-sm text-muted-foreground">{ingredient.nameEn}</div>
                        )}
                      </div>
                      <div className="text-right ml-4">
                        <div className="font-medium">
                          {ing.quantity} {ing.unit}
                        </div>
                        {ingredient?.alcoholContent && ingredient.alcoholContent > 0 && (
                          <div className="text-sm text-muted-foreground">
                            {ingredient.alcoholContent}% ABV
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">暂无配料信息</p>
            )}
          </CardContent>
        </Card>

        {/* 制作步骤 */}
        <Card>
          <CardHeader>
            <CardTitle>制作步骤</CardTitle>
          </CardHeader>
          <CardContent>
            {recipe.steps && recipe.steps.length > 0 ? (
              <div className="space-y-4">
                {recipe.steps.map((step, index) => (
                  <div key={index} className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                      {step.stepNumber}
                    </div>
                    <div className="flex-1 pt-1">
                      <p className="text-sm leading-relaxed">{step.instruction}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">暂无制作步骤</p>
            )}
          </CardContent>
        </Card>

        {/* 备注 */}
        {recipe.notes && (
          <Card>
            <CardHeader>
              <CardTitle>备注</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{recipe.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
