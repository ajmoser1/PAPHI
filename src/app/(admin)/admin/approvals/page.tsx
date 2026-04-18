import { createClient } from '@/lib/supabase/server'
import { approveUser, rejectUser } from '@/actions/admin'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default async function ApprovalsPage() {
  const supabase = await createClient()
  const { data: pending } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, role, created_at')
    .eq('status', 'pending_approval')
    .order('created_at', { ascending: true })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pending Approvals</h1>
        <p className="text-muted-foreground">{pending?.length ?? 0} accounts awaiting review</p>
      </div>

      {!pending?.length ? (
        <p className="text-muted-foreground">No pending accounts.</p>
      ) : (
        <div className="space-y-3">
          {pending.map((p) => (
            <Card key={p.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="font-medium">{p.first_name} {p.last_name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary">{p.role}</Badge>
                    <span className="text-xs text-muted-foreground">
                      Registered {new Date(p.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <form action={approveUser.bind(null, p.id)}>
                    <Button type="submit" size="sm">Approve</Button>
                  </form>
                  <form action={rejectUser.bind(null, p.id)}>
                    <Button type="submit" size="sm" variant="destructive">Reject</Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
