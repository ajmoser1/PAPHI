'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { createIndustry } from '@/actions/admin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function CreateIndustryForm() {
  const [isPending, startTransition] = useTransition()

  return (
    <form
      className="flex gap-3 items-end"
      onSubmit={(e) => {
        e.preventDefault()
        const form = e.currentTarget
        const formData = new FormData(form)
        startTransition(async () => {
          const result = await createIndustry(formData)
          if (result.message) toast.error(result.message)
          else {
            toast.success('Industry added.')
            form.reset()
          }
        })
      }}
    >
      <div className="space-y-1 flex-1">
        <Label htmlFor="name">Career field name</Label>
        <Input id="name" name="name" required placeholder="e.g. Software Engineering" />
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? 'Adding…' : 'Add'}
      </Button>
    </form>
  )
}
