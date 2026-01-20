import os
import subprocess
import platform


def set_mac_proxy(enable=True, host="127.0.0.1", port=8080):
    """
    设置或管理 macOS 系统代理 (Wi-Fi 接口)
    """
    if platform.system() != "Darwin":
        return False

    state = "on" if enable else "off"
    try:
        # 获取活动的内网接口，通常是 Wi-Fi
        # 简单起见，这里假设是 Wi-Fi
        interface = "Wi-Fi"

        if enable:
            subprocess.run(
                ["networksetup", "-setwebproxy", interface, host, str(port)], check=True
            )
            subprocess.run(
                ["networksetup", "-setsecurewebproxy", interface, host, str(port)],
                check=True,
            )

        subprocess.run(
            ["networksetup", "-setwebproxystate", interface, state], check=True
        )
        subprocess.run(
            ["networksetup", "-setsecurewebproxystate", interface, state], check=True
        )
        return True
    except subprocess.CalledProcessError as e:
        print(f"设置代理失败: {e}")
        return False


def get_proxy_status():
    """
    获取当前 macOS 代理状态
    """
    if platform.system() != "Darwin":
        return "Unknown"

    try:
        result = subprocess.run(
            ["networksetup", "-getwebproxy", "Wi-Fi"], capture_output=True, text=True
        )
        if "Enabled: Yes" in result.stdout:
            return "ON"
        return "OFF"
    except Exception as e:
        print(f"获取代理状态失败: {e}")
        return "Error"
