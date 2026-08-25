'use client'

import { useState, useTransition, useRef } from 'react'
import { toast } from 'sonner'
import { removeAvatar, uploadAvatar } from '@/actions/profile'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

const DEFAULT_AVATAR = '/images/default-avatar.svg'
const MAX_AVATAR_BYTES = 5 * 1024 * 1024

interface Props {
  avatarUrl: string | null
}

export function AvatarUpload({ avatarUrl }: Props) {
  const [preview, setPreview] = useState<string | null>(avatarUrl)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)
  const hasCustomAvatar = Boolean(preview)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > MAX_AVATAR_BYTES) {
      toast.error('Photo is too large (max 5MB). Try a smaller image.')
      e.target.value = ''
      return
    }

    const previousPreview = preview
    const objectUrl = URL.createObjectURL(file)
    setPreview(objectUrl)

    const formData = new FormData()
    formData.append('avatar', file)
    startTransition(async () => {
      try {
        const result = await uploadAvatar(formData)
        if ((result as { message?: string })?.message) {
          toast.error((result as { message: string }).message)
          setPreview(previousPreview)
          URL.revokeObjectURL(objectUrl)
        } else {
          toast.success('Avatar updated.')
          if (result && 'url' in result && typeof result.url === 'string') {
            setPreview(result.url)
            URL.revokeObjectURL(objectUrl)
          }
        }
      } catch {
        toast.error('Could not upload photo. Try a smaller image.')
        setPreview(previousPreview)
        URL.revokeObjectURL(objectUrl)
      } finally {
        if (inputRef.current) inputRef.current.value = ''
      }
    })
  }

  function handleRemove() {
    startTransition(async () => {
      const result = await removeAvatar()
      if ((result as any)?.message) toast.error((result as any).message)
      else {
        setPreview(null)
        toast.success('Photo removed.')
      }
    })
  }

  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <Avatar className="h-20 w-20">
        <AvatarImage src={preview ?? DEFAULT_AVATAR} />
        <AvatarFallback className="text-lg">?</AvatarFallback>
      </Avatar>
      <div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() => inputRef.current?.click()}
          >
            {isPending ? 'Saving…' : 'Change photo'}
          </Button>
          {hasCustomAvatar && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isPending}
              onClick={handleRemove}
            >
              Remove photo
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">JPG, PNG, or WebP · max 5MB</p>
      </div>
    </div>
  )
}
