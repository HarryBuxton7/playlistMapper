import type { Playlist, Track } from '@/types'

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

// User profile

export async function fetchUserProfile(token: string): Promise<{ id: string; display_name: string }> {
  const res = await spotifyFetch('https://api.spotify.com/v1/me', token)
  if (!res.ok) throw new Error('Failed to fetch user profile')
  return res.json()
}

// Fetch all playlists (paginated). Calls onBatch after each page so the UI
// can render progressively without waiting for all pages.

export async function fetchAllPlaylists(
  token: string,
  onBatch?: (batch: Playlist[], total: number) => void
): Promise<Playlist[]> {
  const all: Playlist[] = []
  let url: string | null = 'https://api.spotify.com/v1/me/playlists?limit=50'

  while (url) {
    const res = await spotifyFetch(url, token)
    if (!res.ok) throw new Error(`Failed to fetch playlists: ${res.status}`)
    const data = await res.json()

    const batch: Playlist[] = (data.items ?? [])
      .filter(Boolean)
      .map((item: Record<string, unknown>) => ({
        id: item.id as string,
        name: item.name as string,
        coverUrl:
          Array.isArray(item.images) && item.images.length > 0
            ? (item.images[0] as { url: string }).url
            : null,
        trackCount:
          typeof item.tracks === 'object' && item.tracks !== null
            ? ((item.tracks as Record<string, unknown>).total as number) ?? 0
            : 0,
        tracks: [],
      }))

    all.push(...batch)
    onBatch?.(batch, data.total ?? all.length)
    url = data.next ?? null
  }

  return all
}

// Fetch all tracks for a playlist (paginated).

export async function fetchAllTracks(token: string, playlistId: string): Promise<Track[]> {
  const all: Track[] = []
  let url: string | null =
    `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=50`

  while (url) {
    const res = await spotifyFetch(url, token)
    if (!res.ok) throw new Error(`Failed to fetch tracks for ${playlistId}: ${res.status}`)
    const data = await res.json()

    for (const item of data.items ?? []) {
      const track = item?.track
      if (!track || track.type !== 'track' || !track.id) continue
      all.push({
        id: track.id as string,
        uri: track.uri as string,
        name: track.name as string,
        artistName:
          Array.isArray(track.artists) && track.artists.length > 0
            ? (track.artists[0] as { name: string }).name
            : 'Unknown Artist',
        albumName: (track.album as { name: string } | null)?.name ?? '',
        durationMs: (track.duration_ms as number) ?? 0,
        explicit: (track.explicit as boolean) ?? false,
      })
    }

    url = data.next ?? null
  }

  return all
}

// Create a playlist and add tracks to it (100 URIs per request max).

export async function createSpotifyPlaylist(
  token: string,
  userId: string,
  name: string,
  uris: string[]
): Promise<string> {
  const createRes = await fetch(`https://api.spotify.com/v1/users/${userId}/playlists`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, public: false }),
  })
  if (!createRes.ok) throw new Error(`Failed to create playlist: ${createRes.status}`)
  const { id } = await createRes.json()

  for (let i = 0; i < uris.length; i += 100) {
    const chunk = uris.slice(i, i + 100)
    const addRes = await fetch(`https://api.spotify.com/v1/playlists/${id}/tracks`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ uris: chunk }),
    })
    if (!addRes.ok) throw new Error(`Failed to add tracks: ${addRes.status}`)
  }

  return id
}
