'use client'

import { Camera, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { AVATAR_ACCEPT, useAvatarUpload } from './useAvatarUpload'

interface Props {
  avatarUrl: string | null
  initials?: string
}

export function AvatarUpload({ avatarUrl, initials = '?' }: Props) {
  const { preview, isPending, inputRef, openPicker, handleInputChange, handleRemove } = useAvatarUpload({
    initialUrl: avatarUrl,
  })

  return (
    <div className="flex items-center gap-4">
      <Avatar className="size-20 shrink-0">
        {preview && <AvatarImage src={preview} alt="" />}
        <AvatarFallback className="bg-primary-soft text-xl font-semibold text-primary">{initials}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 space-y-2">
        <input
          ref={inputRef}
          type="file"
          accept={AVATAR_ACCEPT}
          className="hidden"
          onChange={handleInputChange}
          aria-label="Choose a profile photo"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={openPicker}>
            <Camera data-icon="inline-start" aria-hidden="true" />
            {isPending ? 'Saving…' : preview ? 'Change photo' : 'Add photo'}
          </Button>
          {preview && (
            <Button type="button" variant="ghost" size="sm" disabled={isPending} onClick={handleRemove}>
              <Trash2 data-icon="inline-start" aria-hidden="true" />
              Remove
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          A clear photo of your face. JPG, PNG, or WebP, up to 5MB. Required so brothers can recognize you.
        </p>
      </div>
    </div>
  )
}
