'use client'

import { useEffect, useRef, useState } from 'react'
import ConnectButton from '@/components/ConnectButton'
import PlaylistGrid from '@/components/PlaylistGrid'
import ProgressBar from '@/components/ProgressBar'
import { getStoredToken, clearToken, fetchAllPlaylists, fetchAllTracks } from '@/lib/spotify'
import { Button } from '@/components/ui/button'
import type { Playlist, Track } from '@/types'

type Phase = 'idle' | 'fetching-playlists' | 'fetching-tracks' | 'done'

export default function Home() {
  const [connected, setConnected] = useState(() => {
    if (typeof window === 'undefined') return false
    const params = new URLSearchParams(window.location.search)
    if (params.get('error')) return false
    return !!getStoredToken()
  })

  const [authError] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    return new URLSearchParams(window.location.search).get('error')
  })

  const [phase, setPhase] = useState<Phase>('idle')
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set())
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const fetchStarted = useRef(false)

  useEffect(() => {
    if (authError) window.history.replaceState({}, '', '/')
  }, [authError])

  useEffect(() => {
    if (!connected || fetchStarted.current) return
    fetchStarted.current = true

    const stored = getStoredToken()
    if (!stored) return
    const token = stored.accessToken

    async function run() {
      // Phase 1: fetch all playlist metadata page by page
      setPhase('fetching-playlists')

      const allPlaylists = await fetchAllPlaylists(token, (batch) => {
        setPlaylists((prev) => [...prev, ...batch])
      })

      // Phase 2: fetch tracks per playlist
      setPhase('fetching-tracks')
      setProgress({ done: 0, total: allPlaylists.length })
      setLoadingIds(new Set(allPlaylists.map((p) => p.id)))

      const deduped = new Map<string, Track>()

      for (let i = 0; i < allPlaylists.length; i++) {
        const pl = allPlaylists[i]
        let tracks: Track[] = []
        try {
          tracks = await fetchAllTracks(token, pl.id)
        } catch {
          // skip playlists that fail (e.g. collaborative playlists we can't read)
        }

        // Only keep tracks not yet seen across all playlists
        const fresh: Track[] = []
        for (const t of tracks) {
          if (!deduped.has(t.id)) {
            deduped.set(t.id, t)
            fresh.push(t)
          }
        }

        setPlaylists((prev) =>
          prev.map((p) =>
            p.id === pl.id ? { ...p, tracks: fresh, trackCount: tracks.length } : p
          )
        )
        setLoadingIds((prev) => {
          const next = new Set(prev)
          next.delete(pl.id)
          return next
        })
        setProgress({ done: i + 1, total: allPlaylists.length })
      }

      setPhase('done')
    }

    run().catch((err) => {
      console.error('Fetch failed:', err)
      setPhase('idle')
    })
  }, [connected])

  function handleDisconnect() {
    clearToken()
    setConnected(false)
    setPlaylists([])
    setPhase('idle')
    fetchStarted.current = false
  }

  if (!connected) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">Playlist Organiser</h1>
        <p className="text-muted-foreground text-sm">
          Connect your Spotify account to get started.
        </p>
        {authError && (
          <p className="text-destructive text-sm">Auth error: {authError}</p>
        )}
        <ConnectButton />
      </main>
    )
  }

  const isFetching = phase === 'fetching-playlists' || phase === 'fetching-tracks'

  return (
    <main className="min-h-screen p-6 space-y-8">
      {/* Header */}
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Playlist Organiser</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
            Connected
          </span>
          <Button variant="ghost" size="sm" onClick={handleDisconnect}>
            Disconnect
          </Button>
        </div>
      </header>

      {/* Progress */}
      {isFetching && (
        <ProgressBar
          label={
            phase === 'fetching-playlists'
              ? 'Fetching your playlists…'
              : `Loading tracks… (${progress.done} / ${progress.total} playlists)`
          }
          done={progress.done}
          total={progress.total}
        />
      )}

      {/* Your playlists */}
      {playlists.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Your Playlists
          </h2>
          <PlaylistGrid playlists={playlists} loadingIds={loadingIds} />
        </section>
      )}

      {/* Bottom half — triage results (Stage 4) */}
      {phase === 'done' && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Organised
          </h2>
          <p className="text-sm text-muted-foreground">Triage coming in Stage 4.</p>
        </section>
      )}
    </main>
  )
}
