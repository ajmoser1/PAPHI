import { redirect } from 'next/navigation'
import { getOwnProfileForApp } from '@/lib/profile'
import { ROLES } from '@/lib/constants'

export default async function FounderLayout({ children }: { children: React.ReactNode }) {
  const profile = await getOwnProfileForApp()
  if (!profile || profile.role !== ROLES.FOUNDER) redirect('/members')
  return children
}
