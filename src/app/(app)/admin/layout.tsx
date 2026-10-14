import { redirect } from 'next/navigation'
import { getOwnProfileForApp } from '@/lib/profile'
import { isAdminRole } from '@/lib/constants'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await getOwnProfileForApp()
  if (!profile || !isAdminRole(profile.role)) redirect('/members')
  return children
}
