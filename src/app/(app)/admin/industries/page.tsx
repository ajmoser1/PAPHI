import { redirect } from 'next/navigation'

/** Folded into the admin page. */
export default function Redirect() {
  redirect('/admin?tab=catalog')
}
