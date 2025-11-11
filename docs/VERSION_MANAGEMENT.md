# 版本管理指南

## 如何更新版本号

本项目使用集中式版本管理，**只需要修改一个文件**即可更新所有地方的版本号。

### 更新步骤

1. **打开版本配置文件**
   ```
   src/config/version.ts
   ```

2. **修改版本号**
   ```typescript
   export const APP_VERSION = '2.0.0';  // 修改应用版本
   export const DB_VERSION = 7;         // 修改数据库版本（如果数据库结构有变化）
   ```

3. **更新版本历史**（可选但推荐）
   ```typescript
   export const VERSION_HISTORY = [
     { version: '2.1.0', dbVersion: 8, date: '2025-11-15', description: '新功能描述' },
     { version: '2.0.0', dbVersion: 7, date: '2025-11-11', description: '系统配置管理、场所管理重构' },
     // ...
   ];
   ```

4. **同步 package.json**（可选）
   如果需要，也可以更新 `package.json` 中的版本号以保持一致：
   ```json
   {
     "version": "2.0.0"
   }
   ```

### 自动应用的位置

修改 `src/config/version.ts` 后，以下位置会自动更新：

- ✅ **设置页面** - 显示应用版本和数据库版本
- ✅ **数据导出** - 导出的 JSON 文件中包含版本信息
- ✅ **其他使用版本号的地方** - 通过导入 `getAppVersion()` 和 `getDbVersion()` 函数

### 版本号规范

#### 应用版本号（APP_VERSION）
遵循语义化版本规范（Semantic Versioning）：
- **主版本号**：不兼容的 API 修改
- **次版本号**：向下兼容的功能性新增
- **修订号**：向下兼容的问题修正

示例：`2.0.0` → `2.1.0` → `2.1.1`

#### 数据库版本号（DB_VERSION）
- 必须与 `src/db/database.ts` 中的最新 `version()` 号一致
- 每次修改数据库结构时递增
- 示例：`version(7)` → `DB_VERSION = 7`

### 注意事项

⚠️ **重要**：
- 数据库版本号必须与 `database.ts` 中的版本号保持同步
- 发布新版本前，确保更新版本历史记录
- 不要在多个地方重复定义版本号

### 示例：发布新版本

假设要发布 2.1.0 版本，添加了新功能但没有修改数据库结构：

```typescript
// src/config/version.ts
export const APP_VERSION = '2.1.0';  // 从 2.0.0 更新到 2.1.0
export const DB_VERSION = 7;         // 数据库版本不变

export const VERSION_HISTORY = [
  { version: '2.1.0', dbVersion: 7, date: '2025-11-15', description: '添加批量导入功能' },
  { version: '2.0.0', dbVersion: 7, date: '2025-11-11', description: '系统配置管理、场所管理重构' },
  // ...
];
```

完成！所有使用版本号的地方都会自动更新。
