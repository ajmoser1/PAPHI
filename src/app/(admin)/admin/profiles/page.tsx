import { createClient } from '@/lib/supabase/server'
import { removeAcceptedProfile } from '@/actions/admin'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

export default async function ActiveProfilesPage() {
  const supabase = await createClient()
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, role, status, created_at')
    .eq('status', 'active')
    .neq('role', 'admin')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Active Profiles</h1>
        <p className="text-muted-foreground">
          {profiles?.length ?? 0} accepted profiles
        </p>
      </div>

      {!profiles?.length ? (
        <p className="text-muted-foreground">No active profiles found.</p>
      ) : (
        <div className="space-y-3">
          {profiles.map((profile) => (
            <Card key={profile.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="font-medium">
                    {profile.first_name} {profile.last_name}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant="secondary">{profile.role}</Badge>
                    <span className="text-xs text-muted-foreground">
                      Accepted {new Date(profile.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <form action={removeAcceptedProfile.bind(null, profile.id)}>
                  <Button type="submit" size="sm" variant="destructive">
                    Remove
                  </Button>
                </form>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
