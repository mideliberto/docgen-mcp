# Integration Tests

## Running the Integration Test

### Via MCP (Recommended)

Use the `create_google_doc` tool with the contents of `integration-test.json`:

```
Tool: create_google_doc
Arguments: <paste contents of integration-test.json>
```

### Via Node.js Script

```bash
cd /path/to/docgen-mcp

node -e "
const { spawn } = require('child_process');
const test = require('./test/integration-test.json');

const proc = spawn('node', ['dist/index.js'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: {
    ...process.env,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    TOKEN_ENCRYPTION_KEY: process.env.TOKEN_ENCRYPTION_KEY,
    TOKEN_STORAGE_PATH: process.env.TOKEN_STORAGE_PATH
  }
});

let buffer = '';
proc.stdout.on('data', (d) => {
  buffer += d.toString();
  const lines = buffer.split('\n');
  buffer = lines.pop();
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const resp = JSON.parse(line);
      if (resp.id === 1) {
        proc.stdin.write(JSON.stringify({
          jsonrpc: '2.0', id: 2, method: 'tools/call',
          params: { name: 'create_google_doc', arguments: test }
        }) + '\n');
      } else if (resp.result) {
        console.log('Result:', resp.result.content[0].text);
        proc.kill();
      }
    } catch {}
  }
});

proc.stdin.write(JSON.stringify({
  jsonrpc: '2.0', id: 1, method: 'initialize',
  params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'test', version: '1.0' } }
}) + '\n');

setTimeout(() => proc.kill(), 60000);
"
```

## What It Tests

The integration test covers all supported features:

1. **Rich Text Formatting** - bold, italic, underline, strikethrough, code, links, colors, highlights, font sizes
2. **Paragraph Options** - alignment (left, center, right), spacing
3. **Headings** - all levels (H1-H6)
4. **Bullet Lists** - simple and nested
5. **Numbered Lists** - decimal, decimal_nested, upper_alpha styles
6. **Tables** - simple and with cell formatting (backgrounds, bold, column widths)
7. **Callouts** - info, warning, critical, success styles
8. **Code Blocks** - monospace with gray background
9. **Horizontal Rules** - visual separator
10. **Page Breaks** - multi-page documents
11. **Images** - URL-based images with sizing and alignment
12. **Headers/Footers** - with alignment and page number placeholder

## Expected Output

A Google Doc with:
- 2+ pages (page break between sections 9 and 10)
- Header: "Integration Test Document" (centered)
- Footer: "Page [Page #]" (right-aligned)
- All formatting visible and correct

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Auth error | Re-authenticate via gmail-mcp |
| Image not loading | Check URL is publicly accessible |
| Missing features | Check you're using latest build (`npm run build`) |
