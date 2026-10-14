'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { createIndustry } from '@/actions/admin'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'

export function CreateIndustryForm() {
  const [isPending, startTransition] = useTransition()

  return (
    <form
      className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end"
      onSubmit={(e) => {
        e.preventDefault()
        const form = e.currentTarget
        const formData = new FormData(form)
        startTransition(async () => {
          const result = await createIndustry(formData)
          if (result.message) toast.error(result.message)
          else {
            toast.success('Career field added.')
            form.reset()
          }
        })
      }}
    >
      <FormField id="new-industry-name" name="name" label="Career field name" required placeholder="e.g. Software Engineering" />
      <Button type="submit" disabled={isPending}>
        {isPending ? 'Adding…' : 'Add field'}
      </Button>
    </form>
  )
}
