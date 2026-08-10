import { setUxPreviewMode, clearUxPreviewMode } from '@/actions/founder'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { UX_PREVIEW_MODES, type UxPreviewMode } from '@/lib/ux-preview'
import Link from 'next/link'

export function UxPreviewPanel({ currentMode }: { currentMode: UxPreviewMode | null }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">UX preview (founder only)</h2>
        <p className="text-sm text-muted-foreground">
          Simulate a new member&apos;s first session without creating throwaway accounts. Uses a
          cookie overlay — your DB role and status stay as-is.
        </p>
      </div>

      {currentMode && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-violet-200 bg-violet-50 px-3 py-2 text-sm">
          <Badge variant="secondary">Active: {currentMode}</Badge>
          <form action={clearUxPreviewMode}>
            <Button type="submit" size="sm" variant="outline">
              Exit preview
            </Button>
          </form>
          <Link href="/members" className="text-sm underline underline-offset-2">
            Open Find a Brother
          </Link>
          <Link href="/profile/edit" className="text-sm underline underline-offset-2">
            Open Profile
          </Link>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {UX_PREVIEW_MODES.map((mode) => (
          <Card key={mode.id}>
            <CardContent className="pt-4 space-y-3">
              <div>
                <p className="font-medium">{mode.label}</p>
                <p className="text-sm text-muted-foreground mt-1">{mode.description}</p>
              </div>
              <form action={setUxPreviewMode.bind(null, mode.id)}>
                <Button
                  type="submit"
                  size="sm"
                  variant={currentMode === mode.id ? 'default' : 'secondary'}
                >
                  {currentMode === mode.id ? 'Currently previewing' : 'Preview'}
                </Button>
              </form>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
