import { Client, printQrToTerminal } from 'zaileys'
import { serveMcp } from './index.js'
import type { McpOptions } from './types.js'

// stdout is the MCP JSON-RPC channel — every human-facing line goes to stderr.
const log = (msg: string): void => void process.stderr.write(`${msg}\n`)

async function main(): Promise<void> {
  const env = process.env
  const authType = env.ZAILEYS_AUTH_TYPE === 'pairing' ? 'pairing' : 'qr'
  const phoneNumber = env.ZAILEYS_PHONE?.replace(/\D/g, '')

  const toolsEnv = env.ZAILEYS_TOOLS?.trim()
  const tools: McpOptions['tools'] =
    toolsEnv == null || toolsEnv === ''
      ? undefined
      : toolsEnv === 'full' || toolsEnv === 'core' || toolsEnv === 'progressive'
        ? toolsEnv
        : toolsEnv.split(',').map((s) => s.trim()).filter(Boolean)

  const options: McpOptions = {
    readOnly: env.ZAILEYS_READONLY === 'true',
    ...(env.ZAILEYS_ALLOWLIST ? { allowlist: env.ZAILEYS_ALLOWLIST.split(',').map((s) => s.trim()).filter(Boolean) } : {}),
    ...(tools ? { tools } : {}),
  }

  const client = new Client({
    sessionId: env.ZAILEYS_SESSION ?? 'mcp',
    authType,
    ...(authType === 'pairing' && phoneNumber ? { phoneNumber } : {}),
    qrTerminal: false,
    statusLog: false,
  })

  client.on('qr', ({ qrString }) => {
    log('\nScan this QR in WhatsApp → Linked Devices:\n')
    void printQrToTerminal(qrString, (s) => process.stderr.write(s)).catch(() => log(qrString))
  })
  client.on('pairing-code', ({ code }) => log(`\nPairing code: ${code}\n`))
  client.on('connect', ({ me }) => log(`Connected as ${me?.id ?? 'unknown'} — MCP ready.`))

  await serveMcp(client, options)
  log(`zaileys-mcp serving over stdio${options.readOnly ? ' (read-only)' : ''}. Waiting for WhatsApp session…`)
}

main().catch((err) => {
  process.stderr.write(`zaileys-mcp failed to start: ${String(err)}\n`)
  process.exit(1)
})
