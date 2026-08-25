'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { mergeCompanies, setCompanyStatus, updateCompany } from '@/actions/admin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Pencil } from 'lucide-react'

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
}: {
  companies: AdminCompany[]
  industries: IndustryOption[]
}) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const needsIndustry = companies.filter(
    (c) => !c.industry_id && c.status !== 'rejected'
  )

  return (
    <div className="space-y-6">
      {needsIndustry.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-medium text-amber-900">
            {needsIndustry.length} compan{needsIndustry.length === 1 ? 'y' : 'ies'} missing
            an industry
          </p>
          <p className="text-xs text-amber-800 mt-0.5">
            Assign an industry so Find a Brother company filters stay useful.
          </p>
        </div>
      )}

      <div className="space-y-2">
        {companies.map((c) =>
          editingId === c.id ? (
            <CompanyEditForm
              key={c.id}
              company={c}
              industries={industries}
              allCompanies={companies}
              isPending={isPending}
              onCancel={() => setEditingId(null)}
              onSave={(formData) => {
                startTransition(async () => {
                  const result = await updateCompany(formData)
                  if (result.message) toast.error(result.message)
                  else {
                    toast.success('Company updated.')
                    setEditingId(null)
                  }
                })
              }}
              onHide={() => {
                startTransition(async () => {
                  const result = await setCompanyStatus(c.id, 'rejected')
                  if (result.message) toast.error(result.message)
                  else {
                    toast.success('Company hidden from member lists.')
                    setEditingId(null)
                  }
                })
              }}
              onRestore={() => {
                startTransition(async () => {
                  const result = await setCompanyStatus(c.id, 'active')
                  if (result.message) toast.error(result.message)
                  else {
                    toast.success('Company restored.')
                    setEditingId(null)
                  }
                })
              }}
              onMerge={(keepId) => {
                startTransition(async () => {
                  const result = await mergeCompanies(keepId, c.id)
                  if (result.message) toast.error(result.message)
                  else {
                    toast.success('Merged — positions moved and this company was hidden.')
                    setEditingId(null)
                  }
                })
              }}
            />
          ) : (
            <div
              key={c.id}
              className="flex items-center justify-between gap-3 rounded-lg border bg-white px-4 py-3"
            >
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{c.name}</p>
                <p className="text-xs text-muted-foreground">
                  {c.industries?.name ?? 'No industry'}
                  {c.suggested_by ? ' · member-suggested' : ''}
                  {c.website ? ` · ${c.website}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant={c.status === 'active' ? 'default' : 'secondary'}>
                  {c.status}
                </Badge>
                {!c.industry_id && c.status !== 'rejected' && (
                  <Badge variant="outline" className="text-amber-700 border-amber-300">
                    needs industry
                  </Badge>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground"
                  onClick={() => setEditingId(c.id)}
                  disabled={isPending}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  )
}

function CompanyEditForm({
  company,
  industries,
  allCompanies,
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
  isPending: boolean
  onCancel: () => void
  onSave: (formData: FormData) => void
  onHide: () => void
  onRestore: () => void
  onMerge: (keepId: string) => void
}) {
  const [mergeTarget, setMergeTarget] = useState('')
  const mergeOptions = allCompanies.filter(
    (c) => c.id !== company.id && c.status !== 'rejected'
  )

  return (
    <form
      className="rounded-lg border bg-white p-4 space-y-3"
      onSubmit={(e) => {
        e.preventDefault()
        onSave(new FormData(e.currentTarget))
      }}
    >
      <input type="hidden" name="id" value={company.id} />
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor={`name-${company.id}`}>Name</Label>
          <Input id={`name-${company.id}`} name="name" defaultValue={company.name} required />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`industry-${company.id}`}>Industry</Label>
          <select
            id={`industry-${company.id}`}
            name="industryId"
            defaultValue={company.industry_id ?? ''}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
          >
            <option value="">— None —</option>
            {industries.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor={`website-${company.id}`}>Website</Label>
          <Input
            id={`website-${company.id}`}
            name="website"
            type="url"
            defaultValue={company.website ?? ''}
            placeholder="https://..."
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`status-${company.id}`}>Status</Label>
          <select
            id={`status-${company.id}`}
            name="status"
            defaultValue={company.status}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
          >
            <option value="active">active</option>
            <option value="suggested">suggested</option>
            <option value="rejected">rejected</option>
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? 'Saving…' : 'Save'}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        {company.status !== 'rejected' ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-destructive"
            onClick={onHide}
            disabled={isPending}
          >
            Hide from lists
          </Button>
        ) : (
          <Button type="button" variant="outline" size="sm" onClick={onRestore} disabled={isPending}>
            Restore
          </Button>
        )}
      </div>

      {mergeOptions.length > 0 && (
        <div className="border-t pt-3 space-y-2">
          <Label htmlFor={`merge-${company.id}`}>Merge into another company</Label>
          <p className="text-xs text-muted-foreground">
            Moves all positions to the target, then hides this company.
          </p>
          <div className="flex flex-wrap gap-2">
            <select
              id={`merge-${company.id}`}
              value={mergeTarget}
              onChange={(e) => setMergeTarget(e.target.value)}
              className="flex h-9 min-w-[12rem] flex-1 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              <option value="">— Choose target —</option>
              {mergeOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!mergeTarget || isPending}
              onClick={() => {
                if (
                  mergeTarget &&
                  window.confirm(
                    `Merge “${company.name}” into the selected company? This cannot be undone easily.`
                  )
                ) {
                  onMerge(mergeTarget)
                }
              }}
            >
              Merge
            </Button>
          </div>
        </div>
      )}
    </form>
  )
}
