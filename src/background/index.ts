type TokenResponse = {
  access_token: string
  refresh_token?: string
  expires_in: number
  scope?: string
  token_type?: string
}

type StoredTokens = {
  accessToken: string
  refreshToken: string
  expiresAtMs: number
}

import { CLIENT_ID, MS_TENANT, MS_SCOPES } from '../constant/constant'
const MS_AUTH_URL = `https://login.microsoftonline.com/${MS_TENANT}/oauth2/v2.0/authorize`
const MS_TOKEN_URL = `https://login.microsoftonline.com/${MS_TENANT}/oauth2/v2.0/token`

const VERIFIER_KEY = 'oauthPkceVerifier'

// 확장용 리다이렉트 URI 반환 (launchWebAuthFlow 전용 고정 도메인)
function getRedirectUri(): string {
  // Reserved redirect for extensions using launchWebAuthFlow
  return `https://${chrome.runtime.id}.chromiumapp.org/`
}

// 토큰 저장 (만료 시각 로그 포함)
async function saveTokens(tokens: StoredTokens): Promise<void> {
  await chrome.storage.local.set({ oauthTokens: tokens })
}

// 토큰 로드 (존재/만료 정보 로그)
async function loadTokens(): Promise<StoredTokens | null> {
  const { oauthTokens } = await chrome.storage.local.get('oauthTokens')
  return oauthTokens ?? null
}

// 만료 체크 (기본 60초 스큐)
function isExpired(expiresAtMs: number, skewSeconds = 60): boolean {
  return Date.now() >= expiresAtMs - skewSeconds * 1000
}

// PKCE 코드 + verifier로 토큰 교환
async function exchangeCodeForTokens(code: string, codeVerifier: string): Promise<StoredTokens> {
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    grant_type: 'authorization_code',
    code,
    redirect_uri: getRedirectUri(),
    scope: MS_SCOPES.join(' '),
    code_verifier: codeVerifier,
  })

  const res = await fetch(MS_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!res.ok) throw new Error(`token exchange failed: ${res.status}`)
  const data = (await res.json()) as TokenResponse
  const expiresAtMs = Date.now() + (data.expires_in ?? 3600) * 1000
  const tokens: StoredTokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? '',
    expiresAtMs,
  }
  await saveTokens(tokens)
  scheduleRefresh(tokens.expiresAtMs)
  return tokens
}

// Refresh Token으로 Access Token 갱신
async function refreshAccessToken(refreshToken: string): Promise<StoredTokens> {
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    redirect_uri: getRedirectUri(),
    scope: MS_SCOPES.join(' '),
  })
  const res = await fetch(MS_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!res.ok) throw new Error(`refresh failed: ${res.status}`)
  const data = (await res.json()) as TokenResponse
  const expiresAtMs = Date.now() + (data.expires_in ?? 3600) * 1000

  const tokens: StoredTokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
    expiresAtMs,
  }
  await saveTokens(tokens)
  scheduleRefresh(tokens.expiresAtMs)
  return tokens
}

// 유효한 Access Token 반환 (만료 시 자동 갱신)
async function getValidAccessToken(): Promise<string> {
  const tokens = await loadTokens()
  if (!tokens) throw new Error('not_authenticated')
  if (!isExpired(tokens.expiresAtMs)) {
    console.log('[BG] getValidAccessToken: using cached token')
    return tokens.accessToken
  }

  const refreshed = await refreshAccessToken(tokens.refreshToken)
  return refreshed.accessToken
}

// PKCE code_challenge(S256) 포함 인증 URL 생성
function buildAuthUrl(codeChallenge: string): string {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: getRedirectUri(),
    scope: MS_SCOPES.join(' '),
    response_mode: 'query',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  })
  return `${MS_AUTH_URL}?${params.toString()}`
}

// ArrayBuffer → base64url 인코딩
function base64urlEncode(arrayBuffer: ArrayBuffer): string {
  const bytes = new Uint8Array(arrayBuffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
  const base64 = btoa(binary)
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

// 난수(base64url) 생성 (verifier 용)
function randomString(bytes = 32): string {
  const array = new Uint8Array(bytes)
  crypto.getRandomValues(array)
  return base64urlEncode(array.buffer)
}

// 입력 텍스트의 SHA-256 → base64url (challenge 생성)
async function sha256Base64Url(input: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(input)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return base64urlEncode(digest)
}

// PKCE 페어(verifier, challenge) 생성
async function createPkcePair(): Promise<{ verifier: string; challenge: string }> {
  const verifier = randomString(64)
  const challenge = await sha256Base64Url(verifier)
  return { verifier, challenge }
}

// 토큰 만료 5분 전으로 알람 예약
function scheduleRefresh(expiresAtMs: number) {
  const whenMs = Math.max(0, expiresAtMs - Date.now() - 5 * 60 * 1000) // 5분 전
  chrome.alarms.create('oauth_token_refresh', { when: Date.now() + whenMs })
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  // 토큰 갱신 알람 처리
  if (alarm.name !== 'oauth_token_refresh') return
  try {
    const tokens = await loadTokens()
    if (!tokens) return
    if (isExpired(tokens.expiresAtMs, 300)) {
      console.log('[BG] onAlarm: refreshing token')
      await refreshAccessToken(tokens.refreshToken)
    } else {
      console.log('[BG] onAlarm: token still valid, reschedule')
      scheduleRefresh(tokens.expiresAtMs)
    }
  } catch (e) {
    console.error('token refresh alarm error', e)
  }
})

//AUTH_START: 웹 인증 흐름 시작
// 메시지 라우팅 (인증 시작/토큰 조회/상태 조회)
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  (async () => {
    if (request?.type === 'AUTH_START') {
      try {
        // PKCE 생성 및 저장
        const { verifier, challenge } = await createPkcePair()
        await chrome.storage.session.set({ [VERIFIER_KEY]: verifier })

        const authUrl = buildAuthUrl(challenge)
        const redirectUrl = await chrome.identity.launchWebAuthFlow({
          url: authUrl,
          interactive: true,
        })

        if (!redirectUrl) throw new Error('no_redirect_url')

        const url = new URL(redirectUrl)
        const code = url.searchParams.get('code')

        if (!code) throw new Error(url.toJSON())

        // 저장한 verifier 로드 후 교환
        const { [VERIFIER_KEY]: storedVerifier } = await chrome.storage.session.get(VERIFIER_KEY)
        if (!storedVerifier) throw new Error('missing_code_verifier')
        await exchangeCodeForTokens(code, storedVerifier)

        // 일회용이므로 제거
        await chrome.storage.session.remove(VERIFIER_KEY)
        sendResponse({ ok: true })
      } catch (e) {
        console.error('AUTH_START error', e)
        sendResponse({ ok: false, error: String(e) })
      }
      return
    }

    if (request?.type === 'GET_ACCESS_TOKEN') {
      try {
        const token = await getValidAccessToken()
        sendResponse({ ok: true, accessToken: token })
      } catch (e) {
        sendResponse({ ok: false, error: String(e) })
      }
      return
    }

    if (request?.type === 'GET_AUTH_STATUS') {
      try {
        const tokens = await loadTokens()
        if (!tokens) {
          sendResponse({ ok: true, hasTokens: false, valid: false })
          return
        }
        const valid = !isExpired(tokens.expiresAtMs)
        sendResponse({
          ok: true,
          hasTokens: true,
          valid,
          expiresAtMs: tokens.expiresAtMs,
        })
      } catch (e) {
        sendResponse({ ok: false, error: String(e) })
      }
      return
    }
  })()
  return true
})
