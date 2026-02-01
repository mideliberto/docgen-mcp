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

---

*See ~/dev/CLAUDE.md for error handling, DEVLOG requirements, and workflow rules.*
