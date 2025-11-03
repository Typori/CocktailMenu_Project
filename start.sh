#!/bin/bash

# Cocktail Menu Pro - 启动脚本

echo "🍸 Cocktail Menu Pro - 调酒配方管理系统"
echo "=========================================="
echo ""

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未找到Node.js"
    echo "请先安装Node.js: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js版本: $(node -v)"
echo "✅ npm版本: $(npm -v)"
echo ""

# 检查依赖
if [ ! -d "node_modules" ]; then
    echo "📦 正在安装依赖..."
    npm install
    echo ""
fi

# 启动开发服务器
echo "🚀 启动开发服务器..."
echo ""
echo "访问地址: http://localhost:5173"
echo "按 Ctrl+C 停止服务器"
echo ""

npm run dev
