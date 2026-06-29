import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Mail, Phone, ExternalLink, Building2, Calendar, MessageSquare } from 'lucide-react'
import { createConversation } from '@/actions/messaging'
import { cn } from '@/lib/utils'

export default async function MemberProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data: profile }, { data: positions }, { data: contact }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, first_name, last_name, avatar_url, bio, graduation_year, chapter, role, status')
      .eq('id', id)
      .single(),
    supabase
      .from('positions')
      .select('id, title, is_current, start_year, end_year, companies(name), industries(name)')
      .eq('profile_id', id)
      .order('is_current', { ascending: false })
      .order('start_year', { ascending: false }),
    supabase
      .from('alumni_contact_public')
      .select('email, phone, linkedin_url, show_email, show_phone, show_linkedin')
      .eq('profile_id', id)
      .single(),
  ])

  if (
    !profile ||
    profile.status !== 'active' ||
    (profile.role !== 'undergrad' && profile.role !== 'alumni' && profile.role !== 'admin')
  ) {
    notFound()
  }

  const isAlumni = profile.role === 'alumni'
  const isAdmin = profile.role === 'admin'
  const initials = `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase()
  const currentPosition = positions?.find((p) => p.is_current)
  const isOwnProfile = user.id === id

  async function startConversation() {
    'use server'
    const conversationId = await createConversation(id)
    redirect(`/messages/${conversationId}`)
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="space-y-4">
        <div className="flex items-start gap-4">
          <Avatar
            className={cn(
              'h-20 w-20 shrink-0',
              isAlumni && 'ring-2 ring-[var(--gold)] ring-offset-2'
            )}
          >
            <AvatarImage src={profile.avatar_url ?? undefined} />
            <AvatarFallback className="text-xl">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold">
                {profile.first_name} {profile.last_name}
              </h1>
              <Badge
                variant={isAlumni ? 'default' : 'secondary'}
                className={cn(
                  isAlumni && 'bg-[var(--gold)] text-primary hover:bg-[var(--gold)]',
                  isAdmin && 'bg-primary text-primary-foreground hover:bg-primary'
                )}
              >
                {isAlumni ? 'Alumni' : isAdmin ? 'Admin' : 'Undergrad'}
              </Badge>
            </div>
            {currentPosition && (
              <p className="text-muted-foreground">
                {currentPosition.title} at {(currentPosition as { companies?: { name?: string } }).companies?.name}
              </p>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              {profile.graduation_year && (
                <Badge variant="secondary">
                  <Calendar className="mr-1 h-3 w-3" /> Class of {profile.graduation_year}
                </Badge>
              )}
              {profile.chapter && <Badge variant="secondary">{profile.chapter}</Badge>}
            </div>
          </div>
        </div>

        {!isOwnProfile && (
          <form action={startConversation} className="block">
            <Button
              type="submit"
              size="lg"
              className="h-14 w-full gap-2 rounded-2xl text-base font-semibold shadow-md hover:shadow-lg"
            >
              <MessageSquare className="h-5 w-5" aria-hidden />
              Message {profile.first_name}
            </Button>
          </form>
        )}
      </div>

      {profile.bio && (
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm leading-relaxed">{profile.bio}</p>
          </CardContent>
        </Card>
      )}

      {positions && positions.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Building2 className="h-4 w-4" /> Experience
          </h2>
          <div className="space-y-3">
            {positions.map((pos) => (
              <div key={pos.id} className="rounded-lg border bg-white p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-sm">{pos.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {(pos as { companies?: { name?: string } }).companies?.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {pos.start_year ?? '?'} — {pos.is_current ? 'Present' : (pos.end_year ?? '?')}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {pos.is_current && <Badge>Current</Badge>}
                    {(pos as { industries?: { name?: string } }).industries?.name && (
                      <Badge variant="secondary">
                        {(pos as { industries?: { name?: string } }).industries?.name}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {contact && (contact.show_email || contact.show_phone || contact.show_linkedin) && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Contact</h2>
          <div className="space-y-2">
            {contact.show_email && contact.email && (
              <a
                href={`mailto:${contact.email}`}
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <Mail className="h-4 w-4" /> {contact.email}
              </a>
            )}
            {contact.show_phone && contact.phone && (
              <a
                href={`tel:${contact.phone}`}
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <Phone className="h-4 w-4" /> {contact.phone}
              </a>
            )}
            {contact.show_linkedin && contact.linkedin_url && (
              <a
                href={contact.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <ExternalLink className="h-4 w-4" /> LinkedIn Profile
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
