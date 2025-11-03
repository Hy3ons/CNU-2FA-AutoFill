export async function startMicrosoftOAuth(): Promise<void> {
  const res = await chrome.runtime.sendMessage({ type: 'AUTH_START' })
  if (!res?.ok) throw new Error(res?.error || 'AUTH_START_FAILED')
}

export async function getAccessTokenFromBackground(): Promise<string> {
  const res = await chrome.runtime.sendMessage({ type: 'GET_ACCESS_TOKEN' })
  if (!res?.ok) throw new Error(res?.error || 'TOKEN_UNAVAILABLE')
  return res.accessToken as string
}

export type AuthStatus = {
  hasTokens: boolean
  valid: boolean
  expiresAtMs?: number
}

export async function getAuthStatus(): Promise<AuthStatus> {
  const res = await chrome.runtime.sendMessage({ type: 'GET_AUTH_STATUS' })
  if (!res?.ok) throw new Error(res?.error || 'STATUS_UNAVAILABLE')
  return {
    hasTokens: !!res.hasTokens,
    valid: !!res.valid,
    expiresAtMs: res.expiresAtMs,
  }
}

