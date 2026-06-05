# Harness System — AI 协作式开发工装体系

> 学习并使用 Harness Engineering 方法论，通过 CLAUDE.md、feature_list.json、init.sh 等工装文件，让 AI 编码 Agent 更可靠、更可控、更可复用地协作开发。

---

## 仓库结构

```
Harness_Basic_Learning/
├── .agents/skills/harness-creator/    # 全局 Harness Creator skill（链接）
├── .claude/                            # Claude Code 配置
│   ├── settings.local.json             # 权限配置
│   └── skills/harness-creator →        # symlink 到 D:\AgentSkill\...
├── Project/
│   ├── Project_01/                     # DB Demo Studio（AI 协作式数据库课程演示工作台）
│   └── project_02/                     # 第二个项目（待初始化）
├── .gitignore
└── README.md
```

## 分支说明

| 分支 | 用途 |
|------|------|
| `master` | 仅目录结构，不含业务代码 |
| `project-01` | Project_01 的汇合分支 |
| `p01-baseline` | Project_01 标准实现（按 requirements-spec.md 逐步开发） |
| `p01-improved` | Project_01 改进实验（不同架构/策略对比） |
| `project-02` | project_02 的工作分支 |

## 核心项目：DB Demo Studio

**AI 协作式数据库课程演示工作台** —— 教师通过自然语言对话与 AI 协作，完成数据库课程知识点演示的生成、可视化、模拟器搭建、讲解词打磨、测验出题和效果验证。

### 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 19 + Vite 8 + TailwindCSS v4 |
| 后端 | FastAPI + Uvicorn + WebSocket |
| 数据库 | PostgreSQL 16 + Redis 7+ |
| AI | Claude API (Anthropic SDK) + DeepSeek fallback |
| 可视化 | Mermaid / D3.js / ECharts |
| 容器 | Docker (MySQL 8.0 + PostgreSQL 16) |

### 演示能力等级

- **P0 即时演示**：6 阶段分步讲解（词法分析 → 语法解析 → 查询优化 → 执行计划 → 执行过程 → 结果分析）
- **P1 轻量可视化**：Mermaid / ASCII / ECharts 对话生成图表
- **P2 专业模拟器**：SQL 分步执行 / B+树 / 事务隔离 / 锁竞争

## Harness 文件体系（15 文件）

| 文件 | 用途 |
|------|------|
| `AGENTS.md` | Agent 完整指令手册 |
| `CLAUDE.md` | Claude Code 快速参考 |
| `feature_list.json` | 功能跟踪与状态 |
| `init.sh` | 环境初始化与验证 |
| `progress.md` | 会话进度日志 |
| `session-handoff.md` | 跨会话交接 |
| `clean-state-checklist.md` | 30+ 项质量检查 |
| `evaluator-rubric.md` | 评分卡 |
| `quality-document.md` | 质量报告 |
| `docs/ARCHITECTURE.md` | 系统架构文档 |
| `docs/PRODUCT.md` | 产品功能文档 |
| `docs/RELIABILITY.md` | 可靠性文档 |
| `scripts/benchmark.sh` | 性能基准测试 |
| `scripts/cleanup-scanner.sh` | 过期工件扫描 |
| `scripts/check-architecture.sh` | 架构边界验证 |

---

> **核心理念**：模型不重要，Harness 才重要。好的工装让 Agent 从"猜"变成"按规则执行"。
