# GitHub Publish Skill

English | [简体中文](README.zh-CN.md)

![OpenClaw Skill](https://img.shields.io/badge/OpenClaw-Skill-111827?style=flat-square)
![Focus-Skill Repo Publishing](https://img.shields.io/badge/Focus-Skill%20Repo%20Publishing-F59E0B?style=flat-square&labelColor=111827)
![Works-Standalone](https://img.shields.io/badge/Works-Standalone-F9FAFB?style=flat-square&labelColor=1F2937)
![Artifact-.skill Included](https://img.shields.io/badge/Artifact-.skill%20Included-FDE68A?style=flat-square&labelColor=1F2937)
![README-Bilingual](https://img.shields.io/badge/README-Bilingual-F9FAFB?style=flat-square&labelColor=92400E)
![License-MIT](https://img.shields.io/badge/License-MIT-F9FAFB?style=flat-square&labelColor=111827)

Publish or republish OpenClaw skills as complete public GitHub skill repositories, using a repository standard designed specifically for skill repos.

> [!IMPORTANT]
> This standard applies only to repositories whose primary artifact is an OpenClaw skill. It is not a general README, branding, or GitHub styling guide for apps, libraries, or mixed-purpose codebases.

## Overview

`skill-publish` defines the publication standard for public OpenClaw skill repositories.

It covers both sides of the job:

- publishing or republishing the skill itself
- shaping the repository so it reads like a finished public artifact rather than a raw folder export

In practice, that means packaging the `.skill` artifact, tightening the repository narrative, aligning metadata, and keeping the repo independently understandable for someone who discovers it cold on GitHub.

## Why this exists

Publishing a working skill is easy. Publishing a repository that is understandable, reusable, and credible to other people is the part that is usually under-specified.

Without an explicit standard, public skill repos tend to fail in predictable ways:

- the repository looks like an internal folder dump instead of a deliberate release
- the packaged artifact is missing or visually buried
- the README assumes too much private context
- contribution expectations are unclear
- related repos in the same skill family drift into inconsistent presentation

`skill-publish` exists to turn that failure mode into a documented, repeatable workflow.

## Scope

Use this skill when the repository is primarily a distributable OpenClaw skill repo and you need to make its public surface coherent.

Good fit:

- creating a new public repository for a reusable OpenClaw skill
- republishing a skill after a material update
- upgrading an older skill repo to current public standards
- aligning README, badges, and metadata across a skill family

Not a fit:

- general software projects
- applications or libraries
- mixed repos where the skill is only a side artifact

## What the standard covers

The skill instructs the agent to standardize the parts of a public skill repo that determine whether it feels complete:

- validate the skill before publication
- package the `.skill` artifact cleanly
- assemble a public repo payload with `README.md`, `README.zh-CN.md`, `LICENSE`, `CONTRIBUTING.md`, skill source, and `dist/`
- write repository copy that stands on its own without private context
- align repository description and topics with the skill's real scope
- write README prose like a professional public tool repo, not an internal note dump
- preserve a hard scope boundary so the repo does not turn into a generic GitHub beautifier

## Workflow summary

A typical publication pass should look like this:

1. Validate the skill and confirm that frontmatter, references, and packaging inputs resolve correctly.
2. Generate or refresh the `.skill` artifact.
3. Assemble the repository payload expected from a public release.
4. Rewrite the README and contribution guidance for standalone public consumption.
5. Align repository metadata and badges with the skill's actual role.
6. Republish cleanly after material updates.

## When to use it

Use `skill-publish` when the problem is the repository itself, not the skill logic alone.

Typical triggers:

- "Turn this internal skill into a public GitHub repo."
- "Refresh this repo so it looks like a finished release."
- "Bring this skill repo in line with the rest of the family."
- "Package the artifact and clean up the public-facing repo surface."

## Representative outcomes

### New public skill repository

A reusable internal skill is ready for public release.

A good agent should validate the skill, package the artifact, build the public repository payload, and publish a repo that is readable and installable without side-channel explanation.

### Public repo refresh

An existing skill repo still works, but its public presentation is inconsistent with newer repos in the same family.

A good agent should preserve the working skill, upgrade the README and contribution docs, and keep the repository independently useful.

### Boundary enforcement

Someone tries to reuse this repo standard for a general app or library repository.

A good agent should reject the scope expansion and state clearly that this standard exists for OpenClaw skill repositories only.

## Related skill repos

These repositories are related examples, not required dependencies:

- `task-orchestrator`: multitask orchestration skill example — <https://github.com/ruanrrn/task-orchestrator>
- `restart-continuity`: restart recovery skill example — <https://github.com/ruanrrn/restart-continuity>
- `telegram-exec-approval`: Telegram approval repair skill example — <https://github.com/ruanrrn/telegram-exec-approval>

If the job is publishing or republishing the repository itself, start here.

## Install

Use either path:

1. Import `dist/skill-publish.skill` into an OpenClaw environment.
2. Copy `skill-publish/` into your skills directory if you want the editable source.

## What this repo contains

- `skill-publish/` - the skill source
- `skill-publish/references/public-skill-style.md` - the style blueprint for public skill repositories
- `dist/skill-publish.skill` - the packaged artifact ready to import

## Repository layout

```text
skill-publish/
├── LICENSE
├── README.md
├── README.zh-CN.md
├── CONTRIBUTING.md
├── skill-publish/
│   ├── SKILL.md
│   └── references/
│       └── public-skill-style.md
└── dist/
    └── skill-publish.skill
```

## Contributing

See `CONTRIBUTING.md` for contribution scope, PR expectations, and the boundary that keeps this repo focused on public skill-repo publication instead of generic repository styling.

## Release hygiene

- regenerate `dist/skill-publish.skill` after each material skill change
- keep `README.md`, `README.zh-CN.md`, `SKILL.md`, and repository metadata aligned
- keep the scope boundary explicit: this standard is for skill repositories only
- prefer a narrower, more maintainable publication standard over feature creep

## Repository

- GitHub: `https://github.com/ruanrrn/skill-publish`
- License: MIT
