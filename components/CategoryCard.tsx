import type { CategoryPlaylist } from '@/types'

const CATEGORY_META: Record<string, { gradient: string; emoji: string; description: string }> = {
  Flow: {
    gradient: 'linear-gradient(135deg, #4f46e5 0%, #7e22ce 100%)',
    emoji: '🎯',
    description: 'Focus & deep work',
  },
  Rush: {
    gradient: 'linear-gradient(135deg, #f97316 0%, #dc2626 100%)',
    emoji: '⚡',
    description: 'High energy & momentum',
  },
  Glow: {
    gradient: 'linear-gradient(135deg, #facc15 0%, #ec4899 100%)',
    emoji: '✨',
    description: 'Bright & sociable',
  },
  Unwind: {
    gradient: 'linear-gradient(135deg, #10b981 0%, #0d9488 100%)',
    emoji: '🌿',
    description: 'Wind-down & rest',
  },
  Soul: {
    gradient: 'linear-gradient(135deg, #8b5cf6 0%, #6b21a8 100%)',
    emoji: '💜',
    description: 'Emotional & reflective',
  },
  Edge: {
    gradient: 'linear-gradient(135deg, #52525b 0%, #18181b 100%)',
    emoji: '🖤',
    description: 'Dark & intense',
  },
  Night: {
    gradient: 'linear-gradient(135deg, #1d4ed8 0%, #1e1b4b 100%)',
    emoji: '🌙',
    description: 'Late night & atmospheric',
  },
}

interface Props {
  playlist: CategoryPlaylist
  triaging?: boolean
  selected?: boolean
  onClick?: () => void
}

export default function CategoryCard({ playlist, triaging, selected, onClick }: Props) {
  const meta = CATEGORY_META[playlist.name]

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-1 sm:gap-2 rounded-2xl p-2 sm:p-4 h-24 sm:h-36 lg:h-48 w-full text-white transition-all duration-150 hover:brightness-125 hover:scale-[1.04] active:scale-[0.98] focus-visible:outline-none ${
        selected
          ? 'ring-2 ring-white/60 ring-offset-2 ring-offset-background brightness-110 scale-[1.04]'
          : ''
      }`}
      style={{ background: meta.gradient }}
    >
      <span className="text-2xl sm:text-3xl lg:text-4xl leading-none">{meta.emoji}</span>
      <span className="font-bold text-xs sm:text-sm text-center leading-tight tracking-wide">
        {playlist.name}
      </span>
      <span className="text-[10px] sm:text-xs text-white/70 font-medium">
        {triaging && playlist.tracks.length === 0 ? (
          <span className="inline-block h-2.5 w-12 animate-pulse rounded bg-white/20" />
        ) : (
          `${playlist.tracks.length} tracks`
        )}
      </span>
    </button>
  )
}
