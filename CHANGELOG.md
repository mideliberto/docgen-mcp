# Changelog

## 1.0.0 (2024-01-30)

Initial release.

### Features

- MCP server with stdio transport
- 8 document generators: brief, memo, proposal, meeting_notes, project_summary, assessment, risk_register, runbook
- Two organization contexts: TMA (consulting), PWP (internal)
- Style constants for consistent document formatting
- Template fill utility for placeholder replacement in .docx files
- YAML-based organization configuration

### Tools

- `generate_document` - Create Word documents programmatically
- `list_document_types` - List available document types
- `get_template_schema` - Get content schema for a document type
