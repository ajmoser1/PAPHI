'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'

export default function AppError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <Empty className="py-16">
      <EmptyHeader>
        <EmptyMedia variant="icon" className="size-12 rounded-xl bg-destructive-soft text-destructive [&_svg]:size-6">
          <AlertTriangle aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle className="heading-3">Something went wrong</EmptyTitle>
        <EmptyDescription>
          That didn&apos;t load. Try again, or head back to Find a Brother.
          {error.digest && (
            <>
              {' '}
              <span className="text-xs text-muted-foreground">Reference: <code>{error.digest}</code></span>
            </>
          )}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent className="flex-row justify-center">
        <Button onClick={() => unstable_retry()}>Try again</Button>
        <Link href="/members" className={buttonVariants({ variant: 'outline' })}>
          Find a Brother
        </Link>
      </EmptyContent>
    </Empty>
  )
}
