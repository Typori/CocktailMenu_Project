/**
 * 应用版本配置
 * 
 * 这是项目中唯一需要手动更新版本号的地方
 * 其他所有地方都会自动从这里读取
 */

export const APP_VERSION = '2.0.0';
export const DB_VERSION = 7; // 对应 database.ts 中的最新版本号

/**
 * 版本历史记录
 */
export const VERSION_HISTORY = [
  { version: '2.0.0', dbVersion: 7, date: '2025-11-11', description: '系统配置管理、场所管理重构' },
  { version: '1.0.0', dbVersion: 6, date: '2024-12-01', description: '初始版本' },
];

/**
 * 获取应用版本
 */
export function getAppVersion(): string {
  return APP_VERSION;
}

/**
 * 获取数据库版本
 */
export function getDbVersion(): number {
  return DB_VERSION;
}

/**
 * 获取完整版本信息
 */
export function getVersionInfo() {
  return {
    appVersion: APP_VERSION,
    dbVersion: DB_VERSION,
    buildDate: new Date().toISOString(),
  };
}
