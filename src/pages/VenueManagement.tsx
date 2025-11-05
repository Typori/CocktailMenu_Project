import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Store, Edit, Trash2, MoreVertical } from 'lucide-react';
import { useScrollRestoration } from '@/hooks/useScrollRestoration';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { db } from '@/db/database';
import { Venue } from '@/types';
import { useVenue } from '@/contexts/VenueContext';
import VenueSelector from '@/components/VenueSelector';
import VenueMenuTab from '@/pages/VenueMenuTab';
import VenueIngredientsTab from '@/pages/VenueIngredientsTab';

export default function VenueManagement() {
  // 滚动位置恢复
  useScrollRestoration();
  
  const { selectedVenueId, selectVenue } = useVenue();
  const [isVenueDialogOpen, setIsVenueDialogOpen] = useState(false);
  const [editingVenue, setEditingVenue] = useState<Venue | null>(null);
  const [venueFormData, setVenueFormData] = useState<Partial<Venue>>({
    name: '',
    description: '',
    address: '',
  });
  const [activeTab, setActiveTab] = useState<string>(() => {
    // 从 localStorage 读取上次选择的页签
    return localStorage.getItem('venueManagement_activeTab') || 'menu';
  });

  const venues = useLiveQuery(() => db.venues.toArray(), []);

  // 如果没有选中店面且有店面列表,自动选择第一个
  useEffect(() => {
    if (!selectedVenueId && venues && venues.length > 0) {
      selectVenue(venues[0].id!);
    }
  }, [selectedVenueId, venues, selectVenue]);

  const handleOpenVenueDialog = (venue?: Venue) => {
    if (venue) {
      setEditingVenue(venue);
      setVenueFormData(venue);
    } else {
      setEditingVenue(null);
      setVenueFormData({ name: '', description: '', address: '' });
    }
    setIsVenueDialogOpen(true);
  };

  const handleSaveVenue = async () => {
    if (!venueFormData.name) {
      alert('请输入店面名称');
      return;
    }

    const venueData: Venue = {
      ...venueFormData as Venue,
      updatedAt: new Date(),
      createdAt: venueFormData.createdAt || new Date(),
    };

    if (editingVenue?.id) {
      await db.venues.update(editingVenue.id, venueData);
    } else {
      const newId = await db.venues.add(venueData);
      selectVenue(newId as number);
    }

    setIsVenueDialogOpen(false);
    setEditingVenue(null);
  };

  const handleDeleteVenue = async (id: number) => {
    if (confirm('确定要删除这个店面吗？这将同时删除该店面的所有数据。')) {
      await db.venues.delete(id);
      await db.venueRecipes.where('venueId').equals(id).delete();
      await db.venueIngredients.where('venueId').equals(id).delete();
      if (selectedVenueId === id) {
        selectVenue(null);
      }
    }
  };

  // 如果没有店面,显示创建提示
  if (!venues || venues.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Store className="h-8 w-8" />
              店面管理
            </h2>
            <p className="text-muted-foreground mt-2">
              管理不同店面的酒款和原料库存
            </p>
          </div>
        </div>

        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Store className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">还没有店面</p>
            <p className="text-sm text-muted-foreground mb-4">
              创建第一个店面来开始管理
            </p>
            <Button onClick={() => handleOpenVenueDialog()} className="touch-feedback">
              <Plus className="mr-2 h-4 w-4" />
              创建店面
            </Button>
          </CardContent>
        </Card>

        <Dialog open={isVenueDialogOpen} onOpenChange={setIsVenueDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>创建店面</DialogTitle>
              <DialogDescription>填写店面的基本信息</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="venue-name">店面名称 *</Label>
                <Input
                  id="venue-name"
                  value={venueFormData.name || ''}
                  onChange={(e) => setVenueFormData({ ...venueFormData, name: e.target.value })}
                  placeholder="例如: 市中心店"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="venue-address">地址</Label>
                <Input
                  id="venue-address"
                  value={venueFormData.address || ''}
                  onChange={(e) => setVenueFormData({ ...venueFormData, address: e.target.value })}
                  placeholder="例如: 北京市朝阳区xxx"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="venue-description">描述</Label>
                <textarea
                  id="venue-description"
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={venueFormData.description || ''}
                  onChange={(e) => setVenueFormData({ ...venueFormData, description: e.target.value })}
                  placeholder="店面特色、定位等..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsVenueDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleSaveVenue} disabled={!venueFormData.name}>
                保存
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  const selectedVenue = venues.find(v => v.id === selectedVenueId);

  return (
    <div className="space-y-6">
      {/* 顶部区域 - 标题和店面选择 */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Store className="h-8 w-8" />
            店面管理
          </h2>
          <p className="text-muted-foreground mt-2">
            管理不同店面的酒款和原料库存
          </p>
        </div>
        
        {/* 店面选择和管理按钮 - 突出显示 */}
        <div className="flex items-center gap-2 flex-shrink-0 p-2 rounded-lg border-2 border-primary/20 bg-primary/5 shadow-sm">
          <span className="font-bold text-sm">当前店面</span>
          <VenueSelector
            venues={venues}
            selectedVenueId={selectedVenueId}
            onSelectVenue={selectVenue}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="touch-feedback border-primary/30 hover:bg-primary/10">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleOpenVenueDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                新建店面
              </DropdownMenuItem>
              {selectedVenue && (
                <>
                  <DropdownMenuItem onClick={() => handleOpenVenueDialog(selectedVenue)}>
                    <Edit className="mr-2 h-4 w-4" />
                    编辑店面
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => handleDeleteVenue(selectedVenue.id!)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    删除店面
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* 内容区域 */}
      {selectedVenue && (
        <>
          {activeTab === 'menu' && <VenueMenuTab venueId={selectedVenueId!} activeTab={activeTab} onTabChange={setActiveTab} />}
          {activeTab === 'ingredients' && <VenueIngredientsTab venueId={selectedVenueId!} activeTab={activeTab} onTabChange={setActiveTab} />}
        </>
      )}

      {/* 店面对话框 */}
      <Dialog open={isVenueDialogOpen} onOpenChange={setIsVenueDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingVenue ? '编辑店面' : '创建店面'}</DialogTitle>
            <DialogDescription>填写店面的基本信息</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="venue-name">店面名称 *</Label>
              <Input
                id="venue-name"
                value={venueFormData.name || ''}
                onChange={(e) => setVenueFormData({ ...venueFormData, name: e.target.value })}
                placeholder="例如: 市中心店"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="venue-address">地址</Label>
              <Input
                id="venue-address"
                value={venueFormData.address || ''}
                onChange={(e) => setVenueFormData({ ...venueFormData, address: e.target.value })}
                placeholder="例如: 北京市朝阳区xxx"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="venue-description">描述</Label>
              <textarea
                id="venue-description"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={venueFormData.description || ''}
                onChange={(e) => setVenueFormData({ ...venueFormData, description: e.target.value })}
                placeholder="店面特色、定位等..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsVenueDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSaveVenue} disabled={!venueFormData.name}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
