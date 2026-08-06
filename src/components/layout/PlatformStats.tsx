'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { PlatformStats as PlatformStatsData } from '@/lib/stats'

const POLL_INTERVAL_MS = 15_000

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
    const supabase = createClient()
    let cancelled = false
    let intervalId: ReturnType<typeof setInterval> | null = null

    async function refresh() {
      if (document.visibilityState !== 'visible') return

      const { data, error } = await supabase.rpc('get_platform_stats')
      if (cancelled || error || !data?.[0]) return

      const row = data[0]
      setStats({
        userCount: Number(row.user_count ?? 0),
        chapterCount: Number(row.chapter_count ?? 0),
        companyCount: Number(row.company_count ?? 0),
      })
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
