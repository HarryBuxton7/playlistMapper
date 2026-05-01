interface Props {
  label: string
  done: number
  total: number
}

export default function ProgressBar({ label, done, total }: Props) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  const indeterminate = total === 0

  return (
    <div className="w-full space-y-1.5">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        {!indeterminate && (
          <span>
            {done} / {total}
          </span>
        )}
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        {indeterminate ? (
          <div className="h-full w-1/3 rounded-full bg-primary animate-[slide_1.5s_ease-in-out_infinite]" />
        ) : (
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        )}
      </div>
    </div>
  )
}
