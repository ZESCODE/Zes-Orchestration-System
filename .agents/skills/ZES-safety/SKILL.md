---
name: ZES-safety
description: Safety checks — prevent destructive operations on production systems, verify rollback capability, and validate before autonomous actions.
metadata:
  origin: ZES
  version: 1.0.0
---

# ZES Safety

Prevents destructive operations across the ZES production ecosystem.

## Production Safeguards
- **No** deleting Cloudflare Pages projects without confirmation
- **No** modifying `~/.zes/memory_hub.sqlite` without backup
- **No** overwriting `~/.codex/config.toml` without review
- **No** revoking API keys without replacement

## Before Any Destructive Operation
1. Backup affected data
2. Verify rollback path exists
3. Check for dependent services
4. Get user confirmation for production changes

## Secret Management
- NEVER hardcode API keys in files
- Use env vars or `~/.zes/.env`
- Rotate keys after any suspected exposure
