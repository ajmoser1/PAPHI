'use client'

import { useState, useTransition, useRef } from 'react'
import { toast } from 'sonner'
import { uploadAvatar } from '@/actions/profile'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface Props {
  avatarUrl: string | null
}

export function AvatarUpload({ avatarUrl }: Props) {
  const [preview, setPreview] = useState<string | null>(avatarUrl)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const objectUrl = URL.createObjectURL(file)
    setPreview(objectUrl)

    const formData = new FormData()
    formData.append('avatar', file)
    startTransition(async () => {
      const result = await uploadAvatar(formData)
      if ((result as any)?.message) toast.error((result as any).message)
      else toast.success('Avatar updated.')
    })
  }

  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <Avatar className="h-20 w-20">
        <AvatarImage src={preview ?? undefined} />
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
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={() => inputRef.current?.click()}
        >
          {isPending ? 'Uploading…' : 'Change photo'}
        </Button>
        <p className="text-xs text-muted-foreground mt-1">JPG, PNG, or WebP · max 5MB</p>
      </div>
    </div>
  )
}
