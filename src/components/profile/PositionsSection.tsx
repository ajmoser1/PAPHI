'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Briefcase, Pencil, Plus, Star, Trash2 } from 'lucide-react'
import { createPosition, deletePosition, setFeaturedPosition, updatePosition } from '@/actions/profile'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { LinkedInImport } from './LinkedInImport'

interface Position {
  id: string
  title: string
  is_current: boolean
  start_year: number | null
  end_year: number | null
  companies: { id: string; name: string } | null
  industries: { id: string; name: string } | null
}

interface Company {
  id: string
  name: string
  industry_id: string | null
}
interface Industry {
  id: string
  name: string
}

interface Props {
  positions: Position[]
  companies: Company[]
  industries: Industry[]
  featuredPositionId: string | null
  /** Hide LinkedIn import and keep the add CTA simpler (pending essentials). */
  essentialsOnly?: boolean
}

interface PositionFormValues {
  companyName: string
  title: string
  industryId: string
  startYear: string
  endYear: string
  isCurrent: boolean
}

const selectClass =
  'h-11 w-full rounded-lg border border-input bg-transparent px-3 text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:h-10 md:text-sm'

function PositionForm({
  formKey,
  heading,
  submitLabel,
  pendingLabel,
  initial,
  companies,
  industries,
  isPending,
  onSubmit,
  onCancel,
}: {
  formKey: string
  heading: string
  submitLabel: string
  pendingLabel: string
  initial?: PositionFormValues
  companies: Company[]
  industries: Industry[]
  isPending: boolean
  onSubmit: (formData: FormData) => void
  onCancel: () => void
}) {
  const [isCurrent, setIsCurrent] = useState(initial?.isCurrent ?? true)
  const [selectedIndustryId, setSelectedIndustryId] = useState(initial?.industryId ?? '')

  function handleCompanyChange(e: React.ChangeEvent<HTMLInputElement>) {
    const match = companies.find((c) => c.name.toLowerCase() === e.target.value.toLowerCase())
    if (match?.industry_id) setSelectedIndustryId(match.industry_id)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    formData.set('isCurrent', String(isCurrent))
    onSubmit(formData)
  }

  return (
    <form key={formKey} onSubmit={handleSubmit} className="space-y-4 rounded-xl bg-muted/40 p-4 ring-1 ring-foreground/10">
      <h3 className="heading-4">{heading}</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor={`${formKey}-companyName`}>Company</Label>
          <Input
            id={`${formKey}-companyName`}
            name="companyName"
            list="company-suggestions"
            placeholder="e.g. Goldman Sachs"
            required
            defaultValue={initial?.companyName}
            onChange={handleCompanyChange}
          />
          <datalist id="company-suggestions">
            {companies.map((c) => (
              <option key={c.id} value={c.name} />
            ))}
          </datalist>
          <p className="text-xs text-muted-foreground">Start typing to pick an existing company, or enter a new one.</p>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor={`${formKey}-title`}>Title</Label>
          <Input id={`${formKey}-title`} name="title" placeholder="e.g. Software Engineer" required defaultValue={initial?.title} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${formKey}-industryId`}>Career field</Label>
          <select
            id={`${formKey}-industryId`}
            name="industryId"
            value={selectedIndustryId}
            onChange={(e) => setSelectedIndustryId(e.target.value)}
            className={selectClass}
          >
            <option value="">Choose a field</option>
            {industries.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">How brothers filter the directory.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${formKey}-startYear`}>Start year</Label>
          <Input id={`${formKey}-startYear`} name="startYear" type="number" inputMode="numeric" min={1900} max={2100} defaultValue={initial?.startYear} />
        </div>
        <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-border bg-card px-3 text-sm sm:col-span-2">
          <input
            type="checkbox"
            id={`${formKey}-isCurrent`}
            checked={isCurrent}
            onChange={(e) => setIsCurrent(e.target.checked)}
            className="size-4 accent-primary"
          />
          I currently work here
        </label>
        {!isCurrent && (
          <div className="space-y-1.5">
            <Label htmlFor={`${formKey}-endYear`}>End year</Label>
            <Input id={`${formKey}-endYear`} name="endYear" type="number" inputMode="numeric" min={1900} max={2100} defaultValue={initial?.endYear} />
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? pendingLabel : submitLabel}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

export function PositionsSection({ positions, companies, industries, featuredPositionId, essentialsOnly = false }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Position | null>(null)
  const [isPending, startTransition] = useTransition()

  const resolvedFeaturedId = featuredPositionId ?? (positions.length === 1 ? (positions[0]?.id ?? null) : null)
  const canChooseDisplay = positions.length > 1

  function closeForms() {
    setShowForm(false)
    setEditingId(null)
  }

  function run(fn: () => Promise<{ message?: string } | unknown>, successMsg: string, after?: () => void) {
    startTransition(async () => {
      const result = (await fn()) as { message?: string } | undefined
      if (result?.message) toast.error(result.message)
      else {
        toast.success(successMsg)
        after?.()
      }
    })
  }

  return (
    <div className="space-y-3">
      {positions.map((pos) =>
        editingId === pos.id ? (
          <PositionForm
            key={pos.id}
            formKey={`edit-${pos.id}`}
            heading="Edit experience"
            submitLabel="Save"
            pendingLabel="Saving…"
            initial={{
              companyName: pos.companies?.name ?? '',
              title: pos.title,
              industryId: pos.industries?.id ?? '',
              startYear: pos.start_year?.toString() ?? '',
              endYear: pos.end_year?.toString() ?? '',
              isCurrent: pos.is_current,
            }}
            companies={companies}
            industries={industries}
            isPending={isPending}
            onSubmit={(fd) => run(() => updatePosition(pos.id, fd), 'Experience updated.', closeForms)}
            onCancel={closeForms}
          />
        ) : (
          <div
            key={pos.id}
            className={cn(
              'flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:flex-row sm:items-start sm:justify-between',
              resolvedFeaturedId === pos.id && canChooseDisplay && 'ring-primary/40'
            )}
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{pos.title}</p>
                {resolvedFeaturedId === pos.id && canChooseDisplay && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
                    <Star className="size-3 fill-current" aria-hidden="true" /> Featured
                  </span>
                )}
                {pos.is_current && (
                  <span className="rounded-full bg-success-soft px-2 py-0.5 text-xs font-medium text-success-soft-foreground">Current</span>
                )}
              </div>
              <p className="text-sm text-foreground/80">{pos.companies?.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {pos.start_year ?? '—'} – {pos.is_current ? 'Present' : (pos.end_year ?? '—')}
                {pos.industries ? ` · ${pos.industries.name}` : ' · No career field yet'}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {canChooseDisplay && resolvedFeaturedId !== pos.id && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => run(() => setFeaturedPosition(pos.id), 'This job now shows on your profile.')}
                  disabled={isPending}
                >
                  <Star data-icon="inline-start" aria-hidden="true" />
                  Feature
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Edit ${pos.title}`}
                onClick={() => {
                  setShowForm(false)
                  setEditingId(pos.id)
                }}
                disabled={isPending}
              >
                <Pencil aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Delete ${pos.title}`}
                className="text-muted-foreground hover:text-destructive"
                onClick={() => setConfirmDelete(pos)}
                disabled={isPending}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </div>
          </div>
        )
      )}

      {showForm ? (
        <PositionForm
          formKey="add"
          heading="Add experience"
          submitLabel="Add experience"
          pendingLabel="Adding…"
          companies={companies}
          industries={industries}
          isPending={isPending}
          onSubmit={(fd) => run(() => createPosition(fd), 'Experience added.', closeForms)}
          onCancel={closeForms}
        />
      ) : (
        !editingId && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/40 bg-transparent px-4 text-sm font-medium text-primary transition-colors duration-fast hover:bg-primary-soft focus-visible:ring-2 focus-visible:ring-ring outline-none"
            >
              <Plus className="size-4" aria-hidden="true" />
              {positions.length === 0 ? 'Add your current job' : 'Add another job'}
            </button>
            {positions.length === 0 && (
              <p className="flex items-start gap-2 text-xs text-muted-foreground">
                <Briefcase className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                Brothers search by company and career field. Without a job you only show up by name.
              </p>
            )}
            {!essentialsOnly && <LinkedInImport industries={industries} />}
          </div>
        )
      )}

      <AlertDialog open={confirmDelete !== null} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this experience?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete ? `${confirmDelete.title}${confirmDelete.companies ? ` at ${confirmDelete.companies.name}` : ''} will be removed from your profile.` : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                const target = confirmDelete
                setConfirmDelete(null)
                if (target) run(() => deletePosition(target.id), 'Experience removed.', () => editingId === target.id && setEditingId(null))
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
