import { cn } from '@/lib/utils'

/** "Step 2 of 3" dots with the current step's label. */
export function StepIndicator({ steps, current, className }: { steps: string[]; current: number; className?: string }) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <ol className="flex items-center gap-1.5" aria-label={`Step ${current} of ${steps.length}`}>
        {steps.map((label, i) => {
          const n = i + 1
          return (
            <li
              key={label}
              aria-current={n === current ? 'step' : undefined}
              className={cn(
                'h-1.5 rounded-full transition-all duration-base',
                n < current && 'w-4 bg-primary/50',
                n === current && 'w-8 bg-primary',
                n > current && 'w-4 bg-border'
              )}
            >
              <span className="sr-only">{label}</span>
            </li>
          )
        })}
      </ol>
      <p className="text-xs font-medium text-muted-foreground">
        Step {current} of {steps.length} · <span className="text-foreground">{steps[current - 1]}</span>
      </p>
    </div>
  )
}
