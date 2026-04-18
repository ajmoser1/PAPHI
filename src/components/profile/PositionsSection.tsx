'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { createPosition, deletePosition } from '@/actions/profile'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Trash2, Plus } from 'lucide-react'

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

export function PositionsSection({ positions, companies, industries }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [isCurrent, setIsCurrent] = useState(true)
  const [selectedIndustryId, setSelectedIndustryId] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleCompanyChange(e: React.ChangeEvent<HTMLInputElement>) {
    const match = companies.find(
      (c) => c.name.toLowerCase() === e.target.value.toLowerCase()
    )
    if (match?.industry_id) {
      setSelectedIndustryId(match.industry_id)
    }
  }

  function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    formData.set('isCurrent', String(isCurrent))
    startTransition(async () => {
      const result = await createPosition(formData)
      if ((result as any)?.message) toast.error((result as any).message)
      else {
        toast.success('Position added.')
        setShowForm(false)
        setSelectedIndustryId('')
      }
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deletePosition(id)
      if ((result as any)?.message) toast.error((result as any).message)
      else toast.success('Position removed.')
    })
  }

  return (
    <div className="space-y-3">
      {positions.map((pos) => (
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
      ))}

      {showForm ? (
        <form onSubmit={handleAdd} className="rounded-lg border bg-white p-4 space-y-4">
          <h3 className="font-medium text-sm">Add position</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <Label htmlFor="companyName">Company</Label>
              <input
                id="companyName"
                name="companyName"
                list="company-suggestions"
                placeholder="e.g. Goldman Sachs"
                required
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
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" placeholder="e.g. Software Engineer" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="industryId">Industry</Label>
              <select
                id="industryId"
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
              <Label htmlFor="startYear">Start year</Label>
              <Input id="startYear" name="startYear" type="number" min={1900} max={2100} />
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <input
                type="checkbox"
                id="isCurrent"
                checked={isCurrent}
                onChange={(e) => setIsCurrent(e.target.checked)}
                className="accent-primary"
              />
              <Label htmlFor="isCurrent" className="cursor-pointer">I currently work here</Label>
            </div>
            {!isCurrent && (
              <div className="space-y-1">
                <Label htmlFor="endYear">End year</Label>
                <Input id="endYear" name="endYear" type="number" min={1900} max={2100} />
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? 'Adding…' : 'Add position'}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => { setShowForm(false); setSelectedIndustryId('') }}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-1" /> Add position
        </Button>
      )}
    </div>
  )
}
