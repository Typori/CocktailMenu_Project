#!/bin/bash

# =========================================
# 鸡尾酒菜单项目启动脚本 (macOS/Linux)
# =========================================

# 获取脚本所在目录的项目根目录
PROJECT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../.." && pwd )"
cd "$PROJECT_DIR" || exit 1

echo "========================================="
echo "  🍸 鸡尾酒菜单管理系统"
echo "========================================="
echo ""
echo "📁 项目目录: $PROJECT_DIR"
echo ""

# 检查 Node.js 环境
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未找到Node.js"
    echo "请先安装Node.js: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js版本: $(node -v)"
echo "✅ npm版本: $(npm -v)"
echo ""

# 检查并安装依赖
if [ ! -d "node_modules" ]; then
    echo "⚠️  未检测到 node_modules 目录"
    echo "🔧 正在安装依赖..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ 依赖安装失败"
        exit 1
    fi
    echo ""
fi

# 检查依赖更新
if [ "package.json" -nt "node_modules/.package-lock.json" ] 2>/dev/null; then
    echo "📦 检测到依赖更新，正在重新安装..."
    npm install
    echo ""
fi

echo "🚀 正在启动开发服务器..."
echo ""
echo "提示："
echo "  - 服务器启动后会自动打开浏览器"
echo "  - 默认地址: http://localhost:5173"
echo "  - 按 Ctrl+C 可以停止服务器"
echo ""
echo "========================================="
echo ""

# 延迟打开浏览器
(sleep 5 && open http://localhost:5173) &

# 启动开发服务器
npm run dev