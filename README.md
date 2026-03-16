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

### Available Skills

- **[skill-publish](skills/skill-publish/)** — Publish or republish OpenClaw skills to the unified repository
- **[task-orchestrator](skills/task-orchestrator/)** — Coordinate multiple user tasks without naive FIFO handling
- **[restart-continuity](skills/restart-continuity/)** — Preserve and resume in-flight work across restarts
- **[telegram-exec-approval](skills/telegram-exec-approval/)** — Add or repair Telegram interactive exec approvals
- **[model-speedtest](skills/model-speedtest/)** — Test model latency by measuring API response speed

## Install

### Installing a Skill

Use ClawHub to install any skill from this repository:

```bash
clawhub install ruanrrn/openclaw/skills/<skill-name>
```

For example, to install `skill-publish`:

```bash
clawhub install ruanrrn/openclaw/skills/skill-publish
```

### Manual Installation

If you prefer manual installation:

1. Navigate to the skill directory: `skills/<skill-name>/`
2. Copy `SKILL.md` and any associated files to your OpenClaw skills directory
3. Optionally use the pre-built `.skill` artifact from `dist/`

## Repository Structure

```text
openclaw/
├── skills/                    # All OpenClaw skills
│   ├── skill-publish/        # Skill publishing workflow
│   ├── task-orchestrator/    # Task coordination
│   ├── restart-continuity/   # Restart recovery
│   ├── telegram-exec-approval/  # Telegram approvals
│   └── model-speedtest/      # Model latency testing
└── scripts/                   # Shared utility scripts
```

## Contributing

Contributions are welcome! Please follow these guidelines:

1. **Skill structure**: Each skill should include `SKILL.md`, `README.md`, and ideally `README.zh-CN.md`
2. **Documentation**: Provide clear descriptions, usage examples, and scope boundaries
3. **Artifacts**: Include the packaged `.skill` file in the `dist/` directory
4. **Metadata**: Keep badges, descriptions, and repository topics consistent
5. **Scope**: Focus on OpenClaw-specific agent skills, not general-purpose code

For detailed contribution guidelines, see the `CONTRIBUTING.md` file in each skill directory.

## License

This repository is licensed under the MIT License. Each individual skill may have its own license—please check the `LICENSE` file in each skill directory.

## Repository

- **GitHub**: https://github.com/ruanrrn/openclaw
- **License**: MIT
- **Maintainer**: @ruanrrn
