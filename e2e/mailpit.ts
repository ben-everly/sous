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

export async function getRecoveryLink(messageId: string): Promise<string> {
  const res = await fetch(`${MAILPIT_URL}/api/v1/message/${messageId}`)
  const body = (await res.json()) as { HTML?: string; Text?: string }
  const source = body.HTML || body.Text || ''
  const link = source.match(/https?:\/\/[^\s"'<>]+/g)?.find((url) => url.includes('/auth/v1/verify'))
  if (!link) throw new Error('No recovery link found in the email')
  return link.replace(/&amp;/g, '&')
}
