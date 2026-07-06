import type { Client } from 'zaileys'

export interface McpOptions {
  /**
   * Read-only mode: expose only tools that read (chats, messages, contacts,
   * profiles, group info). No sending, reacting, deleting, or group creation.
   * Defaults to `false`.
   */
  readOnly?: boolean
  /**
   * Restrict outbound tools (send / react / delete) to these recipients only.
   * Accepts phone numbers or JIDs. When set, any other target is refused.
   * Read tools are unaffected. Empty/unset = no restriction.
   */
  allowlist?: string[]
  /**
   * How many tools to expose to the MCP client at once. All ~60 tools always
   * exist; this controls how many are *active* (in the client's context).
   *
   * - `'progressive'` (default) — a small core stays active; the rest are
   *   revealed on demand when the agent calls the `find_tools` meta-tool. Keeps
   *   the per-request context small without losing any capability.
   * - `'full'` — every tool active from the start. Best for clients that handle
   *   large tool lists well.
   * - `'core'` — only the core tools, no discovery (locked-down minimal set).
   * - `string[]` — an explicit list of tool names to activate, plus `find_tools`
   *   to reach the rest.
   */
  tools?: 'progressive' | 'full' | 'core' | string[]
  /** Server name reported to MCP clients. Defaults to `"zaileys"`. */
  name?: string
  /** Server version reported to MCP clients. Defaults to the package version. */
  version?: string
}

export interface ToolContext {
  client: Client
  options: McpOptions
}
