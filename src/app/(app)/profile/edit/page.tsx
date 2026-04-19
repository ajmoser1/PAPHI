import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProfileEditForm } from '@/components/profile/ProfileEditForm'
import { ContactForm } from '@/components/profile/ContactForm'
import { PositionsSection } from '@/components/profile/PositionsSection'
import { AvatarUpload } from '@/components/profile/AvatarUpload'
import { Separator } from '@/components/ui/separator'

export default async function ProfileEditPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data: profile }, { data: contact }, { data: positions }, { data: companies }, { data: industries }] = await Promise.all([
    supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single(),
    supabase
      .from('alumni_contact')
      .select('*')
      .eq('profile_id', user.id)
      .single(),
    supabase
      .from('positions')
      .select('*, companies(id, name), industries(id, name)')
      .eq('profile_id', user.id)
      .order('is_current', { ascending: false })
      .order('start_year', { ascending: false }),
    supabase
      .from('companies')
      .select('id, name, industry_id')
      .eq('status', 'active')
      .order('name'),
    supabase
      .from('industries')
      .select('id, name')
      .order('name'),
  ])

  if (!profile) redirect('/dashboard')

  const isAlumni = profile.role === 'alumni'

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-primary tracking-tight">Edit Profile</h1>
        <p className="text-muted-foreground">Update your information visible to other members.</p>
      </div>

      <AvatarUpload avatarUrl={profile.avatar_url} />

      <Separator />

      <ProfileEditForm profile={profile} />

      {isAlumni && (
        <>
          <Separator />
          <div>
            <h2 className="text-lg font-semibold mb-4">Work Experience</h2>
            <PositionsSection
              positions={positions ?? []}
              companies={companies ?? []}
              industries={industries ?? []}
            />
          </div>
          <Separator />
          <div>
            <h2 className="text-lg font-semibold mb-4">Contact Information</h2>
            <ContactForm contact={contact} />
          </div>
        </>
      )}
    </div>
  )
}
