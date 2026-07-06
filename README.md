<div align="center">

<br>

<img alt="zaileys-mcp — WhatsApp for AI agents, powered by Zaileys" src="https://github.com/zeative/zaileys-mcp/blob/main/public/icon.png?raw=true" width="130">

<br>
<br>

<h1 align="center">zaileys-mcp — WhatsApp for AI agents, <br /> powered by Zaileys</h1>

<br>

<div align="center">
  <a href="https://www.npmjs.com/package/zaileys-mcp"><img src="https://img.shields.io/npm/v/zaileys-mcp.svg" alt="NPM Version"></a>
  <a href="https://www.npmjs.com/package/zaileys-mcp"><img src="https://img.shields.io/npm/dw/zaileys-mcp?label=npm&color=%23CB3837" alt="NPM Downloads"></a>
  <a href="https://github.com/zeative/zaileys-mcp/releases"><img src="https://img.shields.io/npm/dt/zaileys-mcp" alt="NPM Total Downloads"></a>
  <a href="https://modelcontextprotocol.io"><img src="https://img.shields.io/badge/MCP-server-6E56CF" alt="MCP Server"></a>
</div>

<div align="center">
  <a href="https://github.com/zeative/zaileys-mcp/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="License: MIT"></a>
  <a href="https://discord.gg/KBHhTTVUc5"><img alt="Discord" src="https://img.shields.io/discord/1105833273415962654?logo=discord&label=discord"></a>
  <a href="https://chat.whatsapp.com/GlQfvc83mSH3F6ov06vuCt"><img alt="WhatsApp" src="https://img.shields.io/badge/WhatsApp-Group-25D366?logo=whatsapp&logoColor=white"></a>
  <a href="https://github.com/zeative/zaileys-mcp"><img src="https://img.shields.io/github/stars/zeative/zaileys-mcp" alt="GitHub Stars"></a>
  <a href="https://github.com/zeative/zaileys-mcp"><img src="https://img.shields.io/github/forks/zeative/zaileys-mcp" alt="GitHub Forks"></a>
</div>

<br>

<div align="center">
  <p>
    <b>zaileys-mcp</b> is a <a href="https://modelcontextprotocol.io">Model Context Protocol</a> server that gives AI agents — Claude, Cursor, any MCP client — the ability to drive WhatsApp: send messages, media, polls, and locations; read chats and history; manage groups, communities, newsletters, contacts, presence, and profile. Powered by <a href="https://github.com/zeative/zaileys">Zaileys</a>, so QR / pairing-code auth, reconnection, and sessions are handled for you.
  </p>
</div>

<div align="center">

[Quick start](#quick-start) &nbsp;•&nbsp;
[Why zaileys-mcp](#why-zaileys-mcp) &nbsp;•&nbsp;
[Install](#install) &nbsp;•&nbsp;
[What you can build](#what-you-can-build) &nbsp;•&nbsp;
[Configuration](#configuration) &nbsp;•&nbsp;
[Docs](https://zeative.github.io/zaileys-mcp/)

</div>

</div>

<br>

> [!NOTE]
> This README is a **high-level overview**. The complete guides, tool catalog, and configuration reference live in the documentation site at **<https://zeative.github.io/zaileys-mcp/>**.

> [!WARNING]
> This drives a **real WhatsApp account** through the unofficial Web API (via Zaileys/Baileys). WhatsApp may suspend numbers that use unofficial automation, and an AI agent with these tools can message anyone in your account. Use `read-only` or an allowlist when you don't need full access, and never point it at an account you can't afford to lose.

---

## Quick start

Add it to your MCP client — `npx` fetches it on demand. First launch prints a QR to scan in **WhatsApp → Linked Devices**; the session persists.

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

That's it. Restart your client, then ask your agent:

> "Send a WhatsApp to +62 812 3456 7890 that the deploy is done ✅"

> "Summarize my last 20 messages in the family group."

Works with **Claude Desktop**, **Cursor**, and any MCP client that speaks stdio.

## Why zaileys-mcp

- **Full 1:1 with Zaileys** — 60+ tools covering messaging, chats, groups, communities, newsletters, privacy, profile, presence, contacts, and business. Anything Zaileys can do, an agent can do.
- **Smart tool strategy** — all 60+ tools exist, but only a small **core** stays in the agent's context; the rest are revealed on demand via a `find_tools` meta-tool. Full capability, small context — no bloating every request.
- **Zero-config auth** — Zaileys handles the WhatsApp connection. First run prints a QR; the session persists, restarts connect silently.
- **Embeddable** — already run a Zaileys bot? Expose it to AI agents in one line; it reuses your live session, no second login.
- **Safe by design** — `read-only` mode and recipient allowlists for when an agent shouldn't have full reach.
- **Clean transport** — stdio JSON-RPC stays uncorrupted; QR and logs go to stderr. Custom HTTP/SSE transport supported.

## Install

No install needed for the standalone server — `npx` handles it:

```bash
npx -y zaileys-mcp
```

To embed it in your own bot, add it as a dependency:

```bash
npm i zaileys-mcp zaileys      # or: pnpm add  •  yarn add  •  bun add
```

Requires **Node.js v20+**. Peer dependency: [`zaileys`](https://www.npmjs.com/package/zaileys) `>= 4.7`.

## What you can build

### Drive WhatsApp from your agent

**60+ tools, 1:1 with the Zaileys API** — every `to` / `chat` / `jid` accepts a phone number or a JID interchangeably.

```text
Agent: "add +62 811 111 111 to the Weekend group and make them admin"
  → find_tools("add member to group")   → enables group_add, group_promote, …
  → group_add({ group, participants })
  → group_promote({ group, participants })
```

<details>
<summary><b>Full tool catalog</b></summary>

- **Messaging** — `send_text`, `send_media`, `send_location`, `send_poll`, `send_contact`, `send_sticker`, `react`, `edit_message`, `delete_message`, `forward_message`, `pin_message`, `unpin_message`
- **Chats** — `list_chats`, `get_messages`, `chat_archive`/`unarchive`/`pin`/`unpin`/`mute`/`unmute`/`mark_read`/`mark_unread`/`delete`/`clear`, `set_disappearing`
- **Account & contacts** — `me`, `check_number`, `get_profile`, `save_contact`, `remove_contact`
- **Presence** — `send_typing`, `send_recording`, `set_presence`
- **Groups** — `group_metadata`/`list`/`create`/`add`/`remove`/`promote`/`demote`/`update_subject`/`update_description`/`leave`/`invite_code`/`invite_revoke`/`invite_info`/`invite_accept`/`join_requests`/`approve_join`/`reject_join`/`setting`/`join_approval`/`member_add_mode`/`toggle_ephemeral`
- **Communities** — `community_metadata`/`list`/`subgroups`/`create`/`link_group`/`unlink_group`/`leave`
- **Newsletters** — `newsletter_metadata`/`messages`/`create`/`follow`/`unfollow`/`mute`/`unmute`/`react`
- **Privacy** — `privacy_get`, `blocklist`, `block`, `unblock`
- **Profile** — `set_profile_name`/`status`/`picture`, `remove_profile_picture`
- **Business** — `business_profile`, `business_catalog`, `business_collections`

</details>

### Smart tool strategy

60+ tools is a lot to inject into an agent's context on every request. zaileys-mcp uses **progressive tool disclosure** (the default): only a small **core** (~13 tools) stays active, and the rest are revealed on demand via a `find_tools` meta-tool that enables matches and fires MCP's `tools/list_changed`.

```text
ZAILEYS_TOOLS=progressive   # ~13 core active, rest via find_tools (default)
ZAILEYS_TOOLS=full          # all 60+ active
ZAILEYS_TOOLS=core          # ~12 core, no discovery
ZAILEYS_TOOLS=send_text,get_messages   # a hand-picked set (+ find_tools)
```

### Embed in your own bot

Already run a Zaileys client? Expose it to AI agents in one line — it reuses your live session:

```typescript
import { Client } from 'zaileys'
import { serveMcp } from 'zaileys-mcp'

const client = new Client()
await serveMcp(client) // AI agents can now drive this WhatsApp over stdio
```

Read-only, allowlist, or a custom transport:

```typescript
import { createMcpServer, serveMcp } from 'zaileys-mcp'

await serveMcp(client, { readOnly: true, allowlist: ['62812xxxxxxx'] })

const server = createMcpServer(client)   // bring your own HTTP/SSE transport
await server.connect(myHttpTransport)
```

## Configuration

Standalone (env vars) — programmatic options mirror these one-to-one:

| Variable | Default | Description |
| --- | --- | --- |
| `ZAILEYS_SESSION` | `mcp` | Session id (auth persists under `./.zaileys/auth/<id>`) |
| `ZAILEYS_AUTH_TYPE` | `qr` | `qr` or `pairing` |
| `ZAILEYS_PHONE` | — | Phone number (E.164 digits) for pairing-code login |
| `ZAILEYS_READONLY` | `false` | `true` exposes only read tools (agent can't send) |
| `ZAILEYS_ALLOWLIST` | — | Comma-separated numbers/JIDs; restricts outbound tools |
| `ZAILEYS_TOOLS` | `progressive` | `progressive` · `full` · `core` · comma-list |

Two guardrails, usable in any mode: **`readOnly`** (write tools never registered) and **`allowlist`** (outbound tools refuse other recipients). Recommended: `readOnly` for summarizers/monitors, `allowlist` for personal/team notifiers, a dedicated number for full automation.

## Documentation

- 🌐 [**zeative.github.io/zaileys-mcp**](https://zeative.github.io/zaileys-mcp/) — full documentation: getting started, tools, tool strategy, safety
- ⚙️ [**zeative.github.io/zaileys**](https://zeative.github.io/zaileys/) — the WhatsApp engine underneath
- 🔌 [**Model Context Protocol**](https://modelcontextprotocol.io) — the MCP standard

## Issues & feedback

Hit a problem or have a feature request? Open an [issue](https://github.com/zeative/zaileys-mcp/issues).

- [Buy me a coffee ☕](https://saweria.co/zaadevofc) • [Ko-Fi](https://ko-fi.com/zaadevofc) • [Trakteer](https://trakteer.id/zaadevofc)
- ⭐ Star the repo on GitHub

## License

Distributed under the **MIT License**. See [`LICENSE`](https://github.com/zeative/zaileys-mcp/blob/main/LICENSE) for details.

<div align="left">
  <p>
    <img alt="zaileys-mcp" src="https://github.com/zeative/zaileys-mcp/blob/main/public/icon.png?raw=true" width="28" align="center">
    Copyright © 2026 zaadevofc. All rights reserved.
  </p>
</div>
