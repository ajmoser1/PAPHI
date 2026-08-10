import { Mail, Phone, ExternalLink } from 'lucide-react'
import type { ChapterAdminContactsResult } from '@/lib/chapter-admins'

export function ChapterAdminContactCard({
  contacts,
  className,
}: {
  contacts: ChapterAdminContactsResult
  className?: string
}) {
  const { admins, chapterContactEmail } = contacts
  const hasNamedAdmins = admins.length > 0

  return (
    <div
      className={[
        'rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <p className="font-medium">Need help getting approved?</p>
      {hasNamedAdmins ? (
        <ul className="mt-2 space-y-2">
          {admins.map((admin) => {
            const name = `${admin.firstName} ${admin.lastName}`.trim() || 'Chapter admin'
            return (
              <li key={admin.profileId} className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-3">
                <span className="font-medium">{name}</span>
                {admin.contactType === 'email' && admin.contactValue && (
                  <a
                    href={`mailto:${admin.contactValue}`}
                    className="inline-flex items-center gap-1.5 text-amber-900 underline underline-offset-2 hover:text-amber-950"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    {admin.contactValue}
                  </a>
                )}
                {admin.contactType === 'phone' && admin.contactValue && (
                  <a
                    href={`tel:${admin.contactValue}`}
                    className="inline-flex items-center gap-1.5 text-amber-900 underline underline-offset-2 hover:text-amber-950"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    {admin.contactValue}
                  </a>
                )}
                {admin.contactType === 'linkedin' && admin.contactValue && (
                  <a
                    href={admin.contactValue}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-amber-900 underline underline-offset-2 hover:text-amber-950"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    LinkedIn
                  </a>
                )}
                {!admin.contactType && chapterContactEmail && (
                  <a
                    href={`mailto:${chapterContactEmail}`}
                    className="inline-flex items-center gap-1.5 text-amber-900 underline underline-offset-2 hover:text-amber-950"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    {chapterContactEmail}
                  </a>
                )}
                {!admin.contactType && !chapterContactEmail && (
                  <span className="text-amber-800/80">Ask a brother for their contact info</span>
                )}
              </li>
            )
          })}
        </ul>
      ) : chapterContactEmail ? (
        <p className="mt-1">
          Reach your chapter at{' '}
          <a
            href={`mailto:${chapterContactEmail}`}
            className="font-medium underline underline-offset-2"
          >
            {chapterContactEmail}
          </a>
          .
        </p>
      ) : (
        <p className="mt-1 text-amber-900/80">
          Ask a brother for your chapter admin if you haven&apos;t been approved yet.
        </p>
      )}
    </div>
  )
}
