import Image from 'next/image'

type AffiliationBrandingProps = {
  schoolName?: string | null
  /** Chapter or school logo. Falls back to text when a chapter has none. */
  logoUrl?: string | null
}

function formatSchoolName(schoolName: string | null | undefined) {
  if (!schoolName) return 'Carnegie Mellon'
  return schoolName.replace(/ University$/i, '')
}

const CMU = /carnegie\s*mellon/i

export function AffiliationBranding({ schoolName, logoUrl }: AffiliationBrandingProps) {
  const school = formatSchoolName(schoolName)
  const isCmu = !schoolName || CMU.test(schoolName)

  return (
    <div className="flex flex-col items-center justify-center">
      <p className="eyebrow">Built by SAE at {school}</p>
      <div className="mt-4 flex max-w-full flex-wrap items-center justify-center gap-x-6 gap-y-3 px-4">
        <Image
          src="/images/logos/sae-greek-logo.svg"
          alt="Sigma Alpha Epsilon fraternity logo"
          width={160}
          height={160}
          className="h-16 w-16 object-contain sm:h-20 sm:w-20"
          priority
        />
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt={`${school} logo`} className="h-9 w-auto max-w-[70vw] object-contain sm:h-11" />
        ) : isCmu ? (
          <Image
            src="/images/logos/cmu-wordmark.svg"
            alt="Carnegie Mellon University wordmark"
            width={260}
            height={46}
            className="h-7 w-auto max-w-[70vw] object-contain sm:h-10"
            priority
          />
        ) : (
          <span className="font-heading text-xl font-semibold text-foreground sm:text-2xl">{schoolName}</span>
        )}
      </div>
    </div>
  )
}
