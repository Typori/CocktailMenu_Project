import { useState, useEffect } from 'react';

export interface NotificationSettings {
  lowStockAlert: boolean;
  lowStockThreshold: number; // 百分比，例如 20 表示低于20%时提醒
}

const DEFAULT_SETTINGS: NotificationSettings = {
  lowStockAlert: true,
  lowStockThreshold: 20,
};

export function useNotificationSettings() {
  const [settings, setSettings] = useState<NotificationSettings>(() => {
    const stored = localStorage.getItem('notificationSettings');
    return stored ? JSON.parse(stored) : DEFAULT_SETTINGS;
  });

  useEffect(() => {
    localStorage.setItem('notificationSettings', JSON.stringify(settings));
  }, [settings]);

  const updateSettings = (updates: Partial<NotificationSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  };

  return { settings, updateSettings };
}
