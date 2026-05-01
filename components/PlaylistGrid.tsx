import type { Playlist } from '@/types'
import PlaylistCard from './PlaylistCard'

interface Props {
  playlists: Playlist[]
  loadingIds?: Set<string>
}

export default function PlaylistGrid({ playlists, loadingIds }: Props) {
  if (playlists.length === 0) return null

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {playlists.map((pl) => (
        <PlaylistCard key={pl.id} playlist={pl} loading={loadingIds?.has(pl.id)} />
      ))}
    </div>
  )
}
