import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

/** Stable hue from a name so initials fallbacks differ per person instead of all grey. */
export function hueFromName(name: string): number {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return h % 360
}

type MemberAvatarProps = {
  firstName: string
  lastName: string
  avatarUrl: string | null
  /** Pixel size; the fallback text scales with it. */
  size?: 40 | 48 | 56 | 64 | 80 | 96 | 112
  className?: string
  /** Gold ring for alumni. */
  highlight?: boolean
}

export function MemberAvatar({ firstName, lastName, avatarUrl, size = 56, className, highlight }: MemberAvatarProps) {
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || '?'
  const hue = hueFromName(`${firstName} ${lastName}`)
  const fontSize = Math.round(size * 0.36)
  return (
    <Avatar
      className={cn('shrink-0', highlight && 'ring-2 ring-gold ring-offset-2 ring-offset-card', className)}
      style={{ width: size, height: size }}
    >
      {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
      <AvatarFallback
        className="font-semibold"
        style={{
          fontSize,
          backgroundColor: `oklch(0.93 0.05 ${hue})`,
          color: `oklch(0.4 0.12 ${hue})`,
        }}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  )
}
