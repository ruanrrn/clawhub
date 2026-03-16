# Model Speedtest

English | [简体中文](README.zh-CN.md)

![OpenClaw Skill](https://img.shields.io/badge/OpenClaw-Skill-00A98F?style=flat-square&logo=data:image/svg%2bxml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIHZpZXdCb3g9IjAgMCAxMCAxMCI+PHBhdGggZD0iTTEgNWwtMSAxbDEtMSAxbDItLTFoIiBmaWxsPSIjZmZmIiBzdHJva2U9IiNmZmYiIHN0cm9rZS13aWR0aD0iMiIvPjwvc3ZnPg==)
![Focus-Utility](https://img.shields.io/badge/Focus-Utility-FF5722?style=flat-square)
![Works-Standalone](https://img.shields.io/badge/Works-Standalone-4CAF50?style=flat-square)
![Artifact-.skill Included](https://img.shields.io/badge/Artifact-.skill%20Included-9C27B0?style=flat-square)
![License-MIT](https://img.shields.io/badge/License-MIT-59AED9?style=flat-square)

Benchmark API response latency for all configured AI models with automatic protocol detection.

## Overview

Model Speedtest is an OpenClaw skill that tests response time of all AI models configured in your `openclaw.json`. It sends a minimal "ping" request to each model and measures round-trip latency, providing a complete performance ranking.

## Why this exists

Understanding AI model performance across different providers requires consistent, automated testing. Model Speedtest eliminates manual ping tests by:

- Automatically discovering all models from your configuration
- Using the correct protocol for each provider (OpenAI Completions, OpenAI Responses, Anthropic Messages)
- Measuring precise round-trip time
- Displaying results in a sorted latency table

## Scope

This skill is focused on model performance testing:

- Tests all models from all configured providers
- Supports multiple API protocols dynamically
- Shows failed models with error reasons
- Ranks results by latency (fastest to slowest)
- Provides provider-level breakdown and summary statistics

## What the standard covers

- Dynamic protocol detection from provider configuration
- Automatic timeout handling (5 seconds per request)
- Error classification (auth failed, rate limit, timeout, API error)
- Support for reasoning models that return thinking content
- Bilingual output with status emojis

## Workflow summary

1. Read `openclaw.json` to discover providers and models
2. Detect API protocol for each provider
3. Send "ping" request using appropriate adapter
4. Measure response time
5. Classify status (OK, Non-pong, Timeout, etc.)
6. Display results grouped by provider
7. Rank all models by latency
8. Show summary statistics

## When to use it

- Before choosing a model for a time-sensitive task
- When monitoring API performance over time
- When comparing providers (BigModel vs ARK vs Rightcode)
- After updating model configurations to verify connectivity
- When debugging slow API responses

## Examples

Test all models and see latency ranking:

```bash
node skills/model-speedtest/scripts/main.js
```

Output example:

```
🔍 Model Speedtest

Reading configuration...
Found 3 providers: rightcode, bigmodel, ark

📋 Protocols detected:

  rightcode: openai-responses (8 models)
  bigmodel: openai-completions (7 models)
  ark: openai-completions (1 models)

Testing 16 models...

================================================================================
ALL MODELS SORTED BY LATENCY
================================================================================

| Rank | Model | Provider | Latency | Status | Reason |
|------|-------|----------|---------|--------|---------|
| 1 | glm-5 | bigmodel | 250ms | ❌ API error | Subscription not enabled |
| 2 | glm-4.5 | bigmodel | 570ms | ⚠️ Non-pong | Responsive but returned non-pong |
| 3 | ark-code-latest | ark | 787ms | ✅ OK | Perfect pong |

🏆 Fastest (OK): glm-4.5 (bigmodel) - 570ms
🐌 Slowest (OK): glm-4.6 (bigmodel) - 938ms
```

## Related skill repos

These repositories are related examples, not required dependencies:

- [clawhub](https://github.com/openclaw/clawhub) - For distributing and installing skills
- [skill-publish](https://github.com/openclaw/skills/tree/main/skill-publish) - Standard for publishing skill repos

## Install

### Using ClawHub

```bash
clawhub install model-speedtest
```

### Manual install

Clone this repository to your OpenClaw workspace:

```bash
cd /root/.openclaw/workspace/skills
git clone <repo-url> model-speedtest
```

## What this repo contains

```
model-speedtest/
├── SKILL.md                    # Skill documentation and triggers
├── README.md                    # English documentation
├── README.zh-CN.md               # Chinese documentation
├── LICENSE                      # MIT license
├── CONTRIBUTING.md               # Contribution guidelines
├── scripts/
│   ├── main.js                  # Main test script
│   ├── protocols/
│   │   ├── openai-completions.js
│   │   ├── openai-responses.js
│   │   └── anthropic-messages.js
│   └── utils/
│       ├── read-config.js
│       └── format-output.js
└── references/
    └── api-specs.md             # API format documentation
```

## Repository layout

- `SKILL.md` - Skill metadata and documentation
- `scripts/` - JavaScript test scripts and protocol adapters
- `protocols/` - API protocol adapters (OpenAI Completions, Responses, Anthropic)
- `utils/` - Configuration reading and output formatting utilities
- `references/` - API specification documentation

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.

## Release hygiene

When releasing updates to this skill:

- Regenerate the `.skill` artifact: `python3 scripts/package_skill.py`
- Test against all configured providers
- Update SKILL.md description if triggers change
- Sync changes between README.md and README.zh-CN.md

## Repository

[Repository](https://github.com/your-username/model-speedtest)
