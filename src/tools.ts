import type { McpServer, RegisteredTool } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { ZodRawShape } from 'zod'
import { z } from 'zod'
import { isJid, jidToPhone, phoneToJid, type WAMessage } from 'zaileys'
import type { ToolContext } from './types.js'

type Result = { content: Array<{ type: 'text'; text: string }>; isError?: boolean }

const text = (value: string): Result => ({ content: [{ type: 'text', text: value }] })
const json = (value: unknown): Result => text(JSON.stringify(value ?? { ok: true }, null, 2))
const ok = (extra?: Record<string, unknown>): Result => json({ ok: true, ...extra })
const fail = (message: string): Result => ({ content: [{ type: 'text', text: message }], isError: true })

/** Accept either a phone number (any format) or a full JID; return a normalized JID. */
const toJid = (target: string): string => (isJid(target) ? target : phoneToJid(target))

const messageText = (m: WAMessage): string => {
  const c = m.message as Record<string, { text?: string; caption?: string }> | null | undefined
  if (!c) return ''
  const conv = (c as { conversation?: string }).conversation
  if (typeof conv === 'string') return conv
  return (
    c['extendedTextMessage']?.text ??
    c['imageMessage']?.caption ??
    c['videoMessage']?.caption ??
    c['documentMessage']?.caption ??
    `[${Object.keys(c)[0] ?? 'unknown'}]`
  )
}

interface CatalogEntry {
  name: string
  category: string
  description: string
  core: boolean
  handle: RegisteredTool
}

export function registerTools(server: McpServer, ctx: ToolContext): void {
  const { client, options } = ctx
  const allow = options.allowlist?.map(toJid)
  const guard = (jid: string): string | null =>
    allow && allow.length > 0 && !allow.includes(jid)
      ? `Recipient ${jidToPhone(jid) || jid} is not in the allowlist`
      : null
  const media = (url?: string, base64?: string): Buffer | string | null =>
    base64 ? Buffer.from(base64, 'base64') : (url ?? null)

  const catalog: CatalogEntry[] = []

  // core = kept active by default (the daily-driver tools); everything else is
  // discoverable via find_tools under the 'progressive' strategy.
  const reg = <S extends ZodRawShape>(
    kind: 'read' | 'write',
    name: string,
    category: string,
    core: boolean,
    description: string,
    shape: S,
    fn: (a: z.objectOutputType<S, z.ZodTypeAny>) => Promise<Result>,
  ): void => {
    if (kind === 'write' && options.readOnly === true) return
    const handle = server.registerTool(
      name,
      { description, ...(Object.keys(shape).length ? { inputSchema: shape } : {}) },
      fn as never,
    )
    catalog.push({ name, category, description, core, handle })
  }
  const read = <S extends ZodRawShape>(name: string, category: string, core: boolean, description: string, shape: S, fn: (a: z.objectOutputType<S, z.ZodTypeAny>) => Promise<Result>) =>
    reg('read', name, category, core, description, shape, fn)
  const write = <S extends ZodRawShape>(name: string, category: string, core: boolean, description: string, shape: S, fn: (a: z.objectOutputType<S, z.ZodTypeAny>) => Promise<Result>) =>
    reg('write', name, category, core, description, shape, fn)

  const TARGET = z.string().describe('Phone number or JID')
  const GROUP = z.string().describe('Group JID (…@g.us)')
  const JIDS = z.array(z.string()).min(1).describe('Phone numbers or JIDs')
  const sendGuard = (to: string): { jid: string; blocked: string | null } => {
    const jid = toJid(to)
    return { jid, blocked: guard(jid) }
  }
  const key = (chat: string, id: string, fromMe?: boolean) => ({ remoteJid: toJid(chat), id, fromMe: fromMe === true })

  // ──────────────── account / contacts ────────────────

  read('me', 'account', true, 'Return the connected WhatsApp account (jid, number, name).', {}, async () => {
    const user = client.socket?.user
    if (!user?.id) return fail('Not connected — no WhatsApp session yet.')
    return json({ jid: user.id, number: jidToPhone(user.id), name: user.name ?? null })
  })
  read('check_number', 'account', true, 'Check whether phone numbers are registered on WhatsApp.', { numbers: z.array(z.string()).min(1) }, async ({ numbers }) => json(await client.contact.check(...numbers)))

  // ──────────────── chats / messages ────────────────

  read('list_chats', 'chat', true, 'List recent chats from the store.', { limit: z.number().int().positive().max(200).optional() }, async ({ limit }) => {
    const chats = await client.store.listChats()
    return json(chats.slice(0, limit ?? 50).map((c) => ({ jid: c.id, name: c.name ?? null, unread: c.unreadCount ?? 0 })))
  })
  read('get_messages', 'chat', true, 'Fetch recent messages for a chat from the store, newest first.', { chat: TARGET, limit: z.number().int().positive().max(100).optional() }, async ({ chat, limit }) => {
    const msgs = await client.store.listMessages(toJid(chat), { limit: limit ?? 20 })
    return json(msgs.map((m) => ({ id: m.key?.id ?? null, fromMe: m.key?.fromMe === true, from: m.key?.participant ?? m.key?.remoteJid ?? null, text: messageText(m), timestamp: Number(m.messageTimestamp ?? 0) })))
  })
  read('get_profile', 'account', true, 'Fetch a contact/group profile picture URL and status text.', { target: TARGET }, async ({ target }) => {
    const jid = toJid(target)
    const [picture, status] = await Promise.all([client.profile.getPicture(jid).catch(() => null), client.profile.getStatus(jid).catch(() => null)])
    return json({ jid, picture, status })
  })

  // ──────────────── sending ────────────────

  write('send_text', 'messaging', true, 'Send a text message. Supports *bold*, _italic_, ~strike~, `code`.', { to: TARGET, text: z.string() }, async ({ to, text: body }) => {
    const { jid, blocked } = sendGuard(to)
    if (blocked) return fail(blocked)
    return ok({ id: (await client.send(jid).text(body)).id })
  })
  write('send_media', 'messaging', true, 'Send image/video/audio/document by URL or base64.', { to: TARGET, type: z.enum(['image', 'video', 'audio', 'document']), url: z.string().url().optional(), base64: z.string().optional(), caption: z.string().optional(), fileName: z.string().optional() }, async ({ to, type, url, base64, caption, fileName }) => {
    const { jid, blocked } = sendGuard(to)
    if (blocked) return fail(blocked)
    const src = media(url, base64)
    if (src == null) return fail('Provide either `url` or `base64`.')
    const b = client.send(jid)
    const k = await (type === 'image' ? b.image(src, caption ? { caption } : {}) : type === 'video' ? b.video(src, caption ? { caption } : {}) : type === 'audio' ? b.audio(src) : b.document(src, { fileName: fileName ?? 'file', ...(caption ? { caption } : {}) }))
    return ok({ id: k.id })
  })
  write('send_location', 'messaging', true, 'Send a location pin.', { to: TARGET, latitude: z.number(), longitude: z.number(), name: z.string().optional(), address: z.string().optional() }, async ({ to, latitude, longitude, name, address }) => {
    const { jid, blocked } = sendGuard(to)
    if (blocked) return fail(blocked)
    return ok({ id: (await client.send(jid).location(latitude, longitude, { ...(name ? { name } : {}), ...(address ? { address } : {}) })).id })
  })
  write('send_poll', 'messaging', false, 'Send a poll with 2+ options.', { to: TARGET, question: z.string(), options: z.array(z.string()).min(2), multipleChoice: z.boolean().optional() }, async ({ to, question, options: opts, multipleChoice }) => {
    const { jid, blocked } = sendGuard(to)
    if (blocked) return fail(blocked)
    return ok({ id: (await client.send(jid).poll(question, opts, multipleChoice ? { multipleChoice } : {})).id })
  })
  write('send_contact', 'messaging', false, 'Send a contact card (vCard).', { to: TARGET, vcard: z.string() }, async ({ to, vcard }) => {
    const { jid, blocked } = sendGuard(to)
    if (blocked) return fail(blocked)
    return ok({ id: (await client.send(jid).contact(vcard)).id })
  })
  write('send_sticker', 'messaging', false, 'Send a sticker from URL or base64 (webp/png/jpeg; animated Lottie supported).', { to: TARGET, url: z.string().url().optional(), base64: z.string().optional() }, async ({ to, url, base64 }) => {
    const { jid, blocked } = sendGuard(to)
    if (blocked) return fail(blocked)
    const src = media(url, base64)
    if (src == null) return fail('Provide either `url` or `base64`.')
    return ok({ id: (await client.send(jid).sticker(src)).id })
  })

  // ──────────────── message ops ────────────────

  write('react', 'messaging', true, 'React to a message (empty emoji removes the reaction).', { chat: TARGET, messageId: z.string(), emoji: z.string(), fromMe: z.boolean().optional() }, async ({ chat, messageId, emoji, fromMe }) => {
    const blocked = guard(toJid(chat))
    if (blocked) return fail(blocked)
    await client.react(key(chat, messageId, fromMe), emoji)
    return ok()
  })
  write('edit_message', 'messaging', false, 'Edit a text message you sent.', { chat: TARGET, messageId: z.string(), text: z.string() }, async ({ chat, messageId, text: body }) => {
    const blocked = guard(toJid(chat))
    if (blocked) return fail(blocked)
    await client.edit(key(chat, messageId, true)).text(body)
    return ok()
  })
  write('delete_message', 'messaging', false, 'Delete a message for everyone.', { chat: TARGET, messageId: z.string(), fromMe: z.boolean().optional() }, async ({ chat, messageId, fromMe }) => {
    const blocked = guard(toJid(chat))
    if (blocked) return fail(blocked)
    await client.delete({ remoteJid: toJid(chat), id: messageId, fromMe: fromMe !== false }, { forEveryone: true })
    return ok()
  })
  write('forward_message', 'messaging', false, 'Forward a message to another chat.', { from: TARGET, messageId: z.string(), to: TARGET, fromMe: z.boolean().optional() }, async ({ from, messageId, to, fromMe }) => {
    const blocked = guard(toJid(to))
    if (blocked) return fail(blocked)
    return ok({ id: (await client.forward(key(from, messageId, fromMe), toJid(to))).id })
  })
  write('pin_message', 'messaging', false, 'Pin a message in a chat.', { chat: TARGET, messageId: z.string(), fromMe: z.boolean().optional() }, async ({ chat, messageId, fromMe }) => { await client.pin(key(chat, messageId, fromMe)); return ok() })
  write('unpin_message', 'messaging', false, 'Unpin a message in a chat.', { chat: TARGET, messageId: z.string(), fromMe: z.boolean().optional() }, async ({ chat, messageId, fromMe }) => { await client.unpin(key(chat, messageId, fromMe)); return ok() })

  // ──────────────── chat management ────────────────

  write('chat_archive', 'chat', false, 'Archive a chat.', { chat: TARGET }, async ({ chat }) => { await client.chat.archive(toJid(chat)); return ok() })
  write('chat_unarchive', 'chat', false, 'Unarchive a chat.', { chat: TARGET }, async ({ chat }) => { await client.chat.unarchive(toJid(chat)); return ok() })
  write('chat_pin', 'chat', false, 'Pin a chat.', { chat: TARGET }, async ({ chat }) => { await client.chat.pin(toJid(chat)); return ok() })
  write('chat_unpin', 'chat', false, 'Unpin a chat.', { chat: TARGET }, async ({ chat }) => { await client.chat.unpin(toJid(chat)); return ok() })
  write('chat_mute', 'chat', false, 'Mute a chat (optional duration in ms).', { chat: TARGET, durationMs: z.number().optional() }, async ({ chat, durationMs }) => { await client.chat.mute(toJid(chat), durationMs); return ok() })
  write('chat_unmute', 'chat', false, 'Unmute a chat.', { chat: TARGET }, async ({ chat }) => { await client.chat.unmute(toJid(chat)); return ok() })
  write('chat_mark_read', 'chat', true, 'Mark a chat as read (blue ticks).', { chat: TARGET }, async ({ chat }) => { await client.chat.markRead(toJid(chat)); return ok() })
  write('chat_mark_unread', 'chat', false, 'Mark a chat as unread.', { chat: TARGET }, async ({ chat }) => { await client.chat.markUnread(toJid(chat)); return ok() })
  write('chat_delete', 'chat', false, 'Delete a chat.', { chat: TARGET }, async ({ chat }) => { await client.chat.delete(toJid(chat)); return ok() })
  write('chat_clear', 'chat', false, 'Clear all messages in a chat.', { chat: TARGET }, async ({ chat }) => { await client.chat.clear(toJid(chat)); return ok() })
  write('set_disappearing', 'chat', false, 'Set disappearing-message timer for a chat (seconds, 0 disables).', { chat: TARGET, seconds: z.number().int().min(0) }, async ({ chat, seconds }) => { await client.setDisappearing(toJid(chat), seconds); return ok() })

  // ──────────────── presence ────────────────

  write('send_typing', 'presence', true, 'Show the typing indicator in a chat.', { chat: TARGET, ms: z.number().optional() }, async ({ chat, ms }) => { await client.presence.typing(toJid(chat), ms); return ok() })
  write('send_recording', 'presence', false, 'Show the recording-audio indicator in a chat.', { chat: TARGET, ms: z.number().optional() }, async ({ chat, ms }) => { await client.presence.recording(toJid(chat), ms); return ok() })
  write('set_presence', 'presence', false, "Set the bot's global online/offline presence.", { presence: z.enum(['available', 'unavailable']) }, async ({ presence }) => { presence === 'available' ? await client.presence.online() : await client.presence.offline(); return ok() })

  // ──────────────── profile ────────────────

  write('set_profile_name', 'profile', false, 'Set your profile display name.', { name: z.string() }, async ({ name }) => { await client.profile.setName(name); return ok() })
  write('set_profile_status', 'profile', false, 'Set your profile status/about text.', { status: z.string() }, async ({ status }) => { await client.profile.setStatus(status); return ok() })
  write('set_profile_picture', 'profile', false, 'Set a profile picture (yours or a group) by URL or base64.', { target: TARGET, url: z.string().url().optional(), base64: z.string().optional() }, async ({ target, url, base64 }) => {
    const src = media(url, base64)
    if (src == null) return fail('Provide either `url` or `base64`.')
    await client.profile.setPicture(toJid(target), (typeof src === 'string' ? { url: src } : src) as never)
    return ok()
  })
  write('remove_profile_picture', 'profile', false, 'Remove a profile picture.', { target: TARGET }, async ({ target }) => { await client.profile.removePicture(toJid(target)); return ok() })

  // ──────────────── contacts ────────────────

  write('save_contact', 'contact', false, 'Save/label a contact in the address book.', { jid: TARGET, firstName: z.string().optional(), lastName: z.string().optional(), fullName: z.string().optional() }, async ({ jid, firstName, lastName, fullName }) => { await client.contact.save(toJid(jid), { firstName, lastName, fullName }); return ok() })
  write('remove_contact', 'contact', false, 'Remove a saved contact.', { jid: TARGET }, async ({ jid }) => { await client.contact.remove(toJid(jid)); return ok() })

  // ──────────────── privacy ────────────────

  read('privacy_get', 'privacy', false, 'Get your privacy settings.', {}, async () => json(await client.privacy.get()))
  read('blocklist', 'privacy', false, 'List blocked contacts.', {}, async () => json(await client.privacy.blocklist()))
  write('block', 'privacy', false, 'Block a contact.', { jid: TARGET }, async ({ jid }) => { await client.privacy.block(toJid(jid)); return ok() })
  write('unblock', 'privacy', false, 'Unblock a contact.', { jid: TARGET }, async ({ jid }) => { await client.privacy.unblock(toJid(jid)); return ok() })

  // ──────────────── groups ────────────────

  read('group_metadata', 'group', true, 'Get a group subject, description, and participants (with admin flags).', { group: GROUP }, async ({ group }) => {
    const meta = await client.group.metadata(toJid(group))
    return json({ id: meta.id, subject: meta.subject, description: meta.desc ?? null, owner: meta.owner ?? null, participants: meta.participants.map((p) => ({ jid: p.id, admin: p.admin ?? null })) })
  })
  read('group_list', 'group', false, 'List all groups you participate in.', {}, async () => json((await client.group.list()).map((g) => ({ id: g.id, subject: g.subject, size: g.participants.length }))))
  read('group_invite_code', 'group', false, 'Get a group invite code (link suffix).', { group: GROUP }, async ({ group }) => json({ code: await client.group.inviteCode(toJid(group)) }))
  read('group_invite_info', 'group', false, 'Preview a group from an invite code.', { code: z.string() }, async ({ code }) => json(await client.group.inviteInfo(code)))
  read('group_join_requests', 'group', false, 'List pending join requests for a group.', { group: GROUP }, async ({ group }) => json(await client.group.joinRequests(toJid(group))))
  write('group_create', 'group', false, 'Create a group with a subject and initial participants.', { subject: z.string(), participants: JIDS }, async ({ subject, participants }) => { const m = await client.group.create(subject, participants.map(toJid)); return json({ id: m.id, subject: m.subject }) })
  write('group_add', 'group', false, 'Add members to a group.', { group: GROUP, participants: JIDS }, async ({ group, participants }) => json(await client.group.addMember(toJid(group), participants.map(toJid))))
  write('group_remove', 'group', false, 'Remove members from a group.', { group: GROUP, participants: JIDS }, async ({ group, participants }) => json(await client.group.removeMember(toJid(group), participants.map(toJid))))
  write('group_promote', 'group', false, 'Promote members to admin.', { group: GROUP, participants: JIDS }, async ({ group, participants }) => json(await client.group.promote(toJid(group), participants.map(toJid))))
  write('group_demote', 'group', false, 'Demote admins to members.', { group: GROUP, participants: JIDS }, async ({ group, participants }) => json(await client.group.demote(toJid(group), participants.map(toJid))))
  write('group_update_subject', 'group', false, 'Change a group subject.', { group: GROUP, subject: z.string() }, async ({ group, subject }) => { await client.group.updateSubject(toJid(group), subject); return ok() })
  write('group_update_description', 'group', false, 'Change a group description.', { group: GROUP, description: z.string().optional() }, async ({ group, description }) => { await client.group.updateDescription(toJid(group), description); return ok() })
  write('group_leave', 'group', false, 'Leave a group.', { group: GROUP }, async ({ group }) => { await client.group.leave(toJid(group)); return ok() })
  write('group_invite_revoke', 'group', false, 'Revoke and regenerate a group invite code.', { group: GROUP }, async ({ group }) => json({ code: await client.group.revokeInvite(toJid(group)) }))
  write('group_invite_accept', 'group', false, 'Join a group by invite code.', { code: z.string() }, async ({ code }) => json({ id: await client.group.acceptInvite(code) }))
  write('group_approve_join', 'group', false, 'Approve pending join requests.', { group: GROUP, participants: JIDS }, async ({ group, participants }) => json(await client.group.approveJoin(toJid(group), participants.map(toJid))))
  write('group_reject_join', 'group', false, 'Reject pending join requests.', { group: GROUP, participants: JIDS }, async ({ group, participants }) => json(await client.group.rejectJoin(toJid(group), participants.map(toJid))))
  write('group_setting', 'group', false, "Set a group's announce/lock setting.", { group: GROUP, setting: z.enum(['announcement', 'not_announcement', 'locked', 'unlocked']) }, async ({ group, setting }) => { await client.group.setting(toJid(group), setting); return ok() })
  write('group_join_approval', 'group', false, 'Toggle admin approval for new members.', { group: GROUP, enabled: z.boolean() }, async ({ group, enabled }) => { await client.group.joinApproval(toJid(group), enabled); return ok() })
  write('group_member_add_mode', 'group', false, 'Toggle whether only admins can add members.', { group: GROUP, adminsOnly: z.boolean() }, async ({ group, adminsOnly }) => { await client.group.memberAddMode(toJid(group), adminsOnly); return ok() })
  write('group_toggle_ephemeral', 'group', false, 'Set group disappearing-message timer (seconds).', { group: GROUP, seconds: z.number().int().min(0) }, async ({ group, seconds }) => { await client.group.toggleEphemeral(toJid(group), seconds); return ok() })

  // ──────────────── communities ────────────────

  read('community_metadata', 'community', false, 'Get community metadata.', { community: z.string() }, async ({ community }) => json(await client.community.metadata(toJid(community))))
  read('community_list', 'community', false, 'List communities you participate in.', {}, async () => json((await client.community.list()).map((c) => ({ id: c.id, subject: c.subject }))))
  read('community_subgroups', 'community', false, 'List linked sub-groups of a community.', { community: z.string() }, async ({ community }) => json(await client.community.subGroups(toJid(community))))
  write('community_create', 'community', false, 'Create a community.', { subject: z.string(), body: z.string() }, async ({ subject, body }) => { const m = await client.community.create(subject, body); return json({ id: m.id, subject: m.subject }) })
  write('community_link_group', 'community', false, 'Link a group into a community.', { community: z.string(), group: GROUP }, async ({ community, group }) => { await client.community.linkGroup(toJid(community), toJid(group)); return ok() })
  write('community_unlink_group', 'community', false, 'Unlink a group from a community.', { community: z.string(), group: GROUP }, async ({ community, group }) => { await client.community.unlinkGroup(toJid(community), toJid(group)); return ok() })
  write('community_leave', 'community', false, 'Leave a community.', { community: z.string() }, async ({ community }) => { await client.community.leave(toJid(community)); return ok() })

  // ──────────────── newsletters / channels ────────────────

  read('newsletter_metadata', 'newsletter', false, 'Get newsletter/channel metadata.', { jid: z.string() }, async ({ jid }) => json(await client.newsletter.metadata(toJid(jid))))
  read('newsletter_messages', 'newsletter', false, 'Fetch recent newsletter messages.', { jid: z.string(), count: z.number().int().positive().max(100).optional() }, async ({ jid, count }) => json(await client.newsletter.messages(toJid(jid), count ?? 50)))
  write('newsletter_create', 'newsletter', false, 'Create a newsletter/channel.', { name: z.string(), description: z.string().optional() }, async ({ name, description }) => json(await client.newsletter.create(name, description ? { description } : {})))
  write('newsletter_follow', 'newsletter', false, 'Follow a newsletter/channel.', { jid: z.string() }, async ({ jid }) => { await client.newsletter.follow(toJid(jid)); return ok() })
  write('newsletter_unfollow', 'newsletter', false, 'Unfollow a newsletter/channel.', { jid: z.string() }, async ({ jid }) => { await client.newsletter.unfollow(toJid(jid)); return ok() })
  write('newsletter_mute', 'newsletter', false, 'Mute a newsletter/channel.', { jid: z.string() }, async ({ jid }) => { await client.newsletter.mute(toJid(jid)); return ok() })
  write('newsletter_unmute', 'newsletter', false, 'Unmute a newsletter/channel.', { jid: z.string() }, async ({ jid }) => { await client.newsletter.unmute(toJid(jid)); return ok() })
  write('newsletter_react', 'newsletter', false, 'React to a newsletter message.', { jid: z.string(), serverId: z.string(), emoji: z.string() }, async ({ jid, serverId, emoji }) => { await client.newsletter.react(toJid(jid), serverId, emoji); return ok() })

  // ──────────────── business ────────────────

  read('business_profile', 'business', false, 'Get a business profile.', { jid: TARGET }, async ({ jid }) => json(await client.business.profile(toJid(jid))))
  read('business_catalog', 'business', false, 'Get a business product catalog.', { jid: TARGET, limit: z.number().int().positive().max(100).optional() }, async ({ jid, limit }) => json(await client.business.catalog({ jid: toJid(jid), ...(limit ? { limit } : {}) })))
  read('business_collections', 'business', false, 'Get a business product collections.', { jid: TARGET, limit: z.number().int().positive().optional() }, async ({ jid, limit }) => json(await client.business.collections(toJid(jid), limit)))

  applyStrategy(server, catalog, options.tools ?? 'progressive')
}

// ──────────────── tool-exposure strategy ────────────────

const searchText = (e: CatalogEntry): string => `${e.name.replace(/_/g, ' ')} ${e.category} ${e.description}`.toLowerCase()

const score = (e: CatalogEntry, q: string): number => {
  const hay = searchText(e)
  let s = 0
  if (e.category === q) s += 5
  if (e.name.includes(q.replace(/\s+/g, '_'))) s += 4
  for (const w of q.split(/\s+/)) {
    if (w.length < 2) continue
    if (e.name.includes(w)) s += 3
    else if (hay.includes(w)) s += 1
  }
  return s
}

function applyStrategy(server: McpServer, catalog: CatalogEntry[], strategy: 'progressive' | 'full' | 'core' | string[]): void {
  if (strategy === 'full') return // everything stays enabled, no discovery needed

  const explicit = Array.isArray(strategy) ? new Set(strategy) : null
  const active = (e: CatalogEntry): boolean => (explicit ? explicit.has(e.name) : e.core)
  for (const e of catalog) if (!active(e)) e.handle.disable()

  if (strategy === 'core') return // locked minimal set, no discovery

  // progressive / explicit → add the find_tools meta-tool
  server.registerTool(
    'find_tools',
    {
      description:
        'Discover more WhatsApp tools that are not currently active. Call this FIRST whenever you need an action or data that the visible tools do not cover (managing groups, communities, newsletters, privacy, profile, business, deleting/forwarding/pinning messages, etc.) — this account has many more capabilities than the tools shown right now. Pass a short description of what you need (or a category: messaging, chat, group, community, newsletter, presence, profile, contact, privacy, business, account); matching tools become callable immediately after.',
      inputSchema: { query: z.string().describe('What you need, e.g. "add member to group", "block contact", or a category like "newsletter"') },
    },
    async ({ query }: { query: string }) => {
      const q = query.trim().toLowerCase()
      const hits = catalog
        .filter((e) => !e.handle.enabled)
        .map((e) => ({ e, s: score(e, q) }))
        .filter((m) => m.s > 0)
        .sort((a, b) => b.s - a.s)
        .slice(0, 8)
      for (const { e } of hits) e.handle.enable()
      if (hits.length === 0) return json({ found: [], note: 'No inactive tool matched — try a broader term or a category name.' })
      return json({ activated: hits.map(({ e }) => ({ name: e.name, description: e.description })) })
    },
  )
}
