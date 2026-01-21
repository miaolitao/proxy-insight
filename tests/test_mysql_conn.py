import asyncio
import sys
import os

# Add src to path
sys.path.append(os.path.join(os.getcwd(), "src"))

from db import DatabaseManager
from logging_config import config


async def test_mysql():
    print(f"Testing with db_type: {config.get('db_type')}")
    db = DatabaseManager()
    try:
        await db.init_db()
        print("Database initialized successfully!")

        test_data = {
            "method": "GET",
            "url": "http://test.com",
            "status": 200,
            "time": "100ms",
            "request": {"headers": {"h1": "v1"}, "body": "rb", "cookies": {}},
            "response": {"headers": {"h2": "v2"}, "body": "resb", "cookies": {}},
        }
        await db.save_request(test_data)
        print("Request saved successfully!")

        requests = await db.get_requests(limit=1)
        print(f"Retrieved {len(requests)} requests.")
        if requests:
            print(f"Last request URL: {requests[0]['url']}")

        stats = await db.get_stats()
        print(f"Stats: {stats}")

    except Exception as e:
        print(f"Test failed: {e}")
        import traceback

        traceback.print_exc()


if __name__ == "__main__":
    # Ensure config is set to mysql for this test
    config["db_type"] = "mysql"
    asyncio.run(test_mysql())
