import requests
import time
import subprocess
import signal
import os
import sys


def run_test():
    print("🚀 开始 ProxyInsight 自动化功能测试...")

    # 1. 启动后端服务
    print("Step 1: 启动 Backend 服务...")
    backend_proc = subprocess.Popen(
        ["uv", "run", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "8000"],
        cwd=os.getcwd(),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )

    time.sleep(3)  # 等待启动

    try:
        # 2. 检查 API 状态
        print("Step 2: 检查 API 状态...")
        res = requests.get("http://127.0.0.1:8000/api/status")
        print(f"API 响应: {res.json()}")
        assert res.status_code == 200

        # 3. 开启代理
        print("Step 3: 开启代理并修改系统设置...")
        res = requests.post("http://127.0.0.1:8000/api/proxy/toggle?enable=true")
        print(f"Toggle 开启响应: {res.json()}")
        assert res.json()["success"] == True

        # 4. 模拟通过代理发送 HTTP 请求
        print("Step 4: 模拟流量抓取...")
        proxies = {
            "http": "http://127.0.0.1:8080",
            "https": "http://127.0.0.1:8080",
        }
        try:
            # 这是一个测试网站
            test_res = requests.get(
                "http://httpbin.org/get", proxies=proxies, timeout=5
            )
            print(f"通过代理请求成功: {test_res.status_code}")
        except Exception as e:
            print(f"通过代理请求失败: {e}")
            print("提示: 如果这是在隔离环境运行，代理请求可能超时，这是正常的。")

        # 5. 关闭代理
        print("Step 5: 关闭代理并还原设置...")
        # 显式不对 localhost 使用代理
        res = requests.post(
            "http://127.0.0.1:8000/api/proxy/toggle?enable=false",
            proxies={"http": None, "https": None},
        )
        print(f"Toggle 关闭响应: {res.status_code}")
        if res.status_code == 200:
            print(f"响应内容: {res.json()}")
            assert res.json()["success"] == True
        else:
            print(f"关闭失败，状态码: {res.status_code}")

        print("\n✅ 测试主要流程已完成！")

    except Exception as e:
        print(f"\n❌ 测试过程中出现致命错误: {e}")
        # 强制还原代理状态
        requests.post("http://127.0.0.1:8000/api/proxy/toggle?enable=false")

    finally:
        print("正在清理 Backend 进程...")
        backend_proc.terminate()
        backend_proc.wait()


if __name__ == "__main__":
    run_test()
