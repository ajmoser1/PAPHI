import Link from 'next/link'
import { SearchX } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'

export default function AppNotFound() {
  return (
    <Empty className="py-16">
      <EmptyHeader>
        <EmptyMedia variant="icon" className="size-12 rounded-xl [&_svg]:size-6">
          <SearchX aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle className="heading-3">We couldn&apos;t find that</EmptyTitle>
        <EmptyDescription>The page or member you&apos;re looking for doesn&apos;t exist or is no longer available.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent className="flex-row justify-center">
        <Link href="/members" className={buttonVariants()}>
          Find a Brother
        </Link>
      </EmptyContent>
    </Empty>
  )
}
