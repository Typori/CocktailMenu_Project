import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useScrollRestoration } from '@/hooks/useScrollRestoration';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Grid, List, Eye, BookOpen } from 'lucide-react';
import { formatCurrency } from '@/utils/calculations';

export default function MenuDisplay() {
  // 滚动位置恢复
  useScrollRestoration();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');

  const recipes = useLiveQuery(() => db.recipes.toArray());
  const menuInfos = useLiveQuery(() => db.menuInfo.toArray());

  const filteredRecipes = recipes?.filter(recipe =>
    recipe.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getMenuInfo = (recipeId: number) => {
    return menuInfos?.find(m => m.recipeId === recipeId);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <BookOpen className="h-8 w-8" />
            酒单展示
          </h2>
          <p className="text-muted-foreground mt-2">浏览和展示你的调酒菜单</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('grid')}
            className="touch-feedback"
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('list')}
            className="touch-feedback"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 搜索栏 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="搜索酒款..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* 酒单列表 */}
      <div className={viewMode === 'grid' ? 'grid gap-6 md:grid-cols-2 lg:grid-cols-3' : 'space-y-4'}>
        {filteredRecipes?.map((recipe) => {
          const menuInfo = getMenuInfo(recipe.id!);
          
          return (
            <Card key={recipe.id} className="card-hover overflow-hidden">
              {recipe.images && recipe.images.length > 0 && (
                <div className="aspect-video bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <span className="text-6xl">🍸</span>
                </div>
              )}
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div>
                    <h3 className="text-2xl font-bold">
                      {menuInfo?.menuNames?.[0]?.name || recipe.name}
                    </h3>
                    {recipe.nameEn && (
                      <p className="text-sm text-muted-foreground">{recipe.nameEn}</p>
                    )}
                  </div>

                  {menuInfo?.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {menuInfo.description}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {recipe.calculatedAbv && (
                      <Badge variant="outline">{recipe.calculatedAbv}% ABV</Badge>
                    )}
                    {menuInfo?.price && (
                      <Badge variant="secondary">{formatCurrency(menuInfo.price)}</Badge>
                    )}
                    {menuInfo?.flavorTags?.map((flavor: string, idx: number) => (
                      <Badge key={idx} variant="outline">{flavor}</Badge>
                    ))}
                  </div>

                  <Link to={`/menu/${recipe.id}`}>
                    <Button className="w-full touch-feedback" variant="outline">
                      <Eye className="mr-2 h-4 w-4" />
                      查看详情
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredRecipes?.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">没有找到酒款</p>
        </div>
      )}
    </div>
  );
}
