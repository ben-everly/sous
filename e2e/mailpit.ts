const MAILPIT_URL = 'http://localhost:54324'

export async function clearMailpit(): Promise<void> {
  await fetch(`${MAILPIT_URL}/api/v1/messages`, { method: 'DELETE' })
}

export async function waitForEmail(recipient: string, timeoutMs = 15000): Promise<string> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const res = await fetch(
      `${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:${recipient}`)}`,
    )
    const body = (await res.json()) as { messages?: { ID: string }[] }
    if (body.messages?.length) return body.messages[0].ID
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error(`No email for ${recipient} within ${timeoutMs}ms`)
}

// The negative half of non-enumeration: the UI must respond identically, but GoTrue
// genuinely sends nothing for an address with no (unconfirmed) account.
export async function expectNoEmail(recipient: string, windowMs = 3000): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, windowMs))
  const res = await fetch(
    `${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:${recipient}`)}`,
  )
  const body = (await res.json()) as { messages?: { ID: string }[] }
  if (body.messages?.length) {
    throw new Error(`Expected no email for ${recipient}, found ${body.messages.length}`)
  }
}

// Pull the first token_hash link whose path matches `pathFragment` out of the email body.
async function getEmailLink(messageId: string, pathFragment: string): Promise<string> {
  const res = await fetch(`${MAILPIT_URL}/api/v1/message/${messageId}`)
  const body = (await res.json()) as { HTML?: string; Text?: string }
  const source = body.HTML || body.Text || ''
  const link = source
    .match(/https?:\/\/[^\s"'<>]+/g)
    ?.find((url) => url.includes(pathFragment) && url.includes('token_hash'))
  if (!link) throw new Error(`No ${pathFragment} link found in the email`)
  return link.replace(/&amp;/g, '&')
}

export const getRecoveryLink = (messageId: string) => getEmailLink(messageId, '/reset-password')
export const getConfirmationLink = (messageId: string) => getEmailLink(messageId, '/auth/confirm')
