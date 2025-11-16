# =========================================
# 鸡尾酒菜单项目启动脚本 (PowerShell)
# =========================================

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# 切换到项目根目录
$PROJECT_DIR = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $PROJECT_DIR

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  🍸 鸡尾酒菜单管理系统" -ForegroundColor Yellow
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📁 项目目录: $PROJECT_DIR" -ForegroundColor Green
Write-Host ""

# 检查 Node.js 环境
try {
    $nodeVersion = node --version 2>$null
    $npmVersion = npm --version 2>$null
    Write-Host "✅ Node.js 版本: $nodeVersion" -ForegroundColor Green
    Write-Host "✅ npm 版本: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ 错误：未检测到 Node.js" -ForegroundColor Red
    Write-Host "请先安装 Node.js: https://nodejs.org/" -ForegroundColor Yellow
    Read-Host "按任意键退出"
    exit 1
}

Write-Host ""

# 检查并安装依赖
if (-not (Test-Path "node_modules")) {
    Write-Host "⚠️  未检测到 node_modules 目录" -ForegroundColor Yellow
    Write-Host "🔧 正在安装依赖..." -ForegroundColor Cyan
    try {
        npm install
        if ($LASTEXITCODE -ne 0) {
            throw "npm install failed"
        }
    } catch {
        Write-Host "❌ 依赖安装失败" -ForegroundColor Red
        Read-Host "按任意键退出"
        exit 1
    }
    Write-Host ""
}

# 检查依赖更新
if ((Test-Path "package.json") -and (Test-Path "node_modules")) {
    $packageTime = (Get-Item "package.json").LastWriteTime
    $nodeModulesTime = (Get-Item "node_modules").LastWriteTime
    
    if ($packageTime -gt $nodeModulesTime) {
        Write-Host "📦 检测到依赖更新，正在重新安装..." -ForegroundColor Cyan
        npm install
        Write-Host ""
    }
}

Write-Host "🚀 正在启动开发服务器..." -ForegroundColor Green
Write-Host ""
Write-Host "提示：" -ForegroundColor Yellow
Write-Host "  - 服务器启动后会自动打开浏览器" -ForegroundColor Gray
Write-Host "  - 默认地址: http://localhost:5173" -ForegroundColor Gray
Write-Host "  - 按 Ctrl+C 可以停止服务器" -ForegroundColor Gray
Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# 延迟打开浏览器
Start-Job -ScriptBlock {
    Start-Sleep -Seconds 5
    Start-Process "http://localhost:5173"
} | Out-Null

# 启动开发服务器
try {
    npm run dev
} catch {
    Write-Host ""
    Write-Host "❌ 启动失败" -ForegroundColor Red
    Write-Host "请检查项目配置和依赖是否正确安装" -ForegroundColor Yellow
} finally {
    Write-Host ""
    Read-Host "按任意键退出"
}