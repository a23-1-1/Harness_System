# DB Demo Studio — 可靠性文档

> 面向 AI Agent 的可靠性参考。Agent 在测试和运维时应读此文档理解质量标准和测量方法。

---

## 日志策略

### 日志格式

所有日志使用结构化 JSON 格式：

```json
{
  "timestamp": "2026-06-05T14:30:00.000Z",
  "level": "INFO",
  "service": "indexing-service",
  "message": "Batch indexing complete",
  "data": {
    "documentCount": 3,
    "chunkCount": 14,
    "durationMs": 80
  }
}
```

### 日志级别

| 级别 | 使用场景 | 示例 |
|------|---------|------|
| **DEBUG** | 常规数据访问、文件读取 | "Retrieved chunks for document" |
| **INFO** | 重要事件（用户操作） | "Document imported", "Answer generated" |
| **WARN** | 缺失但非关键数据 | "Content not found for document" |
| **ERROR** | 失败 | "File not found during import" |

### 每个服务的日志点

#### WebSocket Manager
- INFO: 连接建立、连接断开、对话切换
- WARN: 心跳超时、重连失败
- DEBUG: 消息路由

#### LLM Gateway
- INFO: Provider 调用、缓存命中/未命中
- WARN: Provider fallback
- ERROR: 所有 Provider 不可用

#### Conversation Engine
- INFO: 对话创建/删除、消息保存
- DEBUG: 消息读取

#### Agent Runtime
- INFO: Agent 启动、工具调用、任务完成
- DEBUG: 上下文加载

#### MCP 工具服务器
- INFO: 工具调用
- ERROR: 工具调用失败

---

## 清理状态管理

### 重置 API

**IPC 通道**：`app:reset`

**行为**：
1. 清除所有对话和消息（PostgreSQL）
2. 清除所有演示（PostgreSQL）
3. 清除所有 Redis 缓存
4. React 状态重置
5. 要求用户确认（前端弹窗）

### 幂等性

重置操作是幂等的——调用一次或多次结果相同：
- PostgreSQL: `DELETE FROM messages/demos/conversations` 可以安全重复执行
- Redis: `FLUSHDB` 选择性清除本项目 key

### 测试隔离

每次基准测试前：
1. 运行重置
2. 导入标准样本数据
3. 跑基准
4. 运行重置（恢复清理状态）

---

## 基准策略

### 基准套件

**脚本**：`scripts/benchmark.sh`

**任务**：

| 任务 | 测量指标 | 目标值 |
|------|---------|--------|
| 导入 3 个文档 | 耗时 ms | < 200ms |
| 批量索引（3 个文档） | 耗时 ms + 分块数 | < 100ms |
| 查询（有引用） | 耗时 ms | < 300ms |
| 查询（无引用） | 耗时 ms | < 200ms |
| 清理状态重置 | 耗时 ms | < 20ms |
| 对话切换 | 延迟 ms | < 200ms |
| 消息历史加载（50 条） | 耗时 ms | < 100ms |
| WebSocket 重连恢复 | 耗时 ms | < 1000ms |

### 基准样本数据

`data/sample-documents/` 包含：
- `sample-query-join.sql` — JOIN 查询示例
- `sample-query-subquery.sql` — 子查询示例
- `sample-schema-ddl.sql` — 建表 DDL

### 运行方法

```bash
bash scripts/benchmark.sh
```

---

## 错误处理

### WebSocket 断线恢复

```
客户端检测到断线
  → 自动重连（指数退避：1s → 2s → 4s → 8s → 16s max）
  → 重连后发送 conv:switch {convId}
  → 服务端从 Redis session:active:{convId} 恢复上下文
  → 推送 conv:loaded + 最近消息
  → 前端恢复界面状态
```

### LLM Provider 降级链

```
1. Claude Sonnet 4.6（主）
   ↓ 超时/限流/不可用
2. DeepSeek（降级）
   ↓ 也不可用
3. 返回错误 → "AI 服务暂时不可用，请稍后重试"
   同时保留用户最后一条消息，下次重连时自动重试
```

### Redis 不可用降级

```
Redis 不可用
  → 会话状态 → 直接从 PostgreSQL 读取（延迟增加但功能可用）
  → 消息缓存 → 直接从 PostgreSQL 读取
  → Pub/Sub 广播 → 降级为 WebSocket 直接转发
  → LLM 缓存 → 跳过缓存，直接调用 API
  → 限流 → 降级为内存级限流
```

---

## 性能指标

| 指标 | 目标值 | 测量方法 |
|------|--------|---------|
| 对话切换延迟 | < 200ms | `conv:switch` → `conv:loaded` 事件时间差 |
| 消息历史（最近 50 条） | < 100ms | Redis LRANGE 耗时 |
| 消息历史（全量） | < 500ms | PG SELECT + LIMIT 耗时 |
| WebSocket 重连恢复 | < 1s | 断线→界面恢复 |
| AI 首帧响应 | < 500ms | `chat:message` → 第一个 `agent:thinking` |
| LLM 缓存命中率 | > 30% | 缓存命中数 / 总请求数 |
| 课堂广播延迟 | < 100ms | `player:seek` 发送→学生端收到 |
| 并发学生 | > 200 | 压测工具 |
| 前端体积 | < 400KB | `vite build --mode production` 输出 |

---

## 清理扫描

**脚本**：`scripts/cleanup-scanner.sh`

**检测内容**：
1. PG 中的消息是否有对应的对话记录
2. Redis 中是否有过期的 session key（TTL 已过但未删除）
3. 文档导入文件在磁盘上是否存在
4. 演示快照是否有对应的对话
5. 孤立的反馈条目（对话已删除但反馈还在）

---

> 更新此文档的时机：日志策略变更、基准目标值调整、错误处理策略修改、新增降级路径。
