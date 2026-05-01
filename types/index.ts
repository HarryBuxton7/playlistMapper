export const CATEGORY_NAMES = [
  'Lock In',
  'Drive',
  'Glow',
  'Unwind',
  'Feels',
  'Edge',
  'Night',
] as const

export type CategoryName = (typeof CATEGORY_NAMES)[number]

export interface Track {
  id: string
  uri: string
  name: string
  artistName: string
  albumName: string
  durationMs: number
  explicit: boolean
}

export interface Playlist {
  id: string
  name: string
  coverUrl: string | null
  trackCount: number
  tracks: Track[]
  ownerId: string
  collaborative: boolean
}

export interface CategoryPlaylist {
  name: CategoryName
  tracks: Track[]
}

export type AppPhase = 'idle' | 'connecting' | 'fetching' | 'triaging' | 'done'

export interface AppState {
  phase: AppPhase
  spotifyToken: string | null
  userId: string | null
  originalPlaylists: Playlist[]
  allTracks: Track[]
  categoryPlaylists: CategoryPlaylist[]
  progress: { done: number; total: number }
  created: Set<CategoryName>
}
