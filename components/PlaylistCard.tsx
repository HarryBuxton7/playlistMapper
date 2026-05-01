import type { Playlist } from '@/types'

interface Props {
  playlist: Playlist
  loading?: boolean
}

export default function PlaylistCard({ playlist, loading }: Props) {
  return (
    <div className="group flex flex-col gap-3 rounded-xl bg-card p-3 transition-colors hover:bg-accent">
      {/* Cover */}
      <div className="aspect-square w-full overflow-hidden rounded-lg bg-muted">
        {playlist.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={playlist.coverUrl}
            alt={playlist.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground/40">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-10 w-10"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Meta */}
      <div className="space-y-0.5 min-w-0">
        <p className="truncate text-sm font-medium leading-snug">{playlist.name}</p>
        <p className="text-xs text-muted-foreground">
          {loading ? (
            <span className="inline-block h-3 w-16 animate-pulse rounded bg-muted" />
          ) : (
            `${playlist.trackCount} tracks`
          )}
        </p>
      </div>
    </div>
  )
}
