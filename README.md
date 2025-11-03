# 🍸 Cocktail Menu Pro

专业的调酒配方管理与成本核算工具

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.2-61dafb)](https://reactjs.org/)

## ✨ 核心特性

- 📝 **配方管理** - 创建、编辑、删除调酒配方，支持衍生配方
- 🍾 **原料库** - 管理原料价格、库存、酒精度
- 💰 **成本核算** - 自动计算配方成本和酒精度
- 📋 **菜单展示** - 精美的菜单展示，支持单页大字体模式
- 📦 **库存管理** - 实时库存追踪和低库存警告
- 📊 **数据分析** - 成本分析、利润统计
- 🌓 **暗黑模式** - 支持浅色/深色/自动主题
- 📱 **响应式设计** - 完美适配手机、平板、桌面

## 🚀 快速开始

### 一键启动（推荐）

双击项目根目录下的 **`启动服务器.command`** 文件即可！

### 使用命令行

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 访问 http://localhost:5173
```

### 构建生产版本

```bash
npm run build
npm run preview
```

## 📚 文档

完整文档请查看 **[docs/](./docs/)** 目录：

- **[快速启动](./docs/getting-started/quick-start.md)** - 详细的安装和使用指南
- **[功能详解](./docs/guides/features.md)** - 所有功能的详细说明
- **[更新日志](./docs/guides/changelog.md)** - 版本更新记录
- **[项目总览](./docs/development/overview.md)** - 项目架构和技术栈
- **[开发指南](./docs/development/development.md)** - 开发规范和扩展指南

## 📦 技术栈

- **前端框架**: React 18 + TypeScript
- **构建工具**: Vite
- **UI组件**: shadcn/ui + Tailwind CSS
- **数据库**: IndexedDB (Dexie.js)
- **路由**: React Router
- **图表**: Recharts
- **导出**: jsPDF + html2canvas

## 🎯 主要功能

### 配方管理
创建和管理调酒配方，支持配料列表、制作步骤、标签分类等。

### 成本核算
基于原料价格自动计算配方成本、酒精度和利润率。

### 库存管理
实时追踪原料库存，低库存自动警告，生成采购清单。

### 菜单展示
精美的菜单展示界面，支持列表/网格视图和单页大字体展示模式。

### 数据分析
查看成本统计、利润排行，导出JSON备份和PDF菜单。

## 🌟 特色功能

- **衍生配方** - 基于现有配方创建变体，保持父子关系
- **单页展示** - 大字体沉浸式阅读体验，左右滑动切换
- **智能计算** - 自动单位转换，实时成本和酒精度计算
- **完全本地** - 无需联网，数据存储在本地，完全私密

## 📱 界面预览

- 🎨 现代化APP风格界面
- 🌓 完整的暗黑模式支持
- 📱 响应式布局，完美适配各种设备
- 👆 流畅的触摸操作和动画效果

## 🤝 贡献

欢迎提交Issue和Pull Request！

## 📄 许可证

MIT License

---

Made with ❤️ for cocktail enthusiasts

**版本**: 1.0.0  
**最后更新**: 2025-11-01
