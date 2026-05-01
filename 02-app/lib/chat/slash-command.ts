/**
 * Parse a chat input message for a slash command.
 *
 * Recognised forms (only when the slash command is the entire trimmed message):
 *   /<skill-id>
 *   /skill <skill-id>
 *
 * Returns the parsed skillId, or null if the message is not a slash command.
 * The caller is responsible for validating the skillId against the runtime
 * registry — this parser is purely syntactic.
 */
export function parseSlashCommand(message: string): { skillId: string } | null {
  const trimmed = message.trim()
  if (!trimmed.startsWith('/')) return null

  // /skill <skill-id> form
  const skillMatch = trimmed.match(/^\/skill\s+([a-z0-9][a-z0-9-]*)\s*$/i)
  if (skillMatch) {
    return { skillId: skillMatch[1].toLowerCase() }
  }

  // /<skill-id> shorthand
  const shortMatch = trimmed.match(/^\/([a-z0-9][a-z0-9-]*)\s*$/i)
  if (shortMatch) {
    return { skillId: shortMatch[1].toLowerCase() }
  }

  return null
}
