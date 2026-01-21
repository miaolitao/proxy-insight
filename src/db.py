import aiosqlite
import aiomysql
import json
import os
import logging
from datetime import datetime
from logging_config import config

from contextlib import asynccontextmanager

logger = logging.getLogger("proxy_insight")

# Determine project root (one level up from src/)
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(PROJECT_ROOT, "proxy_traffic.db")


class DatabaseManager:
    def __init__(self):
        self.db_type = config.get("db_type", "sqlite").lower()
        self.db_path = DB_PATH
        self.mysql_config = config.get("mysql", {})

    def get_placeholder(self):
        return "%s" if self.db_type == "mysql" else "?"

    @asynccontextmanager
    async def get_conn(self):
        """Returns a context manager for the database connection."""
        if self.db_type == "mysql":
            conn = await aiomysql.connect(
                host=self.mysql_config.get("host", "127.0.0.1"),
                port=self.mysql_config.get("port", 3306),
                user=self.mysql_config.get("user", "root"),
                password=self.mysql_config.get("password", "root"),
                db=self.mysql_config.get("database", "proxy_insight"),
                autocommit=True,
            )
            try:
                yield conn
            finally:
                conn.close()
        else:
            async with aiosqlite.connect(self.db_path) as db:
                yield db

    async def init_db(self):
        """Initialize the database and create the requests table."""
        if self.db_type == "mysql":
            # Initial connection to create database if it doesn't exist
            temp_conn = await aiomysql.connect(
                host=self.mysql_config.get("host", "127.0.0.1"),
                port=self.mysql_config.get("port", 3306),
                user=self.mysql_config.get("user", "root"),
                password=self.mysql_config.get("password", "root"),
                autocommit=True,
            )
            async with temp_conn.cursor() as cur:
                await cur.execute(
                    f"CREATE DATABASE IF NOT EXISTS {self.mysql_config.get('database', 'proxy_insight')}"
                )
            temp_conn.close()

        async with self.get_conn() as conn:
            if self.db_type == "mysql":
                async with conn.cursor() as cur:
                    await cur.execute(
                        """
                        CREATE TABLE IF NOT EXISTS requests (
                            id INT AUTO_INCREMENT PRIMARY KEY,
                            method TEXT,
                            url TEXT,
                            status INT,
                            time TEXT,
                            request_headers LONGTEXT,
                            request_body LONGTEXT,
                            request_cookies LONGTEXT,
                            response_headers LONGTEXT,
                            response_body LONGTEXT,
                            response_cookies LONGTEXT,
                            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                        )
                    """
                    )
            else:
                await conn.execute(
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
                await conn.commit()
        logger.info(f"Database initialized using {self.db_type}")

    async def save_request(self, data):
        """Save a captured request/response pair to the database."""
        try:
            p = self.get_placeholder()
            sql = f"""
                INSERT INTO requests (
                    method, url, status, time,
                    request_headers, request_body, request_cookies,
                    response_headers, response_body, response_cookies
                ) VALUES ({p}, {p}, {p}, {p}, {p}, {p}, {p}, {p}, {p}, {p})
            """
            values = (
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
            )

            async with self.get_conn() as conn:
                if self.db_type == "mysql":
                    async with conn.cursor() as cur:
                        await cur.execute(sql, values)
                else:
                    await conn.execute(sql, values)
                    await conn.commit()
        except Exception as e:
            logger.error(
                f"DB SAVE ERROR: {e} | Data keys: {list(data.keys())} | URL: {data.get('url')}"
            )
            import traceback

            logger.error(traceback.format_exc())

    async def get_requests(self, limit=50, offset=0, query=None):
        """Fetch historical requests from the database."""
        async with self.get_conn() as conn:
            p = self.get_placeholder()
            sql = "SELECT * FROM requests"
            params = []

            if query:
                sql += f" WHERE url LIKE {p} OR method LIKE {p} OR request_body LIKE {p} OR response_body LIKE {p}"
                q = f"%{query}%"
                params.extend([q, q, q, q])

            sql += f" ORDER BY id DESC LIMIT {p} OFFSET {p}"
            params.extend([limit, offset])

            if self.db_type == "mysql":
                async with conn.cursor(aiomysql.DictCursor) as cur:
                    await cur.execute(sql, tuple(params))
                    rows = await cur.fetchall()
            else:
                conn.row_factory = aiosqlite.Row
                async with conn.execute(sql, tuple(params)) as cursor:
                    rows = await cursor.fetchall()

            result = []
            for row in rows:
                d = dict(row)
                ts = d["timestamp"]
                # Convert datetime to string if it's a MySQL datetime object
                if isinstance(ts, datetime):
                    ts = ts.strftime("%Y-%m-%d %H:%M:%S")

                item = {
                    "id": d["id"],
                    "method": d["method"],
                    "url": d["url"],
                    "status": d["status"],
                    "time": d["time"],
                    "timestamp": ts,
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
        async with self.get_conn() as conn:

            async def fetch_one(sql):
                if self.db_type == "mysql":
                    async with conn.cursor() as cur:
                        await cur.execute(sql)
                        res = await cur.fetchone()
                        return res[0]
                else:
                    async with conn.execute(sql) as cursor:
                        res = await cursor.fetchone()
                        return res[0]

            total = await fetch_one("SELECT COUNT(*) FROM requests")
            success = await fetch_one(
                "SELECT COUNT(*) FROM requests WHERE status >= 200 AND status < 400"
            )
            error = await fetch_one("SELECT COUNT(*) FROM requests WHERE status >= 400")

            # Simple average latency
            sql_time = "SELECT time FROM requests"
            if self.db_type == "mysql":
                async with conn.cursor() as cur:
                    await cur.execute(sql_time)
                    times = await cur.fetchall()
            else:
                async with conn.execute(sql_time) as cursor:
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
        async with self.get_conn() as conn:
            if self.db_type == "mysql":
                async with conn.cursor() as cur:
                    await cur.execute("DELETE FROM requests")
            else:
                await conn.execute("DELETE FROM requests")
                await conn.commit()
        logger.info("Database cleared")


db_manager = DatabaseManager()
