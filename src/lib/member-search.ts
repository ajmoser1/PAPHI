export type MemberSearchSort = 'name' | 'class_asc' | 'class_desc' | 'chapter'

export function parseMemberSearchSort(value: string | undefined): MemberSearchSort {
  if (value === 'class_asc' || value === 'class_desc' || value === 'chapter' || value === 'name') {
    return value
  }
  return 'name'
}

export type SearchState = {
  q: string
  industry: string
  company: string
  alumni: boolean
  sort: MemberSearchSort
}

/** URL for a Find a Brother search; shared by the toolbar (client) and the page (server). */
export function buildMembersQuery(params: SearchState): string {
  const sp = new URLSearchParams()
  const q = params.q.trim()
  if (q) sp.set('q', q)
  if (params.industry) sp.set('industry', params.industry)
  if (params.company) sp.set('company', params.company)
  if (params.alumni) sp.set('alumni', '1')
  if (params.sort && params.sort !== 'name') sp.set('sort', params.sort)
  const qs = sp.toString()
  return qs ? `/members?${qs}` : '/members'
}
