"""
DB Demo Studio — EXPLAIN 引擎 MCP 服务器

连接 MySQL 8.0 和 PostgreSQL 16 EXPLAIN 引擎容器，
执行 EXPLAIN 命令并返回结构化 JSON 结果。

安全性：对输入 SQL 做只读验证（仅允许 SELECT/WITH/EXPLAIN），然后安全拼接。
EXPLAIN 本身是只读操作，加上 SQL 验证后风险可控。
"""
import os
import json
import logging
import re

logger = logging.getLogger(__name__)

# 连接配置 — 从环境变量读取
MYSQL_HOST = os.getenv("MYSQL_HOST", "localhost")
MYSQL_PORT = int(os.getenv("MYSQL_PORT", "3308"))
MYSQL_USER = os.getenv("MYSQL_USER", "root")
MYSQL_PASS = os.getenv("MYSQL_PASS", "")
MYSQL_DB = os.getenv("MYSQL_DB", "explain_test")

PG_HOST = os.getenv("PG_EXPLAIN_HOST", "localhost")
PG_PORT = int(os.getenv("PG_EXPLAIN_PORT", "5433"))
PG_USER = os.getenv("PG_EXPLAIN_USER", "explain")
PG_PASS = os.getenv("PG_EXPLAIN_PASS", "explain_pass")
PG_DB = os.getenv("PG_EXPLAIN_DB", "explain_test")

# 只读 SQL 模式白名单
_READONLY_RE = re.compile(
    r"^\s*(SELECT|WITH|EXPLAIN|TABLE|VALUES|SHOW)\s",
    re.IGNORECASE,
)


def _is_readonly(sql: str) -> bool:
    """检查 SQL 是否为只读查询"""
    return bool(_READONLY_RE.match(sql.strip()))


async def explain_mysql(sql: str) -> dict:
    """在 MySQL EXPLAIN 引擎上执行 EXPLAIN"""
    if not _is_readonly(sql):
        return {"dialect": "mysql", "error": "仅支持只读查询（SELECT/WITH/EXPLAIN）"}

    try:
        import aiomysql
        conn = await aiomysql.connect(
            host=MYSQL_HOST, port=MYSQL_PORT,
            user=MYSQL_USER, password=MYSQL_PASS,
            db=MYSQL_DB, autocommit=True,
            connect_timeout=5,
        )
        try:
            async with conn.cursor() as cur:
                await cur.execute(f"EXPLAIN FORMAT=JSON {sql}")
                row = await cur.fetchone()
                if row:
                    raw = row[0] if isinstance(row[0], str) else json.dumps(row[0])
                    return {"dialect": "mysql", "raw": raw, "parsed": json.loads(raw)}
                return {"dialect": "mysql", "error": "无返回结果"}
        finally:
            conn.close()
    except ImportError:
        return {"dialect": "mysql", "error": "aiomysql 未安装，无法连接 MySQL"}
    except Exception as e:
        return {"dialect": "mysql", "error": str(e)}


async def explain_postgres(sql: str) -> dict:
    """在 PostgreSQL EXPLAIN 引擎上执行 EXPLAIN"""
    if not _is_readonly(sql):
        return {"dialect": "postgresql", "error": "仅支持只读查询（SELECT/WITH/EXPLAIN）"}

    try:
        import asyncpg
        conn = await asyncpg.connect(
            host=PG_HOST, port=PG_PORT,
            user=PG_USER, password=PG_PASS,
            database=PG_DB,
            timeout=5,
        )
        try:
            # asyncpg 返回 Record(row)，row[0] 是 JSON 字符串
            rows = await conn.fetch(f"EXPLAIN (ANALYZE false, FORMAT JSON) {sql}")
            if rows:
                raw_str = rows[0][0]
                # raw_str 是 JSON 字符串，格式为 [{...}]
                parsed = json.loads(raw_str)
                return {"dialect": "postgresql", "raw": raw_str, "parsed": parsed[0] if isinstance(parsed, list) else parsed}
            return {"dialect": "postgresql", "error": "无返回结果"}
        finally:
            await conn.close()
    except ImportError:
        return {"dialect": "postgresql", "error": "asyncpg 未安装，无法连接 PostgreSQL"}
    except Exception as e:
        return {"dialect": "postgresql", "error": str(e)}
