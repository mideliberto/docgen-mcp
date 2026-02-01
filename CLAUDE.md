# DocGen MCP - Project Instructions

> **Location:** ~/dev/docgen-mcp/
> **Language:** TypeScript
> **Purpose:** Document generation → DOCX or Google Docs

**Read first:** `~/dev/CLAUDE.md` for universal standards (DEVLOG, error handling, workflow).

---

## Project-Specific

### Key Paths
- Entry point: `src/index.ts`
- Google Docs builder: `src/utils/gdocs-builder.ts`
- Section types: `src/types/sections.ts`
- Auth: `src/auth/google-auth.ts` (needs work to share gmail-mcp tokens)

### Testing
- Type check: `npx tsc --noEmit`
- Build: `npm run build`

### Known Issues
- Auth doesn't yet share encrypted tokens with gmail-mcp (see Issue backlog)

## Commit Protocol

Every commit that fixes a bug or adds a feature MUST:

1. Update `CHANGELOG.md` before committing
2. Add entry under `[Unreleased]` in appropriate section (`### Added`, `### Fixed`, `### Changed`)
3. One-line description with affected function/tool names

If `CHANGELOG.md` doesn't exist, create it using Keep a Changelog format.

No commit without changelog entry. No exceptions.

---

*See ~/dev/CLAUDE.md for error handling, DEVLOG requirements, and workflow rules.*
