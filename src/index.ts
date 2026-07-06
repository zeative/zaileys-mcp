import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js'
import type { Client } from 'zaileys'
import { registerTools } from './tools.js'
import type { McpOptions } from './types.js'

export type { McpOptions } from './types.js'

const VERSION = '0.1.0'

/**
 * Build an MCP server exposing a Zaileys client's WhatsApp capabilities as
 * tools. Use this when you want to attach your own transport (HTTP, SSE, …).
 * For the common case, prefer {@link serveMcp}.
 */
export function createMcpServer(client: Client, options: McpOptions = {}): McpServer {
  const server = new McpServer({ name: options.name ?? 'zaileys', version: options.version ?? VERSION })
  registerTools(server, { client, options })
  return server
}

/**
 * Attach an MCP server to a Zaileys client and serve it over the given
 * transport (stdio by default). Zero-config: pass a client, done.
 *
 * ```typescript
 * import { Client } from 'zaileys'
 * import { serveMcp } from 'zaileys-mcp'
 *
 * const client = new Client()
 * await serveMcp(client) // AI agents can now drive this WhatsApp over stdio
 * ```
 *
 * @returns a handle to close the server.
 */
export async function serveMcp(
  client: Client,
  options: McpOptions & { transport?: Transport } = {},
): Promise<{ server: McpServer; close: () => Promise<void> }> {
  const server = createMcpServer(client, options)
  const transport = options.transport ?? new StdioServerTransport()
  await server.connect(transport)
  return { server, close: () => server.close() }
}
