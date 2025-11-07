import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { VenueProvider } from '@/contexts/VenueContext';
import { db, initializeDefaultSettings, initializeSampleData } from '@/db/database';
import Layout from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import Ingredients from '@/pages/Ingredients';
import Inventory from '@/pages/Inventory';
import IngredientMaster from '@/pages/IngredientMaster';
import Recipes from '@/pages/Recipes';
import RecipeEditor from '@/pages/RecipeEditor';
import RecipeViewer from '@/pages/RecipeViewer';
import MenuDisplay from '@/pages/MenuDisplay';
import SingleRecipeView from '@/pages/SingleRecipeView';
import VenueManagement from '@/pages/VenueManagement';
import Analytics from '@/pages/Analytics';
import Settings from '@/pages/Settings';
import '@/utils/dbDebug'; // 加载数据库调试工具
import './App.css';

function App() {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      try {
        // 确保数据库已打开
        if (!db.isOpen()) {
          await db.open();
        }
        
        // 等待数据库完全就绪
        await db.transaction('rw', db.settings, async () => {
          await initializeDefaultSettings();
        });
        
        await db.transaction('rw', db.ingredients, db.tags, async () => {
          await initializeSampleData();
        });
        
        // 短暂延迟确保所有表都已就绪
        await new Promise(resolve => setTimeout(resolve, 100));
        
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize database:', error);
        // 即使出错也设置为已初始化，避免永久卡在加载页面
        setIsInitialized(true);
      }
    };

    initialize();
  }, []);

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">正在初始化...</p>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <VenueProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="ingredient-master" element={<IngredientMaster />} />
              {/* 备份页面 - 仅供开发和数据恢复使用 */}
              <Route path="ingredients" element={<Ingredients />} />
              <Route path="inventory" element={<Inventory />} />
              <Route path="recipes" element={<Recipes />} />
              <Route path="recipes/new" element={<RecipeEditor />} />
              <Route path="recipes/:id" element={<RecipeViewer />} />
              <Route path="recipes/:id/edit" element={<RecipeEditor />} />
              <Route path="menu" element={<MenuDisplay />} />
              <Route path="menu/:id" element={<SingleRecipeView />} />
              <Route path="venues" element={<VenueManagement />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Routes>
        </Router>
      </VenueProvider>
    </ThemeProvider>
  );
}

export default App;
