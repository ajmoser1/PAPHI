import { createClient } from '@/lib/supabase/server'
import { createIndustry } from '@/actions/admin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function IndustriesPage() {
  const supabase = await createClient()
  const { data: industries } = await supabase
    .from('industries')
    .select('id, name, slug')
    .order('name')

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Industries</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add Industry</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createIndustry} className="flex gap-3 items-end">
            <div className="space-y-1 flex-1">
              <Label htmlFor="name">Industry name</Label>
              <Input id="name" name="name" required />
            </div>
            <Button type="submit">Add</Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {industries?.map((i) => (
          <div key={i.id} className="flex items-center justify-between rounded-lg border bg-white px-4 py-3">
            <p className="font-medium text-sm">{i.name}</p>
            <p className="text-xs text-muted-foreground font-mono">{i.slug}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
