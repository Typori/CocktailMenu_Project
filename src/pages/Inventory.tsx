import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { formatUnit } from '@/utils/calculations';

export default function Inventory() {
  const ingredients = useLiveQuery(() => db.ingredients.toArray());

  const lowStockItems = ingredients?.filter(
    ing => (ing.currentStock || 0) < (ing.minStock || 0)
  );

  const handleAdjustStock = async (id: number, adjustment: number) => {
    const ingredient = await db.ingredients.get(id);
    if (ingredient) {
      const newStock = (ingredient.currentStock || 0) + adjustment;
      await db.ingredients.update(id, { currentStock: Math.max(0, newStock) });
      
      await db.inventoryLogs.add({
        ingredientId: id,
        type: adjustment > 0 ? 'in' : 'out',
        quantity: Math.abs(adjustment),
        timestamp: new Date(),
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">库存管理</h2>
        <p className="text-muted-foreground">管理原料库存和补货提醒</p>
      </div>

      {/* 库存警告 */}
      {lowStockItems && lowStockItems.length > 0 && (
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
              <AlertTriangle className="h-5 w-5" />
              库存警告 ({lowStockItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lowStockItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-lg"
                >
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      当前: {item.currentStock}{formatUnit(item.unit)} / 
                      最低: {item.minStock}{formatUnit(item.unit)}
                    </p>
                  </div>
                  <Badge variant="destructive">需补货</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 库存列表 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {ingredients?.map((ingredient) => {
          const stockPercentage = ingredient.minStock
            ? ((ingredient.currentStock || 0) / ingredient.minStock) * 100
            : 100;
          const isLow = stockPercentage < 100;

          return (
            <Card key={ingredient.id} className={isLow ? 'border-orange-200' : ''}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>{ingredient.name}</span>
                  <Package className={`h-5 w-5 ${isLow ? 'text-orange-500' : 'text-green-500'}`} />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">当前库存</span>
                    <span className="font-medium">
                      {ingredient.currentStock || 0}{formatUnit(ingredient.unit)}
                    </span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        isLow ? 'bg-orange-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(stockPercentage, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    最低库存: {ingredient.minStock}{formatUnit(ingredient.unit)}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 touch-feedback"
                    onClick={() => handleAdjustStock(ingredient.id!, -10)}
                  >
                    <TrendingDown className="mr-1 h-3 w-3" />
                    -10
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 touch-feedback"
                    onClick={() => handleAdjustStock(ingredient.id!, 10)}
                  >
                    <TrendingUp className="mr-1 h-3 w-3" />
                    +10
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 touch-feedback"
                    onClick={() => handleAdjustStock(ingredient.id!, ingredient.quantity)}
                  >
                    补满
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
