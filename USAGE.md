# create_google_doc API Reference

Complete reference for the `create_google_doc` MCP tool.

## Overview

Creates a Google Doc from structured JSON sections. No markdown parsing—all formatting is explicit.

```json
{
  "title": "Document Title",
  "config": "pwp",
  "sections": [...],
  "header": { ... },
  "footer": { ... }
}
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `title` | string | Yes | Document title (also used as filename) |
| `config` | `"tma"` \| `"pwp"` | Yes | Organization context |
| `sections` | Section[] | Yes | Array of content sections |
| `folder_id` | string | No | Google Drive folder ID |
| `header` | HeaderFooter | No | Document header config |
| `footer` | HeaderFooter | No | Document footer config |

## Response

```json
{
  "id": "1abc...xyz",
  "name": "Document Title",
  "webViewLink": "https://docs.google.com/document/d/1abc...xyz/edit"
}
```

---

## Section Types

### heading

```json
{
  "type": "heading",
  "level": 2,
  "text": "Section Title"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `level` | 1-6 | Yes | Heading level (H1-H6) |
| `text` | string | Yes | Heading text |

### paragraph

Simple text:
```json
{
  "type": "paragraph",
  "content": "Plain text paragraph."
}
```

Formatted text:
```json
{
  "type": "paragraph",
  "content": [
    { "text": "This is " },
    { "text": "bold", "bold": true },
    { "text": " and " },
    { "text": "italic", "italic": true },
    { "text": " text." }
  ],
  "alignment": "center",
  "spaceBefore": 12,
  "spaceAfter": 12
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `content` | string \| TextRun[] | Yes | Text or formatted runs |
| `alignment` | `"left"` \| `"center"` \| `"right"` \| `"justified"` | No | Text alignment |
| `spaceBefore` | number | No | Space before (points) |
| `spaceAfter` | number | No | Space after (points) |
| `lineSpacing` | number | No | Line spacing (100=single, 150=1.5, 200=double) |

### bullet_list

Simple:
```json
{
  "type": "bullet_list",
  "items": ["First item", "Second item", "Third item"]
}
```

Nested:
```json
{
  "type": "bullet_list",
  "items": [
    { "content": "Top level", "level": 0 },
    { "content": "Nested item", "level": 1 },
    { "content": "Deeper nested", "level": 2 },
    { "content": "Back to top", "level": 0 }
  ]
}
```

### numbered_list

```json
{
  "type": "numbered_list",
  "items": ["Step one", "Step two", "Step three"],
  "listStyle": "decimal"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `listStyle` | string | `"decimal"` (1, a, i), `"decimal_nested"` (1., 1.1.), `"upper_alpha"` (A, a, i), `"upper_roman"` (I, A, 1) |

### table

Simple:
```json
{
  "type": "table",
  "headers": ["Name", "Role", "Department"],
  "rows": [
    ["Alice", "Engineer", "IT"],
    ["Bob", "Manager", "Operations"]
  ]
}
```

With cell formatting:
```json
{
  "type": "table",
  "headers": ["Status", "Item", "Notes"],
  "rows": [
    [
      { "text": "Complete", "backgroundColor": "C6EFCE", "bold": true },
      "Task A",
      "Done last week"
    ],
    [
      { "text": "Pending", "backgroundColor": "FFEB9C" },
      "Task B",
      "In progress"
    ]
  ],
  "columnWidths": [20, 40, 40]
}
```

With cell alignment:
```json
{
  "type": "table",
  "headers": ["Left", "Center", "Right"],
  "rows": [
    [
      { "text": "Left aligned", "alignment": "left" },
      { "text": "Center aligned", "alignment": "center" },
      { "text": "Right aligned", "alignment": "right" }
    ]
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `headers` | string[] | Column headers |
| `rows` | (string \| TableCell)[][] | Row data |
| `columnWidths` | number[] | Column widths as percentages |

**TableCell:**
| Field | Type | Description |
|-------|------|-------------|
| `text` | string | Cell text |
| `backgroundColor` | string | Hex color without # |
| `bold` | boolean | Bold text |
| `alignment` | `"left"` \| `"center"` \| `"right"` | Text alignment within cell |

### callout

```json
{
  "type": "callout",
  "style": "warning",
  "content": "This is an important warning message."
}
```

| Style | Color |
|-------|-------|
| `info` | Blue background |
| `warning` | Yellow/orange background |
| `critical` | Red background |
| `success` | Green background |

### code_block

```json
{
  "type": "code_block",
  "content": "function hello() {\n  console.log('Hello!');\n}"
}
```

Renders as: gray background, black border, Courier New font.

### horizontal_rule

```json
{
  "type": "horizontal_rule"
}
```

### page_break

```json
{
  "type": "page_break"
}
```

### image

From URL:
```json
{
  "type": "image",
  "url": "https://example.com/image.png",
  "width": 300,
  "alignment": "center"
}
```

From local file:
```json
{
  "type": "image",
  "filePath": "/path/to/image.png",
  "width": 400,
  "height": 300,
  "alignment": "right"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `url` | string | Public image URL |
| `filePath` | string | Local file path (uploaded to Drive) |
| `width` | number | Width in points |
| `height` | number | Height in points |
| `alignment` | `"left"` \| `"center"` \| `"right"` | Image alignment |

**Note:** Local files are uploaded to Drive and made public. Use simple file paths (no special characters).

---

## TextRun Formatting

For rich text in paragraphs, use an array of TextRun objects:

```json
{
  "type": "paragraph",
  "content": [
    { "text": "Normal text " },
    { "text": "bold", "bold": true },
    { "text": " " },
    { "text": "italic", "italic": true },
    { "text": " " },
    { "text": "underlined", "underline": true },
    { "text": " " },
    { "text": "strikethrough", "strikethrough": true },
    { "text": " " },
    { "text": "code", "code": true },
    { "text": " " },
    { "text": "link", "link": "https://example.com" },
    { "text": " " },
    { "text": "red text", "color": "FF0000" },
    { "text": " " },
    { "text": "highlighted", "backgroundColor": "FFFF00" },
    { "text": " " },
    { "text": "large", "fontSize": 18 }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `text` | string | The text content (required) |
| `bold` | boolean | Bold text |
| `italic` | boolean | Italic text |
| `underline` | boolean | Underlined text |
| `strikethrough` | boolean | Strikethrough text |
| `code` | boolean | Monospace font (Consolas) |
| `link` | string | URL for hyperlink |
| `color` | string | Text color (hex without #) |
| `backgroundColor` | string | Highlight color (hex without #) |
| `fontSize` | number | Font size in points |

---

## Headers and Footers

```json
{
  "title": "Report",
  "config": "pwp",
  "header": {
    "text": "PWP Health - Confidential",
    "alignment": "center"
  },
  "footer": {
    "text": "Page ",
    "includePageNumber": true,
    "alignment": "right"
  },
  "sections": [...]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `text` | string | Header/footer text |
| `includePageNumber` | boolean | Add page number placeholder* |
| `alignment` | `"left"` \| `"center"` \| `"right"` | Text alignment |

*Page numbers show as `[Page #]` placeholder (API limitation).

---

## Complete Example

```json
{
  "title": "Q1 2024 IT Status Report",
  "config": "pwp",
  "header": {
    "text": "PWP Health - Internal",
    "alignment": "left"
  },
  "footer": {
    "text": "Confidential",
    "alignment": "center"
  },
  "sections": [
    { "type": "heading", "level": 1, "text": "Executive Summary" },
    {
      "type": "paragraph",
      "content": [
        { "text": "Q1 was a " },
        { "text": "successful", "bold": true, "color": "2E7D32" },
        { "text": " quarter for IT operations." }
      ]
    },
    {
      "type": "callout",
      "style": "success",
      "content": "All major milestones achieved on schedule."
    },
    { "type": "heading", "level": 2, "text": "Key Metrics" },
    {
      "type": "table",
      "headers": ["Metric", "Target", "Actual", "Status"],
      "rows": [
        ["Uptime", "99.9%", "99.95%", { "text": "Met", "backgroundColor": "C6EFCE" }],
        ["Tickets Resolved", "500", "523", { "text": "Met", "backgroundColor": "C6EFCE" }],
        ["Security Incidents", "<5", "2", { "text": "Met", "backgroundColor": "C6EFCE" }]
      ],
      "columnWidths": [30, 20, 20, 30]
    },
    { "type": "heading", "level": 2, "text": "Completed Projects" },
    {
      "type": "numbered_list",
      "items": [
        "MDM rollout (100% device coverage)",
        "Email security hardening",
        "Backup infrastructure upgrade"
      ]
    },
    { "type": "page_break" },
    { "type": "heading", "level": 2, "text": "Q2 Roadmap" },
    {
      "type": "bullet_list",
      "items": [
        { "content": "Infrastructure", "level": 0 },
        { "content": "Cloud migration assessment", "level": 1 },
        { "content": "Network refresh", "level": 1 },
        { "content": "Security", "level": 0 },
        { "content": "Penetration testing", "level": 1 },
        { "content": "Security awareness training", "level": 1 }
      ]
    },
    { "type": "horizontal_rule" },
    {
      "type": "paragraph",
      "content": "Report generated automatically.",
      "alignment": "right"
    }
  ]
}
```

---

## Known Limitations

1. **No real page numbers** - `includePageNumber` adds `[Page #]` placeholder
2. **No bookmarks** - Internal document links not supported via REST API
3. **Local images require simple paths** - Avoid special characters in filenames
4. **Images must be publicly accessible** - Local files are uploaded to Drive with public sharing
