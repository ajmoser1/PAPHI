'use client'

import * as React from 'react'
import Link from 'next/link'
import { Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

/*
 * Form primitives shared by the auth / onboarding flow.
 *
 * Every field wires label → input → hint → error with aria-describedby and
 * aria-invalid, so screen readers hear the error and sighted users see it next
 * to the field (WCAG 3.3.1, 1.3.1). Controls are 44px tall on touch devices
 * and 40px with a pointer, which keeps them tappable for members of all ages
 * without making desktop forms feel oversized.
 */

export const CONTROL_HEIGHT = 'h-11 md:h-10'

const nativeControlClassName = cn(
  'w-full min-w-0 rounded-lg border border-input bg-transparent px-3 text-base transition-colors outline-none',
  'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
  'aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20',
  'disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
  CONTROL_HEIGHT
)

function describedBy(...ids: Array<string | undefined>) {
  const joined = ids.filter(Boolean).join(' ')
  return joined || undefined
}

type FieldShellProps = {
  id: string
  label: React.ReactNode
  hint?: React.ReactNode
  error?: string
  /** Rendered at the right end of the label row, e.g. a "Forgot password?" link. */
  labelEnd?: React.ReactNode
  children: (a11y: { 'aria-invalid'?: true; 'aria-describedby'?: string }) => React.ReactNode
}

/** Label + control + hint + inline error. Children receive the ARIA props to spread on the control. */
export function FieldShell({ id, label, hint, error, labelEnd, children }: FieldShellProps) {
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        {labelEnd}
      </div>
      {children({
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedBy(errorId, hintId),
      })}
      {hint && (
        <p id={hintId} className="text-xs leading-relaxed text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="flex items-start gap-1.5 text-xs font-medium text-destructive">
          <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
    </div>
  )
}

type FormFieldProps = Omit<React.ComponentProps<typeof Input>, 'id'> &
  Omit<FieldShellProps, 'children'>

export function FormField({ id, label, hint, error, labelEnd, className, ...input }: FormFieldProps) {
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} labelEnd={labelEnd}>
      {(a11y) => <Input id={id} className={cn(CONTROL_HEIGHT, 'px-3', className)} {...a11y} {...input} />}
    </FieldShell>
  )
}

/** Password input with a show/hide toggle. Paste and password managers are never blocked. */
export function PasswordField({ id, label, hint, error, labelEnd, className, ...input }: FormFieldProps) {
  const [visible, setVisible] = React.useState(false)
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} labelEnd={labelEnd}>
      {(a11y) => (
        <div className="relative">
          <Input
            id={id}
            type={visible ? 'text' : 'password'}
            className={cn(CONTROL_HEIGHT, 'px-3 pr-12', className)}
            {...a11y}
            {...input}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? 'Hide password' : 'Show password'}
            aria-pressed={visible}
            aria-controls={id}
            className={cn(
              'absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-muted-foreground',
              'hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50'
            )}
          >
            {visible ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
          </button>
        </div>
      )}
    </FieldShell>
  )
}

type NativeSelectProps = React.ComponentProps<'select'> & Omit<FieldShellProps, 'children' | 'id'> & { id: string }

/** Native <select> styled to match Input. Native is deliberate: it gets the platform picker on phones. */
export function SelectField({ id, label, hint, error, labelEnd, className, children, ...select }: NativeSelectProps) {
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} labelEnd={labelEnd}>
      {(a11y) => (
        <select id={id} className={cn(nativeControlClassName, className)} {...a11y} {...select}>
          {children}
        </select>
      )}
    </FieldShell>
  )
}

type FormAlertProps = {
  /** Server-level message (not tied to one field). */
  message?: string
  /** Field errors from the action, keyed by field name. */
  errors?: Record<string, string[] | undefined>
  /** Human labels for field keys, used in the summary links. */
  fieldLabels?: Record<string, string>
  /** Render the message as a success/next-step notice instead of an error. */
  success?: boolean
  /** Optional recovery action rendered under the message (resend link, sign in, etc.). */
  action?: React.ReactNode
  className?: string
}

/**
 * Focusable error summary / status notice. After a failed submit the container
 * takes focus, which also scrolls it into view on a phone where the submit
 * button may be a screen below the first error. Each item links to its field.
 */
export function FormAlert({ message, errors, fieldLabels = {}, success, action, className }: FormAlertProps) {
  const ref = React.useRef<HTMLDivElement>(null)
  const entries = Object.entries(errors ?? {}).filter(([, v]) => v && v.length > 0) as Array<[string, string[]]>
  const hasContent = Boolean(message) || entries.length > 0

  React.useEffect(() => {
    if (hasContent) ref.current?.focus({ preventScroll: false })
  }, [hasContent, message, errors])

  if (!hasContent) return null

  const Icon = success ? CheckCircle2 : AlertCircle

  return (
    <div
      ref={ref}
      tabIndex={-1}
      role={success ? 'status' : 'alert'}
      className={cn(
        'rounded-lg border p-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
        success
          ? 'border-primary/30 bg-primary/5 text-primary'
          : 'border-destructive/30 bg-destructive/5 text-destructive',
        className
      )}
    >
      <div className="flex items-start gap-2">
        <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <div className="min-w-0 flex-1 space-y-1">
          {message && <p className="font-medium leading-snug">{message}</p>}
          {entries.length > 0 && (
            <>
              {!message && (
                <p className="font-medium leading-snug">
                  {entries.length === 1 ? 'One thing needs fixing:' : `${entries.length} things need fixing:`}
                </p>
              )}
              <ul className="list-disc space-y-0.5 pl-4">
                {entries.map(([key, msgs]) => (
                  <li key={key}>
                    <Link href={`#${key}`} className="underline underline-offset-2">
                      {fieldLabels[key] ?? key}
                    </Link>
                    : {msgs[0]}
                  </li>
                ))}
              </ul>
            </>
          )}
          {action && <div className="pt-1">{action}</div>}
        </div>
      </div>
    </div>
  )
}
