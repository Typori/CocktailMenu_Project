import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Wrench, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { runFullDataRepair, repairRecipeIngredientIds, deduplicateIngredients } from '@/utils/dataRepair';

export default function DataRepair() {
  const [isRepairing, setIsRepairing] = useState(false);
  const [result, setResult] = useState<{
    type: 'success' | 'error' | 'warning';
    message: string;
    details?: string[];
  } | null>(null);

  const handleFullRepair = async () => {
    setIsRepairing(true);
    setResult(null);

    try {
      // 捕获console.log输出
      const logs: string[] = [];
      const originalLog = console.log;
      console.log = (...args) => {
        logs.push(args.join(' '));
        originalLog(...args);
      };

      await runFullDataRepair();

      // 恢复console.log
      console.log = originalLog;

      setResult({
        type: 'success',
        message: '数据修复完成！',
        details: logs,
      });
    } catch (error) {
      setResult({
        type: 'error',
        message: '数据修复失败',
        details: [String(error)],
      });
    } finally {
      setIsRepairing(false);
    }
  };

  const handleRepairIds = async () => {
    setIsRepairing(true);
    setResult(null);

    try {
      const result = await repairRecipeIngredientIds();
      
      if (result.success) {
        setResult({
          type: result.errors.length > 0 ? 'warning' : 'success',
          message: `修复完成！已修复 ${result.repairedRecipes} 个配方`,
          details: result.errors,
        });
      } else {
        setResult({
          type: 'error',
          message: '修复失败',
          details: result.errors,
        });
      }
    } catch (error) {
      setResult({
        type: 'error',
        message: '修复失败',
        details: [String(error)],
      });
    } finally {
      setIsRepairing(false);
    }
  };

  const handleDeduplicate = async () => {
    setIsRepairing(true);
    setResult(null);

    try {
      const result = await deduplicateIngredients();
      
      if (result.success) {
        setResult({
          type: 'success',
          message: `清理完成！删除了 ${result.removedCount} 个重复原料`,
          details: result.errors,
        });
      } else {
        setResult({
          type: 'error',
          message: '清理失败',
          details: result.errors,
        });
      }
    } catch (error) {
      setResult({
        type: 'error',
        message: '清理失败',
        details: [String(error)],
      });
    } finally {
      setIsRepairing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">数据修复工具</h2>
        <p className="text-muted-foreground mt-2">
          修复导入数据后可能出现的原料ID不匹配问题
        </p>
      </div>

      {/* 问题说明 */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>什么时候需要使用数据修复？</AlertTitle>
        <AlertDescription className="mt-2 space-y-2">
          <p>如果您遇到以下情况，可能需要运行数据修复：</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>导入旧版本的数据备份后，配方中显示"未知原料"</li>
            <li>配方中的原料名称与实际显示不符</li>
            <li>原料库中出现重复的原料</li>
          </ul>
        </AlertDescription>
      </Alert>

      {/* 修复选项 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              完整修复
            </CardTitle>
            <CardDescription>
              执行所有修复步骤，包括清理重复原料和修复配方引用
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleFullRepair}
              disabled={isRepairing}
              className="w-full"
            >
              {isRepairing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  修复中...
                </>
              ) : (
                '开始完整修复'
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              修复配方引用
            </CardTitle>
            <CardDescription>
              仅修复配方中的原料ID引用，不删除重复原料
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleRepairIds}
              disabled={isRepairing}
              variant="outline"
              className="w-full"
            >
              {isRepairing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  修复中...
                </>
              ) : (
                '修复配方引用'
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              清理重复原料
            </CardTitle>
            <CardDescription>
              仅清理原料库中的重复项，并更新相关引用
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleDeduplicate}
              disabled={isRepairing}
              variant="outline"
              className="w-full"
            >
              {isRepairing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  清理中...
                </>
              ) : (
                '清理重复原料'
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* 修复结果 */}
      {result && (
        <Alert variant={result.type === 'error' ? 'destructive' : 'default'}>
          {result.type === 'success' && <CheckCircle2 className="h-4 w-4" />}
          {result.type === 'warning' && <AlertTriangle className="h-4 w-4" />}
          {result.type === 'error' && <AlertTriangle className="h-4 w-4" />}
          <AlertTitle>{result.message}</AlertTitle>
          {result.details && result.details.length > 0 && (
            <AlertDescription className="mt-2">
              <div className="max-h-96 overflow-y-auto">
                <pre className="text-xs whitespace-pre-wrap font-mono">
                  {result.details.join('\n')}
                </pre>
              </div>
            </AlertDescription>
          )}
        </Alert>
      )}

      {/* 使用说明 */}
      <Card>
        <CardHeader>
          <CardTitle>使用说明</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">修复原理</h4>
            <p className="text-sm text-muted-foreground">
              数据修复工具通过原料的名称（中文名+英文名）来重新建立配方与原料之间的正确关联。
              如果配方中引用的原料ID在当前原料库中不存在，工具会尝试通过名称查找正确的原料ID并更新。
            </p>
          </div>
          
          <div>
            <h4 className="font-medium mb-2">注意事项</h4>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>修复过程会自动备份，但建议在修复前手动导出一份数据备份</li>
              <li>如果原料库中不存在配方引用的原料，修复工具无法自动创建，需要手动添加</li>
              <li>清理重复原料时，会保留最早创建的那个，删除其他重复项</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
