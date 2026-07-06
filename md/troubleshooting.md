# Troubleshooting & FAQ

> Source: https://zeative.github.io/zaileys-mcp/troubleshooting

# Troubleshooting & FAQ

## The QR doesn't appear

The QR is printed to **stderr** (stdout is the MCP JSON-RPC channel and must stay clean). Most MCP clients show server stderr in a logs panel:

- **Claude Desktop** — check the MCP logs (`~/Library/Logs/Claude/mcp-*.log` on macOS).
- **Cursor** — the MCP server output panel.

Or run it directly in a terminal to see the QR inline:

```bash
npx -y zaileys-mcp
```

Prefer not to deal with QR piping? Use pairing: `ZAILEYS_AUTH_TYPE=pairing` + `ZAILEYS_PHONE=62812xxxxxxx`.

## Newly discovered tools don't show up

Under `progressive`, `find_tools` enables tools and emits `notifications/tools/list_changed`. A few MCP clients don't yet re-fetch on that notification. If your agent "finds" a tool but can't call it:

```json
{ "env": { "ZAILEYS_TOOLS": "full" } }
```

`full` exposes every tool up front — you lose the context savings but nothing else.

## Tools are missing entirely

- In **read-only** mode (`ZAILEYS_READONLY=true`) every write tool is intentionally absent.
- In `core` mode there is no `find_tools` and only the core set exists by design.
- `list_chats` / `get_messages` read from the Zaileys **store**; a fresh session with no traffic yet returns empty until messages arrive or history syncs.

## "Not connected — no WhatsApp session yet"

The tool ran before the WhatsApp socket finished connecting (or the QR wasn't scanned). Wait for the connection, or check the stderr logs for the QR / a disconnect reason.

## Stuck in a QR loop / logged out

Delete the auth folder and re-scan:

```bash
rm -rf ./.zaileys/auth/<session>
```

After an explicit logout, WhatsApp invalidates the session — only transient drops reconnect automatically.

## Does this use the official WhatsApp API?

No. It's the unofficial Web API via [Zaileys](https://zeative.github.io/zaileys/) / Baileys. See [Safety](/safety) for the implications.

## Can I run more than one number?

Yes — run multiple server entries with different `ZAILEYS_SESSION` values (and different keys in your MCP client config). Each keeps its own auth folder.

Anything about the underlying WhatsApp connection, storage adapters, or media handling is covered in the [Zaileys documentation](https://zeative.github.io/zaileys/).

## Still stuck?

- Open an issue: [github.com/zeative/zaileys-mcp/issues](https://github.com/zeative/zaileys-mcp/issues)
- Ask in [Discord](https://discord.gg/KBHhTTVUc5) or the [WhatsApp group](https://chat.whatsapp.com/GlQfvc83mSH3F6ov06vuCt)
