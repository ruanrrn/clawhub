#!/bin/bash
# GPU 环境诊断脚本
# 用于检查 Vulkan + GPU 是否正确配置

echo "==================================="
echo "  GPU Anti-Detection 环境诊断"
echo "==================================="
echo ""

# 1. 检查 Vulkan 工具
echo "[1] 检查 Vulkan 工具..."
if command -v vulkaninfo &> /dev/null; then
    echo "✓ vulkaninfo 已安装"
else
    echo "✗ vulkaninfo 未安装"
    echo "   安装: sudo apt-get install vulkan-tools"
fi
echo ""

# 2. 检查 Vulkan 驱动
echo "[2] 检查 Vulkan 驱动..."
if command -v vulkaninfo &> /dev/null; then
    GPU_INFO=$(vulkaninfo --summary 2>&1 | grep -i "deviceName")
    if echo "$GPU_INFO" | grep -qi "llvmpipe"; then
        echo "✗ 只检测到 llvmpipe（软件渲染）"
        echo "   问题：GPU 驱动未正确安装"
    elif echo "$GPU_INFO" | grep -qiE "Intel|NVIDIA|AMD|GeForce|Radeon"; then
        echo "✓ 检测到硬件 GPU:"
        echo "$GPU_INFO" | sed 's/^/   /'
    else
        echo "⚠️  未检测到 GPU"
        echo "   输出: $GPU_INFO"
    fi
else
    echo "⊘ 跳过（vulkaninfo 未安装）"
fi
echo ""

# 3. 检查 DRI 设备
echo "[3] 检查 DRI 设备..."
if [ -d /dev/dri ]; then
    ls -la /dev/dri/ | grep -E "card|render"
    
    # 检查权限
    if [ -r /dev/dri/renderD128 ] 2>/dev/null; then
        echo "✓ renderD128 可读"
    else
        echo "✗ renderD128 无读权限"
        echo "   修复: sudo chmod 666 /dev/dri/*"
        echo "   或: sudo usermod -aG video,render $USER（需重新登录）"
    fi
else
    echo "✗ /dev/dri 不存在"
    echo "   问题：GPU 未正确加载"
fi
echo ""

# 4. 检查用户组
echo "[4] 检查用户组..."
GROUPS=$(groups)
if echo "$GROUPS" | grep -q "video"; then
    echo "✓ 用户在 video 组"
else
    echo "✗ 用户不在 video 组"
    echo "   修复: sudo usermod -aG video $USER"
fi

if echo "$GROUPS" | grep -q "render"; then
    echo "✓ 用户在 render 组"
else
    echo "✗ 用户不在 render 组"
    echo "   修复: sudo usermod -aG render $USER"
fi
echo ""

# 5. 检查 Mesa 驱动
echo "[5] 检查 Mesa 驱动..."
if dpkg -l | grep -q mesa-vulkan-drivers; then
    echo "✓ mesa-vulkan-drivers 已安装"
else
    echo "✗ mesa-vulkan-drivers 未安装"
    echo "   安装: sudo apt-get install mesa-vulkan-drivers"
fi
echo ""

# 6. 检查 GPU 类型特定驱动
echo "[6] 检查 GPU 专用驱动..."

# Intel
if lspci | grep -i vga | grep -qi intel; then
    echo "检测到 Intel GPU"
    if dpkg -l | grep -q intel-media-va-driver; then
        echo "✓ Intel 驱动已安装"
    else
        echo "⚠️  Intel 驱动未完全安装"
        echo "   推荐: sudo apt-get install intel-media-va-driver-non-free i965-va-driver"
    fi
fi

# NVIDIA
if lspci | grep -i vga | grep -qi nvidia; then
    echo "检测到 NVIDIA GPU"
    if dpkg -l | grep -q nvidia-driver; then
        echo "✓ NVIDIA 驱动已安装"
    else
        echo "⚠️  NVIDIA 驱动未安装"
        echo "   安装: sudo apt-get install nvidia-driver nvidia-vulkan-driver"
    fi
fi

# AMD
if lspci | grep -i vga | grep -qi amd; then
    echo "检测到 AMD GPU"
    if dpkg -l | grep -q mesa-vulkan-drivers; then
        echo "✓ AMD 驱动（Mesa）已安装"
    else
        echo "⚠️  AMD 驱动未安装"
        echo "   安装: sudo apt-get install mesa-vulkan-drivers"
    fi
fi
echo ""

# 7. 测试 Playwright + Vulkan
echo "[7] 测试 Playwright + Vulkan..."
if command -v node &> /dev/null; then
    cat > /tmp/gpu_test.js << 'ENDTEST'
const { chromium } = require('playwright');

(async () => {
  try {
    const browser = await chromium.launch({
      headless: true,
      channel: 'chrome',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--use-angle=vulkan',
        '--use-vulkan=native',
        '--enable-features=Vulkan',
        '--ignore-gpu-blocklist',
      ],
    });

    const context = await browser.newContext();
    const page = await context.newPage();
    
    const gpuInfo = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2');
      if (!gl) return { error: 'WebGL not available' };
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      return debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'N/A';
    });
    
    await browser.close();
    
    if (gpuInfo.includes('SwiftShader')) {
      console.log('✗ 使用 SwiftShader（软件渲染）');
      console.log('   ' + gpuInfo);
      process.exit(1);
    } else if (gpuInfo.includes('Intel') || gpuInfo.includes('NVIDIA') || gpuInfo.includes('AMD')) {
      console.log('✓ 使用硬件 GPU');
      console.log('   ' + gpuInfo);
      process.exit(0);
    } else {
      console.log('⚠️  未知渲染器');
      console.log('   ' + gpuInfo);
      process.exit(1);
    }
  } catch (e) {
    console.log('✗ 测试失败:', e.message);
    process.exit(1);
  }
})();
ENDTEST

    node /tmp/gpu_test.js
    TEST_RESULT=$?
    rm -f /tmp/gpu_test.js
    
    if [ $TEST_RESULT -eq 0 ]; then
        echo ""
        echo "==================================="
        echo "  ✓✓✓ 所有检查通过！ ✓✓✓"
        echo "  可以使用 GPU 反检测功能"
        echo "==================================="
    else
        echo ""
        echo "==================================="
        echo "  ✗ GPU 未正确配置"
        echo "  请根据上述提示修复问题"
        echo "==================================="
    fi
else
    echo "⊘ 跳过（Node.js 未安装）"
fi
echo ""

# 8. 总结和建议
echo "[8] 快速修复命令（如果有问题）..."
echo ""
echo "# 安装所有依赖（Debian/Ubuntu）"
echo "sudo apt-get update"
echo "sudo apt-get install -y mesa-vulkan-drivers vulkan-tools mesa-utils"
echo ""
echo "# Intel GPU"
echo "sudo apt-get install -y intel-media-va-driver-non-free i965-va-driver"
echo ""
echo "# NVIDIA GPU"
echo "sudo apt-get install -y nvidia-driver nvidia-vulkan-driver"
echo ""
echo "# 添加用户到组（需要重新登录）"
echo "sudo usermod -aG video,render $USER"
echo ""
echo "# 临时修复权限"
echo "sudo chmod 666 /dev/dri/*"
echo ""
