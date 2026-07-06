# Getting Started

> Source: https://zeative.github.io/zaileys-mcp/getting-started

# Getting Started

### Add the server to your MCP client

No install needed — `npx` fetches it on demand.

  
    Edit `claude_desktop_config.json` (Claude Desktop → Settings → Developer → Edit Config):

    ```json
    {
      "mcpServers": {
        "whatsapp": {
          "command": "npx",
          "args": ["-y", "zaileys-mcp"],
          "env": { "ZAILEYS_SESSION": "my-wa" }
        }
      }
    }
    ```
  
  
    Add to `.cursor/mcp.json` (project) or `~/.cursor/mcp.json` (global):

    ```json
    {
      "mcpServers": {
        "whatsapp": {
          "command": "npx",
          "args": ["-y", "zaileys-mcp"],
          "env": { "ZAILEYS_SESSION": "my-wa" }
        }
      }
    }
    ```
  
  
    Any client that speaks MCP over stdio works. Run the command directly:

    ```bash
    npx -y zaileys-mcp
    ```

    Environment variables configure it — see [Configuration](/configuration).
  

### Authenticate

On first launch the server prints a QR code (to stderr, so it never corrupts the MCP channel). Scan it in **WhatsApp → Linked Devices → Link a device**.

The session persists under `./.zaileys/auth/<ZAILEYS_SESSION>`. After the first scan, restarts connect silently — no QR.

Prefer a pairing code? Set `ZAILEYS_AUTH_TYPE=pairing` and `ZAILEYS_PHONE=62812xxxxxxx`; the code is printed instead of a QR.

### Use it

Restart your MCP client so it picks up the server, then talk to your agent:

> "Send a WhatsApp to +62 812 3456 7890 saying the build passed ✅"

> "What are the last 15 messages in the *Engineering* group?"

> "Add +62 811 111 111 to the *Weekend Trip* group and make them admin."

The agent picks the right tools automatically. For group/admin/newsletter actions it first calls `find_tools` to reveal the relevant tools — that's the [progressive strategy](/tool-strategy) at work.

## Requirements

- **Node.js v20+**
- A WhatsApp account you control (this is an unofficial API — see [Safety](/safety))

## Running from source

```bash
git clone https://github.com/zeative/zaileys-mcp
cd zaileys-mcp && pnpm install && pnpm build
node dist/bin.js
```
