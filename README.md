# DocGen MCP Server

MCP server for generating professional Word documents (TMA consulting / PWP internal).

## Install

```bash
git clone https://github.com/mideliberto/docgen-mcp.git
cd docgen-mcp
npm install
npm run build
```

## Configure Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "docgen": {
      "command": "node",
      "args": ["/absolute/path/to/docgen-mcp/dist/index.js"]
    }
  }
}
```

## Tools

### generate_document
Generate a Word document.

Parameters:
- `doc_type`: brief | memo | proposal | meeting_notes | project_summary | assessment | risk_register | runbook
- `context`: tma | pwp
- `title`: Document title
- `content`: Document-specific content object
- `filename`: Optional output filename

### list_document_types
Returns available document types with descriptions.

### get_template_schema
Returns the content schema for a specific document type.

## Usage Example

```
User: Create a brief on implementing Google Drive intranet at PWP

Claude calls: generate_document({
  doc_type: "brief",
  context: "pwp",
  title: "Google Drive Intranet Implementation",
  content: {
    executive_summary: "...",
    recommendation: "...",
    next_steps: ["...", "..."]
  }
})

Returns: /tmp/docgen-1706621234.docx
```
