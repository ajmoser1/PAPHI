'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

/**
 * Runs a save and tracks its status for an inline indicator. Overlapping saves
 * are allowed; the indicator reflects the latest one.
 */
export function useAutosave() {
  const [status, setStatus] = useState<SaveStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const seq = useRef(0)
  const timer = useRef<number | null>(null)

  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current)
  }, [])

  const run = useCallback(async (fn: () => Promise<{ message?: string } | void>) => {
    const id = ++seq.current
    setStatus('saving')
    setError(null)
    try {
      const result = await fn()
      if (id !== seq.current) return
      if (result && 'message' in result && result.message) {
        setStatus('error')
        setError(result.message)
        return
      }
      setStatus('saved')
      if (timer.current) window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setStatus('idle'), 2000)
    } catch (err) {
      if (id !== seq.current) return
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Could not save.')
    }
  }, [])

  return { status, error, run }
}
