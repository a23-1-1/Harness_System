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
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "siliconflow")

# SiliconFlow（默认，国内可直连，兼容 DeepSeek 模型）
SILICONFLOW_API_KEY = os.getenv("SILICONFLOW_API_KEY", "")
SILICONFLOW_BASE_URL = "https://api.siliconflow.cn/v1"
SILICONFLOW_MODEL = os.getenv("LLM_MODEL", "deepseek-ai/DeepSeek-V3-0324")

# DeepSeek 官方（备选）
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1"
DEEPSEEK_MODEL = "deepseek-chat"

# 系统 Prompt
SYSTEM_PROMPT = """你是一个数据库课程教学助手——DB Demo Studio 的 AI 核心。
你的任务是根据用户输入的 SQL 或数据库知识点，生成结构化的教学演示。

请始终以 JSON 格式输出：
{
  "steps": [
    {
      "index": 1,
      "title": "步骤标题",
      "content": "步骤详细讲解内容"
    }
  ]
}

步骤数量根据知识点的复杂度决定（3-6 步）。
如果用户输入的是 SQL 查询，请覆盖：词法分析 → 语法解析 → 查询优化 → 执行计划 → 执行过程 → 结果分析。
如果用户输入的是数据库概念（如 B+树、事务），请按教学逻辑分步讲解。
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

    async def generate_demo(self, user_input: str, conv_id: str, teacher_profile: Optional[dict] = None) -> dict:
        """根据用户输入生成教学演示

        支持 Redis LLM 缓存，相同 prompt 在 1 小时内命中缓存。
        """
        # 构建 prompt
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]
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

    async def chat(self, messages: list[dict]) -> str:
        """通用对话接口（用于后续 Agent 对话）"""
        client = self._get_client()
        response = await client.chat.completions.create(
            model=self._get_model(),
            messages=messages,
            temperature=0.7,
            max_tokens=4096,
        )
        return response.choices[0].message.content or ""

    def _cache_key(self, messages: list[dict]) -> str:
        """生成缓存 key"""
        raw = json.dumps(messages, ensure_ascii=False, sort_keys=True)
        return hashlib.sha256(raw.encode()).hexdigest()[:32]


# 全局单例
llm_gateway = LLMGateway()
