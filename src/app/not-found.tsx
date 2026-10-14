import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CrestBackground } from '@/components/layout/CrestBackground'

export default function RootNotFound() {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-x-hidden bg-background px-4 py-10">
      <CrestBackground />
      <main id="main" className="relative z-10 w-full max-w-md">
        <Card>
          <CardHeader className="text-center">
            <p className="eyebrow">404</p>
            <CardTitle as="h1" className="heading-2">Page not found</CardTitle>
            <CardDescription>That link doesn&apos;t go anywhere. It may have moved or never existed.</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center gap-2">
            <Link href="/" className={buttonVariants()}>
              Go home
            </Link>
            <Link href="/auth/login" className={buttonVariants({ variant: 'outline' })}>
              Sign in
            </Link>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
