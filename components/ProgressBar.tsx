interface Props {
  label: string
  done: number
  total: number
}

export default function ProgressBar({ label, done, total }: Props) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  const indeterminate = total === 0

  return (
    <div className="w-full rounded-xl border bg-card p-4 space-y-3">
      <div className="flex justify-between items-baseline">
        <span className="text-base font-semibold">{label}</span>
        {!indeterminate && (
          <span className="text-sm tabular-nums text-muted-foreground">
            {done} / {total}
            <span className="ml-2 text-xs">({pct}%)</span>
          </span>
        )}
      </div>
      <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
        {indeterminate ? (
          <div className="h-full w-1/3 rounded-full bg-primary animate-[slide_1.5s_ease-in-out_infinite]" />
        ) : (
          <div
            className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${pct}%` }}
          />
        )}
      </div>
    </div>
  )
}
