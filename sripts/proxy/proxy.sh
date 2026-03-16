#!/bin/bash

# ============================================
# WSL2 v2rayN 代理管理脚本
# ============================================

# 配置文件路径
CONFIG_DIR="$HOME/.config/wsl-proxy"
CONFIG_FILE="$CONFIG_DIR/config"
AUTOSTART_FILE="$CONFIG_DIR/autostart.sh"
BASHRC_MARKER="# === WSL-PROXY-AUTOSTART ==="

# 默认端口
DEFAULT_HTTP_PORT=10811
DEFAULT_SOCKS_PORT=10810

# 颜色定义 (使用 ANSI 颜色代码，兼容性更好)
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# 图标定义 (使用 ASCII 字符，避免乱码)
ICON_OK="[OK]"
ICON_FAIL="[X]"
ICON_INFO="[i]"
ICON_WARN="[!]"
ICON_ARROW="->"

# 清屏并定位到顶部
clear_screen() {
    clear
}

# 初始化配置目录
init_config() {
    [[ -d "$CONFIG_DIR" ]] || mkdir -p "$CONFIG_DIR"
    if [[ ! -f "$CONFIG_FILE" ]]; then
        cat > "$CONFIG_FILE" << EOF
autostart=false
http_port=$DEFAULT_HTTP_PORT
socks_port=$DEFAULT_SOCKS_PORT
first_run=true
EOF
        # 标记首次运行
        FIRST_RUN=true
    fi
}

# 读取配置
read_config() {
    [[ -f "$CONFIG_FILE" ]] && source "$CONFIG_FILE"
    HTTP_PORT=${http_port:-$DEFAULT_HTTP_PORT}
    SOCKS_PORT=${socks_port:-$DEFAULT_SOCKS_PORT}
    FIRST_RUN=${first_run:-false}
}

# 保存配置
save_config() {
    cat > "$CONFIG_FILE" << EOF
autostart=${autostart:-false}
http_port=${HTTP_PORT:-$DEFAULT_HTTP_PORT}
socks_port=${SOCKS_PORT:-$DEFAULT_SOCKS_PORT}
first_run=${FIRST_RUN:-false}
EOF
}

# 显示首次使用说明
show_first_run_guide() {
    clear_screen
    echo ""
    echo -e "${BOLD}========================================${NC}"
    echo -e "${BOLD}     WSL2 v2rayN 代理管理工具${NC}"
    echo -e "${BOLD}========================================${NC}"
    echo ""
    echo -e "${YELLOW}${ICON_WARN} 首次使用配置指南${NC}"
    echo ""
    echo -e "${BOLD}1. Windows 端 v2rayN 配置要求：${NC}"
    echo ""
    echo "   在 Windows 的 v2rayN 客户端中，必须开启"
    echo "   \"允许来自局域网的连接\" (Allow LAN)："
    echo ""
    echo "   设置路径："
    echo "   v2rayN 主界面 -> 设置 (Settings) -> 参数设置"
    echo "   -> v2rayN 设置 -> 勾选 \"允许来自局域网的连接\""
    echo ""
    echo -e "${CYAN}   当前脚本端口配置：${NC}"
    echo -e "${CYAN}   - HTTP 代理端口:  $HTTP_PORT${NC}"
    echo -e "${CYAN}   - SOCKS5 代理端口: $SOCKS_PORT${NC}"
    echo ""
    echo -e "${YELLOW}   请确保 v2rayN 中的端口与上述配置一致！${NC}"
    echo ""
    echo -e "${BOLD}2. 验证连接：${NC}"
    echo "   开启代理后，可以运行以下命令测试："
    echo "   curl -I https://www.google.com"
    echo ""
    echo -e "${BOLD}3. 防火墙提示：${NC}"
    echo "   如果无法连接，请检查 Windows 防火墙"
    echo "   是否允许 v2rayN 通过防火墙"
    echo ""
    echo -e "${GREEN}按 Enter 键继续...${NC}"
    read
    echo ""
    
    # 标记已阅读首次使用说明
    FIRST_RUN=false
    save_config
}

# 获取宿主机 IP
get_host_ip() {
    ip route | grep default | awk '{print $3}'
}

# 刷新代理 IP
refresh_proxy() {
    read_config
    export HOST_IP=$(get_host_ip)
    export HTTP_PROXY="http://$HOST_IP:$HTTP_PORT"
    export HTTPS_PROXY="http://$HOST_IP:$HTTP_PORT"
    export ALL_PROXY="socks5://$HOST_IP:$SOCKS_PORT"
}

# 检查代理是否已开启
is_proxy_on() {
    [[ -n "$HTTP_PROXY" ]] && return 0 || return 1
}

# 检查开机自启是否开启
is_autostart_on() {
    [[ -f "$CONFIG_FILE" ]] && source "$CONFIG_FILE" && [[ "$autostart" == "true" ]] && return 0 || return 1
}

# 测试网络连通性
test_connectivity() {
    clear_screen
    echo ""
    echo "----------------------------------------"
    echo "         网络连通性测试"
    echo "----------------------------------------"
    
    # 保存当前代理状态（用于后续恢复）
    local old_http_proxy="$HTTP_PROXY"
    local old_https_proxy="$HTTPS_PROXY"
    local old_all_proxy="$ALL_PROXY"
    
    # 测试 1：真正直连（不经过代理，临时清除代理变量）
    echo -e "${CYAN}测试 1: 直连 www.google.com (不经过代理)${NC}"
    
    # 临时清除代理环境变量，确保真正直连
    unset HTTP_PROXY HTTPS_PROXY ALL_PROXY
    
    local direct_result=$(curl -s -o /dev/null -w "%{http_code},%{time_total}" --max-time 10 https://www.google.com 2>/dev/null)
    local direct_code=$(echo "$direct_result" | cut -d',' -f1)
    local direct_time=$(echo "$direct_result" | cut -d',' -f2)
    
    if [[ "$direct_code" == "200" ]]; then
        echo -e "  ${GREEN}${ICON_OK} 连通成功${NC} - 延迟: ${direct_time}s"
        echo "  (说明：当前网络可以直接访问国际互联网)"
    else
        echo -e "  ${RED}${ICON_FAIL} 连接失败${NC} (HTTP $direct_code)"
        echo "  (说明：当前网络无法直接访问国际互联网，需要代理)"
    fi
    
    echo ""
    
    # 测试 2：通过代理连接（恢复代理变量）
    if [[ -n "$old_http_proxy" ]]; then
        echo -e "${CYAN}测试 2: 通过代理连接 www.google.com${NC}"
        echo "  代理: $old_http_proxy"
        
        # 恢复代理环境变量
        export HTTP_PROXY="$old_http_proxy"
        export HTTPS_PROXY="$old_https_proxy"
        export ALL_PROXY="$old_all_proxy"
        
        local proxy_result=$(curl -s -o /dev/null -w "%{http_code},%{time_total}" --max-time 10 https://www.google.com 2>/dev/null)
        local proxy_code=$(echo "$proxy_result" | cut -d',' -f1)
        local proxy_time=$(echo "$proxy_result" | cut -d',' -f2)
        
        if [[ "$proxy_code" == "200" ]]; then
            echo -e "  ${GREEN}${ICON_OK} 代理连通成功${NC} - 延迟: ${proxy_time}s"
            
            # 对比直连和代理的速度
            if [[ "$direct_code" == "200" ]]; then
                echo ""
                echo "  对比分析:"
                echo "  - 直连和代理均可使用"
                # 简单比较延迟（注意：direct_time 和 proxy_time 是字符串，需要转换为数字比较）
                if (( $(echo "$direct_time < $proxy_time" | bc -l 2>/dev/null || echo "0") )); then
                    echo "  - 直连延迟 (${direct_time}s) 优于代理 (${proxy_time}s)"
                else
                    echo "  - 代理延迟 (${proxy_time}s) 优于或等于直连 (${direct_time}s)"
                fi
            fi
        else
            echo -e "  ${RED}${ICON_FAIL} 代理连接失败${NC} (HTTP $proxy_code)"
            echo -e "  ${YELLOW}${ICON_WARN} 请检查：${NC}"
            echo "    1. v2rayN 是否已启动"
            echo "    2. 是否开启 \"允许来自局域网的连接\""
            echo "    3. 端口配置是否正确 (当前: HTTP=$HTTP_PORT, SOCKS=$SOCKS_PORT)"
            echo "    4. Windows 防火墙设置"
            echo "    5. 运行 './proxy.sh status' 查看当前代理配置"
        fi
    else
        echo -e "${YELLOW}${ICON_WARN} 代理未开启，跳过代理测试${NC}"
        echo "  提示: 开启代理后可测试代理连通性"
        echo "  运行 './proxy.sh on' 开启代理"
    fi
    
    echo "----------------------------------------"
    echo ""
    echo "按 Enter 键返回主菜单..."
    read
}

# 开启代理
proxy_on() {
    refresh_proxy
    echo ""
    echo -e "${GREEN}${ICON_OK} 代理已开启${NC}"
    echo "   HTTP_PROXY:  $HTTP_PROXY"
    echo "   SOCKS5:      $ALL_PROXY"
    echo "   HOST_IP:     $HOST_IP"
}

# 关闭代理
proxy_off() {
    unset HTTP_PROXY HTTPS_PROXY ALL_PROXY HOST_IP
    echo ""
    echo -e "${RED}${ICON_FAIL} 代理已关闭${NC}"
}

# 显示代理状态（用于主界面）
show_status() {
    read_config
    echo ""
    echo "----------------------------------------"
    echo "           代理状态"
    echo "----------------------------------------"
    
    if is_proxy_on; then
        echo -e "${GREEN}${ICON_OK} 代理状态: 开启${NC}"
        echo "   HTTP_PROXY:  $HTTP_PROXY"
        echo "   HTTPS_PROXY: $HTTPS_PROXY"
        echo "   ALL_PROXY:   $ALL_PROXY"
    else
        echo -e "${RED}${ICON_FAIL} 代理状态: 关闭${NC}"
    fi
    
    echo ""
    echo "端口配置:"
    echo "   HTTP 端口:   $HTTP_PORT"
    echo "   SOCKS 端口:  $SOCKS_PORT"
    echo ""
    
    if is_autostart_on; then
        echo -e "${GREEN}${ICON_OK} 开机自启: 开启${NC}"
    else
        echo -e "${RED}${ICON_FAIL} 开机自启: 关闭${NC}"
    fi
    
    echo "----------------------------------------"
    echo ""
}

# 切换代理状态
toggle_proxy() {
    if is_proxy_on; then
        proxy_off
    else
        proxy_on
    fi
}

# 修改端口配置
change_ports() {
    clear_screen
    read_config
    
    echo ""
    echo "当前端口配置:"
    echo "   HTTP 端口:  $HTTP_PORT"
    echo "   SOCKS 端口: $SOCKS_PORT"
    echo ""
    
    read -p "请输入新的 HTTP 端口 (直接回车保持 $HTTP_PORT): " new_http
    read -p "请输入新的 SOCKS 端口 (直接回车保持 $SOCKS_PORT): " new_socks
    
    # 更新端口
    [[ -n "$new_http" ]] && HTTP_PORT=$new_http
    [[ -n "$new_socks" ]] && SOCKS_PORT=$new_socks
    
    # 保存配置
    save_config
    
    echo ""
    echo -e "${GREEN}${ICON_OK} 端口已更新:${NC}"
    echo "   HTTP 端口:  $HTTP_PORT"
    echo "   SOCKS 端口: $SOCKS_PORT"
    echo ""
    
    # 如果代理正在运行，提示刷新
    if is_proxy_on; then
        echo -e "${YELLOW}${ICON_WARN} 代理正在运行，请刷新代理以应用新端口${NC}"
        read -p "是否立即刷新? [Y/n]: " refresh
        [[ "$refresh" != "n" && "$refresh" != "N" ]] && refresh_proxy && echo -e "${GREEN}${ICON_OK} 代理已刷新${NC}"
    fi
    
    echo ""
    echo "按 Enter 键返回主菜单..."
    read
}

# 启用开机自启
enable_autostart() {
    read_config
    
    # 创建 autostart 脚本
    cat > "$AUTOSTART_FILE" << EOF
#!/bin/bash
# WSL-PROXY 开机自启脚本
export HOST_IP=\$(ip route | grep default | awk '{print \$3}')
export HTTP_PROXY="http://\$HOST_IP:$HTTP_PORT"
export HTTPS_PROXY="http://\$HOST_IP:$HTTP_PORT"
export ALL_PROXY="socks5://\$HOST_IP:$SOCKS_PORT"
EOF
    chmod +x "$AUTOSTART_FILE"
    
    # 添加到 ~/.bashrc（如果不存在）
    if ! grep -q "$BASHRC_MARKER" ~/.bashrc 2>/dev/null; then
        cat >> ~/.bashrc << EOF

$BASHRC_MARKER
# WSL-PROXY 自动启动
[[ -f "$AUTOSTART_FILE" ]] && source "$AUTOSTART_FILE"
$BASHRC_MARKER
EOF
    fi
    
    # 更新配置
    autostart=true
    save_config
    echo -e "${GREEN}${ICON_OK} 开机自启已开启${NC}"
}

# 禁用开机自启
disable_autostart() {
    # 从 ~/.bashrc 移除
    if grep -q "$BASHRC_MARKER" ~/.bashrc 2>/dev/null; then
        sed -i "/$BASHRC_MARKER/,/$BASHRC_MARKER/d" ~/.bashrc
    fi
    
    # 删除 autostart 脚本
    [[ -f "$AUTOSTART_FILE" ]] && rm "$AUTOSTART_FILE"
    
    # 更新配置
    autostart=false
    save_config
    echo -e "${RED}${ICON_FAIL} 开机自启已关闭${NC}"
}

# 切换开机自启状态
toggle_autostart() {
    if is_autostart_on; then
        disable_autostart
    else
        enable_autostart
    fi
}

# 显示交互式菜单（清屏后显示）
show_menu() {
    clear_screen
    echo ""
    echo "========================================"
    echo "        WSL2 代理管理工具"
    echo "========================================"
    echo ""
    
    # 先显示状态
    if is_proxy_on; then
        echo -e "${GREEN}${ICON_OK} 代理: 开启${NC} | HTTP: $HTTP_PROXY"
    else
        echo -e "${RED}${ICON_FAIL} 代理: 关闭${NC}"
    fi
    
    if is_autostart_on; then
        echo -e "${GREEN}${ICON_OK} 自启: 开启${NC}"
    else
        echo -e "${RED}${ICON_FAIL} 自启: 关闭${NC}"
    fi
    echo " 端口: HTTP=$HTTP_PORT, SOCKS=$SOCKS_PORT"
    echo ""
    echo "----------------------------------------"
    echo ""
    
    # 菜单项 1：切换代理状态
    if is_proxy_on; then
        echo -e "  1. ${RED}关闭代理${NC}"
    else
        echo -e "  1. ${GREEN}开启代理${NC}"
    fi
    
    # 菜单项 2：切换开机自启
    if is_autostart_on; then
        echo -e "  2. ${RED}关闭开机自启${NC}"
    else
        echo -e "  2. ${GREEN}开启开机自启${NC}"
    fi
    
    # 菜单项 3-6
    echo "  3. 修改端口配置"
    echo "  4. 刷新代理 IP"
    echo "  5. 测试网络连通性"
    echo "  6. 退出程序"
    echo ""
    echo "----------------------------------------"
}

# 主循环
main() {
    init_config
    read_config
    
    # 首次运行显示说明
    if [[ "$FIRST_RUN" == "true" ]]; then
        show_first_run_guide
    fi
    
    while true; do
        show_menu
        
        read -p "请选择操作 [1-6]: " choice
        
        case "$choice" in
            1)
                toggle_proxy
                ;;
            2)
                toggle_autostart
                ;;
            3)
                change_ports
                ;;
            4)
                refresh_proxy
                echo ""
                echo -e "${GREEN}${ICON_OK} 代理 IP 已刷新: $HOST_IP${NC}"
                echo ""
                echo "按 Enter 键继续..."
                read
                ;;
            5)
                test_connectivity
                ;;
            6)
                clear_screen
                echo "再见！"
                exit 0
                ;;
            *)
                echo ""
                echo -e "${RED}${ICON_FAIL} 无效选择，请重试${NC}"
                echo ""
                echo "按 Enter 键继续..."
                read
                ;;
        esac
    done
}

# 快捷命令处理
case "$1" in
    on)
        init_config
        read_config
        [[ "$FIRST_RUN" == "true" ]] && show_first_run_guide
        proxy_on
        ;;
    off)
        proxy_off
        ;;
    status)
        init_config
        read_config
        [[ "$FIRST_RUN" == "true" ]] && show_first_run_guide
        refresh_proxy
        show_status
        ;;
    refresh)
        refresh_proxy
        echo -e "${GREEN}${ICON_OK} 代理 IP 已刷新: $HOST_IP${NC}"
        ;;
    port|ports)
        init_config
        read_config
        [[ "$FIRST_RUN" == "true" ]] && show_first_run_guide
        change_ports
        ;;
    test)
        init_config
        read_config
        test_connectivity
        ;;
    *)
        main
        ;;
esac
