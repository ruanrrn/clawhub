---
name: github-publish-skill
description: "Publish or republish an OpenClaw skill to the unified openclaw repository (https://github.com/ruanrrn/openclaw). Skills are published to the `skills/` subdirectory instead of creating separate repositories. Use when: (1) publishing a new skill to the unified repository, (2) republishing an existing skill after updates, (3) standardizing README, CONTRIBUTING, and repo metadata for a skill."
---

# GitHub Publish Skill

Publish an OpenClaw skill to GitHub like a finished artifact instead of a folder dump.

## Scope

Use this skill only for publishing skills to the unified `openclaw` repository.

Skills are published to the `skills/` subdirectory of the unified repository, not as separate repos. A skill package typically includes:

- `skills/<skill-name>/SKILL.md`
- `skills/<skill-name>/dist/<skill-name>.skill`
- optional skill resources such as `references/`, `scripts/`, or `assets/`

Do not use this skill as a generic GitHub beautifier for arbitrary codebases, libraries, apps, or mixed-purpose repos.

## What this skill owns

This skill combines two responsibilities:

1. publish or republish a skill to the unified openclaw repository (skills/ subdirectory)
2. shape that skill so it looks complete, standalone, and reusable as a public skill

## Publish workflow

### 1. Validate the skill

Before publishing, ensure:

- `SKILL.md` exists and has valid `name` + `description` frontmatter
- bundled references or assets resolve correctly
- the skill packages cleanly into `.skill`

### 1.5 Run a secret risk scan (mandatory)

Before creating commits or pushing to a public repo, scan for obvious secrets.

Minimum requirements:

- scan tracked + untracked files in the repo payload (exclude `.git/` and `dist/`)
- fail closed: if anything looks like a secret, stop and ask before pushing
- never paste secret values into chat or commit messages; report only file + line

Recommended tooling:

- run `python3 scripts/secret_scan.py <repo-root>` from this skill repo's `scripts/` directory
- also sanity-check that files like `.env`, `*.pem`, `*.key`, `id_rsa`, and `id_ed25519` are not present

If the scan flags findings:

- remove the secret from the repo
- rotate/revoke the credential if it may have been exposed
- add/verify `.gitignore` rules so it cannot happen again

### 2. Prepare the repo payload

A polished public skill repo should usually include:

- `README.md`
- `README.zh-CN.md` (recommended for bilingual repos)
- `LICENSE`
- `CONTRIBUTING.md`
- `dist/<skill>.skill`
- `<skill>/SKILL.md`

### 3. Create or update the skill in the unified repository

Typical local flow for the unified repository:

```bash
# Clone or update the unified repository
cd /tmp
rm -rf openclaw
gh repo clone ruanrrn/openclaw

# Copy the skill to the skills/ directory (without git history)
rsync -av --exclude='.git' --exclude='.gitignore' \
  /root/.openclaw/workspace/skills/<skill-name>/ \
  openclaw/skills/<skill-name>/

# Package and copy the .skill artifact
python3 /root/.nvm/versions/node/v22.22.0/lib/node_modules/openclaw/skills/skill-creator/scripts/package_skill.py \
  /root/.openclaw/workspace/skills/<skill-name> \
  /root/.openclaw/workspace/dist
mkdir -p openclaw/skills/<skill-name>/dist
cp /root/.openclaw/workspace/dist/<skill-name>.skill \
  openclaw/skills/<skill-name>/dist/

# Commit and push
cd openclaw
git add skills/<skill-name>/
git commit -m "Add <skill-name> skill"
git push
```

### 4. Set GitHub metadata

Keep metadata aligned with the skill's real scope:

- description should match the skill trigger language and README
- topics should be concise and family-consistent
- default branch should be `main`

### 5. Republish cleanly

On updates:

- sync the skill source from workspace to the unified repository
- regenerate the `.skill` artifact
- refresh README or assets if the public behavior changed
- commit and push with a descriptive message

Example update flow:

```bash
cd /tmp/openclaw
rsync -av --exclude='.git' --exclude='.gitignore' \
  /root/.openclaw/workspace/skills/<skill-name>/ \
  skills/<skill-name>/
python3 /root/.nvm/versions/node/v22.22.0/lib/node_modules/openclaw/skills/skill-creator/scripts/package_skill.py \
  /root/.openclaw/workspace/skills/<skill-name> \
  /root/.openclaw/workspace/dist
cp /root/.openclaw/workspace/dist/<skill-name>.skill \
  skills/<skill-name>/dist/
git add skills/<skill-name>/
git commit -m "Update <skill-name> skill"
git push
```

## Unified repository policy

All public skills are published to the unified `openclaw` repository:

- **Repository:** https://github.com/ruanrrn/openclaw
- **Skills location:** `skills/<skill-name>/`
- **Do not:** Create separate GitHub repositories for individual skills
- **Do:** Add/update skills in the unified repository's `skills/` directory

Benefits of the unified approach:

- Single point of maintenance
- Easier discovery and navigation
- Consistent structure across all skills
- Reduced repository proliferation

## Public skill repo style

The public style guidance in this skill applies only to skill repositories.

If a repo is not primarily a distributable OpenClaw skill repo, stop and use a different standard.

### README structure

Default structure:

1. title
2. language switcher
3. badge row
4. one-sentence description
5. optional scope callout for hard-boundary repos
6. `Overview`
7. `Why this exists`
8. `Scope`
9. `What the standard covers` or another repo-specific capability section
10. `Workflow summary` when the repo defines an operational workflow
11. `When to use it`
12. representative examples or outcomes
13. `Related skill repos` marked as optional examples, not required dependencies
14. `Install`
15. `What this repo contains`
16. `Repository layout`
17. `Contributing`
18. `Release hygiene`
19. `Repository`

### README voice

Write like a serious open-source tool, not an internal note dump and not marketing fluff.

Aim for:

- precise positioning in the first sentence
- professional, public-facing prose that can survive being read cold on GitHub
- explicit scope boundaries instead of relying on implication
- examples framed as representative outcomes, not casual chat transcripts unless the repo genuinely needs raw transcript style
- short, information-dense paragraphs instead of slogan piles
- bilingual parity when both `README.md` and `README.zh-CN.md` exist

### Translation quality (bilingual repos)

When maintaining both English (`README.md`) and Chinese (`README.zh-CN.md`) versions:

- **Translate meaning, not words.** Avoid literal translations that sound awkward or unnatural. Focus on conveying the same intent and information in a way that native speakers would express it.
- **Match technical terminology.** Use consistent translations for technical terms throughout both versions.
- **Maintain structure parity.** Headers, sections, and formatting should align between both versions. If you add a section to one, add it to the other.
- **Avoid machine-translation artifacts.** Watch out for common MT errors like:
  - Overly formal or stiff phrasing that doesn't match the original tone
  - Mistranslated idioms or cultural references
  - Inconsistent terminology across sections
  - Sentences that are grammatically correct but semantically wrong
- **Review by native speakers when possible.** If you're unsure about translation quality, ask a native speaker to review it.
- **Keep both versions updated.** When you change content in one language, update the other immediately. Stale translations create confusion.

### Badge pattern

Use a small consistent badge set near the top.

Typical badges:

- `OpenClaw Skill`
- `Focus-...`
- `Works-Standalone`
- `Artifact-.skill Included`
- `License-MIT`

Optional badges:

- `README-Bilingual`
- a lane-specific capability badge when it adds clarity

### CONTRIBUTING rule

Keep `CONTRIBUTING.md` short and repo-specific.

It should explain:

- what changes belong in the repo
- what changes do not
- whether `.skill` artifacts must be regenerated after material changes
- what a good PR should explain
- the repo's role inside its skill family

## Family rule

In the unified repository, skills should:

- keep each skill independently useful and self-contained
- treat related skills as optional companions, not hidden dependencies
- maintain consistent structure and style across all skills
- let skills coexist peacefully without creating unnecessary dependencies

## References

Read `references/public-skill-style.md` when shaping README, badges, and CONTRIBUTING sections.
