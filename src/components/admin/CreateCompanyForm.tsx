'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { createCompany } from '@/actions/admin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type IndustryOption = { id: string; name: string }

export function CreateCompanyForm({ industries }: { industries: IndustryOption[] }) {
  const [isPending, startTransition] = useTransition()

  return (
    <form
      className="grid grid-cols-2 gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        const form = e.currentTarget
        const formData = new FormData(form)
        startTransition(async () => {
          const result = await createCompany(formData)
          if (result.message) toast.error(result.message)
          else {
            toast.success('Company added.')
            form.reset()
          }
        })
      }}
    >
      <div className="space-y-1">
        <Label htmlFor="name">Company name</Label>
        <Input id="name" name="name" required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="industryId">Industry</Label>
        <select
          id="industryId"
          name="industryId"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
        >
          <option value="">— Select industry —</option>
          {industries.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </select>
      </div>
      <div className="col-span-2 space-y-1">
        <Label htmlFor="website">Website</Label>
        <Input id="website" name="website" type="url" placeholder="https://..." />
      </div>
      <div className="col-span-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Adding…' : 'Add company'}
        </Button>
      </div>
    </form>
  )
}
