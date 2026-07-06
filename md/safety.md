# Safety

> Source: https://zeative.github.io/zaileys-mcp/safety

# Safety

zaileys-mcp drives a **real WhatsApp account** through the unofficial Web API (via Zaileys/Baileys). Two risks to understand before you point an agent at it.

## 1. Account risk (unofficial API)

This is not the official WhatsApp Business Cloud API. WhatsApp may **suspend or ban** numbers that use unofficial automation, and internal protocol changes can break things without notice.

- Don't use a number you can't afford to lose.
- Avoid spammy patterns — bulk cold outreach, rapid-fire sends.
- A dedicated number for automation is safer than your personal one.

## 2. Agent reach

An AI agent with the full toolset can message **anyone** in your account, add/remove group members, change your profile, and block contacts. Give it the least privilege the task needs.

### Read-only mode

The agent can read chats, messages, profiles, and group info — but **no write tool is even registered**, so it physically cannot send, react, delete, or mutate anything.

```typescript
await serveMcp(client, { readOnly: true })
```

```json
{ "env": { "ZAILEYS_READONLY": "true" } }
```

Use it for summarization, monitoring, and Q&A bots.

### Recipient allowlist

Outbound tools refuse any recipient not on the list. Read tools are unaffected — the agent can still see all chats, but can only *message* approved numbers.

```typescript
await serveMcp(client, { allowlist: ['6281111111111', '6282222222222'] })
```

```json
{ "env": { "ZAILEYS_ALLOWLIST": "6281111111111,6282222222222" } }
```

Use it for notification bots that should only ever message you or a fixed team.

### Combine them

`readOnly` and `allowlist` are independent and stack with any [tool strategy](/tool-strategy). A monitoring agent might run `readOnly`; a personal-assistant agent might run full tools but `allowlist`-ed to your own number and a few contacts.

## Connection tools are recoverable only

The agent can check the connection (`connection_status`), and **`connect`** / **`reconnect`** to recover a stuck link — all of which preserve the saved session. What it **cannot** do is **log out or clear the session**; those tools don't exist. An agent that could destroy its own WhatsApp session might lock itself (and you) out, requiring a fresh QR scan. `reconnect` closes and reopens the socket but never touches the credentials, so it's always safe to call.

## Where the session lives

Auth is stored under `./.zaileys/auth/<session>`. Treat that folder like a credential — anyone with it can act as your WhatsApp. Don't commit it, and scope filesystem access accordingly.

## Recommended posture

| Use case | Config |
| --- | --- |
| Summaries / monitoring | `readOnly: true` |
| Personal assistant (you only) | `allowlist: ['<your number>']` |
| Team notifier | `allowlist: [<team numbers>]` |
| Full automation (trusted) | default, dedicated number |
