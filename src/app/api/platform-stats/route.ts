import { getPlatformStats } from '@/lib/stats'

// Public counts for the home page. The browser used to poll
// /rest/v1/rpc/get_platform_stats directly; that function is now callable by the
// service role only (Security Advisor lints 0028/0029), so the poll comes here and
// the server runs it. Route handlers are dynamic by default (no caching).
export async function GET() {
  const stats = await getPlatformStats()
  return Response.json(stats, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
