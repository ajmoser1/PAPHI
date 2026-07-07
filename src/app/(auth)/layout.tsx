import Image from 'next/image'
import { AffiliationBranding } from '@/components/layout/AffiliationBranding'
import { CrestBackground } from '@/components/layout/CrestBackground'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative flex min-h-screen min-h-[100dvh] flex-col items-center justify-center gap-8 overflow-x-hidden bg-gradient-to-b from-background via-background to-muted/30 px-4 py-10">
      <CrestBackground />
      <div className="relative z-10 w-full max-w-md">{children}</div>
      <div className="relative z-10">
        <AffiliationBranding />
      </div>
    </div>
  )
}
