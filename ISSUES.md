# GitHub Issues to Create

## Issue 1: Implement token refresh for Google OAuth

**Title:** Implement token refresh for shared Gmail MCP tokens

**Labels:** `tech-debt`, `enhancement`

**Body:**
```markdown
## Summary

Currently, docgen-mcp reads OAuth tokens from gmail-mcp's encrypted storage but cannot refresh them. When tokens expire, users must re-authenticate through gmail-mcp.

## Current Behavior

- Tokens are read from `TOKEN_STORAGE_PATH` (shared with gmail-mcp)
- Tokens are decrypted using `TOKEN_ENCRYPTION_KEY`
- When tokens expire, API calls fail with 401
- User must run gmail-mcp's authenticate tool to refresh

## Desired Behavior

- docgen-mcp should detect expired/expiring tokens
- Automatically refresh using refresh_token
- Write refreshed tokens back to encrypted storage
- Seamless operation without user intervention

## Technical Notes

- Need to implement Fernet encryption for token writes (currently only decryption)
- Should match gmail-mcp's encryption scheme exactly
- Consider race conditions if both MCPs write simultaneously

## Acceptance Criteria

- [ ] Token refresh works automatically
- [ ] Refreshed tokens are encrypted and saved
- [ ] No user intervention required for normal operation
- [ ] Works correctly with concurrent gmail-mcp usage
```

---

## Issue 2: Document Google Docs API Limitations

**Title:** Document REST API limitations for Google Docs generation

**Labels:** `documentation`

**Body:**
```markdown
## Summary

Several Google Docs features are not available through the REST API. These limitations should be documented to set user expectations.

## Known Limitations

### Not Supported via REST API

| Feature | Limitation | Workaround |
|---------|------------|------------|
| Page numbers | `insertPageNumber` not available | Use `[Page #]` placeholder text |
| Bookmarks | `createBookmark` not available | Use heading links or external TOC |
| Table of Contents | No auto-generated TOC | Manual heading list |
| Comments | Cannot create comments programmatically | Use callouts instead |
| Suggestions mode | Cannot create tracked changes | N/A |
| Named styles | Cannot create custom styles | Use explicit formatting |
| Section breaks | Different section types not supported | Use page breaks only |

### Partial Support

| Feature | Notes |
|---------|-------|
| Images | URL must be publicly accessible; local files uploaded to Drive |
| Headers/Footers | Basic text only, no page numbers |
| Lists | Tab-based nesting, limited style options |

## References

- [Google Docs API Reference](https://developers.google.com/docs/api/reference/rest)
- [batchUpdate Request Types](https://developers.google.com/docs/api/reference/rest/v1/documents/request)

## Acceptance Criteria

- [ ] Add "Limitations" section to README.md
- [ ] Add detailed limitations to USAGE.md
- [ ] Consider adding LIMITATIONS.md for comprehensive reference
```

---

## How to Create These Issues

```bash
# Issue 1
gh issue create \
  --title "Implement token refresh for shared Gmail MCP tokens" \
  --label "tech-debt,enhancement" \
  --body-file /tmp/issue1.md

# Issue 2
gh issue create \
  --title "Document REST API limitations for Google Docs generation" \
  --label "documentation" \
  --body-file /tmp/issue2.md
```

Or create manually at: https://github.com/mideliberto/docgen-mcp/issues/new
