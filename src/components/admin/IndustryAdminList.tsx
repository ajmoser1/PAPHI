'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { deleteIndustry, updateIndustry } from '@/actions/admin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Pencil, Trash2 } from 'lucide-react'

export type AdminIndustry = {
  id: string
  name: string
  slug: string
  companyCount: number
  positionCount: number
}

export function IndustryAdminList({ industries }: { industries: AdminIndustry[] }) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  return (
    <div className="space-y-2">
      {industries.map((i) =>
        editingId === i.id ? (
          <form
            key={i.id}
            className="rounded-lg border bg-white p-4 space-y-3"
            onSubmit={(e) => {
              e.preventDefault()
              const formData = new FormData(e.currentTarget)
              startTransition(async () => {
                const result = await updateIndustry(formData)
                if (result.message) toast.error(result.message)
                else {
                  toast.success('Industry updated.')
                  setEditingId(null)
                }
              })
            }}
          >
            <input type="hidden" name="id" value={i.id} />
            <div className="space-y-1">
              <Label htmlFor={`industry-name-${i.id}`}>Name</Label>
              <Input
                id={`industry-name-${i.id}`}
                name="name"
                defaultValue={i.name}
                required
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Used by {i.companyCount} compan{i.companyCount === 1 ? 'y' : 'ies'} and{' '}
              {i.positionCount} position{i.positionCount === 1 ? '' : 's'}. Slug updates
              automatically from the name.
            </p>
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={isPending}>
                {isPending ? 'Saving…' : 'Save'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setEditingId(null)}
                disabled={isPending}
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <div
            key={i.id}
            className="flex items-center justify-between gap-3 rounded-lg border bg-white px-4 py-3"
          >
            <div className="min-w-0">
              <p className="font-medium text-sm">{i.name}</p>
              <p className="text-xs text-muted-foreground font-mono">
                {i.slug}
                {' · '}
                {i.companyCount} co · {i.positionCount} pos
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-muted-foreground"
                onClick={() => setEditingId(i.id)}
                disabled={isPending}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-destructive"
                disabled={isPending || i.companyCount > 0 || i.positionCount > 0}
                title={
                  i.companyCount > 0 || i.positionCount > 0
                    ? 'Remap companies and positions before deleting'
                    : 'Delete industry'
                }
                onClick={() => {
                  if (!window.confirm(`Delete industry “${i.name}”?`)) return
                  startTransition(async () => {
                    const result = await deleteIndustry(i.id)
                    if (result.message) toast.error(result.message)
                    else toast.success('Industry deleted.')
                  })
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )
      )}
    </div>
  )
}
