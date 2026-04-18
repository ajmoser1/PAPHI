import { createClient } from '@/lib/supabase/server'
import { createCompany } from '@/actions/admin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default async function CompaniesPage() {
  const supabase = await createClient()

  const [{ data: companies }, { data: industries }] = await Promise.all([
    supabase
      .from('companies')
      .select('id, name, status, industries(name)')
      .order('name'),
    supabase
      .from('industries')
      .select('id, name')
      .order('name'),
  ])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Companies</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add Company</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createCompany} className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="name">Company name</Label>
              <Input id="name" name="name" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="slug">Slug</Label>
              <Input id="slug" name="slug" placeholder="e.g. google" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="industryId">Industry</Label>
              <select
                id="industryId"
                name="industryId"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              >
                <option value="">— Select industry —</option>
                {industries?.map((i) => (
                  <option key={i.id} value={i.id}>{i.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="website">Website</Label>
              <Input id="website" name="website" type="url" placeholder="https://..." />
            </div>
            <div className="col-span-2">
              <Button type="submit">Add company</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {companies?.map((c) => (
          <div key={c.id} className="flex items-center justify-between rounded-lg border bg-white px-4 py-3">
            <div>
              <p className="font-medium text-sm">{c.name}</p>
              <p className="text-xs text-muted-foreground">
                {(c as any).industries?.name ?? 'No industry'}
              </p>
            </div>
            <Badge variant={c.status === 'active' ? 'default' : 'secondary'}>
              {c.status}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  )
}
