import Link from 'next/link'
import { cn } from '@/lib/utils'

export type Brand = {
  title: string
  logoUrl?: string | null
}

export function BrandMark({ brand, className }: { brand: Brand; className?: string }) {
  const initial = brand.title.trim().charAt(0).toUpperCase() || 'C'
  return (
    <Link
      href="/members"
      className={cn(
        'flex min-w-0 items-center gap-3 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar',
        className
      )}
    >
      {brand.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={brand.logoUrl} alt="" className="size-9 shrink-0 rounded-md object-contain" />
      ) : (
        <span
          aria-hidden="true"
          className="flex size-9 shrink-0 items-center justify-center rounded-md bg-sidebar-primary font-heading text-lg font-bold text-sidebar-primary-foreground"
        >
          {initial}
        </span>
      )}
      <span className="min-w-0">
        <span className="block truncate font-heading text-base font-semibold leading-tight text-sidebar-foreground" title={brand.title}>
          {brand.title}
        </span>
        <span className="block text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-sidebar-foreground/55">
          Chapter Connect
        </span>
      </span>
    </Link>
  )
}
