'use client'

import type { Playlist } from '@/types'
import PlaylistCard from './PlaylistCard'

function SkeletonCard() {
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-card p-2">
      <div className="aspect-square w-full rounded-lg bg-muted animate-pulse" />
      <div className="mx-auto h-3 w-8 rounded bg-muted animate-pulse mb-1" />
    </div>
  )
}

interface Props {
  playlists: Playlist[]
  loading?: boolean
}

export default function PlaylistGrid({ playlists, loading }: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-6 gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    )
  }

  if (playlists.length === 0) return null

  return (
    <div className="grid grid-cols-6 gap-2">
      {playlists.map((pl) => (
        <PlaylistCard key={pl.id} playlist={pl} />
      ))}
    </div>
  )
}
