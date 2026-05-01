import type { Playlist } from '@/types'

interface Props {
  playlist: Playlist
  loading?: boolean
}

export default function PlaylistCard({ playlist, loading }: Props) {
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-card p-2">
      <div className="aspect-square w-full overflow-hidden rounded-lg bg-muted">
        {playlist.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={playlist.coverUrl}
            alt={playlist.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground/30">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
        )}
      </div>
      <p className="text-sm text-muted-foreground text-center pb-1 font-medium">
        {loading ? (
          <span className="inline-block h-2.5 w-8 animate-pulse rounded bg-muted" />
        ) : (
          `${playlist.trackCount}`
        )}
      </p>
    </div>
  )
}
