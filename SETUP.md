# DocGen-MCP Setup Guide

## Prerequisites

- Node.js 18+
- npm
- Google Cloud project with Docs and Drive APIs enabled (for Google Docs generation)
- Authenticated gmail-mcp (docgen-mcp shares tokens)

## Installation

```bash
git clone https://github.com/mideliberto/docgen-mcp.git
cd docgen-mcp
npm install
npm run build
```

## Token Sharing with gmail-mcp

docgen-mcp reads OAuth tokens from gmail-mcp's encrypted storage. **You must authenticate via gmail-mcp first.**

### How it works

1. gmail-mcp stores encrypted tokens at a configured path
2. docgen-mcp reads from the same path using the same encryption key
3. Both servers share `TOKEN_ENCRYPTION_KEY` and `TOKEN_STORAGE_PATH`

### Token locations

| Account | Default Path |
|---------|--------------|
| Personal | `~/gmail_mcp_tokens_personal/tokens.json` |
| PWP | `~/gmail_mcp_tokens_pwp/tokens.json` |

Each directory also contains an `encryption_salt` file.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_CLIENT_ID` | Yes | OAuth client ID (same as gmail-mcp) |
| `GOOGLE_CLIENT_SECRET` | Yes | OAuth client secret (same as gmail-mcp) |
| `TOKEN_ENCRYPTION_KEY` | Yes | Fernet key (same as gmail-mcp) |
| `TOKEN_STORAGE_PATH` | Yes | Path to tokens.json (same as gmail-mcp) |

## Claude Desktop / Claude Code Config

```json
{
  "mcpServers": {
    "docgen": {
      "command": "node",
      "args": ["/path/to/docgen-mcp/dist/index.js"],
      "env": {
        "GOOGLE_CLIENT_ID": "your-client-id.apps.googleusercontent.com",
        "GOOGLE_CLIENT_SECRET": "GOCSPX-your-secret",
        "TOKEN_ENCRYPTION_KEY": "your-32-byte-base64-key",
        "TOKEN_STORAGE_PATH": "~/gmail_mcp_tokens_personal/tokens.json"
      }
    }
  }
}
```

**Important:** Use the exact same values for `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `TOKEN_ENCRYPTION_KEY`, and `TOKEN_STORAGE_PATH` as your gmail-mcp configuration.

## Troubleshooting

### "Not authenticated" or "Invalid token"

1. Verify gmail-mcp is authenticated: run `check_auth_status` tool
2. Check `TOKEN_STORAGE_PATH` points to correct tokens.json
3. Verify `TOKEN_ENCRYPTION_KEY` matches gmail-mcp config
4. If tokens were refreshed by gmail-mcp, restart Claude Code

### "Token decryption failed"

The encryption key or salt doesn't match. Ensure:
- Same `TOKEN_ENCRYPTION_KEY` in both configs
- `TOKEN_STORAGE_PATH` directory contains both `tokens.json` and `encryption_salt`

### "API quota exceeded"

Google Docs API has rate limits. Wait a few minutes and retry.

### Token Refresh

docgen-mcp now persists refreshed tokens back to encrypted storage (as of 2026-01-31). If you encounter auth issues after tokens expire:
1. Re-authenticate via gmail-mcp's `authenticate` tool
2. Restart Claude Code to pick up new tokens

## Development

```bash
npm run dev    # Watch mode with auto-rebuild
npm run build  # Production build
npm start      # Run server
```
