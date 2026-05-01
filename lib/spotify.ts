const CLIENT_ID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID!

const SCOPES = [
  'playlist-read-private',
  'playlist-read-collaborative',
  'playlist-modify-public',
  'playlist-modify-private',
].join(' ')

// PKCE helpers

export function generateCodeVerifier(): string {
  const array = new Uint8Array(64)
  crypto.getRandomValues(array)
  return base64urlEncode(array)
}

export async function generateCodeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return base64urlEncode(new Uint8Array(digest))
}

function base64urlEncode(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

export async function buildAuthUrl(): Promise<string> {
  const verifier = generateCodeVerifier()
  const challenge = await generateCodeChallenge(verifier)
  const state = generateCodeVerifier().slice(0, 16)

  localStorage.setItem('spotify_code_verifier', verifier)
  localStorage.setItem('spotify_auth_state', state)

  const redirectUri = `${window.location.origin}/callback`

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: SCOPES,
    code_challenge_method: 'S256',
    code_challenge: challenge,
    state,
  })

  return `https://accounts.spotify.com/authorize?${params}`
}

// Token exchange

export interface SpotifyToken {
  accessToken: string
  expiresAt: number
}

export async function exchangeCodeForToken(code: string): Promise<SpotifyToken> {
  const verifier = localStorage.getItem('spotify_code_verifier')
  if (!verifier) throw new Error('Missing code verifier')

  const redirectUri = `${window.location.origin}/callback`

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: CLIENT_ID,
      code_verifier: verifier,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Token exchange failed: ${err}`)
  }

  const data = await res.json()
  const token: SpotifyToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  }

  localStorage.setItem('spotify_token', JSON.stringify(token))
  localStorage.removeItem('spotify_code_verifier')
  localStorage.removeItem('spotify_auth_state')

  return token
}

export function getStoredToken(): SpotifyToken | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem('spotify_token')
  if (!raw) return null
  const token: SpotifyToken = JSON.parse(raw)
  if (Date.now() >= token.expiresAt) {
    localStorage.removeItem('spotify_token')
    return null
  }
  return token
}

export function clearToken(): void {
  localStorage.removeItem('spotify_token')
}

// Spotify API fetch with exponential backoff

export async function spotifyFetch(url: string, token: string): Promise<Response> {
  let delay = 500
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.status !== 429) return res
    const retryAfter = res.headers.get('Retry-After')
    const wait = retryAfter ? parseInt(retryAfter) * 1000 : delay
    await new Promise((r) => setTimeout(r, wait))
    delay *= 2
  }
  throw new Error('Too many rate limit retries')
}

// Get current user profile

export async function fetchUserProfile(token: string): Promise<{ id: string; display_name: string }> {
  const res = await spotifyFetch('https://api.spotify.com/v1/me', token)
  if (!res.ok) throw new Error('Failed to fetch user profile')
  return res.json()
}
