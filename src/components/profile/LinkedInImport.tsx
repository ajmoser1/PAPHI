'use client'

import { useRef, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { ExternalLink, Loader2, CheckSquare, Square, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { parseLinkedInPdf, type ExtractedPosition } from '@/actions/linkedin'
import { createPosition } from '@/actions/profile'

interface Industry { id: string; name: string }

interface Props {
  industries: Industry[]
}

export function LinkedInImport({ industries }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<'idle' | 'parsing' | 'review'>('idle')
  const [extracted, setExtracted] = useState<ExtractedPosition[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [isPending, startTransition] = useTransition()

  const industryNames = industries.map((i) => i.name)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setStep('parsing')

    const formData = new FormData()
    formData.append('pdf', file)

    startTransition(async () => {
      const result = await parseLinkedInPdf(formData, industryNames)
      if (result.message) {
        toast.error(result.message)
        setStep('idle')
        return
      }
      if (!result.positions?.length) {
        toast.error('No work experience found in this PDF.')
        setStep('idle')
        return
      }
      setExtracted(result.positions)
      setSelected(new Set(result.positions.map((_, i) => i)))
      setStep('review')
    })

    // Reset input so the same file can be re-selected
    e.target.value = ''
  }

  function toggleAll() {
    if (selected.size === extracted.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(extracted.map((_, i) => i)))
    }
  }

  function toggle(i: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  function handleImport() {
    const toImport = extracted.filter((_, i) => selected.has(i))
    if (!toImport.length) return

    startTransition(async () => {
      let failed = 0
      for (const pos of toImport) {
        const fd = new FormData()
        fd.set('companyName', pos.company_name)
        fd.set('title', pos.title)
        fd.set('isCurrent', String(pos.is_current))
        if (pos.start_year) fd.set('startYear', String(pos.start_year))
        if (pos.end_year) fd.set('endYear', String(pos.end_year))

        // Match industry name to id
        const industry = industries.find(
          (ind) => ind.name.toLowerCase() === pos.industry?.toLowerCase()
        )
        if (industry) fd.set('industryId', industry.id)

        const result = await createPosition(fd)
        if ((result as any)?.message) failed++
      }

      if (failed === 0) {
        toast.success(`Imported ${toImport.length} position${toImport.length > 1 ? 's' : ''}.`)
      } else {
        toast.warning(`Imported ${toImport.length - failed} positions. ${failed} failed.`)
      }
      setStep('idle')
      setExtracted([])
      setSelected(new Set())
    })
  }

  if (step === 'idle') {
    return (
      <>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={handleFileChange}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground gap-2"
          onClick={() => inputRef.current?.click()}
        >
          <ExternalLink className="h-4 w-4" />
          Import from LinkedIn PDF
        </Button>
      </>
    )
  }

  if (step === 'parsing') {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Reading your LinkedIn PDF…
      </div>
    )
  }

  // Review step
  return (
    <div className="rounded-lg border bg-white p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">
          Found {extracted.length} position{extracted.length > 1 ? 's' : ''} — select which to import
        </p>
        <button
          type="button"
          onClick={toggleAll}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          {selected.size === extracted.length ? 'Deselect all' : 'Select all'}
        </button>
      </div>

      <ul className="space-y-2">
        {extracted.map((pos, i) => (
          <li
            key={i}
            onClick={() => toggle(i)}
            className="flex items-start gap-3 rounded-md p-2 cursor-pointer hover:bg-muted/50 transition-colors"
          >
            <span className="mt-0.5 text-primary flex-shrink-0">
              {selected.has(i)
                ? <CheckSquare className="h-4 w-4" />
                : <Square className="h-4 w-4 text-muted-foreground" />}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{pos.title}</p>
              <p className="text-xs text-muted-foreground truncate">
                {pos.company_name}
                {pos.industry ? ` · ${pos.industry}` : ''}
                {pos.start_year
                  ? ` · ${pos.start_year}–${pos.is_current ? 'Present' : (pos.end_year ?? '?')}`
                  : ''}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex gap-2 pt-1">
        <Button
          type="button"
          size="sm"
          disabled={isPending || selected.size === 0}
          onClick={handleImport}
          className="gap-2"
        >
          {isPending
            ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Importing…</>
            : <><Upload className="h-3.5 w-3.5" /> Import {selected.size} position{selected.size !== 1 ? 's' : ''}</>}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isPending}
          onClick={() => { setStep('idle'); setExtracted([]); setSelected(new Set()) }}
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}
