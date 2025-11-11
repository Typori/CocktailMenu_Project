import { Outlet, Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Wine, 
  BookOpen, 
  Settings as SettingsIcon,
  Store,
  Moon,
  Sun,
  Bug
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const navigation = [
  { name: '仪表盘', href: '/dashboard', icon: Home },
  { name: '原料库', href: '/ingredients', icon: Wine },
  { name: '配方库', href: '/recipes', icon: BookOpen },
  { name: '店面管理', href: '/venues', icon: Store },
  { name: '设置', href: '/settings', icon: SettingsIcon },
  { name: 'PDF调试', href: '/pdf-debug', icon: Bug },
];

export default function Layout() {
  const location = useLocation();
  const { setTheme, effectiveTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(effectiveTheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航栏 */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              🍸
            </div>
            <div>
              <h1 className="text-xl font-bold">Cocktail Menu Pro</h1>
              <p className="text-xs text-muted-foreground">调酒配方管理系统</p>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="touch-feedback"
          >
            {effectiveTheme === 'dark' ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>
        </div>
      </header>

      <div className="flex">
        {/* 侧边栏 */}
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 border-r bg-background md:block">
          <nav className="flex flex-col gap-1 p-4">
            {navigation.map((item) => {
              const isActive = location.pathname.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors touch-feedback',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* 主内容区 */}
        <main className="flex-1 overflow-auto">
          <div className="container p-6">
            <Outlet />
          </div>
        </main>
      </div>

      {/* 移动端底部导航 */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background md:hidden">
        <div className="flex justify-around p-2">
          {navigation.map((item) => {
            const isActive = location.pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-lg px-3 py-2 text-xs touch-feedback',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground'
                )}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
