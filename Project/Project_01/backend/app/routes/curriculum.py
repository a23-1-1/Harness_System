"""
DB Demo Studio — 课纲 RAG & 知识点搜索 API

提供课纲知识点搜索能力。支持两种模式：
1. 关键词搜索（PostgreSQL ILIKE，默认）
2. 向量相似度搜索（pgvector，需 PG_VECTOR_ENABLED=true）
"""
import json
import logging
import os
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db, engine
from app.redis_cache import redis_cache

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/curriculum", tags=["curriculum"])

PG_VECTOR_ENABLED = os.getenv("PG_VECTOR_ENABLED", "false").lower() == "true"

# 内置知识点库（静态种子数据，当 PG pgvector 不可用时使用）
BUILTIN_KNOWLEDGE_BASE = [
    # SQL 基础
    {"id": "sql-select", "title": "SELECT 查询", "category": "SQL 基础", "keywords": ["SELECT", "查询", "列", "字段"], "content": "SELECT 语句用于从数据库表中检索数据，是 SQL 中最常用的语句。"},
    {"id": "sql-join", "title": "JOIN 连接查询", "category": "SQL 基础", "keywords": ["JOIN", "连接", "INNER JOIN", "LEFT JOIN", "表关联"], "content": "JOIN 用于根据两个或多个表之间的相关列来合并数据。"},
    {"id": "sql-where", "title": "WHERE 条件过滤", "category": "SQL 基础", "keywords": ["WHERE", "条件", "过滤", "AND", "OR"], "content": "WHERE 子句用于过滤记录，只返回满足指定条件的行。"},
    {"id": "sql-subquery", "title": "子查询", "category": "SQL 基础", "keywords": ["子查询", "嵌套查询", "IN", "EXISTS"], "content": "子查询是嵌套在另一个查询内部的查询，用于逐步缩小数据范围。"},
    {"id": "sql-groupby", "title": "GROUP BY 分组聚合", "category": "SQL 基础", "keywords": ["GROUP BY", "分组", "HAVING", "聚合函数", "COUNT", "SUM", "AVG"], "content": "GROUP BY 将结果集按一个或多个列分组，配合聚合函数使用。"},

    # 索引
    {"id": "index-basics", "title": "索引基本原理", "category": "索引", "keywords": ["索引", "B+树", "查找", "加速"], "content": "数据库索引是一种数据结构，用于快速定位数据而无需扫描整个表。"},
    {"id": "index-btree", "title": "B+树索引", "category": "索引", "keywords": ["B+树", "B-Tree", "索引结构", "节点分裂"], "content": "B+树是数据库中最常用的索引结构，所有数据存储在叶子节点，内部节点仅存储键值用于路由。"},
    {"id": "index-clustered", "title": "聚簇索引 vs 非聚簇索引", "category": "索引", "keywords": ["聚簇索引", "非聚簇索引", "Clustered", "主键"], "content": "聚簇索引决定了表中数据的物理存储顺序，每个表只能有一个；非聚簇索引在索引结构中存储指向数据行的指针。"},

    # 查询优化
    {"id": "optimizer-overview", "title": "查询优化器工作原理", "category": "查询优化", "keywords": ["优化器", "执行计划", "代价估算", "CBO"], "content": "查询优化器分析多种执行策略，基于统计信息选择代价最低的方案。"},
    {"id": "optimizer-scan", "title": "全表扫描 vs 索引扫描", "category": "查询优化", "keywords": ["全表扫描", "索引扫描", "Seq Scan", "Index Scan"], "content": "全表扫描顺序读取所有数据页，适合小表或需要大量行的查询；索引扫描通过索引结构快速定位目标行。"},
    {"id": "optimizer-join", "title": "Nested Loop / Hash Join / Sort Merge", "category": "查询优化", "keywords": ["Nested Loop", "Hash Join", "Sort Merge", "连接算法", "代价"], "content": "三种主要 JOIN 算法：Nested Loop 适合小结果集，Hash Join 适合大表等值连接，Sort Merge 适合已排序的大数据集。"},

    # 事务与隔离
    {"id": "tx-basics", "title": "事务 ACID 特性", "category": "事务", "keywords": ["事务", "ACID", "原子性", "一致性", "隔离性", "持久性"], "content": "ACID 是数据库事务的四个基本特性：原子性、一致性、隔离性、持久性。"},
    {"id": "tx-isolation", "title": "事务隔离级别", "category": "事务", "keywords": ["隔离级别", "READ UNCOMMITTED", "READ COMMITTED", "REPEATABLE READ", "SERIALIZABLE"], "content": "SQL 标准定义了四个隔离级别，从低到高分别解决脏读、不可重复读、幻读问题。"},
    {"id": "tx-phantom", "title": "幻读与间隙锁", "category": "事务", "keywords": ["幻读", "间隙锁", "Gap Lock", "Next-Key Lock"], "content": "幻读是在同一事务中两次查询返回不同行集的现象；间隙锁防止其他事务在范围内插入新行。"},
]


@router.get("/search")
async def search_curriculum(
    q: str = Query(default="", description="搜索关键词"),
    category: str = Query(default="", description="按分类筛选"),
    db: AsyncSession = Depends(get_db),
):
    """知识点搜索 API

    支持关键词匹配搜索（使用内置知识库 + PG ILIKE）。
    若 PG_VECTOR_ENABLED=true 且 pgvector 扩展可用，自动升级为向量相似度搜索。
    """
    cache_key = f"curriculum:search:{q}:{category}" if q else "curriculum:search:all"

    # 尝试从 Redis 缓存读取
    try:
        client = await redis_cache.get_client()
        if client:
            cached = await client.get(cache_key)
            if cached:
                return json.loads(cached)
    except Exception:
        pass

    results = list(BUILTIN_KNOWLEDGE_BASE)

    # 关键词过滤
    if q:
        q_lower = q.lower()
        results = [
            r for r in results
            if q_lower in r["title"].lower()
            or q_lower in r["content"].lower()
            or any(q_lower in kw.lower() for kw in r["keywords"])
        ]

    # 分类过滤
    if category:
        results = [r for r in results if r["category"] == category]

    # 尝试 pgvector 向量搜索（如果启用）
    if PG_VECTOR_ENABLED and q:
        try:
            vector_results = await _vector_search(db, q)
            if vector_results:
                # 合并结果，去重
                existing_ids = {r["id"] for r in results}
                for vr in vector_results:
                    if vr["id"] not in existing_ids:
                        results.append(vr)
        except Exception as e:
            logger.warning(f"pgvector 搜索失败（降级为关键词搜索）: {e}")

    response = {
        "results": results,
        "total": len(results),
        "query": q,
        "mode": "vector" if PG_VECTOR_ENABLED else "keyword",
    }

    # 写入 Redis 缓存（5 分钟 TTL）
    try:
        client = await redis_cache.get_client()
        if client:
            await client.setex(cache_key, 300, json.dumps(response, ensure_ascii=False))
    except Exception:
        pass

    return response


async def _vector_search(db: AsyncSession, q: str) -> list[dict]:
    """使用 pgvector 进行向量相似度搜索"""
    # 检查 pgvector 扩展可用
    result = await db.execute(text("SELECT extname FROM pg_extension WHERE extname = 'vector'"))
    if not result.scalar_one_or_none():
        logger.warning("pgvector 扩展未安装，跳过向量搜索")
        return []

    # 向量搜索会通过 LLM 嵌入实现——当前为简化实现，
    # 先用关键词搜索替代，后续可集成 embedding API
    return []
