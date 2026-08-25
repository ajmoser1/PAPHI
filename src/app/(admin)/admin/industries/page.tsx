import { createAdminClient, createClient } from '@/lib/supabase/server'
import { CreateIndustryForm } from '@/components/admin/CreateIndustryForm'
import { IndustryAdminList, type AdminIndustry } from '@/components/admin/IndustryAdminList'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function IndustriesPage() {
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: industries } = await supabase
    .from('industries')
    .select('id, name, slug')
    .order('name')

  const ids = (industries ?? []).map((i) => i.id)
  const usageById = new Map<string, { companyCount: number; positionCount: number }>()

  if (ids.length > 0) {
    const [{ data: companyRows }, { data: positionRows }] = await Promise.all([
      admin.from('companies').select('industry_id').in('industry_id', ids),
      admin.from('positions').select('industry_id').in('industry_id', ids),
    ])

    for (const id of ids) {
      usageById.set(id, { companyCount: 0, positionCount: 0 })
    }
    for (const row of companyRows ?? []) {
      if (!row.industry_id) continue
      const entry = usageById.get(row.industry_id)
      if (entry) entry.companyCount += 1
    }
    for (const row of positionRows ?? []) {
      if (!row.industry_id) continue
      const entry = usageById.get(row.industry_id)
      if (entry) entry.positionCount += 1
    }
  }

  const list: AdminIndustry[] = (industries ?? []).map((i) => ({
    id: i.id,
    name: i.name,
    slug: i.slug,
    companyCount: usageById.get(i.id)?.companyCount ?? 0,
    positionCount: usageById.get(i.id)?.positionCount ?? 0,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Career fields</h1>
        <p className="text-sm text-muted-foreground mt-1">
          These label a member&apos;s role for Find a Brother (not the company&apos;s sector).
          Rename freely; delete only when unused.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add career field</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateIndustryForm />
        </CardContent>
      </Card>

      <IndustryAdminList industries={list} />
    </div>
  )
}
