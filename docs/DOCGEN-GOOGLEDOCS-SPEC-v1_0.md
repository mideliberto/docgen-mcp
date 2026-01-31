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

Google Docs inherits styles from the insertion point. Reset entire paragraph to defaults before applying specific run styles.

### 8.2 Table Cell Styling Order

`updateTableCellStyle` must execute before cell content insertion. Use two-phase request batching.

### 8.3 Additional API Quirks

See [docs/API-QUIRKS.md](./API-QUIRKS.md) for comprehensive documentation of:

- Blank document newline offset (+1 for tableStartLocation)
- Nested list tab consumption (index adjustment after createParagraphBullets)
- No bookmark support (REST API limitation)
- No page number support (no AutoText)
- Image URL requirements (public access, Drive upload workaround)

## 9. Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-30 | Initial specification |
| 1.1 | 2026-01-30 | Added sections 8.3-8.4: Google Docs API quirks and workarounds |
| 1.2 | 2026-01-31 | Consolidated quirks into separate API-QUIRKS.md |
