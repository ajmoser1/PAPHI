import { redirect } from 'next/navigation'

/** Founder tools live on the admin dashboard now. */
export default function FounderRedirect() {
  redirect('/admin#chapters')
}
