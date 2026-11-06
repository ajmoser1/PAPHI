import { requireChapterAdmin } from '@/lib/auth'
import { ROLES } from '@/lib/constants'
import { ALUMNI_CONTACT_VISIBLE_SELECT, hasVisibleContact, type VisibleContactInput } from '@/lib/contact'
import { inviteRegisterUrl, getSiteOrigin } from '@/lib/site'
import { getUxPreviewModeForRole } from '@/lib/ux-preview'
import { PageHeader } from '@/components/layout/PageHeader'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AdminTabs, type AdminTab } from '@/components/admin/AdminTabs'
import { SetupChecklist } from '@/components/admin/SetupChecklist'
import { ApprovalList, type PendingMember } from '@/components/admin/ApprovalList'
import { MembersTable, type ActiveMember } from '@/components/admin/MembersTable'
import { InviteLinkCard } from '@/components/admin/InviteLinkCard'
import { BrandingForm } from '@/components/admin/BrandingForm'
import { CreateCompanyForm } from '@/components/admin/CreateCompanyForm'
import { CompanyAdminList, type AdminCompany } from '@/components/admin/CompanyAdminList'
import { CreateIndustryForm } from '@/components/admin/CreateIndustryForm'
import { IndustryAdminList, type AdminIndustry } from '@/components/admin/IndustryAdminList'
import { ChapterRequestsList, type ChapterRequest } from '@/components/founder/ChapterRequestsList'
import { ChaptersList, type ChapterRow } from '@/components/founder/ChaptersList'
import { UxPreviewMenu } from '@/components/founder/UxPreviewMenu'

type ProfileRow = {
  id: string
  first_name: string
  last_name: string
  role: string
  created_at: string
  chapter_id: string | null
  avatar_url: string | null
  graduation_year: number | null
}

const TAB_IDS = ['todo', 'members', 'branding', 'catalog', 'chapters'] as const
type TabId = (typeof TAB_IDS)[number]

function pickTab(value: string | string[] | undefined): TabId {
  const v = Array.isArray(value) ? value[0] : value
  return (TAB_IDS as readonly string[]).includes(v ?? '') ? (v as TabId) : 'todo'
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  let ctx: Awaited<ReturnType<typeof requireChapterAdmin>>
  try {
    ctx = await requireChapterAdmin()
  } catch {
    return (
      <div className="space-y-6">
        <PageHeader title="Admin" />
        <Empty className="py-14">
          <EmptyHeader>
            <EmptyTitle className="heading-3">No chapter assigned to your admin account</EmptyTitle>
            <EmptyDescription>Ask the founder to assign you to a chapter. Until then there is nothing to manage here.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    )
  }
  const { profile, adminClient, userId } = ctx
  const isFounder = profile.role === ROLES.FOUNDER
  const chapterId = profile.chapter_id
  const chapterScoped = !isFounder && Boolean(chapterId)
  const tab = pickTab((await searchParams).tab)
  const uxPreviewMode = await getUxPreviewModeForRole(profile.role)

  // --- Members (always: counts feed the tab badges) --------------------------
  let pendingQuery = adminClient
    .from('profiles')
    .select('id, first_name, last_name, role, created_at, chapter_id, avatar_url, graduation_year')
    .eq('status', 'pending_approval')
    .order('created_at', { ascending: true })
  if (chapterScoped) pendingQuery = pendingQuery.eq('chapter_id', chapterId!)

  let activeQuery = adminClient
    .from('profiles')
    .select('id, first_name, last_name, role, created_at, chapter_id, avatar_url, graduation_year')
    .eq('status', 'active')
    .not('role', 'in', `(${ROLES.FOUNDER},${ROLES.CHAPTER_ADMIN},${ROLES.ADMIN})`)
    .order('created_at', { ascending: false })
  if (chapterScoped) activeQuery = activeQuery.eq('chapter_id', chapterId!)

  const [{ data: pending }, { data: active }, chapterRes] = await Promise.all([
    pendingQuery,
    activeQuery,
    chapterId
      ? adminClient.from('chapters').select('id, display_title, tagline, school_name, primary_color, accent_color, invite_token').eq('id', chapterId).maybeSingle()
      : Promise.resolve({ data: null }),
  ])
  const pendingList = (pending ?? []) as ProfileRow[]
  const activeList = (active ?? []) as ProfileRow[]
  const chapter = chapterRes.data
  const inviteUrl = chapter?.invite_token ? inviteRegisterUrl(chapter.invite_token, userId) : null

  const chapterIds = [...new Set([...pendingList, ...activeList].map((p) => p.chapter_id).filter((id): id is string => Boolean(id)))]
  const { data: chapterRows } = chapterIds.length
    ? await adminClient.from('chapters').select('id, name, school_name').in('id', chapterIds)
    : { data: [] }
  const chapterLabelById = Object.fromEntries(
    ((chapterRows ?? []) as { id: string; name: string; school_name: string | null }[]).map((ch) => [ch.id, ch.school_name ? `${ch.name} — ${ch.school_name}` : ch.name])
  )

  // --- Founder counts for the Chapters badge --------------------------------
  let requests: ChapterRequest[] = []
  if (isFounder) {
    const { data: reqs } = await adminClient
      .from('chapter_requests')
      .select('id, chapter_name, school_name, contact_name, contact_email')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
    requests = (reqs ?? []) as ChapterRequest[]
  }

  const tabs: AdminTab[] = [
    { id: 'todo', label: 'To do', count: pendingList.length + (isFounder ? requests.length : 0) },
    { id: 'members', label: 'Members', count: activeList.length },
    ...(chapter ? [{ id: 'branding', label: 'Branding' }] : []),
    { id: 'catalog', label: 'Companies & fields' },
    ...(isFounder ? [{ id: 'chapters', label: 'Chapters' }] : []),
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Admin" actions={isFounder ? <UxPreviewMenu currentMode={uxPreviewMode} /> : undefined} />
      <AdminTabs tabs={tabs} active={tab} />

      {tab === 'todo' && (
        <TodoTab
          adminClient={adminClient}
          pendingList={pendingList}
          activeCount={activeList.length}
          chapterLabelById={chapterLabelById}
          inviteUrl={inviteUrl}
          hasColors={Boolean(chapter?.primary_color)}
          isNewChapter={Boolean(chapter) && activeList.length === 0}
          requests={isFounder ? requests : null}
        />
      )}

      {tab === 'members' && (
        <MembersTable
          members={activeList.map((p) => ({
            id: p.id,
            first_name: p.first_name,
            last_name: p.last_name,
            role: p.role,
            created_at: p.created_at,
            avatar_url: p.avatar_url,
            graduation_year: p.graduation_year,
            chapterLabel: p.chapter_id ? (chapterLabelById[p.chapter_id] ?? null) : null,
          }))}
        />
      )}

      {tab === 'branding' && chapter && <BrandingForm chapter={chapter} />}

      {tab === 'catalog' && <CatalogTab adminClient={adminClient} isFounder={isFounder} />}

      {tab === 'chapters' && isFounder && <ChaptersTab adminClient={adminClient} userId={userId} requests={requests} />}
    </div>
  )
}

type AdminClient = Awaited<ReturnType<typeof requireChapterAdmin>>['adminClient']

async function TodoTab({
  adminClient,
  pendingList,
  activeCount,
  chapterLabelById,
  inviteUrl,
  hasColors,
  isNewChapter,
  requests,
}: {
  adminClient: AdminClient
  pendingList: ProfileRow[]
  activeCount: number
  chapterLabelById: Record<string, string>
  inviteUrl: string | null
  hasColors: boolean
  isNewChapter: boolean
  requests: ChapterRequest[] | null
}) {
  const pendingIds = pendingList.map((p) => p.id)
  const { data: contacts } = pendingIds.length
    ? await adminClient.from('alumni_contact').select(`profile_id, ${ALUMNI_CONTACT_VISIBLE_SELECT}`).in('profile_id', pendingIds)
    : { data: [] }
  const contactByProfile = Object.fromEntries(((contacts ?? []) as (VisibleContactInput & { profile_id: string })[]).map((c) => [c.profile_id, c]))

  const pendingMembers: PendingMember[] = pendingList.map((p) => {
    const c = contactByProfile[p.id]
    return {
      id: p.id,
      first_name: p.first_name,
      last_name: p.last_name,
      role: p.role,
      created_at: p.created_at,
      avatar_url: p.avatar_url,
      chapterLabel: p.chapter_id ? (chapterLabelById[p.chapter_id] ?? null) : null,
      canApprove: hasVisibleContact(c),
      phone: c?.phone?.trim() || null,
      email: c?.email?.trim() || null,
      linkedin: c?.linkedin_url?.trim() || null,
    }
  })

  const nothingToDo = pendingMembers.length === 0 && !(requests && requests.length)

  return (
    <div className="space-y-8">
      {isNewChapter && (
        <SetupChecklist
          steps={[
            { id: 'colors', label: 'Set your chapter colors', done: hasColors, href: '/admin?tab=branding' },
            { id: 'invite', label: 'Share your invite link', done: pendingList.length > 0 || activeCount > 0 },
            { id: 'approve', label: 'Approve your first brother', done: activeCount > 0 },
          ]}
        />
      )}

      {requests && requests.length > 0 && (
        <section aria-labelledby="requests-heading">
          <h2 id="requests-heading" className="heading-4 mb-3">
            {requests.length} chapter {requests.length === 1 ? 'request' : 'requests'}
          </h2>
          <ChapterRequestsList requests={requests} />
        </section>
      )}

      {pendingMembers.length > 0 && (
        <section aria-labelledby="approvals-heading">
          <h2 id="approvals-heading" className="heading-4 mb-3">
            {pendingMembers.length} waiting for approval
          </h2>
          <ApprovalList members={pendingMembers} />
        </section>
      )}

      {nothingToDo && (
        <Empty className="py-10">
          <EmptyHeader>
            <EmptyTitle className="heading-3">All clear</EmptyTitle>
            <EmptyDescription>New registrations show up here for approval.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      {inviteUrl && (
        <div className="border-t border-border">
          <InviteLinkCard inviteUrl={inviteUrl} emptyPending={pendingMembers.length === 0} />
        </div>
      )}
    </div>
  )
}

async function CatalogTab({ adminClient, isFounder }: { adminClient: AdminClient; isFounder: boolean }) {
  const [{ data: companies }, { data: industries }] = await Promise.all([
    adminClient.from('companies').select('id, name, status, website, industry_id, suggested_by, industries(name)').order('name'),
    adminClient.from('industries').select('id, name, slug').order('name'),
  ])
  const companyList = (companies ?? []) as unknown as AdminCompany[]
  const industryRows = (industries ?? []) as { id: string; name: string; slug: string }[]
  const usage = new Map<string, { companyCount: number; positionCount: number }>()
  if (industryRows.length) {
    const ids = industryRows.map((i) => i.id)
    const [{ data: companyRows }, { data: positionRows }] = await Promise.all([
      adminClient.from('companies').select('industry_id').in('industry_id', ids),
      adminClient.from('positions').select('industry_id').in('industry_id', ids),
    ])
    for (const id of ids) usage.set(id, { companyCount: 0, positionCount: 0 })
    for (const row of companyRows ?? []) if (row.industry_id) usage.get(row.industry_id)!.companyCount += 1
    for (const row of positionRows ?? []) if (row.industry_id) usage.get(row.industry_id)!.positionCount += 1
  }
  const industryList: AdminIndustry[] = industryRows.map((i) => ({ ...i, ...(usage.get(i.id) ?? { companyCount: 0, positionCount: 0 }) }))
  const missingField = companyList.filter((c) => !c.industry_id && c.status !== 'rejected').length

  return (
    <Tabs defaultValue="companies">
      <TabsList>
        <TabsTrigger value="companies">
          Companies
          {missingField > 0 && <span className="ml-1 rounded-full bg-warning-soft px-1.5 text-xs text-warning-soft-foreground">{missingField}</span>}
        </TabsTrigger>
        <TabsTrigger value="fields">Career fields</TabsTrigger>
      </TabsList>
      <TabsContent value="companies" className="space-y-5 pt-3">
        <CreateCompanyForm industries={industryRows} />
        <CompanyAdminList companies={companyList} industries={industryRows} isFounder={isFounder} />
      </TabsContent>
      <TabsContent value="fields" className="space-y-5 pt-3">
        {isFounder && <CreateIndustryForm />}
        <IndustryAdminList industries={industryList} isFounder={isFounder} />
      </TabsContent>
    </Tabs>
  )
}

async function ChaptersTab({ adminClient, userId, requests }: { adminClient: AdminClient; userId: string; requests: ChapterRequest[] }) {
  const host = new URL(getSiteOrigin()).host
  const { data: chs } = await adminClient.from('chapters').select('id, slug, name, school_name, status, invite_token, contact_email').order('name')
  const chapters: ChapterRow[] = ((chs ?? []) as Array<Omit<ChapterRow, 'inviteUrl' | 'host'> & { invite_token: string }>).map((ch) => ({
    id: ch.id,
    slug: ch.slug,
    name: ch.name,
    school_name: ch.school_name,
    status: ch.status,
    contact_email: ch.contact_email,
    inviteUrl: inviteRegisterUrl(ch.invite_token, userId),
    host,
  }))

  return (
    <div className="space-y-8">
      {requests.length > 0 && (
        <section aria-labelledby="chapter-requests-heading">
          <h2 id="chapter-requests-heading" className="heading-4 mb-3">
            {requests.length} chapter {requests.length === 1 ? 'request' : 'requests'}
          </h2>
          <ChapterRequestsList requests={requests} />
        </section>
      )}
      <ChaptersList chapters={chapters} />
    </div>
  )
}
