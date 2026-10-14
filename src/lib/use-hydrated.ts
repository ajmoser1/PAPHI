'use client'

import { useSyncExternalStore } from 'react'

const noop = () => () => {}

/** False during server render and hydration, true afterwards. Use for locale/timezone-dependent text. */
export function useHydrated(): boolean {
  return useSyncExternalStore(noop, () => true, () => false)
}
