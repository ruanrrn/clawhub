#!/bin/bash
# 微信公众号抓取环境检查脚本
# 检查所有必要的依赖和配置

set -e

echo "🔍 微信公众号抓取环境检查"
echo "======================================"
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_passed=0
check_failed=0
check_warning=0

# 检查函数
check_command() {
    if command -v "$1" &> /dev/null; then
        echo -e "${GREEN}✓${NC} $2"
        ((check_passed++))
        return 0
    else
        echo -e "${RED}✗${NC} $2"
        ((check_failed++))
        return 1
    fi
}

check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $2"
        ((check_passed++))
        return 0
    else
        echo -e "${RED}✗${NC} $2"
        ((check_failed++))
        return 1
    fi
}

check_optional() {
    if command -v "$1" &> /dev/null; then
        echo -e "${GREEN}✓${NC} $2 (可选)"
        ((check_passed++))
        return 0
    else
        echo -e "${YELLOW}⚠${NC} $2 (可选，未安装)"
        ((check_warning++))
        return 1
    fi
}

# 1. 检查 Vulkan 驱动（关键！）
echo "1. 检查 Vulkan 驱动"
echo "-----------------------------------"
if command -v vulkaninfo &> /dev/null; then
    if vulkaninfo --summary 2>&1 | grep -q "deviceName"; then
        device_name=$(vulkaninfo --summary 2>&1 | grep "deviceName" | head -1 | awk -F'=' '{print $2}' | xargs)
        echo -e "${GREEN}✓${NC} Vulkan 驱动已安装"
        echo "  GPU: $device_name"
        ((check_passed++))
    else
        echo -e "${RED}✗${NC} Vulkan 驱动未正确配置"
        echo "  修复: sudo apt-get install mesa-vulkan-drivers vulkan-tools"
        ((check_failed++))
    fi
else
    echo -e "${RED}✗${NC} vulkaninfo 未找到"
    echo "  修复: sudo apt-get install vulkan-tools"
    ((check_failed++))
fi
echo ""

# 2. 检查 Chrome
echo "2. 检查 Google Chrome"
echo "-----------------------------------"
if command -v google-chrome &> /dev/null; then
    chrome_version=$(google-chrome --version 2>&1)
    echo -e "${GREEN}✓${NC} Chrome 已安装"
    echo "  版本: $chrome_version"
    ((check_passed++))
elif command -v chromium &> /dev/null; then
    chromium_version=$(chromium --version 2>&1)
    echo -e "${YELLOW}⚠${NC} 使用 Chromium (建议使用 Google Chrome)"
    echo "  版本: $chromium_version"
    ((check_warning++))
else
    echo -e "${RED}✗${NC} Chrome/Chromium 未安装"
    echo "  修复: wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb"
    echo "        sudo apt install ./google-chrome-stable_current_amd64.deb"
    ((check_failed++))
fi
echo ""

# 3. 检查 Node.js + Playwright
echo "3. 检查 Node.js + Playwright"
echo "-----------------------------------"
check_command "node" "Node.js 已安装"
if command -v node &> /dev/null; then
    node_version=$(node --version)
    echo "  版本: $node_version"
fi

check_command "npm" "npm 已安装"

if command -v npx &> /dev/null; then
    if npx playwright --version &> /dev/null 2>&1; then
        playwright_version=$(npx playwright --version 2>&1)
        echo -e "${GREEN}✓${NC} Playwright 已安装"
        echo "  版本: $playwright_version"
        ((check_passed++))
    else
        echo -e "${RED}✗${NC} Playwright 未安装"
        echo "  修复: npm install playwright"
        echo "        npx playwright install chrome"
        ((check_failed++))
    fi
else
    echo -e "${RED}✗${NC} npx 未找到"
    ((check_failed++))
fi
echo ""

# 4. 检查 Python + Playwright (可选)
echo "4. 检查 Python + Playwright (可选)"
echo "-----------------------------------"
check_optional "python3" "Python3 已安装"
if command -v python3 &> /dev/null; then
    python_version=$(python3 --version)
    echo "  版本: $python_version"
    
    if python3 -c "import playwright" 2> /dev/null; then
        echo -e "${GREEN}✓${NC} Playwright Python 包已安装"
        ((check_passed++))
    else
        echo -e "${YELLOW}⚠${NC} Playwright Python 包未安装"
        echo "  修复: pip install playwright"
        echo "        playwright install chrome"
        ((check_warning++))
    fi
fi
echo ""

# 5. 检查中文字体 (可选)
echo "5. 检查中文字体 (可选)"
echo "-----------------------------------"
if fc-list :lang=zh | grep -q "Noto"; then
    echo -e "${GREEN}✓${NC} Noto 中文字体已安装"
    ((check_passed++))
elif fc-list :lang=zh | grep -q "."; then
    echo -e "${YELLOW}⚠${NC} 有中文字体，但不是 Noto（建议安装）"
    echo "  修复: sudo apt-get install fonts-noto-cjk"
    ((check_warning++))
else
    echo -e "${YELLOW}⚠${NC} 未检测到中文字体（截图可能显示方框）"
    echo "  修复: sudo apt-get install fonts-noto-cjk fonts-wqy-zenhei"
    ((check_warning++))
fi
echo ""

# 6. 测试 Chrome + Vulkan
echo "6. 测试 Chrome + Vulkan"
echo "-----------------------------------"
if command -v google-chrome &> /dev/null; then
    if google-chrome --headless --disable-gpu --dump-dom about:blank &> /dev/null; then
        echo -e "${GREEN}✓${NC} Chrome 可以无头模式运行"
        ((check_passed++))
    else
        echo -e "${RED}✗${NC} Chrome 无头模式运行失败"
        ((check_failed++))
    fi
    
    # 测试 Vulkan
    if google-chrome --headless --use-angle=vulkan --use-vulkan=native --disable-gpu --dump-dom about:blank &> /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Chrome 可以使用 Vulkan"
        ((check_passed++))
    else
        echo -e "${YELLOW}⚠${NC} Chrome Vulkan 测试失败（可能正常，需实际测试）"
        ((check_warning++))
    fi
else
    echo -e "${YELLOW}⚠${NC} 跳过（Chrome 未安装）"
    ((check_warning++))
fi
echo ""

# 总结
echo "======================================"
echo "📊 检查结果"
echo "======================================"
echo -e "${GREEN}通过:${NC} $check_passed"
echo -e "${RED}失败:${NC} $check_failed"
echo -e "${YELLOW}警告:${NC} $check_warning"
echo ""

if [ $check_failed -eq 0 ]; then
    echo -e "${GREEN}✓ 环境检查通过！可以开始抓取微信公众号文章。${NC}"
    echo ""
    echo "快速测试:"
    echo "  node scripts/fetch_article.js \"https://mp.weixin.qq.com/s/xxxxx\""
    exit 0
else
    echo -e "${RED}✗ 环境检查失败，请先修复上述问题。${NC}"
    echo ""
    echo "快速修复命令:"
    echo "  sudo apt-get update"
    echo "  sudo apt-get install mesa-vulkan-drivers vulkan-tools"
    echo "  wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb"
    echo "  sudo apt install ./google-chrome-stable_current_amd64.deb"
    echo "  npm install playwright"
    echo "  npx playwright install chrome"
    exit 1
fi
