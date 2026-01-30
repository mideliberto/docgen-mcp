# DocGen MCP Server

MCP server for generating professional Word documents. Supports two contexts: TMA (consulting) and PWP (internal).

## Quick Start

```bash
git clone https://github.com/mideliberto/docgen-mcp.git
cd docgen-mcp
npm install
npm run build
```

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "docgen": {
      "command": "node",
      "args": ["/path/to/docgen-mcp/dist/index.js"]
    }
  }
}
```

Restart Claude Desktop.

## Document Types

| Type | Description |
|------|-------------|
| `brief` | Executive brief with recommendation and next steps |
| `memo` | Internal memorandum with header fields and action items |
| `proposal` | Project proposal with scope, timeline, investment |
| `meeting_notes` | Meeting summary with attendees, decisions, action items |
| `project_summary` | Status report with accomplishments, risks, milestones |
| `assessment` | IT assessment with severity-rated findings |
| `risk_register` | Risk tracking table with likelihood/impact matrix |
| `runbook` | Operational procedure documentation |

## Tools

### generate_document

Creates a Word document and returns the temp file path.

```json
{
  "doc_type": "brief",
  "context": "tma",
  "title": "Cloud Migration Strategy",
  "content": {
    "executive_summary": "Migrate to Azure over 6 months.",
    "recommendation": "Proceed with phased migration.",
    "next_steps": ["Inventory systems", "Select pilot workloads"]
  },
  "filename": "cloud-migration-brief"
}
```

**Parameters:**
- `doc_type` (required): One of the document types above
- `context` (required): `tma` or `pwp`
- `title` (required): Document title
- `content` (required): Document-specific content object
- `filename` (optional): Output filename without extension

**Returns:** Path to generated .docx file (e.g., `/tmp/cloud-migration-brief.docx`)

### list_document_types

Returns available document types with descriptions.

### get_template_schema

Returns the content schema for a specific document type.

```json
{ "doc_type": "brief" }
```

## Content Schemas

### brief

```json
{
  "executive_summary": "string (required)",
  "background": "string",
  "recommendation": "string (required)",
  "rationale": ["string"],
  "next_steps": ["string (required)"],
  "timeline": "string"
}
```

### memo

```json
{
  "to": "string (required)",
  "from": "string (defaults to config author)",
  "subject": "string (required)",
  "body": "string (required, use \\n\\n for paragraphs)",
  "action_items": ["string"]
}
```

### proposal

```json
{
  "executive_summary": "string (required)",
  "problem_statement": "string (required)",
  "proposed_solution": "string (required)",
  "scope": ["string (required)"],
  "deliverables": ["string (required)"],
  "timeline_phases": [{ "phase": "", "duration": "", "description": "" }],
  "investment": [{ "item": "", "amount": "" }],
  "assumptions": ["string"],
  "next_steps": ["string (required)"]
}
```

### meeting_notes

```json
{
  "meeting_date": "string (required)",
  "attendees": ["string (required)"],
  "agenda": ["string"],
  "discussion_points": ["string (required)"],
  "decisions": ["string"],
  "action_items": [{ "owner": "", "task": "", "due": "" }],
  "next_meeting": "string"
}
```

### project_summary

```json
{
  "overview": "string (required)",
  "objectives": ["string (required)"],
  "status": "on_track | at_risk | delayed | completed (required)",
  "status_summary": "string (required)",
  "accomplishments": ["string (required)"],
  "upcoming_milestones": [{ "milestone": "", "date": "" }],
  "risks": [{ "risk": "", "mitigation": "" }],
  "blockers": ["string"],
  "next_steps": ["string (required)"]
}
```

### assessment

```json
{
  "executive_summary": "string (required)",
  "scope": "string (required)",
  "methodology": "string (required)",
  "findings": [{
    "severity": "critical | high | medium | low",
    "title": "string",
    "description": "string",
    "recommendation": "string"
  }],
  "summary_by_severity": [{ "severity": "", "count": 0 }],
  "recommendations": ["string (required)"],
  "next_steps": ["string (required)"]
}
```

### risk_register

```json
{
  "overview": "string (required)",
  "risks": [{
    "id": "string",
    "title": "string",
    "description": "string",
    "likelihood": "low | medium | high",
    "impact": "low | medium | high",
    "severity": "low | medium | high | critical",
    "owner": "string",
    "mitigation": "string",
    "status": "open | mitigating | closed"
  }]
}
```

### runbook

```json
{
  "purpose": "string (required)",
  "scope": "string (required)",
  "prerequisites": ["string"],
  "procedures": [{
    "title": "string",
    "steps": ["string"]
  }],
  "troubleshooting": [{ "issue": "", "resolution": "" }],
  "contacts": [{ "role": "", "name": "", "contact": "" }],
  "revision_history": [{ "date": "", "version": "", "changes": "" }]
}
```

## Configuration

Organization configs in `config/`:

```yaml
# config/tma.yaml
organization:
  name: "True Meridian Advisory"
  abbreviation: "TMA"

identity:
  author: "Mike Deliberto"
  title: "Principal Consultant"
  email: "mike@truemeridianadvisory.com"

metadata:
  company: "True Meridian Advisory LLC"
  confidentiality: "Confidential"
```

## Styling

Documents use consistent styling defined in `src/styles.ts`:

- **Colors:** Primary blues, severity colors (critical/high/medium/low), neutral grays
- **Fonts:** Arial, sizes from 9pt (caption) to 28pt (hero title)
- **Tables:** Alternating row shading, header styling, consistent borders

## Template Fill Mode

For documents requiring existing .docx templates with placeholders:

```typescript
import { fillTemplate } from './utils/template-fill.js';

const buffer = await fillTemplate('templates/tma/assessment.docx', {
  'CLIENT_NAME': 'Acme Corp',
  'DATE': '2024-01-15',
  'AUTHOR': 'Mike Deliberto'
});
```

Supports `[PLACEHOLDER]` and `{{placeholder}}` syntax.

## Development

```bash
npm run dev    # Watch mode
npm run build  # Production build
npm start      # Run server
```

## License

MIT
