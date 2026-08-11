import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function AccountSettingsCard({ email }: { email: string | null }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Account</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 max-w-lg">
        <div>
          <p className="text-sm font-medium">Login email</p>
          <p className="text-sm text-muted-foreground mt-1">{email ?? '—'}</p>
        </div>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            To change your password, we&apos;ll email you a reset link.
          </p>
          <Link
            href="/auth/forgot-password"
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
          >
            Reset password
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
