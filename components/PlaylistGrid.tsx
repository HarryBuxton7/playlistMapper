'use client'

import { useState } from 'react'
import type { Playlist } from '@/types'
import PlaylistCard from './PlaylistCard'

const INITIAL_LIMIT = 9

function SkeletonCard() {
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-card p-2">
      <div className="aspect-square w-full rounded-lg bg-muted animate-pulse" />
      <div className="mx-auto h-2.5 w-8 rounded bg-muted animate-pulse mb-1" />
    </div>
  )
}

interface Props {
  playlists: Playlist[]
  loading?: boolean
}

export default function PlaylistGrid({ playlists, loading }: Props) {
  const [expanded, setExpanded] = useState(false)

  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: INITIAL_LIMIT }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    )
  }

  if (playlists.length === 0) return null

  const visible = expanded ? playlists : playlists.slice(0, INITIAL_LIMIT)
  const hidden = playlists.length - INITIAL_LIMIT

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {visible.map((pl) => (
          <PlaylistCard key={pl.id} playlist={pl} />
        ))}
      </div>
      {hidden > 0 && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2 font-medium"
        >
          {expanded ? 'Show less ↑' : `Show ${hidden} more ↓`}
        </button>
      )}
    </div>
  )
}
