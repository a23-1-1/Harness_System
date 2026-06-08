"""
DB Demo Studio — SQL 分析 MCP 服务器

使用 sqlparse 解析 SQL 语法树，返回结构化分析结果。
包括：关键字识别、表名提取、列名提取、JOIN 类型检测。
"""

import sqlparse
from sqlparse.sql import Identifier, IdentifierList, Where, Comparison, Function
from sqlparse.tokens import Keyword, DML, Name, Punctuation


def analyze_sql(sql: str) -> dict:
    """分析 SQL 语句，返回结构化结果"""
    parsed = sqlparse.parse(sql)
    if not parsed:
        return {"error": "SQL 解析失败", "tokens": []}

    stmt = parsed[0]
    tokens = list(stmt.flatten())

    # 提取表名
    tables = []
    # 提取列名
    columns = []
    # 提取关键字
    keywords = []
    # JOIN 类型
    join_type = None

    # 简单遍历 token 流识别
    tokens_str = str(stmt)
    stmt_upper = tokens_str.upper()

    # JOIN 类型检测：先匹配 JOIN（默认 INNER），再匹配其他类型
    if "CROSS JOIN" in stmt_upper:
        join_type = "CROSS JOIN"
    elif "FULL JOIN" in stmt_upper or "FULL OUTER JOIN" in stmt_upper:
        join_type = "FULL JOIN"
    elif "RIGHT JOIN" in stmt_upper or "RIGHT OUTER JOIN" in stmt_upper:
        join_type = "RIGHT JOIN"
    elif "LEFT JOIN" in stmt_upper or "LEFT OUTER JOIN" in stmt_upper:
        join_type = "LEFT JOIN"
    elif "INNER JOIN" in stmt_upper or " JOIN " in stmt_upper:
        join_type = "INNER JOIN"

    # 用 sqlparse 结构化提取
    from sqlparse.sql import Token
    seen_tables = set()
    seen_columns = set()

    for token in tokens:
        if token.ttype in (Keyword, DML):
            kw = token.value.upper().strip()
            if kw and kw not in keywords and len(kw) > 1:
                keywords.append(kw)

    # 提取表名（from 子句后的标识符）
    from_seen = False
    for token in stmt.tokens:
        if token.ttype is DML and token.value.upper() == "SELECT":
            continue
        if token.ttype is Keyword and token.value.upper() == "FROM":
            from_seen = True
            continue
        if from_seen and isinstance(token, (Identifier, IdentifierList)):
            if isinstance(token, IdentifierList):
                for ident in token.get_sublists():
                    name = ident.get_name()
                    if name and name not in seen_tables:
                        tables.append({"name": name})
                        seen_tables.add(name)
            else:
                name = token.get_name()
                if name and name not in seen_tables:
                    tables.append({"name": name})
                    seen_tables.add(name)
            from_seen = False

        # WHERE 子句中的列名
        if isinstance(token, Where):
            for sub in token.tokens:
                if isinstance(sub, Comparison):
                    left = sub.left
                    if left and hasattr(left, 'get_real_name'):
                        col = left.get_real_name()
                        if col and col not in seen_columns:
                            columns.append(col)
                            seen_columns.add(col)

    # 提取 SELECT 后的列
    select_seen = False
    for token in stmt.tokens:
        if token.ttype is DML and token.value.upper() == "SELECT":
            select_seen = True
            continue
        if select_seen and isinstance(token, (Identifier, IdentifierList, Function, Comparison)):
            if isinstance(token, IdentifierList):
                for ident in token.get_sublists():
                    col = ident.get_alias() or ident.get_name()
                    if col and col not in seen_columns:
                        columns.append(col)
                        seen_columns.add(col)
            else:
                col = token.get_alias() or token.get_name() if hasattr(token, 'get_name') else str(token)
                if col and col not in seen_columns and col.upper() not in ('FROM', 'WHERE', 'INNER', 'LEFT', 'RIGHT', 'ON', 'AND', 'OR', 'AS'):
                    columns.append(col)
                    seen_columns.add(col)
            break

    return {
        "tables": tables,
        "columns": columns,
        "keywords": keywords,
        "join_type": join_type,
        "token_count": len(tokens),
    }
