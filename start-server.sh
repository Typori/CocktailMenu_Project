#!/bin/bash

# 鸡尾酒菜单项目启动脚本
# 作用：自动切换到项目目录并启动开发服务器

# 获取脚本所在目录（项目根目录）
PROJECT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# 切换到项目目录
cd "$PROJECT_DIR" || exit 1

echo "========================================="
echo "  🍸 鸡尾酒菜单管理系统"
echo "========================================="
echo ""
echo "📁 项目目录: $PROJECT_DIR"
echo ""

# 检查 node_modules 是否存在
if [ ! -d "node_modules" ]; then
    echo "⚠️  未检测到 node_modules 目录"
    echo "🔧 正在安装依赖..."
    npm install
    echo ""
fi

# 检查是否有 package-lock.json 更新
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

# 在后台等待3秒后自动打开浏览器
(sleep 3 && open http://localhost:5173) &

# 启动开发服务器
npm run dev
