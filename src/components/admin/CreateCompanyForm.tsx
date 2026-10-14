'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { createCompany } from '@/actions/admin'
import { Button } from '@/components/ui/button'
import { FormField, SelectField } from '@/components/ui/form-field'

type IndustryOption = { id: string; name: string }

export function CreateCompanyForm({ industries }: { industries: IndustryOption[] }) {
  const [isPending, startTransition] = useTransition()

  return (
    <form
      className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
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
      <FormField id="new-company-name" name="name" label="Company name" required placeholder="e.g. Goldman Sachs" />
      <SelectField id="new-company-industry" name="industryId" label="Career field">
        <option value="">Choose a field</option>
        {industries.map((i) => (
          <option key={i.id} value={i.id}>
            {i.name}
          </option>
        ))}
      </SelectField>
      <Button type="submit" disabled={isPending} className="sm:mb-0">
        {isPending ? 'Adding…' : 'Add company'}
      </Button>
    </form>
  )
}
