import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import { RecipeRating } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RatingInput } from '@/components/RatingInput';
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface RecipeRatingsProps {
  recipeId: number;
  onRatingsChange?: (averageRating: number) => void;
}

export function RecipeRatings({ recipeId, onRatingsChange }: RecipeRatingsProps) {
  const [newRating, setNewRating] = useState(0);
  const [newComment, setNewComment] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editRating, setEditRating] = useState(0);
  const [editComment, setEditComment] = useState('');

  // 查询该配方的所有评分
  const ratings = useLiveQuery(
    () => db.recipeRatings.where('recipeId').equals(recipeId).reverse().sortBy('createdAt'),
    [recipeId]
  );

  // 计算平均评分
  const calculateAverageRating = (ratingsList: RecipeRating[]) => {
    if (!ratingsList || ratingsList.length === 0) return 0;
    const sum = ratingsList.reduce((acc, r) => acc + r.rating, 0);
    return Math.round((sum / ratingsList.length) * 10) / 10;
  };

  // 添加评分
  const handleAddRating = async () => {
    if (newRating === 0) {
      alert('请设置评分');
      return;
    }

    try {
      await db.recipeRatings.add({
        recipeId,
        rating: newRating,
        comment: newComment.trim() || undefined,
        createdAt: new Date(),
      });

      // 更新配方的当前评分
      const allRatings = await db.recipeRatings.where('recipeId').equals(recipeId).toArray();
      const avgRating = calculateAverageRating(allRatings);
      await db.recipes.update(recipeId, { 
        currentRating: avgRating,
        updatedAt: new Date(),
      });

      // 通知父组件
      if (onRatingsChange) {
        onRatingsChange(avgRating);
      }

      // 重置表单
      setNewRating(0);
      setNewComment('');
    } catch (error) {
      console.error('Failed to add rating:', error);
      alert('添加评分失败，请重试');
    }
  };

  // 删除评分
  const handleDeleteRating = async (ratingId: number) => {
    if (!confirm('确定要删除这条评分吗？')) return;

    try {
      await db.recipeRatings.delete(ratingId);

      // 更新配方的当前评分
      const allRatings = await db.recipeRatings.where('recipeId').equals(recipeId).toArray();
      const avgRating = calculateAverageRating(allRatings);
      await db.recipes.update(recipeId, { 
        currentRating: avgRating,
        updatedAt: new Date(),
      });

      // 通知父组件
      if (onRatingsChange) {
        onRatingsChange(avgRating);
      }
    } catch (error) {
      console.error('Failed to delete rating:', error);
      alert('删除评分失败，请重试');
    }
  };

  // 开始编辑评分
  const handleStartEdit = (rating: RecipeRating) => {
    setEditingId(rating.id!);
    setEditRating(rating.rating);
    setEditComment(rating.comment || '');
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditRating(0);
    setEditComment('');
  };

  // 保存编辑
  const handleSaveEdit = async (ratingId: number) => {
    if (editRating === 0) {
      alert('请设置评分');
      return;
    }

    try {
      await db.recipeRatings.update(ratingId, {
        rating: editRating,
        comment: editComment.trim() || undefined,
      });

      // 更新配方的当前评分
      const allRatings = await db.recipeRatings.where('recipeId').equals(recipeId).toArray();
      const avgRating = calculateAverageRating(allRatings);
      await db.recipes.update(recipeId, { 
        currentRating: avgRating,
        updatedAt: new Date(),
      });

      // 通知父组件
      if (onRatingsChange) {
        onRatingsChange(avgRating);
      }

      // 重置编辑状态
      handleCancelEdit();
    } catch (error) {
      console.error('Failed to update rating:', error);
      alert('更新评分失败，请重试');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>评分记录</span>
          {ratings && ratings.length > 0 && (
            <span className="text-sm font-normal text-muted-foreground">
              平均评分: <span className="text-lg font-bold text-primary">{calculateAverageRating(ratings).toFixed(1)}</span> / 5.0
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 添加新评分 */}
        <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
          <h4 className="font-medium">添加新评分</h4>
          
          <RatingInput
            value={newRating}
            onChange={setNewRating}
            label="评分 (0-5分)"
          />

          <div className="space-y-2">
            <Label htmlFor="new-comment">评语（可选）</Label>
            <textarea
              id="new-comment"
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="记录品尝感受、改进建议等..."
            />
          </div>

          <Button
            onClick={handleAddRating}
            className="w-full touch-feedback"
          >
            <Plus className="mr-2 h-4 w-4" />
            添加评分
          </Button>
        </div>

        {/* 历史评分列表 */}
        {ratings && ratings.length > 0 ? (
          <div className="space-y-3">
            <h4 className="font-medium">历史评分</h4>
            {ratings.map((rating) => (
              <div
                key={rating.id}
                className="p-4 border rounded-lg bg-background space-y-2"
              >
                {editingId === rating.id ? (
                  // 编辑模式
                  <div className="space-y-3">
                    <RatingInput
                      value={editRating}
                      onChange={setEditRating}
                      label="评分 (0-5分)"
                    />
                    <div className="space-y-2">
                      <Label htmlFor={`edit-comment-${rating.id}`}>评语（可选）</Label>
                      <textarea
                        id={`edit-comment-${rating.id}`}
                        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={editComment}
                        onChange={(e) => setEditComment(e.target.value)}
                        placeholder="记录品尝感受、改进建议等..."
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleSaveEdit(rating.id!)}
                        className="flex-1"
                      >
                        <Check className="mr-2 h-4 w-4" />
                        保存
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCancelEdit}
                        className="flex-1"
                      >
                        <X className="mr-2 h-4 w-4" />
                        取消
                      </Button>
                    </div>
                  </div>
                ) : (
                  // 显示模式
                  <>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="text-2xl font-bold text-primary">
                          {rating.rating.toFixed(1)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          / 5.0
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {rating.createdAt ? format(rating.createdAt, 'yyyy-MM-dd HH:mm', { locale: zhCN }) : ''}
                        </span>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleStartEdit(rating)}
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDeleteRating(rating.id!)}
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {rating.comment && (
                      <div className="text-sm leading-relaxed text-muted-foreground pl-1">
                        {rating.comment}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>还没有评分记录</p>
            <p className="text-sm mt-1">添加第一条评分吧！</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
