'use client'

import { useEffect, useRef, useState } from 'react'
import ConnectButton from '@/components/ConnectButton'
import PlaylistGrid from '@/components/PlaylistGrid'
import CategoryCard from '@/components/CategoryCard'
import ProgressBar from '@/components/ProgressBar'
import {
  getStoredToken,
  clearToken,
  fetchAllPlaylists,
  fetchAllTracks,
  fetchUserProfile,
  fetchSavedTracks,
  createSpotifyPlaylist,
} from '@/lib/spotify'
import { triageAllTracks } from '@/lib/triage'
import { Button } from '@/components/ui/button'
import { CATEGORY_NAMES } from '@/types'
import type { Playlist, Track, CategoryPlaylist, CategoryName } from '@/types'

type Phase = 'idle' | 'fetching-playlists' | 'fetching-tracks' | 'triaging' | 'done'

const CATEGORY_META_EMOJI: Record<CategoryName, string> = {
  'Lock In': '🎯',
  Drive:     '⚡',
  Glow:      '✨',
  Unwind:    '🌿',
  Feels:     '💜',
  Edge:      '🖤',
  Night:     '🌙',
}

function buildEmptyCategoryPlaylists(): CategoryPlaylist[] {
  return CATEGORY_NAMES.map((name) => ({ name, tracks: [] }))
}

export default function Home() {
  const [mounted, setMounted] = useState(false)
  const [connected, setConnected] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  const [phase, setPhase] = useState<Phase>('idle')
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [triageProgress, setTriageProgress] = useState({ done: 0, total: 0 })
  const [categoryPlaylists, setCategoryPlaylists] = useState<CategoryPlaylist[]>(
    buildEmptyCategoryPlaylists()
  )
  const [pipelineError, setPipelineError] = useState<string | null>(null)
  const [trackCount, setTrackCount] = useState(0)

  const [userId, setUserId] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<CategoryName | null>(null)

  const [addingAll, setAddingAll] = useState(false)
  const [addAllProgress, setAddAllProgress] = useState({ done: 0, total: 0 })
  const [allAdded, setAllAdded] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  const fetchStarted = useRef(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const error = params.get('error')
    if (error) {
      setAuthError(error)
      window.history.replaceState({}, '', '/')
    } else {
      setConnected(!!getStoredToken())
    }
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!connected || fetchStarted.current) return
    fetchStarted.current = true

    const stored = getStoredToken()
    if (!stored) return
    const token = stored.accessToken

    async function run() {
      setPhase('fetching-playlists')

      const profile = await fetchUserProfile(token)
      setUserId(profile.id)

      const allPlaylists = await fetchAllPlaylists(token, (batch) => {
        setPlaylists((prev) => [...prev, ...batch])
      })

      setPhase('fetching-tracks')

      const deduped = new Map<string, Track>()

      for (let i = 0; i < allPlaylists.length; i++) {
        const pl = allPlaylists[i]
        let tracks: Track[] = []
        try {
          tracks = await fetchAllTracks(token, pl.id)
        } catch (err) {
          console.warn(`Skipping playlist "${pl.name}":`, err)
        }

        for (const t of tracks) {
          if (!deduped.has(t.id)) deduped.set(t.id, t)
        }

        setPlaylists((prev) =>
          prev.map((p) =>
            p.id === pl.id
              ? { ...p, ...(tracks.length > 0 && { trackCount: tracks.length }) }
              : p
          )
        )
      }

      let triageTracks = [...deduped.values()].slice(0, 50)

      if (triageTracks.length === 0) {
        try {
          const saved = await fetchSavedTracks(token, 50)
          triageTracks = saved
        } catch (err) {
          console.error('Saved tracks fetch failed:', err)
        }
      }

      setTrackCount(triageTracks.length)
      setPhase('triaging')
      setTriageProgress({ done: 0, total: triageTracks.length })

      const triageMap = new Map(triageTracks.map((t) => [t.id, t]))

      await triageAllTracks(triageTracks, (results, done, total) => {
        setTriageProgress({ done, total })
        setCategoryPlaylists((prev) => {
          const next = prev.map((cp) => ({ ...cp, tracks: [...cp.tracks] }))
          const byName = new Map<CategoryName, CategoryPlaylist>(next.map((cp) => [cp.name, cp]))
          for (const r of results) {
            const track = triageMap.get(r.id)
            if (track) byName.get(r.category)?.tracks.push(track)
          }
          return next
        })
      })

      setPhase('done')
    }

    run().catch((err) => {
      console.error('Pipeline error:', err)
      setPipelineError(String(err))
      setPhase('idle')
    })
  }, [connected])

  function handleDisconnect() {
    clearToken()
    setConnected(false)
    setPlaylists([])
    setCategoryPlaylists(buildEmptyCategoryPlaylists())
    setPhase('idle')
    setUserId(null)
    setSelectedCategory(null)
    setAddingAll(false)
    setAllAdded(false)
    setAddError(null)
    fetchStarted.current = false
  }

  async function handleAddAll() {
    if (addingAll || allAdded) return
    const stored = getStoredToken()
    if (!stored || !userId) return

    const toCreate = categoryPlaylists.filter((cp) => cp.tracks.length > 0)
    if (toCreate.length === 0) return

    setAddError(null)
    setAddingAll(true)
    setAddAllProgress({ done: 0, total: toCreate.length })

    for (let i = 0; i < toCreate.length; i++) {
      const cp = toCreate[i]
      try {
        await createSpotifyPlaylist(
          stored.accessToken,
          userId,
          cp.name,
          cp.tracks.map((t) => t.uri)
        )
      } catch (err) {
        console.error(`Failed to create "${cp.name}":`, err)
        setAddError(`Failed on "${cp.name}" — ${err}`)
      }
      setAddAllProgress({ done: i + 1, total: toCreate.length })
    }

    setAddingAll(false)
    setAllAdded(true)
  }

  // Auto-select the first non-empty category when triage completes
  useEffect(() => {
    if (phase === 'done' && selectedCategory === null) {
      const first = categoryPlaylists.find((cp) => cp.tracks.length > 0)
      if (first) setSelectedCategory(first.name)
    }
  }, [phase, categoryPlaylists, selectedCategory])

  if (!mounted) return null

  // ── Landing ──────────────────────────────────────────────────────────────
  if (!connected) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-10 px-6">
        <div className="text-center space-y-5">
          <h1 className="text-6xl sm:text-8xl font-bold tracking-tight leading-none">
            Playlist
            <br />
            <span className="bg-gradient-to-r from-primary via-purple-400 to-violet-300 bg-clip-text text-transparent">
              Organiser
            </span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-sm mx-auto leading-relaxed">
            AI sorts your entire Spotify library into 7 mood-based playlists.
          </p>
        </div>
        {authError && <p className="text-destructive text-sm">Auth error: {authError}</p>}
        <ConnectButton />
      </main>
    )
  }

  // ── App ───────────────────────────────────────────────────────────────────
  const isFetching = phase === 'fetching-playlists' || phase === 'fetching-tracks'
  const isTriaging = phase === 'triaging'
  const totalTracks = playlists.reduce((sum, p) => sum + p.trackCount, 0)

  return (
    <main className="min-h-screen py-10">
      <div className="max-w-5xl mx-auto px-6 space-y-8">

        {/* Disconnect */}
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={handleDisconnect}>
            Disconnect
          </Button>
        </div>

        {/* Pipeline error */}
        {pipelineError && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {pipelineError}
          </div>
        )}

        {/* Playlist section */}
        <section className="space-y-3">
          {playlists.length > 0 && (
            <p className="text-base text-muted-foreground font-medium">
              {totalTracks} tracks across {playlists.length} playlists
            </p>
          )}
          <PlaylistGrid
            playlists={playlists}
            loading={isFetching && playlists.length === 0}
          />
        </section>

        {/* Triage progress */}
        {isTriaging && (
          <ProgressBar
            label={`Sorting ${trackCount} tracks with Claude…`}
            done={triageProgress.done}
            total={triageProgress.total}
          />
        )}

        {/* Category grid */}
        {(isTriaging || phase === 'done') && (
          <section className="space-y-4">
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-7">
              {categoryPlaylists.map((cp) => (
                <CategoryCard
                  key={cp.name}
                  playlist={cp}
                  triaging={isTriaging}
                  selected={selectedCategory === cp.name}
                  onClick={() =>
                    setSelectedCategory((prev) => (prev === cp.name ? null : cp.name))
                  }
                />
              ))}
            </div>

            {/* Expanded track list */}
            {selectedCategory && (() => {
              const cp = categoryPlaylists.find((c) => c.name === selectedCategory)!
              return (
                <div className="rounded-xl border bg-card p-4 space-y-3">
                  <p className="text-lg font-bold">
                    {CATEGORY_META_EMOJI[selectedCategory]} {cp.name}
                    <span className="text-muted-foreground font-normal text-base ml-3">
                      {cp.tracks.length} tracks
                    </span>
                  </p>
                  <div className="divide-y divide-border max-h-72 overflow-y-auto">
                    {cp.tracks.length === 0 ? (
                      <p className="py-6 text-base text-muted-foreground text-center">No tracks yet</p>
                    ) : (
                      cp.tracks.map((t) => (
                        <div key={t.id} className="flex items-baseline gap-4 py-3">
                          <p className="text-base font-medium truncate flex-1">{t.name}</p>
                          <p className="text-sm text-muted-foreground truncate shrink-0">{t.artistName}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )
            })()}

            {/* Add all to Spotify */}
            {phase === 'done' && (
              <div className="space-y-3 pt-2">
                {addingAll && (
                  <ProgressBar
                    label={`Creating playlists in Spotify… (${addAllProgress.done} / ${addAllProgress.total})`}
                    done={addAllProgress.done}
                    total={addAllProgress.total}
                  />
                )}
                {addError && (
                  <p className="text-sm text-destructive">{addError}</p>
                )}
                <Button
                  size="lg"
                  className="w-full"
                  disabled={addingAll || allAdded}
                  onClick={handleAddAll}
                >
                  {allAdded ? '✓ All playlists added to Spotify' : addingAll ? 'Adding…' : 'Add all to Spotify'}
                </Button>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  )
}
