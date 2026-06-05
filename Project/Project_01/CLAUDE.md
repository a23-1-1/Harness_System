# CLAUDE.md — AI 协作式数据库课程演示工作台

## 项目定位

用户在与 AI 的多轮对话中，协作完成数据库课程知识点演示的 **生成、可视化、模拟器搭建、讲解词打磨、测验出题和效果验证**。所有功能都可 **对话触发、对话优化、对话反馈**。

## 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端 | **Streamlit** | 快速搭建交互式演示 UI，天然支持对话式界面 |
| 可视化 | **graphviz / matplotlib / plotly** | 数据库关系图、查询执行计划、B+树/Bloom Filter 可视化 |
| 模拟器 | **Python 类实现** | 简易数据库引擎模拟（B+树、哈希索引、查询执行器等）|
| AI 接口 | **Claude API (Anthropic SDK)** | 对话驱动、讲解词生成、测验出题 |
| 测试 | **pytest** | 单元测试 + 集成测试 |
| 依赖管理 | **pip + venv** | 标准 Python 虚拟环境 |

## Startup Workflow

1. **确认工作目录** — 确保在 `Project/Project_01/`
2. **读此文件** — 了解项目规则
3. **运行 `./init.sh`** — 激活虚拟环境、装依赖
4. **读取 `feature_list.json`** — 了解当前功能状态
5. **读取 `progress.md`** — 了解上次进度

如果 init.sh 失败，先修复环境再开发。

## 工作规则

- **一次一个功能**：从 `feature_list.json` 选一个未完成功能
- **对话优先**：所有功能都应支持通过对话触发和调整
- **验证必过**：不通过验证不能标记完成
- **更新制品**：每次结束前更新 progress.md 和 feature_list.json
- **保持干净**：下个会话能直接 `./init.sh` 启动

## 完成标准

一个功能完成必须满足**全部**：

- [ ] 功能行为实现并可通过对话触发
- [ ] 可视化/模拟器/测验等输出可展示
- [ ] pytest 通过
- [ ] 证据记录在 feature_list.json 或 progress.md

## 结束会话

1. 更新 `progress.md`
2. 更新 `feature_list.json`
3. 记录阻塞项和风险
4. 提交代码（有意义的 commit message）
5. 确保下次可 `./init.sh` 直接启动

## 验证命令

```bash
./init.sh          # 完整验证
pytest .           # 跑测试
streamlit run app.py --server.port 8501  # 启动工作台
```

## 晋升规则

- **架构决策**：先看已有模块，再问用户
- **需求不清晰**：先看对话历史记录，再问用户
- **测试失败**：修复后重跑，连续失败标记阻塞
- **范围模糊**：重读 feature_list.json 中的完成标准
