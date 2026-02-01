# DocGen MCP - Project Instructions

> **Location:** ~/dev/docgen-mcp/
> **Language:** TypeScript
> **Purpose:** Document generation → DOCX or Google Docs

---

## Development Logging

Every completed task MUST end with an append to DEVLOG.md:

```markdown
### [Task Title]
**Origin:** [Issue #X | Chat decision | Bug report]
**Task:** [One-line description]
**Changes:**
- [What was done]
**Commits:** [hash]
**Status:** Complete | Partial | Blocked
**Notes:** [Optional - gotchas, follow-up needed]
```

If DEVLOG.md doesn't exist, create it first using the template in the repo.

Commit changes to DEVLOG.md as part of the task commit, or immediately after if the main commit is already pushed.

---

## Project-Specific Notes

- Build: `npm run build`
- Types: `src/types/sections.ts` (do not modify without explicit instruction)
- Validation: `src/schemas/sections.ts` + `src/utils/validate-input.ts`

---
