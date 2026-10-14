'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

export type AdminSection = { id: string; label: string; count?: number }

/** Sticky in-page navigation for the dashboard sections, highlighting the one in view. */
export function AdminSectionBar({ sections }: { sections: AdminSection[] }) {
  const [active, setActive] = useState(sections[0]?.id)

  useEffect(() => {
    const els = sections.map((s) => document.getElementById(s.id)).filter((el): el is HTMLElement => Boolean(el))
    if (!els.length) return
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActive(visible[0].target.id)
      },
      { rootMargin: '-120px 0px -60% 0px', threshold: 0 }
    )
    els.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [sections])

  return (
    <nav aria-label="Dashboard sections" className="sticky top-14 z-30 -mx-4 border-b border-border/80 bg-page/90 px-4 backdrop-blur md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
      <ul className="no-scrollbar flex gap-1 overflow-x-auto py-2">
        {sections.map((s) => (
          <li key={s.id} className="shrink-0">
            <a
              href={`#${s.id}`}
              aria-current={active === s.id ? 'location' : undefined}
              className={cn(
                'inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium transition-colors duration-fast outline-none focus-visible:ring-2 focus-visible:ring-ring',
                active === s.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              {s.label}
              {typeof s.count === 'number' && s.count > 0 && (
                <span className={cn('rounded-full px-1.5 text-xs font-semibold', active === s.id ? 'bg-primary-foreground/20' : 'bg-muted-foreground/15')}>
                  {s.count}
                </span>
              )}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
