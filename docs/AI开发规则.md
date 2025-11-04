# Cocktail Menu Pro - AI 开发助手规则

> 本文档定义了 AI 助手在本项目中的工作原则和规范

## 📋 基本原则

### 语言规范
- **始终使用中文**与用户交流

### 工作模式
AI 助手在本项目中扮演智能开发助手角色，需要：
1. **理解需求**：准确理解用户的功能需求和问题
2. **分析方案**：基于项目现有架构提出解决方案
3. **实施开发**：编写符合项目规范的代码
4. **测试验证**：确保功能正常工作
5. **文档更新**：同步更新相关文档

---

## 🏗️ 项目理解

### 技术栈
```
前端框架: React 18 + TypeScript
构建工具: Vite 5
UI组件: shadcn/ui + Tailwind CSS
数据库: IndexedDB (Dexie.js)
路由: React Router 6
```

### 核心功能模块
1. **原料管理** - 库存、价格、单位管理
2. **配方管理** - 配方编辑、成本计算、酒精度计算
3. **酒单展示** - 多视图展示、筛选搜索
4. **上架酒款** - 多店面管理、价格设置
5. **数据分析** - 成本统计、利润分析

### 文档体系
```
docs/
├── AI开发规则.md                # AI助手工作规范（本文档）
├── 更新日志.md                  # 版本更新记录
├── 快速开始.md                  # 安装、启动和基本使用
├── 功能说明.md                  # 所有功能的详细介绍
└── 开发指南.md                  # 开发者完整指南
```

---

## 💻 开发规范

### 1. 代码质量要求

#### TypeScript 规范
```typescript
// ✅ 好的实践：明确的类型定义
interface Props {
  name: string;
  onSave: (data: Recipe) => void;
  isLoading?: boolean;
}

export function Component({ name, onSave, isLoading = false }: Props) {
  // ...
}

// ❌ 避免：使用 any 类型
export function Component(props: any) {
  // ...
}
```

#### React 组件规范
- 使用函数组件 + Hooks
- 避免使用 class 组件
- 使用 `useLiveQuery` 实现数据响应式更新

#### 样式规范
- 使用 Tailwind CSS
- 使用 `cn()` 工具函数合并类名
- 避免内联样式

### 2. 数据库操作规范

```typescript
// ✅ 使用 useLiveQuery 自动响应数据变化
const recipes = useLiveQuery(() => db.recipes.toArray());

// ✅ 使用 async/await
const handleSave = async () => {
  await db.recipes.add(newRecipe);
};

// ❌ 避免直接操作 DOM
```

### 3. 文件操作规范

**重要原则**：
- ✅ **必须先读取文件**再进行编辑
- ✅ 使用项目现有的工具函数和组件
- ❌ 避免重写整个文件（除非必要）
- ❌ 避免创建重复功能的文件

### 4. UI/UX 设计规范

#### 固定顶部设计模式

对于有滚动内容的页面，应遵循以下固定顶部设计原则：

**查看页面（Viewer）**：
```tsx
// 使用 sticky 定位固定标题和操作按钮
<div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b mb-6">
  <div className="max-w-5xl mx-auto py-3">
    <div className="flex items-center justify-between gap-4">
      {/* 返回按钮 + 标题 */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <Button variant="ghost" size="icon">
          <ArrowLeft />
        </Button>
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold truncate">标题</h2>
        </div>
      </div>
      {/* 操作按钮组 */}
      <div className="flex gap-2 shrink-0">
        <Button>收藏</Button>
        <Button>复制</Button>
        <Button>编辑</Button>
      </div>
    </div>
  </div>
</div>
```

**编辑页面（Editor）**：
```tsx
// 使用 fixed 定位固定保存按钮
<div className="fixed top-4 right-4 z-50">
  <Button className="shadow-lg">
    <Save className="mr-2 h-4 w-4" />
    保存
  </Button>
</div>
```

**设计要点**：
- ✅ 查看页面使用 `sticky` 定位，保持标题和操作按钮可见
- ✅ 编辑页面使用 `fixed` 定位保存按钮，方便随时保存
- ✅ 使用 `backdrop-blur` 和半透明背景提升视觉效果
- ✅ 使用 `truncate` 防止长标题溢出
- ✅ 使用 `shrink-0` 防止按钮被压缩
- ✅ 移动端响应式：使用 `hidden sm:inline` 隐藏按钮文字，只显示图标

#### 表单Enter键处理规范

为防止Enter键触发表单提交导致页面滚动，应遵循以下规范：

**Combobox组件**：
```tsx
// 在Command和CommandInput上都处理Enter键
const handleKeyDown = (e: React.KeyboardEvent) => {
  if (e.key === 'Enter') {
    e.preventDefault()
    e.stopPropagation() // 阻止事件冒泡
    // 选择第一个匹配项
  }
}

const handleInputKeyDown = (e: React.KeyboardEvent) => {
  if (e.key === 'Enter') {
    e.preventDefault()
    e.stopPropagation()
  }
}
```

**表单容器**：
```tsx
// 在表单容器上阻止Enter键默认行为
const handleFormKeyDown = (e: React.KeyboardEvent) => {
  if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
    e.preventDefault()
  }
}

<div onKeyDown={handleFormKeyDown}>
  {/* 表单内容 */}
</div>
```

---

## 🔄 开发工作流

### 添加新功能的标准流程

#### Step 1: 分析需求
1. 理解用户需求
2. 检查是否与现有功能冲突
3. 确定需要修改的文件

#### Step 2: 定义数据模型
```typescript
// src/types/index.ts
export interface NewFeature {
  id?: number;
  name: string;
  // ... 其他字段
}
```

#### Step 3: 扩展数据库（如需要）
```typescript
// src/db/database.ts
this.version(X).stores({
  // ... 现有表
  newFeatures: '++id, name, createdAt',
});
```

#### Step 4: 实现功能
- 创建或修改页面组件
- 实现业务逻辑
- 添加必要的工具函数

#### Step 5: 测试验证
- 在浏览器中测试功能
- 检查控制台是否有错误
- 验证数据库操作是否正确

#### Step 6: 更新文档
- 更新 `docs/更新日志.md`
- 如有新功能，更新 `docs/功能说明.md`
- 如影响开发流程，更新 `docs/开发指南.md`

### 修改现有功能的流程

1. **定位文件**：找到需要修改的组件/文件
2. **读取文件**：使用工具读取文件内容
3. **理解代码**：分析现有实现逻辑
4. **实施修改**：进行必要的代码修改
5. **测试验证**：确保修改不破坏现有功能
6. **更新文档**：同步更新相关文档

---

## 📝 文档维护规范

### 何时更新文档

#### 添加新功能时
1. **必须**更新 `docs/更新日志.md`（记录在对应版本下）
2. **必须**更新 `docs/功能说明.md`（添加功能说明）
3. 如影响开发流程，更新 `docs/开发指南.md`

#### 修改 API 时
1. **必须**更新 `docs/开发指南.md` 的 API 部分
2. 更新相关示例代码

#### 更改代码规范时
1. **必须**更新 `docs/开发指南.md` 的代码规范部分
2. 在 `docs/更新日志.md` 中记录变更

#### 修复 Bug 时
1. 在 `docs/更新日志.md` 的 "修复" 部分记录
2. 如果是重要 Bug，添加到本文档的 "经验教训" 部分

### 文档更新格式

#### CHANGELOG.md 格式
```markdown
## [版本号] - 日期

### 新增功能 ✨
- 功能描述

### 优化改进 🔧
- 改进描述

### 修复 🐛
- Bug 描述和修复方案

### 技术更新 🔨
- 技术变更描述
```

---

## ⚠️ 重要注意事项

### 开发前必读
1. **先读取文件**：编辑任何文件前必须先读取其内容
2. **检查依赖**：确认项目已安装的依赖，避免重复安装
3. **遵循规范**：严格遵循项目现有的代码风格和架构
4. **避免过度工程**：保持简单，不要过度设计

### 安全操作
1. **Git 操作**：使用 `-force` 参数前必须询问用户
2. **依赖安装**：发现安全漏洞时运行 `npm audit`
3. **数据库操作**：重大数据库变更前告知用户

### 沟通原则
1. **诚实**：不确定的事情明确告知用户
2. **清晰**：用简洁的语言解释技术问题
3. **主动**：发现问题主动提出解决方案
4. **谦虚**：承认不知道的内容，不要猜测

---

## 📚 经验教训

### 调试技巧
- 在程序输出中包含有用的调试信息
- 使用 Chrome DevTools 查看 IndexedDB 数据
- 使用 React DevTools 检查组件状态

### 常见陷阱
1. **损耗率计算**：默认损耗率应为 0%，不是 5%
2. **单位转换**：1 oz = 30 ml（调酒行业标准）
3. **数据库版本**：升级数据库版本时必须递增版本号
4. **文件编辑**：编辑前必须先读取文件最新内容

### 项目特定知识
- **项目名称**：Cocktail Menu Pro
- **当前版本**：1.0.0
- **数据库版本**：Version 2
- **Node.js 版本**：>= 16.0.0
- **包管理器**：npm

---

## 🎯 质量标准

### 代码质量
- ✅ TypeScript 类型完整
- ✅ 无 ESLint 错误
- ✅ 无控制台警告
- ✅ 响应式设计适配移动端

### 功能质量
- ✅ 功能正常工作
- ✅ 边界情况处理
- ✅ 错误提示友好
- ✅ 性能优化合理

### 文档质量
- ✅ CHANGELOG 更新及时
- ✅ 代码注释清晰（复杂逻辑）
- ✅ API 文档准确
- ✅ 示例代码可运行

---

## 🔗 参考资源

- [React 文档](https://react.dev/)
- [TypeScript 文档](https://www.typescriptlang.org/)
- [Dexie.js 文档](https://dexie.org/)
- [Tailwind CSS 文档](https://tailwindcss.com/)
- [shadcn/ui 文档](https://ui.shadcn.com/)

---

**最后更新**: 2025-11-03  
**适用版本**: Cocktail Menu Pro v1.0.0