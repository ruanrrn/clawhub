# OpenClaw Skills

English | [简体中文](README.zh-CN.md)

![OpenClaw](https://img.shields.io/badge/OpenClaw-Unified%20Skills-111827?style=flat-square)
![Repository](https://img.shields.io/badge/Repository-Open%20Source-F9FAFB?style=flat-square&labelColor=1F2937)
![License-MIT](https://img.shields.io/badge/License-MIT-F9FAFB?style=flat-square&labelColor=111827)

A unified repository containing public OpenClaw skills and scripts.

## Overview

This repository serves as the central home for OpenClaw skills—reusable, shareable agent capabilities that can be installed via ClawHub.

Instead of maintaining separate repositories for each skill, all public skills are organized here under the `skills/` directory, providing a single point of discovery and maintenance.

## Skills

### Available Skills (11)

#### Agent Operations
- **[memory-manager](skills/memory-manager/)** — Manage agent memory: add, search, update, and organize persistent knowledge
- **[operational-fallbacks](skills/operational-fallbacks/)** — Fallback strategies and recovery patterns for common operational failures
- **[restart-continuity](skills/restart-continuity/)** — Preserve and resume in-flight work across restarts
- **[self-improving-agent](skills/self-improving-agent/)** — Self-improvement loop: monitor performance, identify gaps, patch skills
- **[task-orchestrator](skills/task-orchestrator/)** — Coordinate multiple user tasks without naive FIFO handling
- **[todo-continuity](skills/todo-continuity/)** — Preserve and resume TODO state across sessions

#### Skill Management
- **[skill-publish](skills/skill-publish/)** — Publish or republish OpenClaw skills to the unified repository
- **[skill-vetter](skills/skill-vetter/)** — Vet and validate skills before publication or deployment

#### Testing & Debugging
- **[model-speedtest](skills/model-speedtest/)** — Test model latency by measuring API response speed
- **[telegram-exec-approval](skills/telegram-exec-approval/)** — Add or repair Telegram interactive exec approvals

#### Content Processing
- **[weixin-link-reader](skills/weixin-link-reader/)** — Extract and process content from WeChat article links

## Install

### Installing a Skill

Use ClawHub to install any skill from this repository:

```bash
clawhub install ruanrrn/openclaw/skills/<skill-name>
```

For example, to install `memory-manager`:

```bash
clawhub install ruanrrn/openclaw/skills/memory-manager
```

### Manual Installation

If you prefer manual installation:

1. Navigate to the skill directory: `skills/<skill-name>/`
2. Copy `SKILL.md` and any associated files to your OpenClaw skills directory
3. Optionally use the pre-built `.skill` artifact from `dist/`

## Repository Structure

```text
clawhub/
├── skills/                         # All OpenClaw skills (11)
│   ├── memory-manager/            # Memory management
│   ├── model-speedtest/           # Model latency testing
│   ├── operational-fallbacks/     # Failure recovery patterns
│   ├── restart-continuity/        # Restart recovery
│   ├── self-improving-agent/      # Self-improvement loop
│   ├── skill-publish/             # Skill publishing workflow
│   ├── skill-vetter/              # Skill validation
│   ├── task-orchestrator/         # Task coordination
│   ├── telegram-exec-approval/    # Telegram approvals
│   ├── todo-continuity/           # TODO state preservation
│   └── weixin-link-reader/        # WeChat content extraction
└── scripts/                        # Shared utility scripts
```

## Contributing

Contributions are welcome! Please follow these guidelines:

1. **Skill structure**: Each skill should include `SKILL.md`, `README.md`, and ideally `README.zh-CN.md`
2. **Documentation**: Provide clear descriptions, usage examples, and scope boundaries
3. **Artifacts**: Include the packaged `.skill` file in the `dist/` directory
4. **Metadata**: Keep badges, descriptions, and repository topics consistent
5. **Scope**: Focus on OpenClaw-specific agent skills, not general-purpose code
6. **No private data**: Ensure no API keys, secrets, personal data, or private server IPs

For detailed contribution guidelines, see the `CONTRIBUTING.md` file in each skill directory.

## License

This repository is licensed under the MIT License. Each individual skill may have its own license—please check the `LICENSE` file in each skill directory.

## Repository

- **GitHub**: https://github.com/ruanrrn/clawhub
- **License**: MIT
- **Maintainer**: @ruanrrn

## Changelog

### 2026-06-07
- Integrated 6 additional skills from private workspace
- Total skills: 5 → 11
- Added categories: Agent Operations, Skill Management, Testing & Debugging, Content Processing
