'use client'

import { useEffect, useState } from 'react'
import ConnectButton from '@/components/ConnectButton'
import { getStoredToken, clearToken } from '@/lib/spotify'
import { Button } from '@/components/ui/button'

export default function Home() {
  const [connected, setConnected] = useState(() => {
    if (typeof window === 'undefined') return false
    const params = new URLSearchParams(window.location.search)
    if (params.get('error')) return false
    return !!getStoredToken()
  })

  const [error] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    return new URLSearchParams(window.location.search).get('error')
  })

  // Clear the error query param from the URL without triggering a re-render
  useEffect(() => {
    if (error) window.history.replaceState({}, '', '/')
  }, [error])

  function handleDisconnect() {
    clearToken()
    setConnected(false)
  }

  if (!connected) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">Playlist Organiser</h1>
        <p className="text-muted-foreground text-sm">Connect your Spotify account to get started.</p>
        {error && (
          <p className="text-destructive text-sm">Auth error: {error}</p>
        )}
        <ConnectButton />
      </main>
    )
  }

  return (
    <main className="min-h-screen p-6">
      <header className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Playlist Organiser</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
            Connected to Spotify
          </span>
          <Button variant="ghost" size="sm" onClick={handleDisconnect}>
            Disconnect
          </Button>
        </div>
      </header>

      {/* Stages 3–5 will populate this area */}
      <div className="text-muted-foreground text-sm">Ready — playlists will appear here.</div>
    </main>
  )
}
