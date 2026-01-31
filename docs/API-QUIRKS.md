# Google Docs API Quirks & Gotchas

> **Created:** 2026-01-31  
> **Source:** docgen-mcp development session  
> **Purpose:** Document API behaviors that aren't obvious from documentation

---

## 1. Phantom Newline at Index 1-2

**Problem:** Blank Google Docs contain a protected newline character at index 1-2 that cannot be deleted.

**Symptom:** When inserting content at index 1, structural elements (especially tables) land at calculated index + 1.

**Impact:** `updateTableCellStyle` fails with "invalid table start location" if you use the calculated index.

**Fix:** For `tableStartLocation` in cell styling requests, use `index + 1`:
```typescript
tableCellLocation: {
  tableStartLocation: { index: tableStart + 1 },  // +1 for phantom newline
  rowIndex: 0,
  columnIndex: 0,
}
```

**Note:** This only affects `tableStartLocation` references, not general content insertion.

---

## 2. Nested List Tab Consumption

**Problem:** Tab characters (`\t`) used for nesting levels in lists are consumed by `createParagraphBullets` - they indicate nesting depth but don't persist in the final document.

**Symptom:** Content after nested lists fails with "Index N must be less than end index" because the running index count is wrong.

**Fix:** Track total tabs inserted, subtract from running index after bullet creation:
```typescript
// After createParagraphBullets
this.index -= totalTabs;
```

**Applies to:** Both `insertBulletList` and `insertNumberedList` methods.

---

## 3. Style Bleeding Between Runs

**Problem:** Text styles (bold, italic, color, backgroundColor, strikethrough) propagate to subsequent content via the trailing newline character.

**Symptom:** Yellow highlight on one word causes all following paragraphs to have yellow highlight.

**Root Cause:** If `resetTextStyle` excludes the trailing newline (`end - 1`), the newline retains inherited styles, and the next insertion inherits from that styled newline.

**Fix:** Two-part solution:

1. Include newline in reset range (`end` not `end - 1`)

2. Reset ALL style properties explicitly:
```typescript
textStyle: {
  bold: false,
  italic: false,
  underline: false,
  strikethrough: false,
  foregroundColor: { color: { rgbColor: { red: 0, green: 0, blue: 0 } } },
  backgroundColor: { color: { rgbColor: { red: 1, green: 1, blue: 1 } } },  // white
  weightedFontFamily: { fontFamily: 'Arial' },
  fontSize: { magnitude: 11, unit: 'PT' }
},
fields: 'bold,italic,underline,strikethrough,foregroundColor,backgroundColor,weightedFontFamily,fontSize'
```

**Best Pattern:** Insert all text first, reset entire paragraph to defaults, then apply explicit styles on top.

---

## 4. Two-Phase API Requirements

**Problem:** Some features require creating an element first, getting its ID from the response, then using that ID in subsequent requests.

**Features requiring two-phase:**
- Headers (`createHeader` → `headerId` → insert content with `segmentId`)
- Footers (`createFooter` → `footerId` → insert content with `segmentId`)
- Bookmarks (`createBookmark` → `bookmarkId` → link with `bookmarkId`) *

\* Bookmarks via REST API don't actually work - see limitations below.

**Pattern:**
```typescript
// Phase 1: Create
const phase1Response = await docs.documents.batchUpdate({
  documentId,
  requestBody: { requests: [{ createHeader: { type: 'DEFAULT', sectionBreakLocation: { index: 0 } } }] },
});

// Extract ID from response
const headerId = phase1Response.data.replies[0].createHeader.headerId;

// Phase 2: Populate
await docs.documents.batchUpdate({
  documentId,
  requestBody: { requests: [{ insertText: { location: { segmentId: headerId, index: 0 }, text: 'Header text' } }] },
});
```

---

## 5. Table Cell Styling Order

**Problem:** When inserting table content and styling cells, the order of operations matters.

**Correct order:**
1. Insert table structure (`insertTable`)
2. Insert cell content in **reverse order** (last cell first) to preserve indices
3. Apply cell styling (`updateTableCellStyle`)
4. Apply text styling to cell content

**Why reverse order:** Each insertion shifts subsequent indices. Inserting back-to-front means earlier insertions don't affect indices you haven't used yet.

---

## 6. Alignment Enum Values

**Problem:** Alignment values in the API don't match intuitive names.

**Mapping:**
| Intuitive | API Value |
|-----------|-----------|
| left | `START` |
| center | `CENTER` |
| right | `END` |
| justified | `JUSTIFIED` |

**Applies to:** `updateParagraphStyle` alignment field.

---

## 7. API Limitations (Not Possible via REST API)

| Feature | Status | Workaround |
|---------|--------|------------|
| Table of Contents | ❌ Not available | Manual creation or Apps Script |
| Clickable bookmarks | ❌ `createBookmark` doesn't exist | Visual styling only (blue underline) |
| Auto page numbers | ❌ `insertPageNumber` doesn't work | Placeholder text `[Page #]` |
| Base64 images | ❌ Rejected | Upload to Drive first, use URL |
| Custom list start number | ❌ Not available | Manual numbering as text |
| Different first page header | ⚠️ Complex | Requires section break manipulation |

---

## 8. Token/Auth Quirks

**Shared credentials:** docgen-mcp reads tokens from gmail-mcp's encrypted token file via Fernet decryption.

**Token refresh:** Access tokens expire in 1 hour. gmail-mcp auto-refreshes; docgen-mcp currently does not (tech debt - see GitHub issue #1).

**Workaround:** Re-authenticate when tokens expire. Don't leave multiple auth processes running (causes conflicts).

---

## 9. Drive Upload for Images

**For non-public images:**
1. Upload to Google Drive via Drive API
2. Set permissions to "anyone with link can view"
3. Use URL format: `https://drive.google.com/uc?export=view&id={fileId}`
4. Pass URL to `insertInlineImage`

**Note:** Some URL formats don't work. The `export=view` parameter is required.

---

## Quick Reference: Common Errors

| Error | Likely Cause | Fix |
|-------|--------------|-----|
| "invalid table start location" | Phantom newline offset | Add +1 to tableStartLocation index |
| "Index N must be less than end index" | Tab consumption in lists | Subtract tab count from index after bullets |
| Styles bleeding to next paragraph | Newline inheriting styles | Reset full range including newline |
| Cell alignment not working | Using 'LEFT'/'RIGHT' | Use 'START'/'END' |
| Image not showing | Non-public URL or base64 | Upload to Drive, use public URL |

---

*End of API quirks document*
