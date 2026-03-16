# Contributing to GitHub Publish Skill

Keep contributions narrow, practical, and strictly centered on publishing OpenClaw skill repositories.

## Scope

Good contributions:

- clearer guidance for packaging and publishing OpenClaw skills to GitHub
- stronger rules for polished public skill repo presentation
- better examples of repo metadata, README structure, or social-preview handling for skill repos
- improvements that clarify the hard boundary that this style applies only to skill repositories

Avoid:

- turning this repo into a generic GitHub repo beautifier for arbitrary software projects
- mixing in non-skill publishing workflows for apps, libraries, or unrelated codebases
- duplicating all public-skill family docs without improving the canonical publishing workflow

## Workflow

1. Make the smallest useful change.
2. Keep README claims aligned with `github-publish-skill/SKILL.md`.
3. Regenerate `dist/github-publish-skill.skill` after material skill changes.
4. Preserve the hard boundary: the repo style rules are for skill repositories only.

## Pull request guidance

A good PR should explain:

- what changed in the publish workflow or style guidance
- why the change improves public skill publishing specifically
- whether the packaged `.skill` artifact was regenerated
- whether the skill-only scope boundary stayed explicit

## Repo principle

This repo should remain the canonical skill-repo publishing standard for OpenClaw skills, not a universal GitHub repo styling kit.
