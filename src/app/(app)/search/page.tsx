import { redirect } from 'next/navigation'

/** Next.js may pass repeated keys as string[]; HTML forms use "" for unselected <select>. */
function firstParam(value: string | string[] | undefined): string | undefined {
  if (value === undefined) return undefined
  return Array.isArray(value) ? value[0] : value
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const raw = await searchParams
  const params = new URLSearchParams()

  const q = firstParam(raw.q)?.trim()
  const industry = firstParam(raw.industry)?.trim()
  const company = firstParam(raw.company)?.trim()

  if (q) params.set('q', q)
  if (industry) params.set('industry', industry)
  if (company) params.set('company', company)
  params.set('alumni', '1')

  redirect(`/members?${params.toString()}`)
}
