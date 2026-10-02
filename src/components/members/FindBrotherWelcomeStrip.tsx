'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'

const STORAGE_KEY = 'find-brother-welcome-dismissed'

export function FindBrotherWelcomeStrip() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      setVisible(sessionStorage.getItem(STORAGE_KEY) !== '1')
    } catch {
      setVisible(true)
    }
  }, [])

  function dismiss() {
    try {
      sessionStorage.setItem(STORAGE_KEY, '1')
    } catch {
      // ignore
    }
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-foreground/90 leading-relaxed">
          <span className="font-semibold text-primary">Welcome to Find a Brother.</span>{' '}
          Search by name, company, or career field — results update as you type. Use the filters
          below, and switch between{' '}
          <span className="font-medium">All chapters</span> and{' '}
          <span className="font-medium">My chapter</span> to change who you see.
        </p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
          onClick={dismiss}
          aria-label="Dismiss welcome tip"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
