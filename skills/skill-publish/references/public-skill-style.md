# Public Skill Style Blueprint

Use this style for polished public OpenClaw skill repositories only.

## Hard boundary

Apply this blueprint only when the repo is primarily a skill repo.

Good fit:

- the repo's main artifact is an OpenClaw skill
- the repo contains `<skill-name>/SKILL.md`
- the repo ships `dist/<skill-name>.skill`

Not a fit:

- general software projects
- libraries
- apps
- mixed repos where the skill is only a small side artifact

## Header pattern

```md
# Skill Name

English | [简体中文](README.zh-CN.md)

![OpenClaw Skill](...)
![Focus-...](...)
![Works-Standalone](...)
![Artifact-.skill Included](...)
![License-MIT](...)

One-sentence repository description.

> [!IMPORTANT]
> Optional hard-boundary callout when the repo standard applies only to a narrow class of repositories.
```

Optional:

- bilingual badge for multilingual repos
- omit the callout when the repo does not need boundary reinforcement at the top

## Required narrative sections

- `Overview`
- `Why this exists`
- `Scope`
- a repo-specific capability section such as `What the standard covers`
- `Workflow summary` when the repo defines a repeatable operational flow
- `When to use it`
- representative examples or outcomes
- `Related skill repos`
- `Install`
- `What this repo contains`
- `Repository layout`
- `Contributing`
- `Release hygiene`
- `Repository`

## README voice

Write for a public GitHub reader who has no private context.

Prefer:

- a precise opening sentence that says what the repo does
- professional product-documentation language over slogans or in-jokes
- explicit scope statements for narrow repos
- representative outcomes and workflows over vague claims
- bilingual consistency when the repo ships `README.md` and `README.zh-CN.md`

Avoid:

- chatty filler that weakens the repo's credibility
- internal shorthand that only makes sense to people already in the project
- overselling a narrow skill as a universal framework

## Translation quality (bilingual repos)

When maintaining both English and Chinese versions:

- **Translate meaning, not words.** Avoid literal translations that sound awkward or unnatural. Focus on conveying the same intent and information in a way that native speakers would express it.
- **Match technical terminology.** Use consistent translations for technical terms throughout both versions.
- **Maintain structure parity.** Headers, sections, and formatting should align between both versions.
- **Avoid machine-translation artifacts.** Watch out for common MT errors:
  - Overly formal or stiff phrasing that doesn't match the original tone
  - Mistranslated idioms or cultural references
  - Inconsistent terminology across sections
- **Keep both versions updated.** When you change content in one language, update the other immediately.

## Related-skills wording

Use wording like:

- "These repositories are related examples, not required dependencies"
- "Start here when the problem is publishing the repository itself"
- "Use the umbrella repo when you want the whole operating model"

## CONTRIBUTING shape

Keep it short. Use these sections:

- title
- `Scope`
- `Workflow`
- `Pull request guidance`
- `Repo principle`

## Family consistency

Across a family of skill repos:

- keep the badge grammar consistent
- keep the README section order close enough to feel related
- let colors and copy vary by repo lane
- keep each repo independently understandable
