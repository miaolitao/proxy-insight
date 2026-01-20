import time
import logging
from src.proxy_mgr import proxy_manager

# Setup minimal logging
logging.basicConfig(level=logging.INFO)


def test_cycle():
    print("--- Starting Proxy ---")
    proxy_manager.start_proxy(host="127.0.0.1", port=8081)

    # Wait for it to be fully up (simulate running state)
    time.sleep(2)

    print("--- Stopping Proxy ---")
    proxy_manager.stop_proxy()

    # Simulate the user toggling immediately
    print("--- Restarting Proxy Immediately ---")
    try:
        proxy_manager.start_proxy(host="127.0.0.1", port=8081)
        print("SUCCESS: Proxy restarted without error.")
        time.sleep(2)
        proxy_manager.stop_proxy()
    except Exception as e:
        print(f"FAILURE: Could not restart proxy: {e}")


if __name__ == "__main__":
    test_cycle()
