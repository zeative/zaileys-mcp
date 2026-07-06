# Tool Strategy

> Source: https://zeative.github.io/zaileys-mcp/tool-strategy

# Tool Strategy

Exposing all 60+ tools to an agent at once is wasteful: every tool's schema is injected into the model's context on **every** request, and a long list makes the model slower and more likely to pick the wrong tool. But trimming the toolset would cost capability.

zaileys-mcp solves this with **progressive tool disclosure** — the default `progressive` strategy.

## How it works

1. On startup, all 60+ tools are registered, but only a **core** set (~13 daily-driver tools) stays *enabled*. The rest are registered **disabled**, so they don't appear in the client's `tools/list` and never enter the agent's context.
2. A meta-tool, **`find_tools`**, is always available. When the agent needs something the visible tools don't cover — managing a group, blocking a contact, creating a newsletter — it calls `find_tools` with a short description or a category name.
3. `find_tools` ranks the inactive catalog (by name, category, and description keywords), **enables** the top matches, and the server emits MCP's `notifications/tools/list_changed`. The client re-fetches the tool list, and the matched tools are now callable — on the very next step.

```text
Agent: "add +62 811… to the Weekend group as admin"
  → find_tools("add member to group")
      activated: group_add, group_promote, group_member_add_mode, …
  → group_add({ group, participants })
  → group_promote({ group, participants })
```

The agent's context grows only by the handful of tools it actually needs, when it needs them — not by 60 up front.

This is the same **lazy tool loading** pattern used inside larger AI systems (a small always-on core plus on-demand discovery), adapted to MCP's native dynamic-tools mechanism. The search is keyword/category based — **no embedding model or API key required**, so the server stays zero-config.

## The core set

Always active under `progressive`:

`me` · `check_number` · `list_chats` · `get_messages` · `get_profile` · `send_text` · `send_media` · `send_location` · `react` · `chat_mark_read` · `send_typing` · `group_metadata` · `find_tools`

These cover the overwhelming majority of requests; everything else is one `find_tools` call away.

## Choosing a strategy

| You want… | Use |
| --- | --- |
| Small context, full capability (recommended) | `progressive` (default) |
| Every tool visible immediately | `full` |
| A locked-down minimal set, no discovery | `core` |
| A hand-picked set (plus discovery for the rest) | `['send_text', 'get_messages', …]` |

```typescript
await serveMcp(client, { tools: 'full' })
await serveMcp(client, { tools: ['send_text', 'send_media', 'get_messages'] })
```

Or via env: `ZAILEYS_TOOLS=full`, `ZAILEYS_TOOLS=send_text,get_messages`.

Some MCP clients don't yet react to `tools/list_changed`. If your client won't show newly discovered tools, switch to `ZAILEYS_TOOLS=full` — you lose the context savings but keep every tool.
