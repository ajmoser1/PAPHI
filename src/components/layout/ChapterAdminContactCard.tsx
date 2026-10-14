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
        'rounded-lg border border-warning/40 bg-warning-soft px-4 py-3 text-sm text-warning-soft-foreground',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <p className="font-medium">Need help getting approved? Message your chapter admin.</p>
      {hasNamedAdmins ? (
        <ul className="mt-2 space-y-3">
          {admins.map((admin) => {
            const name = `${admin.firstName} ${admin.lastName}`.trim() || 'Chapter admin'
            const hasChannels = admin.channels.length > 0
            return (
              <li key={admin.profileId} className="space-y-1">
                <span className="font-medium">{name}</span>
                {hasChannels ? (
                  <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:gap-x-4 sm:gap-y-1">
                    {admin.channels.map((channel) => {
                      if (channel.type === 'email') {
                        return (
                          <a
                            key={`${admin.profileId}-email`}
                            href={`mailto:${channel.value}`}
                            className="inline-flex items-center gap-1.5 text-warning-soft-foreground underline underline-offset-2 hover:text-foreground"
                          >
                            <Mail className="size-3.5" aria-hidden="true" />
                            {channel.value}
                          </a>
                        )
                      }
                      if (channel.type === 'phone') {
                        return (
                          <a
                            key={`${admin.profileId}-phone`}
                            href={`tel:${channel.value}`}
                            className="inline-flex items-center gap-1.5 text-warning-soft-foreground underline underline-offset-2 hover:text-foreground"
                          >
                            <Phone className="size-3.5" aria-hidden="true" />
                            {channel.value}
                          </a>
                        )
                      }
                      return (
                        <a
                          key={`${admin.profileId}-linkedin`}
                          href={channel.value}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-warning-soft-foreground underline underline-offset-2 hover:text-foreground"
                        >
                          <ExternalLink className="size-3.5" aria-hidden="true" />
                          LinkedIn
                        </a>
                      )
                    })}
                  </div>
                ) : chapterContactEmail ? (
                  <a
                    href={`mailto:${chapterContactEmail}`}
                    className="inline-flex items-center gap-1.5 text-warning-soft-foreground underline underline-offset-2 hover:text-foreground"
                  >
                    <Mail className="size-3.5" aria-hidden="true" />
                    {chapterContactEmail}
                  </a>
                ) : (
                  <span className="text-warning-soft-foreground/80">Ask a brother for their contact info</span>
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
        <p className="mt-1 text-warning-soft-foreground/80">
          Ask a brother for your chapter admin if you haven&apos;t been approved yet.
        </p>
      )}
    </div>
  )
}
