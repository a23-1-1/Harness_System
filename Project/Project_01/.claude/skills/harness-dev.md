---
name: harness-dev
description: "完整 Harness 开发流程：读文档 → 确认进度 → 创建任务 → 按子功能迭代 → 代码审查 → 功能测试 → 更新进度。用于在 DB Demo Studio 项目中按 AGENTS.md 规范进行功能开发。"
model: sonnet
---

# Harness 开发流程

你在 Project/Project_01 开发的 DB Demo Studio 项目中使用此 skill。

## 启动流程

1. 读 `CLAUDE.md` 了解项目规则
2. 读 `docs/ARCHITECTURE.md` 了解系统架构
3. 读 `docs/PRODUCT.md` 了解功能需求
4. 读 `docs/RELIABILITY.md` 了解测试标准
5. 运行 `bash init.sh` 验证环境
6. 读 `feature_list.json` 确认当前进度

## 开发流程

### 1. 任务拆分
- 将本次功能拆分为 1-4 个独立子任务
- 每个子任务只改相关文件，不修改无关文件
- 创建 TaskCreate 跟踪进度

### 2. 迭代子功能
- 一次只实现一个子功能
- Python 代码添加类型注解
- TypeScript 严格模式
- 每完成一个子任务创建一次 commit

### 3. 代码审查

先运行 `git diff HEAD` 分析变更文件，然后根据变更内容自动生成审查提示词，而不是使用通用模板。

**生成审查提示词的方法：**
1. 运行 `git diff HEAD --name-only` 列出本次改动的文件
2. 按文件类型分类：
   - `backend/app/mcp/servers/`：检查数据结构正确性、空值处理、模拟器逻辑
   - `backend/app/agents/orchestrator.py`：检查调度链路、异常降级
   - `backend/app/ws/manager.py`：检查新事件路由
   - `backend/app/llm/gateway.py`：检查 prompt 变更
   - `frontend/src/hooks/`：检查 D3 hook 的 enter/update/exit 模式、cleanup
   - `frontend/src/components/`：检查组件的空值处理、数据结构对齐
3. 对每个变更文件提出 1-2 个具体问题（如 "simConfig 这个字段后端用的是什么字段名？前端读的是什么字段名？"）
4. 将生成的问题组装成审查提示词输出

输出格式：

```
/code-review
> 对本次变更做代码审查，重点检查：
>
> **后端**
> - [file 1]: [具体问题]
> - [file 2]: [具体问题]
>
> **前端**
> - [file 3]: [具体问题]
>
> **协议一致性**
> - [新事件名] 的 payload 结构前后端是否一致？
>
> **边界情况**
> - [具体边界]
```

### 4. 功能测试

先运行 `git diff HEAD` 分析变更文件，然后根据变更内容自动生成测试提示词。

**生成测试提示词的方法：**
1. 分析 diff 确定核心功能变更
2. 基于变更内容设计测试场景：
   - 场景 1（主功能路径）：用户输入什么 → 预期后端返回什么 → 前端渲染什么
   - 场景 2（数据结构对齐）：遍历前端读取的每个字段名，确认后端对应的字段存在
   - 场景 3（边界/降级）：异常输入、空数据、快速操作
   - 场景 4（重复稳定性）：连续多次操作
3. 将场景组装成测试提示词输出

输出格式：

```
/verify
> 对本次变更做功能测试，验证以下场景：
>
> **场景 1：[功能名称]**
> 1. 输入 [具体提示词]
> 2. 验证 [后端行为]
> 3. 验证 [前端渲染]
>
> **场景 2：字段完整性**
> 1. 检查 demo:complete payload 的 steps 中每个 step 的字段
> 2. 验证前端读取的 [字段A] 在后端产生
> 3. 验证前端读取的 [字段B] 在后端产生
>
> **场景 3：[边界]**
> ...
```

### 5. 进度更新
- 完成后更新 `feature_list.json` 状态（done/in-progress）和 evidence
- 更新 `progress.md` 记录 session 完成内容

### 6. 提交 & PR（手动）

开发过程中生成的 commits 由开发者手动提交：

```bash
git add <changed files>
git commit -m "feat(feat-xxx): 功能描述"
git push origin <branch>
```

PR 也手动创建：
- 访问 https://github.com/a23-1-1/Harness_System/pull/new/<branch>
- 手动填写标题和 body

skill 不会代你执行 `git add`、`git commit` 或 `git push`。

## 文件约束
- 后端：`backend/app/` 下按层组织（agents/、llm/、mcp/、models/、routes/、ws/）
- 前端：`frontend/src/` 下按组件组织（components/、hooks/）
- 数据：PostgreSQL 持久化，Redis 热缓存
- 通信：实时走 WebSocket，CRUD 走 REST
