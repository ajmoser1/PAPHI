import { createClient } from '@/lib/supabase/server'
import { requireChapterAdmin } from '@/lib/auth'
import { updateChapterBranding } from '@/actions/chapter-admin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { inviteRegisterUrl } from '@/lib/site'

export default async function CustomizePage() {
  const { profile, adminClient } = await requireChapterAdmin()

  if (!profile.chapter_id) {
    return <p className="text-muted-foreground">No chapter assigned.</p>
  }

  const { data: chapter } = await adminClient
    .from('chapters')
    .select('*')
    .eq('id', profile.chapter_id)
    .single()

  if (!chapter) return <p>Chapter not found.</p>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Customize Chapter</h1>
        <p className="text-muted-foreground">Set your chapter&apos;s branding and appearance</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Branding</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateChapterBranding} className="space-y-4 max-w-lg">
            <input type="hidden" name="chapterId" value={chapter.id} />
            <div className="space-y-1">
              <Label htmlFor="displayTitle">Display title</Label>
              <Input
                id="displayTitle"
                name="displayTitle"
                defaultValue={chapter.display_title ?? ''}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="tagline">Tagline</Label>
              <Textarea id="tagline" name="tagline" defaultValue={chapter.tagline ?? ''} rows={2} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="schoolName">School name</Label>
              <Input id="schoolName" name="schoolName" defaultValue={chapter.school_name ?? ''} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="primaryColor">Primary color</Label>
                <Input
                  id="primaryColor"
                  name="primaryColor"
                  type="color"
                  defaultValue="#5b21b6"
                  className="h-10"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="accentColor">Accent color</Label>
                <Input
                  id="accentColor"
                  name="accentColor"
                  type="color"
                  defaultValue="#d4a017"
                  className="h-10"
                />
              </div>
            </div>
            <Button type="submit">Save branding</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invite link</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-2">Share this link with brothers to register:</p>
          <code className="text-xs bg-muted p-2 rounded block break-all">
            {inviteRegisterUrl(chapter.invite_token)}
          </code>
        </CardContent>
      </Card>
    </div>
  )
}
