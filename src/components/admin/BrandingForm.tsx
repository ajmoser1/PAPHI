'use client'

import { useState, useTransition, type CSSProperties } from 'react'
import { toast } from 'sonner'
import { Check, X } from 'lucide-react'
import { updateChapterBranding } from '@/actions/chapter-admin'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { FormField } from '@/components/ui/form-field'
import { BRAND_DEFAULT_HEX, contrastForeground, contrastRatio, toHexColor } from '@/lib/colors'

type Chapter = {
  id: string
  display_title: string | null
  tagline: string | null
  school_name: string | null
  primary_color: string | null
  accent_color: string | null
}

/** CSS variables that re-derive the theme inside the preview from the two picked colors. */
function previewVars(primary: string, accent: string): CSSProperties {
  return {
    '--brand-primary': primary,
    '--brand-accent': accent,
    '--brand-primary-foreground': contrastForeground(primary),
    '--brand-accent-foreground': contrastForeground(accent),
    '--primary': 'var(--brand-primary)',
    '--primary-foreground': 'var(--brand-primary-foreground)',
    '--sidebar': 'oklch(from var(--brand-primary) clamp(0.22, calc(l - 0.04), 0.30) min(c, 0.15) h)',
    '--sidebar-foreground': 'oklch(from var(--brand-primary) 0.96 calc(c * 0.1) h)',
    '--sidebar-primary': 'var(--brand-accent)',
    '--sidebar-primary-foreground': 'var(--brand-accent-foreground)',
    '--sidebar-hover': 'oklch(from var(--sidebar) calc(l + 0.06) c h)',
    '--accent': 'oklch(from var(--brand-accent) 0.95 calc(c * 0.35) h)',
    '--accent-foreground': 'var(--brand-primary)',
    '--gold': 'var(--brand-accent)',
    '--primary-soft': 'oklch(from var(--brand-primary) 0.96 calc(c * 0.25) h)',
  } as CSSProperties
}

function ContrastBadge({ label, ratio }: { label: string; ratio: number | null }) {
  const ok = ratio !== null && ratio >= 4.5
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${ok ? 'bg-success-soft text-success-soft-foreground' : 'bg-destructive-soft text-destructive-soft-foreground'}`}>
      {ok ? <Check className="size-3" aria-hidden="true" /> : <X className="size-3" aria-hidden="true" />}
      {label} {ratio ? `${ratio.toFixed(1)}:1` : '—'}
    </span>
  )
}

export function BrandingForm({ chapter }: { chapter: Chapter }) {
  const [primary, setPrimary] = useState(toHexColor(chapter.primary_color ?? '') ?? BRAND_DEFAULT_HEX.primary)
  const [accent, setAccent] = useState(toHexColor(chapter.accent_color ?? '') ?? BRAND_DEFAULT_HEX.accent)
  const [title, setTitle] = useState(chapter.display_title ?? '')
  const [isPending, startTransition] = useTransition()

  const primaryOnWhite = contrastRatio(primary, '#ffffff')
  const accentText = contrastRatio(accent, contrastForeground(accent) === 'oklch(0.15 0 0)' ? '#262626' : '#fafafa')

  return (
    <form
      className="grid gap-6 lg:grid-cols-[1fr_minmax(16rem,20rem)]"
      onSubmit={(e) => {
        e.preventDefault()
        const fd = new FormData(e.currentTarget)
        startTransition(async () => {
          const result = await updateChapterBranding(fd)
          if (result.message) toast.error(result.message)
          else toast.success('Branding saved. Members see it on their next page load.')
        })
      }}
    >
      <div className="space-y-4">
        <input type="hidden" name="chapterId" value={chapter.id} />
        <FormField id="displayTitle" name="displayTitle" label="Display title" value={title} onChange={(e) => setTitle(e.target.value)} required hint="Shown in the sidebar and on your chapter's landing page." />
        <div className="space-y-1.5">
          <Label htmlFor="tagline">Tagline</Label>
          <Textarea id="tagline" name="tagline" defaultValue={chapter.tagline ?? ''} rows={2} placeholder="Find brothers for referrals, mentorship, and opportunities." />
        </div>
        <FormField id="schoolName" name="schoolName" label="School name" defaultValue={chapter.school_name ?? ''} />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="primaryColor">Primary color</Label>
            <div className="flex items-center gap-2">
              <input
                id="primaryColor"
                name="primaryColor"
                type="color"
                value={primary}
                onChange={(e) => setPrimary(e.target.value)}
                className="h-11 w-14 cursor-pointer rounded-lg border border-input bg-card p-1 md:h-10"
              />
              <code className="text-sm text-muted-foreground">{primary}</code>
            </div>
            <ContrastBadge label="On white" ratio={primaryOnWhite} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="accentColor">Accent color</Label>
            <div className="flex items-center gap-2">
              <input
                id="accentColor"
                name="accentColor"
                type="color"
                value={accent}
                onChange={(e) => setAccent(e.target.value)}
                className="h-11 w-14 cursor-pointer rounded-lg border border-input bg-card p-1 md:h-10"
              />
              <code className="text-sm text-muted-foreground">{accent}</code>
            </div>
            <ContrastBadge label="Label text" ratio={accentText} />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Buttons, headings, and the sidebar use the primary color. The accent marks alumni and the active menu item. Aim for 4.5:1 or better.
        </p>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving…' : 'Save branding'}
        </Button>
      </div>

      <div className="space-y-3">
        <p className="eyebrow">Preview</p>
        <div style={previewVars(primary, accent)} className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
          <div className="flex">
            <div className="w-28 shrink-0 space-y-1 bg-sidebar p-3 text-sidebar-foreground">
              <p className="truncate font-heading text-xs font-semibold">{title || 'Chapter'}</p>
              <div className="rounded-md bg-sidebar-primary px-2 py-1 text-[0.625rem] font-semibold text-sidebar-primary-foreground">Find a Brother</div>
              <div className="rounded-md px-2 py-1 text-[0.625rem] text-sidebar-foreground/70">Messages</div>
              <div className="rounded-md px-2 py-1 text-[0.625rem] text-sidebar-foreground/70">My profile</div>
            </div>
            <div className="flex-1 space-y-2 bg-page p-3">
              <p className="font-heading text-sm font-bold text-primary">Find a Brother</p>
              <div className="flex items-center gap-2 rounded-lg bg-card p-2 ring-1 ring-foreground/10">
                <span className="size-6 rounded-full bg-primary-soft ring-2 ring-gold" />
                <span className="h-2 flex-1 rounded bg-muted" />
                <span className="rounded-full bg-accent px-1.5 text-[0.5rem] font-semibold text-accent-foreground">ALUMNI</span>
              </div>
              <span className="inline-block rounded-md bg-primary px-2.5 py-1 text-[0.625rem] font-medium text-primary-foreground">Message</span>
            </div>
          </div>
        </div>
      </div>
    </form>
  )
}
