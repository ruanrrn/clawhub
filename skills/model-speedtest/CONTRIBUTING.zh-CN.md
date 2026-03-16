# 贡献指南

感谢您对 Model Speedtest 的兴趣！

## 范围

本仓库专注于模型性能测试。贡献应符合此范围：

- 新增 AI 提供商的协议适配器
- 错误处理改进
- 输出格式增强
- 文档改进
- 现有功能的错误修复

## 工作流程

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -am 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 发起 Pull Request

## Pull Request 指南

优质的 PR 应该：

- 在标题中清晰描述更改
- 在描述中解释为什么需要此更改
- 包含新功能的测试
- 保持 README.md 和 README.zh-CN.md 的同步
- 维持与现有文件的代码风格一致性

## 仓库原则

- 保持简单，专注于延迟测试
- 避免添加不相关的工具或功能
- 优先保证可靠性和清晰的输出，而非巧妙的技巧
- 确保更改在所有支持的协议上都能工作

## 不适合提交的内容

- 与模型测试无关的功能
- 将核心目的从延迟测量改变
- 为简单任务添加复杂的依赖
- 没有充分理由破坏向后兼容性

感谢贡献！
