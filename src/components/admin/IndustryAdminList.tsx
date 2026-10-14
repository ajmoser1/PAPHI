'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Pencil, Trash2 } from 'lucide-react'
import { deleteIndustry, updateIndustry } from '@/actions/admin'
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
import { FormField } from '@/components/ui/form-field'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export type AdminIndustry = {
  id: string
  name: string
  slug: string
  companyCount: number
  positionCount: number
}

export function IndustryAdminList({ industries, isFounder }: { industries: AdminIndustry[]; isFounder: boolean }) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<AdminIndustry | null>(null)
  const [isPending, startTransition] = useTransition()

  return (
    <ul className="divide-y divide-border rounded-lg ring-1 ring-foreground/10">
      {industries.map((i) => {
        const inUse = i.companyCount > 0 || i.positionCount > 0
        const usage = `${i.companyCount} ${i.companyCount === 1 ? 'company' : 'companies'} · ${i.positionCount} ${i.positionCount === 1 ? 'position' : 'positions'}`
        return editingId === i.id ? (
          <li key={i.id} className="p-4">
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault()
                const formData = new FormData(e.currentTarget)
                startTransition(async () => {
                  const result = await updateIndustry(formData)
                  if (result.message) toast.error(result.message)
                  else {
                    toast.success('Career field renamed.')
                    setEditingId(null)
                  }
                })
              }}
            >
              <input type="hidden" name="id" value={i.id} />
              <FormField id={`industry-name-${i.id}`} name="name" label="Name" defaultValue={i.name} required hint={`Used by ${usage}. Renaming updates everyone.`} />
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={isPending}>
                  {isPending ? 'Saving…' : 'Save'}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setEditingId(null)} disabled={isPending}>
                  Cancel
                </Button>
              </div>
            </form>
          </li>
        ) : (
          <li key={i.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="font-medium">{i.name}</p>
              <p className="text-xs text-muted-foreground">{usage}</p>
            </div>
            {isFounder && (
              <div className="flex shrink-0 items-center gap-1">
                <Button type="button" variant="ghost" size="icon-sm" aria-label={`Rename ${i.name}`} onClick={() => setEditingId(i.id)} disabled={isPending}>
                  <Pencil aria-hidden="true" />
                </Button>
                {inUse ? (
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <span tabIndex={0} className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground/50 outline-none focus-visible:ring-2 focus-visible:ring-ring md:size-8" aria-label={`Cannot delete ${i.name}: in use`} />
                      }
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" />
                    </TooltipTrigger>
                    <TooltipContent>Reassign its companies and positions before deleting.</TooltipContent>
                  </Tooltip>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Delete ${i.name}`}
                    className="text-muted-foreground hover:text-destructive"
                    disabled={isPending}
                    onClick={() => setDeleting(i)}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                )}
              </div>
            )}
          </li>
        )
      })}

      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{deleting?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>It is not used by any company or position, so nothing else changes.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                const t = deleting
                setDeleting(null)
                if (!t) return
                startTransition(async () => {
                  const result = await deleteIndustry(t.id)
                  if (result.message) toast.error(result.message)
                  else toast.success('Career field deleted.')
                })
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ul>
  )
}
