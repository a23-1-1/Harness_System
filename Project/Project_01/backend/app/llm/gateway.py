"""
DB Demo Studio — LLM Gateway

兼容 OpenAI API 格式的 LLM 网关，支持 DeepSeek / SiliconFlow 等 Provider。
默认使用 SiliconFlow 托管的 DeepSeek 模型（兼容 OpenAI SDK）。
"""
import os
import json
import logging
import hashlib
from typing import Optional
from openai import AsyncOpenAI

from app.redis_cache import redis_cache

logger = logging.getLogger(__name__)

# ─── 配置 ────────────────────────────────────────────────────
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "deepseek")

# SiliconFlow（备选，国内可直连）
SILICONFLOW_API_KEY = os.getenv("SILICONFLOW_API_KEY", "")
SILICONFLOW_BASE_URL = "https://api.siliconflow.cn/v1"
SILICONFLOW_MODEL = os.getenv("LLM_MODEL", "deepseek-ai/DeepSeek-V3-0324")

# DeepSeek 官方（默认）
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1"
DEEPSEEK_MODEL = os.getenv("LLM_MODEL", "deepseek-chat")

# 系统 Prompt
SYSTEM_PROMPT = """你是一个数据库课程教学助手——DB Demo Studio 的 AI 核心。
你的任务是根据用户输入的 SQL 或数据库知识点，生成结构化的 P0 教学演示。

## 输出格式

请始终以 JSON 格式输出：

```json
{
  "title": "演示标题（概括知识点，简练）",
  "steps": [
    {
      "index": 1,
      "stage": "lex",
      "title": "词法分析",
      "content": "详细的步骤讲解内容，使用教学性语言，包含关键概念解释。",
      "interactive_hint": "点击关键字可查看含义"
    }
  ]
}
```

## P0 标准 6 阶段

当用户输入 SQL 查询时，请严格按以下 6 个阶段生成：

| 阶段 | 显示名称 | 讲解方向 |
|------|---------|---------|
| lex | 词法分析 | 识别 SQL 中的关键字、表名、列名、条件；解释每个关键字含义 |
| parse | 语法解析 | 展示语法树结构，说明表间关系（JOIN 类型）、过滤条件位置 |
| optimize | 查询优化 | 展示优化器可选的扫描策略（全表扫描/索引扫描），解释为什么选当前策略 |
| plan | 执行计划 | 展示最终执行计划树，说明每个算子的作用和代价估算 |
| execute | 执行过程 | 模拟逐步执行过程，展示中间结果行数变化、缓冲区使用 |
| result | 结果分析 | 展示最终结果集，总结教学要点 |

当用户输入数据库概念（非 SQL）时，按知识点教学逻辑分 3-6 步讲解，每步的 stage 使用教学阶段名称（如 concept、example、summary 等）。

## 可视化增强

如果用户要求「加图表」「画图」「可视化」「Mermaid」「流程图」「ER 图」等，请在步骤中添加 mermaid 字段。

SQL 查询的 6 阶段按以下对应生成默认 Mermaid 图：

| 阶段 | 推荐图类型 | 图示内容 |
|------|-----------|---------|
| lex | flowchart LR | 关键字 → 标识符 → 运算符 的 token 序列 |
| parse | erDiagram | 表之间的关系（JOIN 或引用） |
| optimize | flowchart TD | 多个执行策略的代价对比决策树 |
| plan | flowchart TD | 执行计划树（算子层级） |
| execute | sequenceDiagram | 存储引擎与表之间的数据流交互 |
| result | flowchart LR | 查询结果概览 |

```json
{
  "index": 3,
  "stage": "optimize",
  "title": "查询优化策略对比",
  "content": "优化器在全表扫描和索引扫描之间选择...",
  "mermaid": "flowchart TD\n  A[全表扫描 cost=100] --> E[选择索引扫描]\n  C[索引扫描 cost=20] --> E"
}
```

如果用户没有明确要求可视化，选择 1-2 个最关键的阶段添加 mermaid 字段（无需每个阶段都有）。

当用户输入的是数据库概念（非 SQL）时，按知识点教学逻辑分 3-6 步讲解，每步的 stage 使用教学阶段名称（如 concept、example、summary 等）。

## P2 专业模拟器输出格式

当用户要求「模拟」「动画」「演示过程」「建模拟器」「B+树」「事务」「隔离级别」「幻读」等关键词时，生成 P2 模拟器类型演示。此时 type 设为 simulator，steps 中每步包含 simConfig 字段：

```json
{
  "title": "B+树插入演示",
  "demo_type": "simulator",
  "simulator_type": "bplus_tree",
  "simulator_config": {
    "operation": "insert",
    "key": 42,
    "order": 4
  },
  "steps": [
    {
      "index": 1,
      "stage": "setup",
      "title": "查找插入位置",
      "content": "从根节点开始查找键 42 应插入的叶子节点...",
      "simConfig": {
        "type": "bplus_tree",
        "action": "traverse",
        "nodes": [...]
      }
    }
  ]
}
```

模拟器类型与配置：
- bplus_tree: {operation: insert|delete|search, key: number, order: number}
- transaction: {isolation_level: string, scenario: phantom_read|dirty_read|non_repeatable_read|lock_wait}
- sql_execution: {sql: string, join_type: string, tables: [{name, rows}]}

## 教学风格要求

- 语言通俗易懂，多用类比和比喻
- 重要概念优先解释
- 每步内容长度 80-200 字，有实质性讲解
- 使用中文输出
"""


class LLMGateway:
    """LLM 网关"""

    def __init__(self):
        self._client: Optional[AsyncOpenAI] = None

    def _get_client(self) -> AsyncOpenAI:
        """获取 OpenAI 兼容客户端"""
        if self._client is None:
            if LLM_PROVIDER == "siliconflow":
                api_key = SILICONFLOW_API_KEY
                base_url = SILICONFLOW_BASE_URL
            elif LLM_PROVIDER == "deepseek":
                api_key = DEEPSEEK_API_KEY
                base_url = DEEPSEEK_BASE_URL
            else:
                raise ValueError(f"不支持的 LLM Provider: {LLM_PROVIDER}")

            if not api_key:
                raise ValueError(f"{LLM_PROVIDER} API Key 未配置，请在 .env 中设置对应的 API Key")

            self._client = AsyncOpenAI(api_key=api_key, base_url=base_url)
        return self._client

    def _get_model(self) -> str:
        if LLM_PROVIDER == "siliconflow":
            return SILICONFLOW_MODEL
        return DEEPSEEK_MODEL

    async def generate_demo(self, user_input: str, conv_id: str,
                            teacher_profile: Optional[dict] = None,
                            sql_analysis: Optional[dict] = None) -> dict:
        """根据用户输入生成教学演示

        支持 Redis LLM 缓存，相同 prompt 在 1 小时内命中缓存。
        可选传入 sql_analysis 结果作为上下文，帮助 LLM 生成更准确的演示。
        """
        # 构建 prompt
        system_msg = SYSTEM_PROMPT
        if sql_analysis:
            tables = sql_analysis.get("tables", [])
            columns = sql_analysis.get("columns", [])
            keywords = sql_analysis.get("keywords", [])
            join_type = sql_analysis.get("join_type", "")
            analysis_summary = f"""
## SQL 分析结果（供参考）
- 表: {', '.join(t['name'] for t in tables) if tables else '未识别'}
- 列: {', '.join(columns[:8]) if columns else '未识别'}
- 关键字: {', '.join(keywords[:10]) if keywords else '未识别'}
- JOIN 类型: {join_type or '无'}
"""
            system_msg += analysis_summary

        messages = [{"role": "system", "content": system_msg}]
        if teacher_profile:
            style = teacher_profile.get("style", {})
            style_hint = f"请使用以下风格：正式程度={style.get('formality', 'medium')}，技术深度={style.get('depth', 'medium')}。"
            messages.append({"role": "system", "content": style_hint})
        messages.append({"role": "user", "content": user_input})

        # 计算缓存 key
        cache_key = self._cache_key(messages)

        # 尝试从缓存读取
        cached = await redis_cache.get_llm_cached(cache_key)
        if cached:
            logger.info("LLM 缓存命中", extra={"data": {"convId": conv_id, "provider": LLM_PROVIDER}})
            return json.loads(cached)

        # 调用 LLM
        logger.info("LLM 调用开始", extra={"data": {"convId": conv_id, "provider": LLM_PROVIDER, "model": self._get_model()}})
        try:
            client = self._get_client()
            response = await client.chat.completions.create(
                model=self._get_model(),
                messages=messages,
                temperature=0.7,
                max_tokens=2048,
                response_format={"type": "json_object"},
            )
            content = response.choices[0].message.content or "{}"
            result = json.loads(content)

            # 写入缓存
            await redis_cache.cache_llm_response(cache_key, content)
            logger.info("LLM 调用成功", extra={"data": {
                "convId": conv_id,
                "provider": LLM_PROVIDER,
                "tokens": response.usage.total_tokens if response.usage else 0,
            }})
            return result

        except Exception as e:
            logger.error(f"LLM 调用失败: {e}", extra={"data": {"convId": conv_id}})
            # 失败时返回降级演示
            return {
                "steps": [
                    {"index": 1, "title": "理解输入", "content": f"分析您的输入: {user_input[:50]}..."},
                    {"index": 2, "title": "构造步骤", "content": "AI 正在尝试生成演示，但 API 调用出现异常。"},
                    {"index": 3, "title": "降级响应", "content": f"请检查 API Key 配置是否正确（当前 Provider: {LLM_PROVIDER}）。"},
                ]
            }

    async def chat_with_json(self, prompt: str) -> str:
        """对话接口，强制 JSON 输出（用于步骤重写等子任务）"""
        messages = [{"role": "user", "content": prompt}]
        try:
            client = self._get_client()
            response = await client.chat.completions.create(
                model=self._get_model(),
                messages=messages,
                temperature=0.7,
                max_tokens=2048,
                response_format={"type": "json_object"},
            )
            return response.choices[0].message.content or "{}"
        except Exception as e:
            logger.error(f"chat_with_json() 调用失败: {e}")
            return "{}"

    async def chat(self, messages: list[dict]) -> str:
        """通用对话接口（用于后续 Agent 对话）"""
        try:
            client = self._get_client()
            response = await client.chat.completions.create(
                model=self._get_model(),
                messages=messages,
                temperature=0.7,
                max_tokens=4096,
            )
            return response.choices[0].message.content or ""
        except Exception as e:
            logger.error(f"chat() 调用失败: {e}")
            return ""

    def _cache_key(self, messages: list[dict]) -> str:
        """生成缓存 key"""
        raw = json.dumps(messages, ensure_ascii=False, sort_keys=True)
        return hashlib.sha256(raw.encode()).hexdigest()[:32]


# 全局单例
llm_gateway = LLMGateway()
