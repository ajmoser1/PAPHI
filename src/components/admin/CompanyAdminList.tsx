'use client'

import { useMemo, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Pencil, Search } from 'lucide-react'
import { mergeCompanies, setCompanyStatus, updateCompany } from '@/actions/admin'
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
import { FormField, SelectField } from '@/components/ui/form-field'
import { companyStatusLabel } from '@/lib/labels'
import { cn } from '@/lib/utils'

export type AdminCompany = {
  id: string
  name: string
  status: string
  website: string | null
  industry_id: string | null
  suggested_by: string | null
  industries: { name: string } | null
}

type IndustryOption = { id: string; name: string }

export function CompanyAdminList({
  companies,
  industries,
  isFounder,
}: {
  companies: AdminCompany[]
  industries: IndustryOption[]
  /** Hide, restore, and merge are founder-only actions. */
  isFounder: boolean
}) {
  const [query, setQuery] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const needsIndustry = companies.filter((c) => !c.industry_id && c.status !== 'rejected')
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? companies.filter((c) => c.name.toLowerCase().includes(q)) : companies
  }, [companies, query])

  function run(fn: () => Promise<{ message?: string }>, ok: string) {
    startTransition(async () => {
      const result = await fn()
      if (result.message) toast.error(result.message)
      else {
        toast.success(ok)
        setEditingId(null)
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search companies" aria-label="Search companies" className="bg-card pl-9" />
        </div>
        {needsIndustry.length > 0 && (
          <p className="rounded-full bg-warning-soft px-3 py-1 text-xs font-medium text-warning-soft-foreground">
            {needsIndustry.length} missing a career field
          </p>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="py-4 text-sm text-muted-foreground">No companies match.</p>
      ) : (
        <ul className="divide-y divide-border rounded-lg ring-1 ring-foreground/10">
          {filtered.map((c) =>
            editingId === c.id ? (
              <li key={c.id} className="p-4">
                <CompanyEditForm
                  company={c}
                  industries={industries}
                  allCompanies={companies}
                  isFounder={isFounder}
                  isPending={isPending}
                  onCancel={() => setEditingId(null)}
                  onSave={(fd) => run(() => updateCompany(fd), 'Company updated.')}
                  onHide={() => run(() => setCompanyStatus(c.id, 'rejected'), 'Company hidden from member lists.')}
                  onRestore={() => run(() => setCompanyStatus(c.id, 'active'), 'Company restored.')}
                  onMerge={(keepId) => run(() => mergeCompanies(keepId, c.id), 'Merged. Positions moved and this company was hidden.')}
                />
              </li>
            ) : (
              <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className={cn('truncate font-medium', c.status === 'rejected' && 'text-muted-foreground line-through')}>{c.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {c.industries?.name ?? 'No career field'}
                    {c.suggested_by ? ' · suggested by a member' : ''}
                    {c.website ? ` · ${c.website}` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {c.status !== 'active' && (
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">{companyStatusLabel(c.status)}</span>
                  )}
                  {!c.industry_id && c.status !== 'rejected' && (
                    <span className="rounded-full bg-warning-soft px-2 py-0.5 text-xs font-medium text-warning-soft-foreground">Needs field</span>
                  )}
                  <Button type="button" variant="ghost" size="icon-sm" aria-label={`Edit ${c.name}`} onClick={() => setEditingId(c.id)} disabled={isPending}>
                    <Pencil aria-hidden="true" />
                  </Button>
                </div>
              </li>
            )
          )}
        </ul>
      )}
    </div>
  )
}

function CompanyEditForm({
  company,
  industries,
  allCompanies,
  isFounder,
  isPending,
  onCancel,
  onSave,
  onHide,
  onRestore,
  onMerge,
}: {
  company: AdminCompany
  industries: IndustryOption[]
  allCompanies: AdminCompany[]
  isFounder: boolean
  isPending: boolean
  onCancel: () => void
  onSave: (formData: FormData) => void
  onHide: () => void
  onRestore: () => void
  onMerge: (keepId: string) => void
}) {
  const [mergeTarget, setMergeTarget] = useState('')
  const [confirmMerge, setConfirmMerge] = useState(false)
  const mergeOptions = allCompanies.filter((c) => c.id !== company.id && c.status !== 'rejected')
  const mergeName = mergeOptions.find((c) => c.id === mergeTarget)?.name

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        onSave(new FormData(e.currentTarget))
      }}
    >
      <input type="hidden" name="id" value={company.id} />
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField id={`name-${company.id}`} name="name" label="Name" defaultValue={company.name} required />
        <SelectField id={`industry-${company.id}`} name="industryId" label="Career field" defaultValue={company.industry_id ?? ''}>
          <option value="">None</option>
          {industries.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </SelectField>
        <FormField id={`website-${company.id}`} name="website" label="Website" type="url" defaultValue={company.website ?? ''} placeholder="https://" />
        {isFounder ? (
          <SelectField id={`status-${company.id}`} name="status" label="Status" defaultValue={company.status} hint="Only active companies appear in member filters.">
            <option value="active">Active</option>
            <option value="suggested">Suggested</option>
            <option value="rejected">Hidden</option>
          </SelectField>
        ) : (
          <input type="hidden" name="status" value={company.status} />
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? 'Saving…' : 'Save'}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        {isFounder &&
          (company.status !== 'rejected' ? (
            <Button type="button" variant="outline" size="sm" className="text-destructive" onClick={onHide} disabled={isPending}>
              Hide from lists
            </Button>
          ) : (
            <Button type="button" variant="outline" size="sm" onClick={onRestore} disabled={isPending}>
              Restore
            </Button>
          ))}
      </div>

      {isFounder && mergeOptions.length > 0 && (
        <div className="space-y-2 border-t border-border pt-3">
          <SelectField
            id={`merge-${company.id}`}
            name="mergeTarget"
            label="Merge into another company"
            hint="Moves every position to the target, then hides this one."
            value={mergeTarget}
            onChange={(e) => setMergeTarget(e.target.value)}
          >
            <option value="">Choose a target</option>
            {mergeOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </SelectField>
          <Button type="button" variant="outline" size="sm" disabled={!mergeTarget || isPending} onClick={() => setConfirmMerge(true)}>
            Merge
          </Button>
          <AlertDialog open={confirmMerge} onOpenChange={setConfirmMerge}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Merge “{company.name}” into “{mergeName}”?</AlertDialogTitle>
                <AlertDialogDescription>Every position at {company.name} moves to {mergeName}, then {company.name} is hidden. This is hard to undo.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={() => {
                    setConfirmMerge(false)
                    if (mergeTarget) onMerge(mergeTarget)
                  }}
                >
                  Merge companies
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </form>
  )
}
