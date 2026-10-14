'use client'

import { useRef, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { removeAvatar, uploadAvatar } from '@/actions/profile'

export const MAX_AVATAR_BYTES = 5 * 1024 * 1024
export const AVATAR_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif'

type Options = {
  initialUrl: string | null
  onUploaded?: (url: string) => void
  onRemoved?: () => void
}

/** Shared upload/remove logic for every place a member can set their photo. */
export function useAvatarUpload({ initialUrl, onUploaded, onRemoved }: Options) {
  const [preview, setPreview] = useState<string | null>(initialUrl)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  function openPicker() {
    inputRef.current?.click()
  }

  function handleFile(file: File | undefined | null) {
    if (!file) return
    if (file.size > MAX_AVATAR_BYTES) {
      toast.error('Photo is too large (max 5MB). Try a smaller image.')
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
        } else if (result && 'url' in result && typeof result.url === 'string') {
          setPreview(result.url)
          toast.success('Photo updated.')
          onUploaded?.(result.url)
        }
      } catch {
        toast.error('Could not upload photo. Try a smaller image.')
        setPreview(previousPreview)
      } finally {
        URL.revokeObjectURL(objectUrl)
        if (inputRef.current) inputRef.current.value = ''
      }
    })
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    handleFile(e.target.files?.[0])
  }

  function handleRemove() {
    startTransition(async () => {
      const result = await removeAvatar()
      if ((result as { message?: string })?.message) toast.error((result as { message: string }).message)
      else {
        setPreview(null)
        toast.success('Photo removed.')
        onRemoved?.()
      }
    })
  }

  return { preview, isPending, inputRef, openPicker, handleFile, handleInputChange, handleRemove }
}
