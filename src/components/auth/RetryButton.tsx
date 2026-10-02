'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function RetryButton({ label = 'Try again' }: { label?: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  return (
    <Button
      type="button"
      size="lg"
      className="h-11 w-full text-base md:h-10 md:text-sm"
      disabled={isPending}
      onClick={() => startTransition(() => router.refresh())}
    >
      <RefreshCw className={isPending ? 'animate-spin' : undefined} aria-hidden="true" />
      {isPending ? 'Checking…' : label}
    </Button>
  )
}
