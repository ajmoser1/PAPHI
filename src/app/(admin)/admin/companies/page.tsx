import { createAdminClient, createClient } from '@/lib/supabase/server'
import { CreateCompanyForm } from '@/components/admin/CreateCompanyForm'
import { CompanyAdminList, type AdminCompany } from '@/components/admin/CompanyAdminList'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function CompaniesPage() {
  const supabase = await createClient()
  const admin = createAdminClient()

  const [{ data: companies }, { data: industries }] = await Promise.all([
    admin
      .from('companies')
      .select('id, name, status, website, industry_id, suggested_by, industries(name)')
      .order('name'),
    supabase.from('industries').select('id, name').order('name'),
  ])

  const list = (companies ?? []) as unknown as AdminCompany[]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Companies</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Edit industry and status, hide junk entries, or merge duplicates. Soft-hide keeps
          existing positions intact.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add Company</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateCompanyForm industries={industries ?? []} />
        </CardContent>
      </Card>

      <CompanyAdminList companies={list} industries={industries ?? []} />
    </div>
  )
}
