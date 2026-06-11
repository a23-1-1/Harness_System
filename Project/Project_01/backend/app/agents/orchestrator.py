"""
DB Demo Studio — Orchestrator Agent

编排 AI 工作流：意图识别 → 工具选择 → LLM 生成 → 结果组装。
支持流式 step:preview 推送、用户可打断（per-conversation）、单步重写、demo_snapshot 持久化。
"""
import asyncio
import html
import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select

from app.llm.gateway import llm_gateway
from app.database import async_session_factory
from app.models.conversation import Conversation, Message, Demo
from app.redis_cache import redis_cache
from app.mcp.registry import mcp_registry
from app.mcp.servers.sql_analyze import analyze_sql
from app.mcp.servers.mermaid_gen import generate_mermaid
from app.mcp.servers.simulator_engine import simulate_bplus_tree, simulate_transaction, simulate_sql_execution, simulate_sql_strategy_compare

logger = logging.getLogger(__name__)

# 工具注册表（后续 MCP 服务器接入后扩展）
TOOL_REGISTRY = {
    "sql_analyze": {"name": "SQL 分析", "description": "解析 SQL 语法结构"},
    "explain_engine": {"name": "EXPLAIN 引擎", "description": "获取查询执行计划"},
    "mermaid_gen": {"name": "Mermaid 生成", "description": "生成 Mermaid 图表"},
    "simulator": {"name": "模拟器", "description": "构建 B+树/事务模拟器"},
}

# P0 标准阶段标签
P0_STAGES = ["lex", "parse", "optimize", "plan", "execute", "result"]


class OrchestratorAgent:
    """Orchestrator Agent —— 编排 AI 协作流程"""

    def __init__(self):
        # per-conversation 打断事件，避免 C1/C2 全局标志位问题
        self._interrupt_events: dict[str, asyncio.Event] = {}

    def interrupt(self, conv_id: str):
        """标记指定对话的打断请求"""
        event = self._interrupt_events.get(conv_id)
        if event:
            event.set()
            logger.info("打断请求已设置", extra={"data": {"convId": conv_id}})

    def _check_interrupted(self, conv_id: str) -> bool:
        """检查指定对话是否被打断"""
        event = self._interrupt_events.get(conv_id)
        return event is not None and event.is_set()

    async def process_message(self, websocket, ws_manager, conv_id: str, payload: dict):
        """处理用户消息：保存 → 缓存 → 分析 → 生成 → 推送"""
        msg_type = payload.get("type", "text")
        content = payload.get("content", "")

        # 创建 per-conversation 打断事件（用于 Orchestrator.interrupt 标记）
        self._interrupt_events[conv_id] = asyncio.Event()

        try:
            # 1. 保存用户消息到 PostgreSQL + 更新计数器
            # 如果 PG/Redis 不可用，生成匿名 msg_id 继续执行（降级模式）
            try:
                msg_id = await self._save_user_message(conv_id, msg_type, content)
                await redis_cache.push_message(conv_id, {
                    "id": msg_id,
                    "role": "user",
                    "type": msg_type,
                    "content": {"text": content} if msg_type == "text" else payload,
                })
            except Exception as e:
                logger.warning(f"消息持久化失败（以降级模式继续）: {e}")
                import uuid
                msg_id = f"msg_{uuid.uuid4().hex[:12]}"

            # 2. 加载教师 Profile（风格偏好）
            teacher_profile = await self._load_teacher_profile(conv_id)

            # 3. 推送 agent:thinking — 正在分析
            await ws_manager.send_personal(websocket, "agent:thinking", {
                "step": "analyze",
                "message": "正在分析输入内容，识别教学意图…",
            })

            # 4. 尝试 SQL 分析（如果输入看起来像 SQL）
            sql_analysis = None
            if self._contains_sql(content):
                sql_analysis = analyze_sql(content)
                logger.info("SQL 分析完成", extra={"data": {"convId": conv_id, "tables": len(sql_analysis.get("tables", []))}})

            # 5. 模拟器意图检测：B+树/事务/SQL 执行
            sim_intent = self._detect_simulator_intent(content)
            if sim_intent:
                logger.info("检测到模拟器意图", extra={"data": {"convId": conv_id, "simType": sim_intent["type"]}})
                await ws_manager.send_personal(websocket, "agent:thinking", {
                    "step": "simulator",
                    "message": f"正在构建 {sim_intent['label']}…",
                })
                try:
                    if sim_intent["type"] == "bplus_tree":
                        result = simulate_bplus_tree(
                            operation=sim_intent.get("operation", "insert"),
                            key=sim_intent.get("key", 42),
                        )
                    elif sim_intent["type"] == "transaction":
                        result = simulate_transaction(
                            isolation_level=sim_intent.get("isolation_level", "READ COMMITTED"),
                            scenario=sim_intent.get("scenario", "phantom_read"),
                        )
                    elif sim_intent["type"] == "sql_execution":
                        sql = content if self._contains_sql(content) else "SELECT * FROM t1 JOIN t2 ON ..."
                        result = simulate_sql_execution(
                            sql=sql,
                            join_type=sim_intent.get("join_type", "Nested Loop Join"),
                            tables=sim_intent.get("tables", [{"name": "t1", "rows": 100}, {"name": "t2", "rows": 500}]),
                        )
                    elif sim_intent["type"] == "strategy_compare":
                        result = simulate_sql_strategy_compare(
                            sql=content if self._contains_sql(content) else "",
                            tables=[{"name": "students", "rows": 100}, {"name": "scores", "rows": 500}],
                        )
                    else:
                        result = None

                    if result:
                        steps = result.get("steps", [])
                        result["title"] = result.get("title", sim_intent["label"])
                        # 跳过 LLM 调用，直接使用模拟器数据
                        # 跳到第 7 步（推送 step:preview）
                        await self._send_simulator_result(websocket, ws_manager, conv_id, msg_id, result, steps, content)
                        return
                except Exception as e:
                    logger.error(f"模拟器生成失败: {e}", extra={"data": {"convId": conv_id}})
                    # 降级到 LLM 生成

            # 5b. 调用 LLM Gateway 生成演示（传入 Profile + 分析结果作为上下文）
            try:
                result = await llm_gateway.generate_demo(content, conv_id, teacher_profile=teacher_profile, sql_analysis=sql_analysis)
                steps = result.get("steps", [])
            except asyncio.CancelledError:
                raise  # 由 manager.py 的 task.cancel() 发起，向上传播
            except Exception as e:
                logger.error(f"LLM 生成失败: {e}", extra={"data": {"convId": conv_id}})
                await ws_manager.send_personal(websocket, "demo:complete", {
                    "demoId": f"demo_{conv_id}",
                    "title": f"演示: {content[:30]}",
                    "steps": [
                        {"index": 1, "stage": "error", "title": "处理异常",
                         "content": f"AI 处理过程中出现错误: {str(e)[:100]}"},
                    ],
                })
                return

            # 5. 检查打断（CancelledError 优先传播，作为补充）
            if self._check_interrupted(conv_id):
                await self._notify_interrupted(ws_manager, websocket)
                return

            # 6. 为缺少 mermaid 的步骤自动生成可视化（使用 SQL 分析结果）
            if sql_analysis:
                for step in steps:
                    if not step.get("mermaid"):
                        mermaid_result = generate_mermaid(sql_analysis, step.get("stage", ""))
                        if mermaid_result.get("mermaid"):
                            step["mermaid"] = mermaid_result["mermaid"]
                            step["mermaid_type"] = mermaid_result.get("diagram_type", "flowchart")

            # 7. 推送每个步骤的预览（流式生成）
            for step in steps:
                if self._check_interrupted(conv_id):
                    await self._notify_interrupted(ws_manager, websocket)
                    return

                stage = step.get("stage", "")
                stage_label = self._stage_label(stage)
                preview_payload: dict = {
                    "stepIndex": step.get("index", 0),
                    "title": step.get("title", ""),
                    "content": step.get("content", ""),
                    "stage": stage,
                    "stageLabel": stage_label,
                    "interactiveHint": step.get("interactive_hint", ""),
                    "mermaid": step.get("mermaid", ""),
                    "mermaidType": step.get("mermaid_type", ""),
                }
                sim_cfg = step.get("simConfig") or step.get("sim_config")
                if isinstance(sim_cfg, dict) and sim_cfg:
                    preview_payload["simConfig"] = sim_cfg
                await ws_manager.send_personal(websocket, "step:preview", preview_payload)

            # 7. 保存 AI 回复消息 + demo_snapshot 到 PG
            title = result.get("title", f"演示: {content[:30]}")
            demo_id = await self._save_demo_snapshot(conv_id, title, steps, msg_id)

            # 写入 Redis 缓存
            await redis_cache.push_message(conv_id, {
                "id": demo_id,
                "role": "assistant",
                "type": "demo_snapshot",
                "content": {"title": title, "steps": steps},
            })

            # 8. demo:complete 前等待 300ms，给网络上的 chat:interrupt 消息抵达时间
            # asyncio.sleep 是取消点——如果 task.cancel() 在此期间被调用，
            # CancelledError 会在 sleep 内部被抛出，无需手动轮询
            try:
                await asyncio.sleep(0.3)
            except asyncio.CancelledError:
                logger.info("打断请求在 demo:complete 前到达", extra={"data": {"convId": conv_id}})
                return

            # 再检查一次 Event 打断标记
            if self._check_interrupted(conv_id):
                await self._notify_interrupted(ws_manager, websocket)
                return

            complete_payload: dict = {
                "demoId": demo_id,
                "title": title,
                "steps": steps,
            }
            complete_payload.update(self._extract_simulator_metadata(result, steps))
            await ws_manager.send_personal(websocket, "demo:complete", complete_payload)

        except asyncio.CancelledError:
            # task.cancel() — manager.py 发出的打断请求
            logger.info("process_message 被 task.cancel() 取消", extra={"data": {"convId": conv_id}})
            # 发送打断通知（ws 连接仍有效，只取消了任务）
            await self._notify_interrupted(ws_manager, websocket)

        except Exception as e:
            logger.error(f"Agent 处理失败: {e}", extra={"data": {"convId": conv_id}})
            await ws_manager.send_personal(websocket, "demo:complete", {
                "demoId": f"demo_{conv_id}",
                "title": f"演示: {content[:30]}",
                "steps": [
                    {"index": 1, "stage": "error", "title": "处理异常",
                     "content": f"AI 处理过程中出现错误: {str(e)[:100]}"},
                ],
            })
        finally:
            # 清理 per-conversation 打断事件
            self._interrupt_events.pop(conv_id, None)

    async def _notify_interrupted(self, ws_manager, websocket):
        """推送打断通知"""
        await ws_manager.send_personal(websocket, "agent:thinking", {
            "step": "interrupted",
            "message": "生成已中断",
        })

    async def update_simulator(self, websocket, ws_manager, conv_id: str, payload: dict):
        """对话式参数调整 — 增量更新模拟器（simulator:update）

        payload: { simulator_type, params: { ... } }
        不重新生成 demo:complete，只推送 demo:updated 事件。
        """
        sim_type = payload.get("simulator_type", "")
        params = payload.get("params", {})

        logger.info("模拟器参数更新请求", extra={"data": {"convId": conv_id, "simType": sim_type, "params": params}})

        try:
            if sim_type == "bplus_tree":
                result = simulate_bplus_tree(
                    operation=params.get("operation", "insert"),
                    key=params.get("key", 42),
                    order=params.get("order", 4),
                )
            elif sim_type == "transaction":
                result = simulate_transaction(
                    isolation_level=params.get("isolation_level", "READ COMMITTED"),
                    scenario=params.get("scenario", "phantom_read"),
                )
            elif sim_type == "sql_execution":
                result = simulate_sql_execution(
                    sql=params.get("sql", "SELECT ..."),
                    join_type=params.get("join_type", "Nested Loop Join"),
                    tables=params.get("tables", [{"name": "t1", "rows": 100}, {"name": "t2", "rows": 500}]),
                )
            else:
                await ws_manager.send_personal(websocket, "error", {
                    "code": "UNKNOWN_SIMULATOR",
                    "message": f"不支持的模拟器类型: {sim_type}",
                })
                return

            steps = result.get("steps", [])

            # 推送 demo:updated（与 demo:complete 同结构但事件名不同）
            await ws_manager.send_personal(websocket, "demo:updated", {
                "title": result.get("title", "模拟器"),
                "steps": steps,
                "simulator_type": sim_type,
                "simulator_config": {k: result[k] for k in ("operation", "key", "order", "isolation_level", "scenario", "join_type") if k in result},
                "demo_type": "simulator",
            })

        except Exception as e:
            logger.error(f"模拟器更新失败: {e}", extra={"data": {"convId": conv_id}})
            await ws_manager.send_personal(websocket, "error", {
                "code": "SIMULATOR_UPDATE_FAILED",
                "message": f"模拟器参数更新失败: {str(e)[:100]}",
            })

    async def regenerate_step(self, websocket, ws_manager, conv_id: str, payload: dict):
        """局部重写某一步骤（step:regenerate）"""
        step_index = payload.get("stepIndex", 0)
        instructions = payload.get("instructions", "")

        # 单 session 内完成读→改→写（G1）
        async with async_session_factory() as db:
            # 1. 加载最近的 demo_snapshot 消息
            result = await db.execute(
                select(Message)
                .where(Message.conv_id == conv_id, Message.type == "demo_snapshot")
                .order_by(Message.created_at.desc())
                .limit(1)
            )
            snapshot_msg = result.scalar_one_or_none()

            if not snapshot_msg:
                await ws_manager.send_personal(websocket, "error", {
                    "code": "NO_SNAPSHOT",
                    "message": "没有找到演示快照，请先生成一个演示",
                })
                return

            steps = snapshot_msg.content.get("steps", [])
            if step_index < 0 or step_index >= len(steps):
                await ws_manager.send_personal(websocket, "error", {
                    "code": "INVALID_STEP",
                    "message": f"步骤索引 {step_index} 无效，当前共 {len(steps)} 步",
                })
                return

            original_step = steps[step_index]

            # 2. 用 LLM 重写该步
            rewrite_prompt = f"""原始步骤内容：
标题：{original_step.get('title', '')}
内容：{original_step.get('content', '')}

修改要求：{instructions}

请仅输出该步骤的修改结果（JSON，保持与原始结构一致）：
{{
  "title": "修改后的标题",
  "content": "修改后的内容，80-200字"
}}
直接输出 JSON，不要多余说明。"""
            try:
                result_text = await llm_gateway.chat_with_json(rewrite_prompt)
                rewritten = json.loads(result_text)
            except Exception as e:
                await ws_manager.send_personal(websocket, "error", {
                    "code": "REWRITE_FAILED",
                    "message": f"重写步骤失败: {str(e)[:100]}",
                })
                return

            # 3. 更新步骤
            steps[step_index]["title"] = rewritten.get("title", original_step["title"])
            steps[step_index]["content"] = rewritten.get("content", original_step["content"])
            snapshot_msg.content["steps"] = steps

            # 4. 持久化到 PG
            snapshot_msg.content = snapshot_msg.content
            await db.commit()

        # 5. 推送 step:regenerated（与 step:preview payload 一致，G6）
        original_stage = original_step.get("stage", "")
        await ws_manager.send_personal(websocket, "step:regenerated", {
            "stepIndex": step_index,
            "title": steps[step_index]["title"],
            "content": steps[step_index]["content"],
            "stage": original_stage,
            "stageLabel": self._stage_label(original_stage),
            "interactiveHint": original_step.get("interactive_hint", ""),
        })

        # 6. 从编辑操作推断教师风格并异步更新 Profile
        asyncio.create_task(self._update_style_from_edit(
            conv_id, instructions,
            original_step.get("content", ""),
            steps[step_index].get("content", ""),
        ))

    async def export_demo(self, websocket, ws_manager, conv_id: str, payload: dict):
        """导出当前演示（demo:export）"""
        fmt = payload.get("format", "html")

        async with async_session_factory() as db:
            # 加载最新 snapshot
            result = await db.execute(
                select(Message)
                .where(Message.conv_id == conv_id, Message.type == "demo_snapshot")
                .order_by(Message.created_at.desc())
                .limit(1)
            )
            snapshot_msg = result.scalar_one_or_none()

            result = await db.execute(
                select(Conversation).where(Conversation.id == conv_id)
            )
            conv = result.scalar_one_or_none()

        if not snapshot_msg:
            await ws_manager.send_personal(websocket, "error", {
                "code": "NO_DEMO",
                "message": "当前对话没有演示可以导出",
            })
            return

        steps = snapshot_msg.content.get("steps", [])
        title = snapshot_msg.content.get("title", conv.title if conv else "演示")

        if fmt == "html":
            # 生成独立 HTML 教学页
            stage_labels = {
                "lex": "词法分析", "parse": "语法解析",
                "optimize": "查询优化", "plan": "执行计划",
                "execute": "执行过程", "result": "结果分析",
            }
            cards_html = "".join(
                f"""<div class="step-card">
                    <div class="step-header">
                        <span class="step-num">{s.get("index", i+1)}</span>
                        <span class="stage-badge">{html.escape(stage_labels.get(s.get("stage",""), s.get("stage","")))}</span>
                        <strong>{html.escape(s.get("title",""))}</strong>
                    </div>
                    <p>{html.escape(s.get("content",""))}</p>
                </div>"""
                for i, s in enumerate(steps)
            )
            html_content = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8"><title>{html.escape(title)} — DB Demo Studio</title>
<style>
* {{ margin:0; padding:0; box-sizing:border-box; }}
body {{ font-family:-apple-system,system-ui,sans-serif; background:#f1f5f9; color:#1e293b; padding:40px 20px; }}
.container {{ max-width:800px; margin:0 auto; }}
h1 {{ font-size:1.8rem; margin-bottom:8px; }}
.sub {{ color:#64748b; font-size:0.95rem; margin-bottom:32px; }}
.step-card {{ background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:20px; margin-bottom:16px; }}
.step-header {{ display:flex; align-items:center; gap:10px; margin-bottom:8px; }}
.step-num {{ background:#2563eb; color:#fff; width:28px; height:28px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:0.8rem; font-weight:700; }}
.stage-badge {{ background:#eef2ff; color:#4338ca; border:1px solid #c7d2fe; border-radius:999px; padding:2px 10px; font-size:0.75rem; font-weight:600; }}
.step-card p {{ line-height:1.7; color:#475569; }}
.footer {{ text-align:center; margin-top:40px; color:#94a3b8; font-size:0.85rem; }}
</style></head>
<body><div class="container">
<h1>{html.escape(title)}</h1>
<p class="sub">由 DB Demo Studio AI 协作生成</p>
{cards_html}
<div class="footer">DB Demo Studio — AI 协作式数据库课程演示工作台</div>
</div></body></html>"""

            await ws_manager.send_personal(websocket, "demo:exported", {
                "format": "html",
                "content": html_content,
                "filename": f"{html.escape(title[:20])}.html",
            })
        elif fmt == "mermaid":
            # 提取所有步骤的 Mermaid 代码
            mermaid_blocks = []
            for s in steps:
                mermaid_code = s.get("mermaid", "")
                if mermaid_code:
                    stage = s.get("stage", "")
                    stage_label = self._stage_label(stage)
                    mermaid_blocks.append(f"## {stage_label} - {s.get('title', '')}\n\n```mermaid\n{mermaid_code}\n```")
            mermaid_content = "\n\n".join(mermaid_blocks) if mermaid_blocks else "# 未找到 Mermaid 代码"
            await ws_manager.send_personal(websocket, "demo:exported", {
                "format": "mermaid",
                "content": mermaid_content,
                "filename": f"{html.escape(title[:20])}.md",
            })
        elif fmt == "standalone":
            # 生成自包含 HTML（可用于手动嵌入 LMS，非标准 LTI 1.3 包）
            lti_html = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8"><title>{html.escape(title)}</title>
<base target="_blank" />
<style>body{{font-family:system-ui,sans-serif;padding:20px;background:#f8fafc;}}</style>
</head>
<body>
<h1>{html.escape(title)}</h1>
<p>由 DB Demo Studio 生成，可用于 LMS 嵌入（Canvas/Moodle）。</p>
<div class="steps">
{"".join(f'<details><summary>步骤 {s.get("index","?")}: {html.escape(s.get("title",""))}</summary><p>{html.escape(s.get("content",""))}</p></details>' for s in steps)}
</div>
</body></html>"""
            await ws_manager.send_personal(websocket, "demo:exported", {
                "format": "standalone",
                "content": lti_html,
                "filename": f"{html.escape(title[:20])}_lti.html",
            })
        else:
            await ws_manager.send_personal(websocket, "error", {
                "code": "UNSUPPORTED_FORMAT",
                "message": f"不支持的导出格式: {fmt}",
            })

    @staticmethod
    def _looks_like_sql(text: str) -> bool:
        """检测输入是否以 SQL 关键字开头。"""
        upper = text.strip().upper()
        return any(upper.startswith(kw) for kw in ("SELECT", "INSERT", "UPDATE", "DELETE", "CREATE", "DROP", "ALTER", "WITH", "EXPLAIN", "SHOW"))

    @staticmethod
    def _contains_sql(text: str) -> bool:
        """检测文本中是否包含 SQL 语句片段（不限于行首）。"""
        if OrchestratorAgent._looks_like_sql(text):
            return True
        upper = text.upper()
        return any(kw in upper for kw in ("SELECT ", "INSERT ", "UPDATE ", "DELETE ", "JOIN ", "EXPLAIN "))

    async def _send_simulator_result(self, websocket, ws_manager, conv_id, msg_id, result, steps, content):
        """推送模拟器结果（跳过 LLM 调用）"""
        title = result.get("title", "模拟器演示")
        # 保存 demo_snapshot
        demo_id = await self._save_demo_snapshot(conv_id, title, steps, msg_id)
        await redis_cache.push_message(conv_id, {
            "id": demo_id, "role": "assistant", "type": "demo_snapshot",
            "content": {"title": title, "steps": steps},
        })
        # 推送 step:preview
        for s in steps:
            if self._check_interrupted(conv_id):
                await self._notify_interrupted(ws_manager, websocket)
                return
            sim_config = s.get("simConfig", {})
            await ws_manager.send_personal(websocket, "step:preview", {
                "stepIndex": s.get("index", 0),
                "title": s.get("title", ""),
                "content": s.get("content", ""),
                "stage": s.get("stage", "simulator"),
                "simConfig": sim_config,
            })
        # 推送 demo:complete，携带 simulator_type 标记
        await ws_manager.send_personal(websocket, "demo:complete", {
            "demoId": demo_id,
            "title": title,
            "steps": steps,
            "simulator_type": result.get("simulator_type", ""),
            "simulator_config": {k: result[k] for k in ("operation", "key", "order", "isolation_level", "scenario", "join_type") if k in result},
            "demo_type": "simulator",
        })

    @staticmethod
    def _extract_simulator_metadata(result: dict, steps: list) -> dict:
        """从 LLM/模拟器结果中提取前端 SimulatorPreview 所需元数据。"""
        meta: dict = {}
        sim_type = result.get("simulator_type") or result.get("simulatorType")
        if not sim_type:
            for step in steps:
                cfg = step.get("simConfig") or step.get("sim_config")
                if isinstance(cfg, dict) and cfg.get("type"):
                    sim_type = cfg["type"]
                    break
        if sim_type:
            meta["simulator_type"] = sim_type
        sim_config = result.get("simulator_config") or result.get("simulatorConfig")
        if isinstance(sim_config, dict) and sim_config:
            meta["simulator_config"] = sim_config
        demo_type = result.get("demo_type") or result.get("demoType") or result.get("type")
        if demo_type:
            meta["demo_type"] = demo_type
        elif sim_type:
            meta["demo_type"] = "simulator"
        return meta

    @staticmethod
    def _detect_simulator_intent(content: str) -> dict | None:
        """检测用户是否要求启动模拟器"""
        lower = content.lower()
        if "模拟" in lower and OrchestratorAgent._contains_sql(content):
            join_type = "Hash Join" if "hash" in lower else "Sort Merge Join" if "sort" in lower or "merge" in lower else "Nested Loop Join"
            return {"type": "sql_execution", "label": "SQL 执行模拟器", "join_type": join_type}
        if any(kw in lower for kw in ("策略对比", "join对比", "对比join", "对比策略", "nested loop vs", "hash join vs", "sort merge vs", "哪种join", "哪种连接")):
            return {"type": "strategy_compare", "label": "JOIN 策略对比"}
        # 也匹配 "对比 JOIN 策略" 等组合（关键词不连续的情况）
        if "对比" in lower and ("join" in lower or "策略" in lower or "连接" in lower):
            return {"type": "strategy_compare", "label": "JOIN 策略对比"}
        if any(kw in lower for kw in ("b+树", "btree", "b-tree", "b 树", "b树插入", "b树删除")):
            # 尝试提取 key 值
            import re
            nums = re.findall(r"\d+", content)
            key = int(nums[0]) if nums else 42
            op = "delete" if "删除" in lower else "search" if "查找" in lower or "搜索" in lower else "insert"
            return {"type": "bplus_tree", "label": "B+树模拟器", "operation": op, "key": key}
        if any(kw in lower for kw in ("隔离级别", "幻读", "脏读", "不可重复读", "rr级别", "rc级别", "事务模拟")):
            scenario = "dirty_read" if "脏读" in lower else "non_repeatable_read" if "不可重复读" in lower else "phantom_read"
            iso = "SERIALIZABLE" if "序列化" in lower or "可串行化" in lower else "REPEATABLE READ" if "rr" in lower else "READ COMMITTED" if "rc" in lower else "READ UNCOMMITTED" if "ru" in lower or "读未提交" in lower else "READ COMMITTED"
            return {"type": "transaction", "label": "事务模拟器", "isolation_level": iso, "scenario": scenario}
        if any(kw in lower for kw in ("模拟执行", "分步执行", "执行过程", "nested loop", "hash join", "sort merge", "join算法")):
            join_type = "Hash Join" if "hash" in lower else "Sort Merge Join" if "sort" in lower or "merge" in lower else "Nested Loop Join"
            return {"type": "sql_execution", "label": "SQL 执行模拟器", "join_type": join_type}
        return None

    async def _save_user_message(self, conv_id: str, msg_type: str, content: str) -> str:
        """保存用户消息到 PG，返回消息 ID"""
        async with async_session_factory() as db:
            result = await db.execute(select(Conversation).where(Conversation.id == conv_id))
            conv = result.scalar_one_or_none()
            if not conv:
                conv = Conversation(
                    id=conv_id,
                    teacher_id="default",
                    title=f"对话 {conv_id[:8]}",
                )
                db.add(conv)
                await db.flush()

            msg = Message(
                conv_id=conv_id,
                role="user",
                type=msg_type,
                content={"text": content},
            )
            db.add(msg)
            conv.message_count += 1
            await db.commit()
            msg_id = msg.id

        logger.info("消息已持久化", extra={"data": {"convId": conv_id, "msgId": msg_id, "type": msg_type}})
        return msg_id

    async def _save_demo_snapshot(self, conv_id: str, title: str, steps: list, trigger_msg_id: str) -> str:
        """保存演示快照到 PG（assistant 消息 + demo 表）"""
        demo_id = f"demo_{uuid.uuid4().hex[:12]}"
        # 计算当前版本号：查询已有快照数 + 1（G2）
        new_version = 1
        new_order = 1

        async with async_session_factory() as db:
            # 查询当前最大 version 和 snapshot_order
            result = await db.execute(
                select(Demo)
                .where(Demo.conv_id == conv_id)
                .order_by(Demo.version.desc())
                .limit(1)
            )
            latest_demo = result.scalar_one_or_none()
            if latest_demo:
                new_version = latest_demo.version + 1
                new_order = latest_demo.snapshot_order + 1

            # 保存为 assistant 消息，metadata 关联触发消息（C3）
            msg = Message(
                conv_id=conv_id,
                role="assistant",
                type="demo_snapshot",
                content={"title": title, "steps": steps},
                metadata_={
                    "triggerMsgId": trigger_msg_id,
                    "demoId": demo_id,
                    "version": new_version,
                },
            )
            db.add(msg)

            # 保存到 demos 表
            demo = Demo(
                id=demo_id,
                conv_id=conv_id,
                version=new_version,
                snapshot_order=new_order,
                title={"zh": title},
                demo_type="p0",
                content={
                    "steps": steps,
                    "triggerMsgId": trigger_msg_id,
                },
            )
            db.add(demo)

            # 更新对话计数器（M1：user + assistant 都算）
            result = await db.execute(select(Conversation).where(Conversation.id == conv_id))
            conv = result.scalar_one_or_none()
            if conv:
                conv.message_count += 1
                conv.snapshot_count += 1

            await db.commit()

        logger.info("演示快照已持久化", extra={"data": {
            "convId": conv_id, "demoId": demo_id, "version": new_version, "stepCount": len(steps),
        }})
        return demo_id

    def _stage_label(self, stage: str) -> str:
        """获取阶段中文标签"""
        labels = {
            "lex": "词法分析",
            "parse": "语法解析",
            "optimize": "查询优化",
            "plan": "执行计划",
            "execute": "执行过程",
            "result": "结果分析",
        }
        return labels.get(stage, stage)

    async def identify_intent(self, user_input: str) -> str:
        """识别用户意图（关键词匹配）"""
        input_lower = user_input.lower()
        if "select" in input_lower or "join" in input_lower or "sql" in input_lower:
            return "sql_query"
        if "b+树" in input_lower or "btree" in input_lower or "索引" in input_lower:
            return "bplus_tree"
        if "事务" in input_lower or "隔离" in input_lower or "幻读" in input_lower:
            return "transaction"
        return "knowledge_point"

    # ─── 测验系统 ──────────────────────────────────────────

    async def _load_teacher_profile(self, conv_id: str) -> Optional[dict]:
        """加载教师 Profile（Redis 缓存 → PG）"""
        try:
            # 从 teacherId 推断
            teacher_id = conv_id.split(":")[0] if ":" in conv_id else "default"
            client = await redis_cache.get_client()
            if client:
                cached = await client.get(f"teacher:profile:{teacher_id}")
                if cached:
                    logger.info(f"教师 Profile 缓存命中: teacher={teacher_id}")
                    return json.loads(cached)
            # 从 PG 读
            from app.models.teacher import TeacherProfile
            async with async_session_factory() as db:
                result = await db.execute(
                    select(TeacherProfile).where(TeacherProfile.teacher_id == teacher_id)
                )
                profile = result.scalar_one_or_none()
                if profile:
                    data = {
                        "style": profile.style or {},
                        "preferences": profile.preferences or {},
                    }
                    logger.info(f"教师 Profile 已加载: teacher={teacher_id}")
                    return data
                logger.info(f"教师 Profile 不存在，使用默认: teacher={teacher_id}")
        except Exception as e:
            logger.warning(f"教师 Profile 加载失败: {e}")
        return None

    @staticmethod
    async def _infer_style_from_edit(instructions: str, original_content: str, rewritten_content: str) -> dict:
        """从编辑操作推断教师风格偏好"""
        insights = {}
        orig_len = len(original_content)
        new_len = len(rewritten_content)

        # 篇幅偏好
        ratio = new_len / orig_len if orig_len > 0 else 1.0
        if ratio < 0.7:
            insights["detail_level"] = "concise"
        elif ratio > 1.3:
            insights["detail_level"] = "detailed"
        else:
            insights["detail_level"] = "balanced"

        # 风格线索
        instruction_lower = instructions.lower()
        if any(kw in instruction_lower for kw in ("通俗", "简单", "浅显", "易懂")):
            insights["formality"] = "casual"
        elif any(kw in instruction_lower for kw in ("深入", "专业", "正式", "技术")):
            insights["formality"] = "formal"
        if any(kw in instruction_lower for kw in ("举例", "例子", "类比", "比喻")):
            insights["examples"] = "many"

        return insights

    async def _update_style_from_edit(self, conv_id: str, instructions: str, original_content: str, rewritten_content: str):
        """从编辑操作推断风格偏好并持久化到 PG"""
        try:
            insights = await self._infer_style_from_edit(instructions, original_content, rewritten_content)
            if not insights:
                return

            teacher_id = conv_id.split(":")[0] if ":" in conv_id else "default"

            # 更新 PG
            from app.models.teacher import TeacherProfile
            async with async_session_factory() as db:
                result = await db.execute(
                    select(TeacherProfile).where(TeacherProfile.teacher_id == teacher_id)
                )
                profile = result.scalar_one_or_none()
                if not profile:
                    profile = TeacherProfile(teacher_id=teacher_id)
                    db.add(profile)
                current_style = dict(profile.style or {})
                current_style.update(insights)
                profile.style = current_style
                await db.commit()

            # 刷新 Redis 缓存
            client = await redis_cache.get_client()
            if client:
                await client.delete(f"teacher:profile:{teacher_id}")

            logger.info(f"教师风格已自动更新: teacher={teacher_id}, insights={insights}")
        except Exception as e:
            logger.warning(f"教师风格自动更新失败: {e}")

    @staticmethod
    def _normalize_quiz_questions(questions: list, expected_count: int, q_type: str, topic: str) -> list:
        """后处理 LLM 输出题目：规范化格式、补全字段、修正类型、补齐数量"""
        if not questions:
            return []

        normalized = []
        actual_type = q_type
        for i, q in enumerate(questions):
            qid = q.get("id", f"q{i + 1}")
            question_text = q.get("question", "")
            if not question_text:
                continue

            # 强制类型匹配
            if q.get("type") not in ("choice", "true_false"):
                actual_type = q_type

            # 规范化 correct 为单字母
            correct_raw = str(q.get("correct", ""))
            correct_letter = correct_raw.strip()[0].upper() if correct_raw else "A"

            # 确保 options 格式正确
            options = q.get("options", [])
            if not options or not isinstance(options, list):
                if actual_type == "choice":
                    options = ["A. 选项A", "B. 选项B", "C. 选项C", "D. 选项D"]
                else:
                    options = ["T", "F"]

            # 确保 explanation 存在
            explanation = q.get("explanation", "") or f"此题考察 {topic or '当前知识点'}。正确答案是 {correct_letter}。"

            normalized.append({
                "id": qid,
                "type": actual_type,
                "question": question_text,
                "options": options,
                "correct": correct_letter,
                "explanation": explanation,
            })

        # 补齐不足数量（LLM 可能不遵守 count 参数）
        while len(normalized) < expected_count:
            idx = len(normalized) + 1
            if actual_type == "choice":
                normalized.append({
                    "id": f"q{idx}",
                    "type": "choice",
                    "question": f"关于 {topic or '当前知识点'}，以下说法正确的是？",
                    "options": ["A. 说法一", "B. 说法二", "C. 说法三", "D. 说法四"],
                    "correct": "A",
                    "explanation": f"此题考察 {topic or '当前知识点'}。正确答案是 A。",
                })
            else:
                normalized.append({
                    "id": f"q{idx}",
                    "type": "true_false",
                    "question": f"关于 {topic or '当前知识点'}，以下说法是否正确？",
                    "options": ["T", "F"],
                    "correct": "T",
                    "explanation": f"此题考察 {topic or '当前知识点'}。正确答案是 正确。",
                })

        return normalized[:expected_count]

    async def generate_quiz(self, websocket, ws_manager, conv_id: str, payload: dict):
        """AI 出题（quiz:generate）

        payload: {
            count: 3,           # 题目数量
            type: "choice",     # choice | true_false
            topic: "JOIN 查询"   # 知识点/步骤描述（可选）
        }
        """
        count = payload.get("count", 3)
        q_type = payload.get("type", "choice")
        topic = payload.get("topic", "")

        # 参数校验
        if not isinstance(count, int) or count < 1 or count > 10:
            count = 3
        if q_type not in ("choice", "true_false"):
            q_type = "choice"

        # 尝试从最新演示快照获取步骤作为上下文
        context = ""
        try:
            async with async_session_factory() as db:
                result = await db.execute(
                    select(Message)
                    .where(Message.conv_id == conv_id, Message.type == "demo_snapshot")
                    .order_by(Message.created_at.desc())
                    .limit(1)
                )
                snapshot_msg = result.scalar_one_or_none()
                if snapshot_msg:
                    steps = snapshot_msg.content.get("steps", [])
                    context = "\n".join(
                        f"步骤{s.get('index', i+1)} [{s.get('stage', '')}] {s.get('title', '')}: {s.get('content', '')[:100]}"
                        for i, s in enumerate(steps)
                    )
        except Exception:
            pass

        await ws_manager.send_personal(websocket, "agent:thinking", {
            "step": "quiz_generate",
            "message": f"正在生成 {count} 道{q_type}题…",
        })

        prompt = f"""根据以下教学内容生成 {count} 道数据库课程{'选择题' if q_type == 'choice' else '判断题'}。

知识点/主题: {topic or '当前演示内容'}

教学上下文:
{context[:1500] if context else '无具体上下文，根据主题出题'}

要求：
1. 题目覆盖该知识点的核心概念
2. 每道题有明确正确的答案
3. 选择题有 4 个选项，1 个正确答案
4. 判断题标记 true/false
5. 附带简要解析（为什么对/错）

输出 JSON 格式：
{{
  "questions": [
    {{
      "id": "q1",
      "type": "choice",
      "question": "题目内容",
      "options": ["A. 选项1", "B. 选项2", "C. 选项3", "D. 选项4"],
      "correct": "A",
      "explanation": "解析内容"
    }}
  ]
}}
直接输出 JSON，不要多余说明。"""

        try:
            result_text = await llm_gateway.chat_with_json(prompt)
            result = json.loads(result_text)
            questions = result.get("questions", [])
        except Exception as e:
            logger.error(f"quiz:generate LLM 调用失败: {e}")
            questions = []

        # 后处理：规范化 LLM 输出
        questions = self._normalize_quiz_questions(questions, count, q_type, topic)

        if not questions:
            logger.warning(f"quiz:generate 未生成有效题目，降级处理: conv={conv_id}, topic={topic}")
            # 降级：告知用户出题失败
            await ws_manager.send_personal(websocket, "agent:thinking", {
                "step": "warning",
                "message": "出题失败，请稍后重试或换一个知识点。",
            })
            questions = [{
                "id": "q1",
                "type": "choice",
                "question": "关于" + (topic or "当前知识点") + "，以下哪个描述是正确的？",
                "options": ["A. 这是正确描述", "B. 这是错误描述", "C. 不确定", "D. 以上都不对"],
                "correct": "A",
                "explanation": "这是对基本概念的验证题。",
            }]

        await ws_manager.send_personal(websocket, "quiz:generated", {
            "questions": questions,
            "topic": topic,
        })

    async def answer_quiz(self, websocket, ws_manager, conv_id: str, payload: dict):
        """学生答题 + AI 判题讲解（quiz:answer）

        payload: {
            questionId: "q1",
            answer: "A",
            question: {完整题目对象},
            studentId: "stu001",
            topic: "JOIN 查询",    # 知识点主题（可选）
        }
        """
        question_id = payload.get("questionId", "")
        student_answer = payload.get("answer", "")
        question = payload.get("question", {})
        student_id = payload.get("studentId", "")
        topic = payload.get("topic", "")

        correct_answer = question.get("correct", "")
        # 标准化答案前缀比较：correct 可能是 "A" 或 "A. 选项文本"
        correct_letter = correct_answer.strip()[0].upper() if correct_answer else ""
        student_letter = student_answer.strip().upper() if student_answer else ""
        is_correct = student_letter == correct_letter and bool(correct_letter)

        # 用 LLM 生成个性化讲解
        explanation = question.get("explanation", "")
        if is_correct:
            # 正确：简短肯定
            teaching_reply = f"✅ 回答正确！{explanation}"
            logger.info(f"Quiz correct: q={question_id}, student={student_id}")
        else:
            # 错误：AI 对话式引导
            prompt = f"""学生回答了一道数据库题，答案错误。

题目: {question.get('question', '')}
正确答案: {correct_answer}
学生答案: {student_answer}
解析: {explanation}

请用苏格拉底式引导方式，帮助学生理解正确思路。不要直接给答案，而是：
1. 先肯定学生的思考
2. 指出关键误区和为什么
3. 引导学生重新思考
输出简洁的 2-3 句话。"""
            try:
                teaching_reply = await llm_gateway.chat([{"role": "user", "content": prompt}])
            except Exception:
                teaching_reply = f"❌ 回答错误。正确答案是 {correct_answer}。{explanation}"

            logger.info(f"Quiz wrong: q={question_id}, student={student_id}")

        # 记录答题结果到 StudentProgress
        if student_id:
            try:
                from app.database import async_session_factory
                from app.models.student_progress import StudentProgress
                from sqlalchemy import select
                async with async_session_factory() as db:
                    # 查找或创建学生的掌握度记录
                    result = await db.execute(
                        select(StudentProgress).where(
                            StudentProgress.student_id == student_id,
                            StudentProgress.teacher_id == conv_id.split(":")[0] if ":" in conv_id else "default",
                        ).limit(1)
                    )
                    sp = result.scalar_one_or_none()
                    if not sp:
                        sp = StudentProgress(
                            student_id=student_id,
                            teacher_id=conv_id.split(":")[0] if ":" in conv_id else "default",
                            subject=topic or question.get("question", "")[:50],
                        )
                        db.add(sp)
                    sp.total_questions += 1
                    if is_correct:
                        sp.correct_answers += 1
                    answers = list(sp.quiz_answers or [])
                    answers.append({
                        "questionId": question_id,
                        "correct": is_correct,
                        "studentAnswer": student_answer,
                        "correctAnswer": correct_answer,
                        "timestamp": datetime.now(tz=timezone.utc).isoformat(),
                    })
                    sp.quiz_answers = answers[-200:]  # 保留最近 200 条
                    # 更新掌握度（简单模型）
                    mastery = dict(sp.mastery or {})
                    topic = question.get("question", "")[:30]
                    current = mastery.get(topic, 0.5)
                    mastery[topic] = min(1.0, current + 0.1 if is_correct else max(0.0, current - 0.1))
                    sp.mastery = mastery
                    await db.commit()
            except Exception as e:
                logger.warning(f"学生进度记录失败: {e}")

        await ws_manager.send_personal(websocket, "quiz:result", {
            "questionId": question_id,
            "correct": is_correct,
            "correctAnswer": correct_answer,
            "studentAnswer": student_answer,
            "explanation": teaching_reply,
        })


# 全局单例
orchestrator = OrchestratorAgent()
