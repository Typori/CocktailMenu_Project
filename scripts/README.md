# 脚本目录说明

本目录包含项目的所有辅助脚本和工具。

## 📁 目录结构

```
scripts/
├── launchers/          # 启动脚本
│   ├── start-windows.bat    # Windows 批处理启动脚本
│   ├── start-windows.ps1    # Windows PowerShell 启动脚本
│   └── start-macos.sh       # macOS/Linux 启动脚本
└── setup/              # 设置和配置脚本
    ├── init-system-configs.js  # 系统配置初始化脚本
    └── README.md               # 设置脚本说明
```

## 🚀 启动脚本

### Windows 用户
- **`start-windows.bat`** - 推荐使用，功能完整的批处理脚本
- **`start-windows.ps1`** - PowerShell 版本，界面更美观，支持彩色输出

### macOS/Linux 用户
- **`start-macos.sh`** - 适用于 macOS 和 Linux 系统

### 功能特点
- ✅ 自动检测 Node.js 环境
- ✅ 自动安装缺失的依赖
- ✅ 检测依赖更新并重新安装
- ✅ 自动打开浏览器
- ✅ 友好的中文提示界面
- ✅ 错误处理和状态显示

## 🛠️ 设置脚本

### init-system-configs.js
系统配置初始化脚本，用于在浏览器中初始化系统基础数据。

详细说明请查看 `setup/README.md`。

## 📝 使用说明

1. **快速启动**: 直接双击根目录的 `start.bat` 文件
2. **完整功能**: 运行 `scripts/launchers/` 目录下对应系统的脚本
3. **系统配置**: 按需运行 `scripts/setup/` 目录下的配置脚本

## 🔧 维护说明

- 所有脚本都支持相对路径，可以从任意位置运行
- 脚本会自动切换到项目根目录
- 包含完整的错误检查和用户友好的提示信息