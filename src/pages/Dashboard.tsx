import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import { useScrollRestoration } from '@/hooks/useScrollRestoration';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wine, BookOpen, Package, TrendingUp, AlertTriangle, Star } from 'lucide-react';
import { Statistics } from '@/types';

export default function Dashboard() {
  // 滚动位置恢复
  useScrollRestoration();
  
  const [stats, setStats] = useState<Statistics>({
    totalRecipes: 0,
    totalIngredients: 0,
    averageCost: 0,
    averageProfit: 0,
    mostUsedIngredients: [],
    popularRecipes: [],
    lowStockItems: [],
  });

  const recipes = useLiveQuery(() => db.recipes.toArray(), []);
  const ingredients = useLiveQuery(() => db.ingredients.toArray(), []);
  const favoriteRecipes = useLiveQuery(() => 
    db.recipes.filter(r => r.isFavorite === true).toArray(),
    []
  );

  useEffect(() => {
    const calculateStats = async () => {
      try {
        const totalRecipes = await db.recipes.count();
        const totalIngredients = await db.ingredients.count();
        
        const allRecipes = await db.recipes.toArray();
        const avgCost = allRecipes.reduce((sum, r) => sum + (r.calculatedCost || 0), 0) / (totalRecipes || 1);
        
        const allMenuInfo = await db.menuInfo.toArray();
        const avgProfit = allMenuInfo.reduce((sum, m) => sum + (m.profitMargin || 0), 0) / (allMenuInfo.length || 1);
        
        const lowStock = await db.ingredients
          .filter(ing => (ing.currentStock || 0) < (ing.minStock || 0))
          .toArray();

        setStats({
          totalRecipes,
          totalIngredients,
          averageCost: Math.round(avgCost * 100) / 100,
          averageProfit: Math.round(avgProfit * 10) / 10,
          mostUsedIngredients: [],
          popularRecipes: [],
          lowStockItems: lowStock.map(ing => ({
            id: ing.id!,
            name: ing.name,
            stock: ing.currentStock || 0,
          })),
        });
      } catch (error) {
        console.error('Failed to calculate stats:', error);
      }
    };

    if (recipes !== undefined && ingredients !== undefined) {
      calculateStats();
    }
  }, [recipes, ingredients]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">仪表盘</h2>
        <p className="text-muted-foreground">欢迎回来！这是你的调酒管理概览</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">配方总数</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRecipes}</div>
            <p className="text-xs text-muted-foreground">
              {favoriteRecipes?.length || 0} 个收藏
            </p>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">原料种类</CardTitle>
            <Wine className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalIngredients}</div>
            <p className="text-xs text-muted-foreground">
              {stats.lowStockItems.length} 个库存不足
            </p>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均成本</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">¥{stats.averageCost}</div>
            <p className="text-xs text-muted-foreground">每杯平均成本</p>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均利润率</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageProfit}%</div>
            <p className="text-xs text-muted-foreground">整体利润率</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* 收藏的配方 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              收藏的配方
            </CardTitle>
            <CardDescription>你最喜欢的调酒配方</CardDescription>
          </CardHeader>
          <CardContent>
            {favoriteRecipes && favoriteRecipes.length > 0 ? (
              <div className="space-y-2">
                {favoriteRecipes.slice(0, 5).map((recipe) => (
                  <Link
                    key={recipe.id}
                    to={`/recipes/${recipe.id}/edit`}
                    className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent transition-colors touch-feedback"
                  >
                    <div>
                      <p className="font-medium">{recipe.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {recipe.calculatedAbv ? `${recipe.calculatedAbv}% ABV` : ''}
                        {recipe.calculatedCost ? ` · ¥${recipe.calculatedCost}` : ''}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>还没有收藏的配方</p>
                <Link to="/recipes">
                  <Button variant="link" className="mt-2">去添加配方</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 库存警告 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              库存警告
            </CardTitle>
            <CardDescription>需要补充的原料</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.lowStockItems.length > 0 ? (
              <div className="space-y-2">
                {stats.lowStockItems.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-lg border border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-900 p-3"
                  >
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">
                        当前库存: {item.stock}
                      </p>
                    </div>
                    <Link to="/inventory">
                      <Button size="sm" variant="outline">补货</Button>
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>所有原料库存充足 ✓</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 快捷操作 */}
      <Card>
        <CardHeader>
          <CardTitle>快捷操作</CardTitle>
          <CardDescription>常用功能入口</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            <Link to="/recipes/new">
              <Button className="w-full touch-feedback" variant="default">
                <BookOpen className="mr-2 h-4 w-4" />
                创建新配方
              </Button>
            </Link>
            <Link to="/ingredients">
              <Button className="w-full touch-feedback" variant="outline">
                <Wine className="mr-2 h-4 w-4" />
                管理原料
              </Button>
            </Link>
            <Link to="/menu">
              <Button className="w-full touch-feedback" variant="outline">
                <Package className="mr-2 h-4 w-4" />
                查看酒单
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
