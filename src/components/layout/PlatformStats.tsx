'use client'

import { useEffect, useState } from 'react'
import type { PlatformStats as PlatformStatsData } from '@/lib/stats'

const POLL_INTERVAL_MS = 15_000
const STATS_ENDPOINT = '/api/platform-stats'

function toCount(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) && n >= 0 ? n : null
}

async function fetchPlatformStats(): Promise<PlatformStatsData | null> {
  try {
    const res = await fetch(STATS_ENDPOINT, { cache: 'no-store' })
    if (!res.ok) return null
    const body: unknown = await res.json()
    if (!body || typeof body !== 'object') return null
    const row = body as Record<string, unknown>
    const userCount = toCount(row.userCount)
    const chapterCount = toCount(row.chapterCount)
    const companyCount = toCount(row.companyCount)
    if (userCount == null || chapterCount == null || companyCount == null) return null
    return { userCount, chapterCount, companyCount }
  } catch {
    return null
  }
}

type PlatformStatsProps = {
  initialStats: PlatformStatsData
}

function formatCount(n: number) {
  return new Intl.NumberFormat('en-US').format(n)
}

export function PlatformStats({ initialStats }: PlatformStatsProps) {
  const [stats, setStats] = useState(initialStats)

  useEffect(() => {
    setStats(initialStats)
  }, [initialStats])

  useEffect(() => {
    let cancelled = false
    let intervalId: ReturnType<typeof setInterval> | null = null

    async function refresh() {
      if (document.visibilityState !== 'visible') return

      const next = await fetchPlatformStats()
      if (cancelled || !next) return
      setStats(next)
    }

    function startPolling() {
      if (intervalId != null) return
      intervalId = setInterval(refresh, POLL_INTERVAL_MS)
    }

    function stopPolling() {
      if (intervalId == null) return
      clearInterval(intervalId)
      intervalId = null
    }

    function onVisibilityChange() {
      if (document.visibilityState === 'visible') {
        void refresh()
        startPolling()
      } else {
        stopPolling()
      }
    }

    if (document.visibilityState === 'visible') {
      startPolling()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      cancelled = true
      stopPolling()
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [])

  const items = [
    { label: 'Users', value: stats.userCount },
    { label: 'Chapters', value: stats.chapterCount },
    { label: 'Companies', value: stats.companyCount },
  ]

  return (
    <div className="mt-8 flex w-full max-w-md flex-wrap items-start justify-center gap-8 sm:gap-12">
      {items.map(({ label, value }) => (
        <div key={label} className="flex min-w-[5.5rem] flex-col items-center gap-1">
          <span className="text-3xl font-bold tracking-tight text-primary sm:text-4xl">
            {formatCount(value)}
          </span>
          <span className="text-sm text-primary">{label}</span>
        </div>
      ))}
    </div>
  )
}
