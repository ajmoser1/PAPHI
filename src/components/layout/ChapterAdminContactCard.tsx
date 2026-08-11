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
                            className="inline-flex items-center gap-1.5 text-amber-900 underline underline-offset-2 hover:text-amber-950"
                          >
                            <Mail className="h-3.5 w-3.5" />
                            {channel.value}
                          </a>
                        )
                      }
                      if (channel.type === 'phone') {
                        return (
                          <a
                            key={`${admin.profileId}-phone`}
                            href={`tel:${channel.value}`}
                            className="inline-flex items-center gap-1.5 text-amber-900 underline underline-offset-2 hover:text-amber-950"
                          >
                            <Phone className="h-3.5 w-3.5" />
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
                          className="inline-flex items-center gap-1.5 text-amber-900 underline underline-offset-2 hover:text-amber-950"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          LinkedIn
                        </a>
                      )
                    })}
                  </div>
                ) : chapterContactEmail ? (
                  <a
                    href={`mailto:${chapterContactEmail}`}
                    className="inline-flex items-center gap-1.5 text-amber-900 underline underline-offset-2 hover:text-amber-950"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    {chapterContactEmail}
                  </a>
                ) : (
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
