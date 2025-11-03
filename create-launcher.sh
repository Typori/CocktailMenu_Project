#!/bin/bash

# 创建 macOS 应用启动器
# 这个脚本会创建一个可以双击运行的 .app 应用

PROJECT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
APP_NAME="启动鸡尾酒菜单.app"
APP_PATH="$PROJECT_DIR/$APP_NAME"

echo "正在创建应用启动器..."

# 创建 .app 目录结构
mkdir -p "$APP_PATH/Contents/MacOS"
mkdir -p "$APP_PATH/Contents/Resources"

# 创建 Info.plist
cat > "$APP_PATH/Contents/Info.plist" << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>launcher</string>
    <key>CFBundleName</key>
    <string>鸡尾酒菜单</string>
    <key>CFBundleIconFile</key>
    <string>AppIcon</string>
    <key>CFBundleIdentifier</key>
    <string>com.cocktailmenu.launcher</string>
    <key>CFBundleVersion</key>
    <string>1.0</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
</dict>
</plist>
EOF

# 创建启动脚本
cat > "$APP_PATH/Contents/MacOS/launcher" << 'LAUNCHER_EOF'
#!/bin/bash

# 获取应用所在目录的父目录（项目根目录）
APP_DIR="$(dirname "$(dirname "$(dirname "$0")")")"
PROJECT_DIR="$APP_DIR"

# 打开终端并执行启动脚本
osascript <<EOF
tell application "Terminal"
    activate
    do script "cd '$PROJECT_DIR' && ./start-server.sh"
end tell
EOF
LAUNCHER_EOF

# 设置执行权限
chmod +x "$APP_PATH/Contents/MacOS/launcher"

# 创建一个简单的图标（使用 emoji）
# 注意：这需要 iconutil，如果想要更好的图标，可以手动替换
cat > "$APP_PATH/Contents/Resources/AppIcon.icns" << 'EOF'
🍸
EOF

echo ""
echo "✅ 应用启动器创建成功！"
echo ""
echo "📍 位置: $APP_PATH"
echo ""
echo "使用方法："
echo "  1. 双击 '$APP_NAME' 即可启动服务器"
echo "  2. 或者在终端运行: ./start-server.sh"
echo "  3. 你也可以把 .app 拖到 Dock 栏方便使用"
echo ""
echo "提示："
echo "  - 首次运行可能需要在系统设置中允许运行"
echo "  - 如果遇到权限问题，请运行: chmod +x start-server.sh"
echo ""
