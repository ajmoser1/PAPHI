import { redirect } from 'next/navigation'

/** Founder tools live on the admin page. */
export default function FounderRedirect() {
  redirect('/admin?tab=chapters')
}
