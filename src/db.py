import aiosqlite
import json
import os
import logging
from datetime import datetime

logger = logging.getLogger("proxy_insight")

# Determine project root (one level up from src/)
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(PROJECT_ROOT, "proxy_traffic.db")


class DatabaseManager:
    def __init__(self, db_path=DB_PATH):
        self.db_path = db_path

    async def init_db(self):
        """Initialize the database and create the requests table."""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                """
                CREATE TABLE IF NOT EXISTS requests (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    method TEXT,
                    url TEXT,
                    status INTEGER,
                    time TEXT,
                    request_headers TEXT,
                    request_body TEXT,
                    request_cookies TEXT,
                    response_headers TEXT,
                    response_body TEXT,
                    response_cookies TEXT,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """
            )
            await db.commit()
        logger.info(f"Database initialized at {self.db_path}")

    async def save_request(self, data):
        """Save a captured request/response pair to the database."""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                """
                INSERT INTO requests (
                    method, url, status, time,
                    request_headers, request_body, request_cookies,
                    response_headers, response_body, response_cookies
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
                (
                    data["method"],
                    data["url"],
                    data["status"],
                    data["time"],
                    json.dumps(data["request"]["headers"]),
                    data["request"]["body"],
                    json.dumps(data["request"]["cookies"]),
                    json.dumps(data["response"]["headers"]),
                    data["response"]["body"],
                    json.dumps(data["response"]["cookies"]),
                ),
            )
            await db.commit()

    async def get_requests(self, limit=50, offset=0):
        """Fetch historical requests from the database."""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute(
                "SELECT * FROM requests ORDER BY id DESC LIMIT ? OFFSET ?",
                (limit, offset),
            ) as cursor:
                rows = await cursor.fetchall()
                # Restore original format for frontend compatibility
                result = []
                for row in rows:
                    d = dict(row)
                    item = {
                        "id": d["id"],
                        "method": d["method"],
                        "url": d["url"],
                        "status": d["status"],
                        "time": d["time"],
                        "request": {
                            "headers": json.loads(d["request_headers"]),
                            "body": d["request_body"],
                            "cookies": json.loads(d["request_cookies"]),
                        },
                        "response": {
                            "headers": json.loads(d["response_headers"]),
                            "body": d["response_body"],
                            "cookies": json.loads(d["response_cookies"]),
                        },
                    }
                    result.append(item)
                return result

    async def get_stats(self):
        """Get summary statistics from the database."""
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute("SELECT COUNT(*) FROM requests") as cursor:
                total = (await cursor.fetchone())[0]
            async with db.execute(
                "SELECT COUNT(*) FROM requests WHERE status >= 200 AND status < 400"
            ) as cursor:
                success = (await cursor.fetchone())[0]
            async with db.execute(
                "SELECT COUNT(*) FROM requests WHERE status >= 400"
            ) as cursor:
                error = (await cursor.fetchone())[0]

            # Simple average latency
            async with db.execute("SELECT time FROM requests") as cursor:
                times = await cursor.fetchall()
                if times:
                    import re

                    latencies = []
                    for t in times:
                        match = re.search(r"(\d+)", t[0])
                        if match:
                            latencies.append(int(match.group(1)))
                    avg_latency = sum(latencies) / len(latencies) if latencies else 0
                else:
                    avg_latency = 0

            return {
                "total": total,
                "success": success,
                "error": error,
                "avg_latency": f"{int(avg_latency)}ms",
            }

    async def clear_all(self):
        """Clear all historical requests."""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("DELETE FROM requests")
            await db.commit()
        logger.info("Database cleared")


db_manager = DatabaseManager()
