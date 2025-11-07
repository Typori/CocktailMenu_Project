import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, TrendingUp, DollarSign, Percent, BarChart3 } from 'lucide-react';
import { formatCurrency } from '@/utils/calculations';
import { exportToJson, exportMenuToPdf } from '@/utils/export';

export default function Analytics() {
  const recipes = useLiveQuery(() => db.recipes.toArray());
  const menuInfos = useLiveQuery(() => db.menuInfo.toArray());
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalCost: 0,
    averageProfit: 0,
    topRecipes: [] as Array<{ name: string; profit: number }>,
  });

  useEffect(() => {
    if (!recipes || !menuInfos) return;

    let totalRevenue = 0;
    let totalCost = 0;
    const recipeStats: Array<{ name: string; profit: number }> = [];

    recipes.forEach((recipe) => {
      const menuInfo = menuInfos.find(m => m.recipeId === recipe.id);
      if (menuInfo && recipe.calculatedCost) {
        const profit = menuInfo.price - recipe.calculatedCost;
        totalRevenue += menuInfo.price;
        totalCost += recipe.calculatedCost;
        recipeStats.push({ name: recipe.name, profit });
      }
    });

    recipeStats.sort((a, b) => b.profit - a.profit);

    setStats({
      totalRevenue,
      totalCost,
      averageProfit: totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0,
      topRecipes: recipeStats.slice(0, 5),
    });
  }, [recipes, menuInfos]);

  const handleExportJson = async () => {
    try {
      await exportToJson();
      alert('数据导出成功！');
    } catch (error) {
      alert('导出失败，请重试');
    }
  };

  const handleExportPdf = async () => {
    try {
      const allRecipeIds = recipes?.map(r => r.id!).filter(Boolean) || [];
      await exportMenuToPdf(allRecipeIds);
      alert('菜单导出成功！');
    } catch (error) {
      alert('导出失败，请重试');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="h-8 w-8" />
            数据分析
          </h2>
          <p className="text-muted-foreground mt-2">查看成本分析和利润统计</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExportJson} variant="outline" className="touch-feedback">
            <Download className="mr-2 h-4 w-4" />
            导出数据
          </Button>
          <Button onClick={handleExportPdf} className="touch-feedback">
            <Download className="mr-2 h-4 w-4" />
            导出菜单PDF
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总收入</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">基于菜单价格</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总成本</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalCost)}</div>
            <p className="text-xs text-muted-foreground">原料成本</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均利润率</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageProfit.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">整体利润率</p>
          </CardContent>
        </Card>
      </div>

      {/* 利润最高的配方 */}
      <Card>
        <CardHeader>
          <CardTitle>利润最高的配方</CardTitle>
          <CardDescription>按单杯利润排序</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.topRecipes.length > 0 ? (
            <div className="space-y-3">
              {stats.topRecipes.map((recipe, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                      {idx + 1}
                    </div>
                    <span className="font-medium">{recipe.name}</span>
                  </div>
                  <span className="text-lg font-bold text-green-600">
                    {formatCurrency(recipe.profit)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>暂无数据</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 成本分析图表占位 */}
      <Card>
        <CardHeader>
          <CardTitle>成本分析</CardTitle>
          <CardDescription>配方成本分布</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            <p>图表功能开发中...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
