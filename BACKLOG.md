# DocGen-MCP Backlog

## Current State (2026-01-31)

**Status:** Google Docs generation working, auth shares gmail-mcp tokens

| Feature | Status |
|---------|--------|
| Word document generation | Working |
| Google Docs generation | Working |
| Token sharing with gmail-mcp | Working |
| Token refresh persistence | Working |

## Open Issues

*None currently*

## Planned

- [ ] Add `update_google_doc` tool for modifying existing documents
- [ ] Support for inserting images by Drive file ID (not just URL/local path)

## Recently Completed

### 2026-01-31
- Token refresh persistence implemented (saves refreshed tokens back to encrypted storage)
- Documentation standardization

### 2026-01-30
- Google Docs generation fully working
- Token sharing with gmail-mcp implemented
- Rich text formatting, tables, callouts, code blocks
- Image support (URL and local file upload)
- Headers and footers
