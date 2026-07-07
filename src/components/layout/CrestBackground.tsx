import Image from 'next/image'

type CrestBackgroundProps = {
  src?: string
}

export function CrestBackground({
  src = '/images/logos/sae-crest-bg.png',
}: CrestBackgroundProps) {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center overflow-hidden"
      aria-hidden
    >
      <Image
        src={src}
        alt=""
        width={1400}
        height={1400}
        className="max-h-none w-[min(100vw,42rem)] opacity-[0.35] blur-sm"
        priority
      />
    </div>
  )
}
