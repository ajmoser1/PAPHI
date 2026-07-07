import Image from 'next/image'

type AffiliationBrandingProps = {
  schoolName?: string | null
}

function formatSchoolName(schoolName: string | null | undefined) {
  if (!schoolName) return 'Carnegie Mellon'
  return schoolName.replace(/ University$/i, '')
}

export function AffiliationBranding({ schoolName }: AffiliationBrandingProps) {
  const school = formatSchoolName(schoolName)

  return (
    <div className="flex flex-col items-center justify-center">
      <p className="text-xs font-medium uppercase tracking-wide text-foreground">
        Built by SAE at {school}
      </p>
      <div className="mt-4 flex items-center justify-center gap-8">
        <Image
          src="/images/logos/sae-greek-logo.svg"
          alt="Sigma Alpha Epsilon fraternity logo"
          width={160}
          height={160}
          className="h-24 w-24 object-contain sm:h-28 sm:w-28"
          priority
        />
        <Image
          src="/images/logos/cmu-wordmark.svg"
          alt="Carnegie Mellon University wordmark"
          width={260}
          height={46}
          className="h-9 w-auto object-contain sm:h-11"
          priority
        />
      </div>
    </div>
  )
}
