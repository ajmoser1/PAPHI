'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { createPosition, deletePosition, updatePosition } from '@/actions/profile'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Trash2, Plus, Pencil } from 'lucide-react'
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

interface Company { id: string; name: string; industry_id: string | null }
interface Industry { id: string; name: string }

interface Props {
  positions: Position[]
  companies: Company[]
  industries: Industry[]
}

interface PositionFormValues {
  companyName: string
  title: string
  industryId: string
  startYear: string
  endYear: string
  isCurrent: boolean
}

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
    const match = companies.find(
      (c) => c.name.toLowerCase() === e.target.value.toLowerCase()
    )
    if (match?.industry_id) {
      setSelectedIndustryId(match.industry_id)
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    formData.set('isCurrent', String(isCurrent))
    onSubmit(formData)
  }

  return (
    <form key={formKey} onSubmit={handleSubmit} className="rounded-lg border bg-white p-4 space-y-4">
      <h3 className="font-medium text-sm">{heading}</h3>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1">
          <Label htmlFor={`${formKey}-companyName`}>Company</Label>
          <input
            id={`${formKey}-companyName`}
            name="companyName"
            list="company-suggestions"
            placeholder="e.g. Goldman Sachs"
            required
            defaultValue={initial?.companyName}
            onChange={handleCompanyChange}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <datalist id="company-suggestions">
            {companies.map((c) => (
              <option key={c.id} value={c.name} />
            ))}
          </datalist>
          <p className="text-xs text-muted-foreground">Type to search or enter a new company name.</p>
        </div>
        <div className="col-span-2 space-y-1">
          <Label htmlFor={`${formKey}-title`}>Title</Label>
          <Input
            id={`${formKey}-title`}
            name="title"
            placeholder="e.g. Software Engineer"
            required
            defaultValue={initial?.title}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${formKey}-industryId`}>Industry</Label>
          <select
            id={`${formKey}-industryId`}
            name="industryId"
            value={selectedIndustryId}
            onChange={(e) => setSelectedIndustryId(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
          >
            <option value="">— Select —</option>
            {industries.map((i) => (
              <option key={i.id} value={i.id}>{i.name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${formKey}-startYear`}>Start year</Label>
          <Input
            id={`${formKey}-startYear`}
            name="startYear"
            type="number"
            min={1900}
            max={2100}
            defaultValue={initial?.startYear}
          />
        </div>
        <div className="col-span-2 flex items-center gap-2">
          <input
            type="checkbox"
            id={`${formKey}-isCurrent`}
            checked={isCurrent}
            onChange={(e) => setIsCurrent(e.target.checked)}
            className="accent-primary"
          />
          <Label htmlFor={`${formKey}-isCurrent`} className="cursor-pointer">I currently work here</Label>
        </div>
        {!isCurrent && (
          <div className="space-y-1">
            <Label htmlFor={`${formKey}-endYear`}>End year</Label>
            <Input
              id={`${formKey}-endYear`}
              name="endYear"
              type="number"
              min={1900}
              max={2100}
              defaultValue={initial?.endYear}
            />
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? pendingLabel : submitLabel}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

export function PositionsSection({ positions, companies, industries }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function closeForms() {
    setShowForm(false)
    setEditingId(null)
  }

  function handleAdd(formData: FormData) {
    startTransition(async () => {
      const result = await createPosition(formData)
      if ((result as any)?.message) toast.error((result as any).message)
      else {
        toast.success('Position added.')
        closeForms()
      }
    })
  }

  function handleUpdate(positionId: string, formData: FormData) {
    startTransition(async () => {
      const result = await updatePosition(positionId, formData)
      if ((result as any)?.message) toast.error((result as any).message)
      else {
        toast.success('Position updated.')
        closeForms()
      }
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deletePosition(id)
      if ((result as any)?.message) toast.error((result as any).message)
      else {
        toast.success('Position removed.')
        if (editingId === id) setEditingId(null)
      }
    })
  }

  function startEdit(pos: Position) {
    setShowForm(false)
    setEditingId(pos.id)
  }

  return (
    <div className="space-y-3">
      {positions.map((pos) =>
        editingId === pos.id ? (
          <PositionForm
            key={pos.id}
            formKey={`edit-${pos.id}`}
            heading="Edit position"
            submitLabel="Save changes"
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
            onSubmit={(formData) => handleUpdate(pos.id, formData)}
            onCancel={closeForms}
          />
        ) : (
          <div key={pos.id} className="flex items-start justify-between rounded-lg border bg-white p-4">
            <div>
              <p className="font-medium text-sm">{pos.title}</p>
              <p className="text-sm text-muted-foreground">{pos.companies?.name}</p>
              <div className="flex items-center gap-2 mt-1">
                {pos.is_current && <Badge variant="default" className="text-xs">Current</Badge>}
                {pos.industries && <Badge variant="secondary" className="text-xs">{pos.industries.name}</Badge>}
                <span className="text-xs text-muted-foreground">
                  {pos.start_year ?? '?'} — {pos.is_current ? 'Present' : (pos.end_year ?? '?')}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => startEdit(pos)}
                disabled={isPending}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => handleDelete(pos.id)}
                disabled={isPending}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )
      )}

      {showForm ? (
        <PositionForm
          formKey="add"
          heading="Add position"
          submitLabel="Add position"
          pendingLabel="Adding…"
          companies={companies}
          industries={industries}
          isPending={isPending}
          onSubmit={handleAdd}
          onCancel={closeForms}
        />
      ) : !editingId && (
        <div className="rounded-xl border-2 border-dashed border-primary/35 bg-primary/5 p-4 space-y-3">
          <p className="text-sm font-medium text-foreground">
            Add your work experience so brothers can find you by company and industry.
          </p>
          <Button
            type="button"
            size="lg"
            className="h-14 w-full text-base font-semibold"
            onClick={() => setShowForm(true)}
          >
            <Plus className="mr-2 h-5 w-5" />
            Add Work Experience
          </Button>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>
          <LinkedInImport industries={industries} />
        </div>
      )}
    </div>
  )
}
