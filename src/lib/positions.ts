export type DisplayPosition = {
  id: string
  title: string
  is_current: boolean
  start_year: number | null
  end_year?: number | null
  companies?: { name?: string } | null
}

export function pickDisplayPosition<T extends DisplayPosition>(
  positions: T[],
  featuredPositionId: string | null | undefined
): T | undefined {
  if (!positions.length) return undefined

  if (featuredPositionId) {
    const featured = positions.find((p) => p.id === featuredPositionId)
    if (featured) return featured
  }

  const current = positions.filter((p) => p.is_current)
  if (current.length) {
    return [...current].sort((a, b) => (b.start_year ?? 0) - (a.start_year ?? 0))[0]
  }

  return [...positions].sort((a, b) => (b.start_year ?? 0) - (a.start_year ?? 0))[0]
}
