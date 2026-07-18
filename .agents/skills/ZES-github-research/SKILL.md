---
name: ZES-github-research
description: Deep GitHub research — analyze repos, compare alternatives, evaluate project health, explore codebases, and track issues/PRs. Use when researching libraries, evaluating dependencies, comparing tools, or understanding open-source projects.
metadata:
  origin: ZES
  version: 1.0.0
---

# ZES GitHub Deep Research

Comprehensive GitHub research skill for the ZES ecosystem. Analyze repos, compare alternatives, evaluate health, and explore codebases.

## Auth Setup

ZES has GitHub PATs configured in `~/.zes/.env`:
- `GITHUB_PAT_ZESCODE` — ZESCODE org access
- `GITHUB_PAT_ARFAXDEV` — arfaXdev access

```bash
export GITHUB_TOKEN=$(grep GITHUB_PAT_ZESCODE ~/.zes/.env | cut -d= -f2)
```

## 1. Deep Repo Analysis

Analyze any GitHub repo for fitness, health, and patterns.

```bash
# Repo info (stars, forks, issues, language, license)
gh repo view owner/repo --json name,description,stargazerCount,forkCount,issues,primaryLanguage,licenseInfo,createdAt,updatedAt,pushedAt,defaultBranchRef

# Recent commit activity (last 30 days)
gh api repos/owner/repo/stats/commit_activity

# Contributor activity
gh api repos/owner/repo/stats/contributors

# Dependency graph
gh api repos/owner/repo/dependency-graph/sbom

# README analysis
gh api repos/owner/repo/readme --jq '.content' | base64 -d | head -100
```

## 2. Project Health Evaluation

Score a project on these dimensions:

| Metric | Good | Warning | Bad |
|--------|------|---------|-----|
| Stars | >1k | 100-1k | <100 |
| Last push | <30d | <90d | >90d |
| Open issues | <50 | 50-200 | >200 |
| PR merge time | <7d | <30d | >30d |
| Contributors | >10 | 3-10 | <3 |
| License | MIT/Apache | BSD | None/Proprietary |
| Release cadence | Monthly | Quarterly | None |

```bash
# Quick health check
gh repo view owner/repo --json stargazerCount,forkCount,issues,licenseInfo,updatedAt
gh api repos/owner/repo/issues?state=open --jq 'length'
gh api repos/owner/repo/pulls?state=open --jq 'length'
gh api repos/owner/repo/releases/latest --jq '.published_at' 2>/dev/null
```

## 3. Compare Alternatives

When evaluating libraries/tools for ZES:

```bash
# Search repos by topic
gh search repos "topic:llm-agent" --sort stars --limit 10

# Search by description
gh search repos "unified memory" --language python --sort stars --limit 10

# Compare two repos
for repo in "owner/repo-a" "owner/repo-b"; do
  echo "=== $repo ==="
  gh repo view $repo --json stargazerCount,forkCount,updatedAt,primaryLanguage
done
```

### Comparison Matrix Template

| Feature | Option A | Option B | ZES Fit |
|---------|----------|----------|---------|
| Stars | | | |
| Last updated | | | |
| Python/Node | | | |
| License | | | |
| Active maintenance | | | |
| Community size | | | |
| Integration ease | | | |

## 4. Codebase Exploration

```bash
# List repo structure
gh api repos/owner/repo/git/trees/main?recursive=1 --jq '.tree[].path' | head -50

# Find key files
gh api repos/owner/repo/git/trees/main?recursive=1 --jq '.tree[].path' | grep -E "(package\.json|requirements\.txt|Makefile|docker-compose|\.env\.example|README)"

# Read specific file
gh api repos/owner/repo/contents/src/main.py --jq '.content' | base64 -d

# Search code
gh search code "memory provider" --repo owner/repo --limit 10

# Search commits
gh api repos/owner/repo/commits --jq '.[].commit.message' | head -20
```

## 5. Issue & PR Research

```bash
# Open issues by label
gh api repos/owner/repo/issues?state=open --jq '.[].labels[].name' | sort | uniq -c | sort -rn

# Recent closed PRs (velocity indicator)
gh pr list --repo owner/repo --state merged --limit 10

# Check CI status
gh api repos/owner/repo/actions/runs?per_page=5 --jq '.workflow_runs[].conclusion'

# Release history
gh api repos/owner/repo/releases --jq '.[].tag_name' | head -10
```

## 6. ZES-Specific Research

When researching for the ZES ecosystem:

### Providers to Research
- LLM providers (free tier analysis)
- Vector stores for memory
- Real-time communication (WebSocket)
- Authentication solutions
- Database options (SQLite, Postgres, Supabase)

### Libraries to Evaluate
- Dashboard frameworks (React, Radix UI, shadcn)
- Memory/vector solutions (ChromaDB, FAISS, LanceDB)
- Agent frameworks (LangChain, CrewAI, AutoGen)
- Deployment tools (Cloudflare Workers, Wrangler)

## 7. Research Report Template

```markdown
# Research: [Topic]
Date: [date]
Researcher: ZES-github-research

## Summary
[One paragraph overview]

## Options Evaluated

### [Option 1]
- Repo: owner/repo
- Stars: X | Forks: X | Last push: X
- License: X
- Pros: ...
- Cons: ...
- ZES Fit: [High/Medium/Low]

### [Option 2]
...

## Recommendation
[Best option for ZES with rationale]

## Next Steps
- [ ] Install/test recommended option
- [ ] Create integration skill if adopted
- [ ] Update ZES provider manager config
```

## 8. GitHub API Rate Limits

```bash
# Check remaining rate limit
gh api rate_limit --jq '.rate.remaining'

# Authenticated: 5000/hour
# Unauthenticated: 60/hour
```

Always use authenticated requests for deep research.
