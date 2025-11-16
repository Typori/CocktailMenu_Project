@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

REM =========================================
REM 鸡尾酒菜单项目启动脚本 (Windows)
REM =========================================

cd /d "%~dp0\..\..\"

echo =========================================
echo   🍸 鸡尾酒菜单管理系统
echo =========================================
echo.
echo 📁 项目目录: %CD%
echo.

REM 检查 Node.js 环境
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ 错误：未检测到 Node.js
    echo 请先安装 Node.js: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

REM 显示版本信息
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
echo ✅ Node.js 版本: %NODE_VERSION%
echo ✅ npm 版本: %NPM_VERSION%
echo.

REM 检查并安装依赖
if not exist "node_modules" (
    echo ⚠️  未检测到 node_modules 目录
    echo 🔧 正在安装依赖...
    call npm install
    if %errorlevel% neq 0 (
        echo ❌ 依赖安装失败
        pause
        exit /b 1
    )
    echo.
)

REM 检查 package.json 更新
if exist "package.json" if exist "node_modules" (
    for %%i in (package.json) do set PACKAGE_TIME=%%~ti
    for %%i in (node_modules) do set MODULES_TIME=%%~ti
    REM 简化检查，如果需要可以手动重新安装
)

echo 🚀 正在启动开发服务器...
echo.
echo 提示：
echo   - 服务器启动后会自动打开浏览器
echo   - 默认地址: http://localhost:5173
echo   - 按 Ctrl+C 可以停止服务器
echo.
echo =========================================
echo.

REM 延迟打开浏览器
start "" cmd /c "timeout /t 5 /nobreak >nul && start http://localhost:5173"

REM 启动开发服务器
call npm run dev

if %errorlevel% neq 0 (
    echo.
    echo ❌ 启动失败，请检查项目配置
    pause
)