import Link from 'next/link'
import { cn } from '@/lib/utils'

export type AdminTab = { id: string; label: string; count?: number }

/** Top-level admin navigation. Server-rendered links; the page reads `?tab=`. */
export function AdminTabs({ tabs, active }: { tabs: AdminTab[]; active: string }) {
  return (
    <nav aria-label="Admin sections" className="-mx-4 border-b border-border px-4 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
      <ul className="no-scrollbar -mb-px flex gap-1 overflow-x-auto">
        {tabs.map((t) => {
          const isActive = t.id === active
          return (
            <li key={t.id} className="shrink-0">
              <Link
                href={t.id === 'todo' ? '/admin' : `/admin?tab=${t.id}`}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'inline-flex h-11 items-center gap-2 border-b-2 px-3 text-sm font-medium outline-none transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-ring',
                  isActive ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
                )}
              >
                {t.label}
                {typeof t.count === 'number' && t.count > 0 && (
                  <span
                    className={cn(
                      'inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold',
                      isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                    )}
                  >
                    {t.count}
                  </span>
                )}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
