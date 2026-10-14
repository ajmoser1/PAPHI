import { redirect } from 'next/navigation'

/** Folded into the single admin dashboard. */
export default function Redirect() {
  redirect('/admin#approvals')
}
