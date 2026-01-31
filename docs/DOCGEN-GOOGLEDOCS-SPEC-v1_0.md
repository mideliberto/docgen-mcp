# DOCGEN Google Docs Specification v1.0

## 1. Overview

This document specifies the Google Docs generation capabilities of the docgen-mcp server, including supported elements, styling, and known API quirks.

## 2. Supported Elements

- Headings (levels 1-6)
- Paragraphs (plain and formatted)
- Bullet lists (flat and nested)
- Numbered lists (flat and nested)
- Tables (with header styling and borders)
- Callouts (info, warning, critical, success)
- Code blocks (monospace with background)
- Horizontal rules
- Page breaks

## 3. Styling

### 3.1 Colors
- Primary: PWP blue (#1F4E79)
- Header cell background: #D9D9D9
- Border: #CCCCCC

### 3.2 Fonts
- Body: Default Google Docs font
- Code: Consolas, 10pt

## 4. Index Tracking

The Google Docs API uses character indices for all operations. The builder maintains a running index that advances with each insertion.

## 5. Request Batching

All requests are accumulated and sent in a single `batchUpdate` call. Two-phase updates are used when table styling requires the table structure to exist first.

## 6. Table Structure

Tables use the following index formula:
- Structure size: `3 + rows * (cols * 2 + 1)`
- Cell (r, c) base index: `tableStart + 4 + r * (numCols * 2 + 1) + c * 2`

## 7. Authentication

Uses encrypted OAuth tokens shared with gmail-mcp via Fernet encryption. See `src/auth/google-auth.ts`.

## 8. Limitations & Workarounds

### 8.1 Style Bleeding

Google Docs inherits styles from previous content. Use `resetTextStyle` before applying new styles to prevent inheritance.

### 8.2 Table Cell Styling Order

`updateTableCellStyle` must execute before cell content insertion to avoid index corruption.

### 8.3 Blank Document Newline Offset

A newly created Google Doc is not empty—it contains a protected trailing newline at index 1-2. This newline cannot be deleted.

**Impact:** When inserting content at index 1, the phantom newline gets pushed forward. All structural elements (tables, etc.) land at their calculated index + 1.

**Symptom:** `updateTableCellStyle` fails with "The provided table start location is invalid" even when the index appears correct.

**Solution:** Use `tableStartLocation: { index: tableStart + 1 }` for table styling requests.

**Note:** This offset only affects `tableStartLocation` references. Cell content insertions and text styling work correctly because they use indices relative to the table structure, not absolute document position.

### 8.4 Nested List Tab Consumption

Nested bullet and numbered lists use tab characters (`\t`) as nesting level indicators. When `createParagraphBullets` executes, these tabs are consumed/removed from the document.

**Impact:** Index tracking counts inserted tabs, but they don't exist in the final document. Subsequent insertions use inflated indices, causing "Index N must be less than end index" errors.

**Symptom:** Content after nested lists fails to insert. Error message references an index beyond document bounds.

**Solution:** Track total tabs inserted, then subtract from running index after `createParagraphBullets`:
```typescript
let totalTabs = 0;
for (const item of items) {
  const level = item.level ?? 0;
  totalTabs += level;
  this.insertText('\t'.repeat(level) + item.text + '\n');
}
// After createParagraphBullets:
this.index -= totalTabs;
```

**Note:** Tabs must still be inserted—the API uses them to determine nesting depth. They just don't persist in the final document.

## 9. Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-30 | Initial specification |
| 1.1 | 2026-01-30 | Added sections 8.3-8.4: Google Docs API quirks and workarounds |
