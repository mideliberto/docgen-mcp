# docgen-mcp

MCP server for generating professional documents—Word (.docx) and Google Docs—with structured formatting.

## Features

- **Word document generation** from templates (brief, memo, proposal, etc.)
- **Google Docs generation** via structured JSON sections
- **Rich text formatting**: bold, italic, underline, colors, links, code
- **Document elements**: headings, paragraphs, lists, tables, callouts, code blocks
- **Image support**: public URLs or local file upload via Drive
- **Headers/footers** with alignment options
- **Nested lists** with multiple numbering styles
- **Table cell styling**: per-cell backgrounds, bold, and alignment
- **Two contexts**: TMA (consulting) or PWP (internal)

## Prerequisites

- Node.js 18+
- For Google Docs: Google Cloud project with Docs and Drive APIs enabled
- OAuth 2.0 credentials (shares tokens with gmail-mcp)

## Installation

```bash
git clone https://github.com/mideliberto/docgen-mcp.git
cd docgen-mcp
npm install
npm run build
```

## Configuration

### Environment Variables (for Google Docs)

```bash
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-secret
TOKEN_ENCRYPTION_KEY=your-32-byte-base64-key
TOKEN_STORAGE_PATH=~/gmail_mcp_tokens/tokens.json
```

### Claude Desktop Config

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "docgen": {
      "command": "node",
      "args": ["/path/to/docgen-mcp/dist/index.js"],
      "env": {
        "GOOGLE_CLIENT_ID": "...",
        "GOOGLE_CLIENT_SECRET": "...",
        "TOKEN_ENCRYPTION_KEY": "...",
        "TOKEN_STORAGE_PATH": "~/gmail_mcp_tokens/tokens.json"
      }
    }
  }
}
```

## Quick Start

### Google Docs (create_google_doc)

```json
{
  "title": "My Document",
  "config": "pwp",
  "sections": [
    { "type": "heading", "level": 1, "text": "Introduction" },
    { "type": "paragraph", "content": "Hello, world!" },
    { "type": "bullet_list", "items": ["First item", "Second item"] }
  ]
}
```

Returns: `{ "id": "...", "webViewLink": "https://docs.google.com/..." }`

### Word Documents (generate_document)

```json
{
  "doc_type": "brief",
  "context": "tma",
  "title": "Cloud Migration Strategy",
  "content": {
    "executive_summary": "Migrate to Azure over 6 months.",
    "recommendation": "Proceed with phased migration.",
    "next_steps": ["Inventory systems", "Select pilot workloads"]
  }
}
```

Returns: Path to generated .docx file

## Tools

| Tool | Description |
|------|-------------|
| `create_google_doc` | Create Google Doc from structured sections |
| `generate_document` | Create Word doc from template |
| `get_section_schema` | Get schema for Google Docs sections |
| `list_document_types` | List Word doc types |
| `get_template_schema` | Get schema for Word doc type |

## Documentation

- **[USAGE.md](./USAGE.md)** - Complete API reference for `create_google_doc`
- **Word doc schemas** - See below for `generate_document` content schemas

## Word Document Types

| Type | Description |
|------|-------------|
| `brief` | Executive brief with recommendation |
| `memo` | Internal memorandum |
| `proposal` | Project proposal with scope/timeline |
| `meeting_notes` | Meeting summary |
| `project_summary` | Status report |
| `assessment` | IT assessment with findings |
| `risk_register` | Risk tracking table |
| `runbook` | Operational procedures |

## Known Limitations

- **No page numbers in Google Docs**: REST API doesn't support AutoText
- **No bookmarks**: REST API lacks `createBookmark`
- **Local images**: Uploaded to Drive automatically, requires public sharing
- **Token refresh**: Read-only from gmail-mcp

## Development

```bash
npm run dev    # Watch mode
npm run build  # Production build
npm start      # Run server
```

## License

MIT
