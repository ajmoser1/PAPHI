'use client'

import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { SelectField } from '@/components/ui/form-field'

export type ChapterOption = { id: string; name: string; school_name: string | null }
export type Inviter = { first_name: string; last_name: string }

/** One sentence under the card title that says who invited you, or what happens next. */
export function describeInvite(
  inviteChapter: ChapterOption | null,
  inviter: Inviter | null,
  fallback: string
): string {
  if (inviteChapter && inviter) {
    const name = `${inviter.first_name} ${inviter.last_name}`.trim()
    return inviteChapter.school_name
      ? `${name} invited you to ${inviteChapter.name} at ${inviteChapter.school_name}.`
      : `${name} invited you to ${inviteChapter.name}.`
  }
  if (inviteChapter) {
    return inviteChapter.school_name
      ? `You've been invited to join ${inviteChapter.name} at ${inviteChapter.school_name}.`
      : `You've been invited to join ${inviteChapter.name}.`
  }
  return fallback
}

export function chapterLabel(ch: ChapterOption): string {
  return ch.school_name ? `${ch.name}, ${ch.school_name}` : ch.name
}

/** Shown at the top of the card when the URL carried an invite token that did not resolve. */
export function BrokenInviteNotice() {
  return (
    <div
      role="status"
      className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <p>
        That invite link has expired or isn&apos;t valid any more. Pick your chapter below, or ask
        whoever invited you for a fresh link.
      </p>
    </div>
  )
}

const ROLE_OPTIONS = [
  { value: 'undergrad', label: 'Current undergrad', hint: 'Still in school' },
  { value: 'alumni', label: 'Graduated', hint: 'Alumni of the chapter' },
] as const

type MembershipFieldsProps = {
  chapters: ChapterOption[]
  /** A token that resolved to an active chapter, or '' when there is none. */
  inviteToken: string
  errors?: Record<string, string[] | undefined>
  defaults?: { chapterId?: string; role?: string }
}

/**
 * Chapter + role fields shared by Register and Complete-signup so both forms
 * behave identically. Chapter is hidden when a valid invite link already
 * decided it; role is a real fieldset so the group has a programmatic name.
 * Pair with <BrokenInviteNotice /> at the top of the card when the token was bad.
 */
export function MembershipFields({
  chapters,
  inviteToken,
  errors,
  defaults,
}: MembershipFieldsProps) {
  const showChapterSelect = !inviteToken && chapters.length > 0
  const noChaptersAvailable = !inviteToken && chapters.length === 0

  return (
    <>
      {inviteToken && <input type="hidden" name="inviteToken" value={inviteToken} />}

      {showChapterSelect && (
        <SelectField
          id="chapterId"
          name="chapterId"
          label="Chapter"
          required
          defaultValue={defaults?.chapterId ?? ''}
          error={errors?.chapterId?.[0]}
          hint={
            <>
              Don&apos;t see yours?{' '}
              <Link href="/start-chapter" className="underline underline-offset-4 hover:text-primary">
                Request to start it
              </Link>
              .
            </>
          }
        >
          <option value="">Select your chapter</option>
          {chapters.map((ch) => (
            <option key={ch.id} value={ch.id}>
              {chapterLabel(ch)}
            </option>
          ))}
        </SelectField>
      )}

      {noChaptersAvailable && (
        <div
          role="status"
          className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
        >
          <p>
            No chapters are live yet. Ask your chapter admin for an invite link, or request your
            chapter and we&apos;ll set it up.
          </p>
          <Link href="/start-chapter" className="inline-block font-medium underline underline-offset-4">
            Request to start your chapter
          </Link>
        </div>
      )}

      <fieldset
        className="space-y-2"
        aria-invalid={errors?.role ? true : undefined}
        aria-describedby={errors?.role ? 'role-error' : undefined}
      >
        <legend className="text-sm font-medium leading-none">I am a…</legend>
        <div className="grid grid-cols-2 gap-3 pt-1">
          {ROLE_OPTIONS.map(({ value, label, hint }) => (
            <label
              key={value}
              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50"
            >
              <input
                type="radio"
                name="role"
                value={value}
                defaultChecked={defaults?.role === value}
                className="size-4 shrink-0 accent-primary"
                required
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium leading-tight">{label}</span>
                <span className="block text-xs text-muted-foreground">{hint}</span>
              </span>
            </label>
          ))}
        </div>
        {errors?.role && (
          <p id="role-error" className="text-xs font-medium text-destructive">
            {errors.role[0]}
          </p>
        )}
      </fieldset>
    </>
  )
}
