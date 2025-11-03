import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '@/db/database';
import { Recipe, MenuInfo, Ingredient } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatCurrency, formatUnit } from '@/utils/calculations';

export default function SingleRecipeView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [menuInfo, setMenuInfo] = useState<MenuInfo | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [allRecipeIds, setAllRecipeIds] = useState<number[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    loadRecipe();
    loadAllRecipeIds();
  }, [id]);

  const loadRecipe = async () => {
    if (!id) return;
    
    const r = await db.recipes.get(Number(id));
    if (r) {
      setRecipe(r);
      
      const m = await db.menuInfo.where('recipeId').equals(Number(id)).first();
      setMenuInfo(m || null);

      const ings = await Promise.all(
        r.ingredients.map(ing => db.ingredients.get(ing.ingredientId))
      );
      setIngredients(ings.filter(Boolean) as Ingredient[]);
    }
  };

  const loadAllRecipeIds = async () => {
    const allRecipes = await db.recipes.toArray();
    const ids = allRecipes.map(r => r.id!);
    setAllRecipeIds(ids);
    setCurrentIndex(ids.indexOf(Number(id)));
  };

  const navigateToRecipe = (direction: 'prev' | 'next') => {
    let newIndex = currentIndex;
    if (direction === 'prev') {
      newIndex = currentIndex > 0 ? currentIndex - 1 : allRecipeIds.length - 1;
    } else {
      newIndex = currentIndex < allRecipeIds.length - 1 ? currentIndex + 1 : 0;
    }
    navigate(`/menu/${allRecipeIds[newIndex]}`);
  };

  if (!recipe) {
    return <div className="text-center py-12">加载中...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="container flex items-center justify-between p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/menu')}
            className="touch-feedback"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigateToRecipe('prev')}
              className="touch-feedback"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigateToRecipe('next')}
              className="touch-feedback"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* 主内容 - 单页大字体展示 */}
      <div className="container max-w-4xl mx-auto p-6 space-y-8">
        {/* 酒款图片 */}
        {recipe.images && recipe.images.length > 0 ? (
          <div className="aspect-video rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <span className="text-9xl">🍸</span>
          </div>
        ) : (
          <div className="aspect-video rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <span className="text-9xl">🍸</span>
          </div>
        )}

        {/* 酒名 */}
        <div className="text-center space-y-2">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
            {menuInfo?.menuName || recipe.name}
          </h1>
          {menuInfo?.menuNameEn && (
            <p className="text-2xl text-muted-foreground">{menuInfo.menuNameEn}</p>
          )}
        </div>

        {/* 标签和信息 */}
        <div className="flex flex-wrap justify-center gap-3">
          {recipe.calculatedAbv && (
            <Badge variant="outline" className="text-lg px-4 py-2">
              {recipe.calculatedAbv}% ABV
            </Badge>
          )}
          {menuInfo?.price && (
            <Badge variant="secondary" className="text-lg px-4 py-2">
              {formatCurrency(menuInfo.price)}
            </Badge>
          )}
          {recipe.totalVolume && (
            <Badge variant="outline" className="text-lg px-4 py-2">
              {recipe.totalVolume}ml
            </Badge>
          )}
        </div>

        {/* 描述 */}
        {menuInfo?.description && (
          <Card>
            <CardContent className="p-8">
              <p className="text-xl text-center leading-relaxed">
                {menuInfo.description}
              </p>
            </CardContent>
          </Card>
        )}

        {/* 配料 */}
        <Card>
          <CardContent className="p-8">
            <h2 className="text-3xl font-bold mb-6">配料</h2>
            <div className="space-y-4">
              {recipe.ingredients.map((recipeIng, idx) => {
                const ingredient = ingredients.find(i => i.id === recipeIng.ingredientId);
                return (
                  <div key={idx} className="flex justify-between items-center text-xl border-b pb-3">
                    <span className="font-medium">{ingredient?.name || '未知原料'}</span>
                    <span className="text-muted-foreground">
                      {recipeIng.quantity}{formatUnit(recipeIng.unit)}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* 制作步骤 */}
        {recipe.instructions && (
          <Card>
            <CardContent className="p-8">
              <h2 className="text-3xl font-bold mb-6">制作步骤</h2>
              <p className="text-lg leading-relaxed whitespace-pre-wrap">
                {recipe.instructions}
              </p>
            </CardContent>
          </Card>
        )}

        {/* 技法和杯具 */}
        <div className="grid md:grid-cols-2 gap-4">
          {recipe.technique && (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-sm text-muted-foreground mb-2">调制技法</p>
                <p className="text-2xl font-bold capitalize">{recipe.technique}</p>
              </CardContent>
            </Card>
          )}
          {recipe.glassType && (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-sm text-muted-foreground mb-2">推荐杯具</p>
                <p className="text-2xl font-bold capitalize">{recipe.glassType}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
