import { Mail, MessageSquare } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { getFeedbackEmail, getFeedbackMailtoUrl } from '@/lib/feedback'

export function FeedbackCard() {
  const email = getFeedbackEmail()
  const mailto = getFeedbackMailtoUrl()

  if (!email || !mailto) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="h-4 w-4" />
          Questions or feedback
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 max-w-lg">
        <p className="text-sm text-muted-foreground">
          Found a bug, have an idea, or need help? Email us — we read every message, especially
          during launch.
        </p>
        <a href={mailto} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-2')}>
          <Mail className="h-4 w-4" />
          {email}
        </a>
      </CardContent>
    </Card>
  )
}
