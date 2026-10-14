'use client'

import { useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Camera, Upload } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AVATAR_ACCEPT, useAvatarUpload } from '@/components/profile/useAvatarUpload'
import { cn } from '@/lib/utils'

/**
 * Blocks the app until the member adds a profile photo. The upload happens
 * inside the dialog so nobody has to hunt for the setting. The dialog does not
 * open on Profile or Settings, and links there for anyone who prefers that page.
 */
export function PhotoRequiredDialog({ initials }: { initials: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const [dragging, setDragging] = useState(false)
  const cameraRef = useRef<HTMLInputElement>(null)
  const onAllowedPage = pathname === '/profile/edit' || pathname.startsWith('/settings')

  const { preview, isPending, inputRef, openPicker, handleFile, handleInputChange } = useAvatarUpload({
    initialUrl: null,
    onUploaded: () => router.refresh(),
  })

  return (
    <Dialog open={!onAllowedPage} onOpenChange={() => {}}>
      <DialogContent showCloseButton={false} role="alertdialog" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="heading-3">Add a profile photo</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-foreground/80">
            Brothers recognize faces. Every member has a photo, so add yours to keep using Chapter Connect.
            You can change it any time from your profile.
          </DialogDescription>
        </DialogHeader>

        <input
          ref={inputRef}
          type="file"
          accept={AVATAR_ACCEPT}
          className="hidden"
          onChange={handleInputChange}
          aria-label="Choose a profile photo"
        />
        <input
          ref={cameraRef}
          type="file"
          accept={AVATAR_ACCEPT}
          capture="user"
          className="hidden"
          onChange={handleInputChange}
          aria-label="Take a profile photo"
        />

        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            handleFile(e.dataTransfer.files?.[0])
          }}
          className={cn(
            'flex flex-col items-center gap-4 rounded-xl border-2 border-dashed p-6 text-center transition-colors duration-fast',
            dragging ? 'border-primary bg-primary-soft' : 'border-border bg-muted/40'
          )}
        >
          <Avatar className="size-28">
            {preview && <AvatarImage src={preview} alt="" />}
            <AvatarFallback className="bg-primary-soft text-3xl font-semibold text-primary">{initials}</AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <p className="text-sm font-medium">{isPending ? 'Uploading…' : 'Drop a photo here'}</p>
            <p className="text-xs text-muted-foreground">JPG, PNG, or WebP, up to 5MB.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <Button type="button" disabled={isPending} onClick={openPicker}>
              <Upload data-icon="inline-start" aria-hidden="true" />
              Choose photo
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              className="sm:hidden"
              onClick={() => cameraRef.current?.click()}
            >
              <Camera data-icon="inline-start" aria-hidden="true" />
              Take photo
            </Button>
          </div>
        </div>
        <p className="text-center text-xs text-muted-foreground">
          Prefer to do it from your profile?{' '}
          <Link href="/profile/edit#photo" className="font-medium text-primary underline-offset-4 hover:underline">
            Open my profile
          </Link>
        </p>
      </DialogContent>
    </Dialog>
  )
}
