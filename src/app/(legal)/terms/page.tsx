import type { Metadata } from 'next'
import Link from 'next/link'
import { LEGAL, formatEffectiveDate } from '@/lib/legal'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'The rules for using Chapter Connect.',
}

export default function TermsPage() {
  const contact = <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>

  return (
    <>
      <h1>Terms of Service</h1>
      <p className="legal-meta">Effective {formatEffectiveDate(LEGAL.effectiveDate)}</p>

      <div className="legal-summary">
        <p>
          <strong>The short version.</strong> Chapter Connect exists so brothers can find each other
          for referrals, mentorship, and opportunities. Be who you say you are, treat other members’
          contact details as a courtesy rather than a mailing list, and respect your chapter admins’
          decisions. We provide the Service as is, and we may suspend accounts that break these rules.
        </p>
      </div>

      <h2>1. Agreement</h2>
      <p>
        These Terms are an agreement between you and {LEGAL.operatorName} (“we”, “us”) about your use of
        the Chapter Connect website and service (the “Service”). By creating an account or using the
        Service you agree to them and to our <Link href="/privacy">Privacy Policy</Link>.
      </p>

      <h2>2. Who may use the Service</h2>
      <ul>
        <li>
          The Service is for current and former members of participating fraternity chapters. Each new
          account is reviewed by a chapter admin before it is approved.
        </li>
        <li>You must provide accurate information about yourself, including your real name and chapter.</li>
        <li>
          You must be old enough to form a binding agreement where you live, and in any case at least
          16.
        </li>
      </ul>

      <h2>3. Your account</h2>
      <ul>
        <li>
          You are responsible for keeping your password confidential and for activity on your account.
          We may reject passwords that appear in known data breaches.
        </li>
        <li>Tell us promptly at {contact} if you suspect unauthorized use.</li>
        <li>One account per person. Do not share accounts or create accounts for others.</li>
      </ul>

      <h2>4. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Misrepresent your identity, chapter, membership status, or work history.</li>
        <li>
          Use other members’ contact details for marketing, recruiting into unrelated schemes, bulk
          messaging, or any purpose other than genuine personal or professional networking.
        </li>
        <li>Harass, threaten, or discriminate against anyone.</li>
        <li>Copy, scrape, or export the member directory, or share members’ information outside the Service without their permission.</li>
        <li>Upload content you do not have the right to share, or content that is unlawful or offensive.</li>
        <li>Attempt to bypass approval, privacy settings, or other security measures.</li>
      </ul>

      <h2>5. Your content</h2>
      <p>
        You keep ownership of what you post, including your photo, bio, and work history. You give us a
        limited license to store, display, and share that content with other members as described in
        the Privacy Policy and your settings, so the Service can do what it is for. You can edit or
        remove your content at any time.
      </p>

      <h2>6. Chapter admins and the platform</h2>
      <ul>
        <li>
          Chapter admins may approve, decline, or suspend accounts in their chapter at their
          discretion, and may contact you to verify your identity.
        </li>
        <li>
          We may remove content or suspend accounts that violate these Terms or put other members at
          risk, and we may change or discontinue features of the Service.
        </li>
      </ul>

      <h2>7. Third-party services</h2>
      <p>
        The Service uses third-party providers for hosting, sign-in, and optional features such as
        LinkedIn PDF import. Those providers’ terms apply to their services. Google sign-in is governed
        by Google’s terms, and you can revoke access from your Google account at any time.
      </p>

      <h2>8. Disclaimers</h2>
      <p>
        The Service is provided “as is” and “as available”, without warranties of any kind. We do not
        verify members’ work histories or guarantee the accuracy of profile information, the outcome of
        any introduction, or that the Service will be uninterrupted or error-free.
      </p>

      <h2>9. Limitation of liability</h2>
      <p>
        To the fullest extent permitted by law, we are not liable for indirect, incidental, special, or
        consequential damages, or for any loss of opportunity, data, or goodwill, arising from your use
        of the Service or your interactions with other members. Our total liability for any claim is
        limited to the greater of the amount you paid us in the past twelve months, which is currently
        nothing, and one hundred US dollars.
      </p>

      <h2>10. Ending your use</h2>
      <p>
        You may stop using the Service or ask us to delete your account at any time by emailing{' '}
        {contact}. We may suspend or terminate accounts that violate these Terms. Sections 5, 8, 9, and
        11 survive termination.
      </p>

      <h2>11. Governing law</h2>
      <p>
        These Terms are governed by the laws of {LEGAL.governingLaw}, without regard to conflict of law
        rules.
      </p>

      <h2>12. Changes</h2>
      <p>
        We may update these Terms. If the changes are material we will update the effective date above
        and, where appropriate, notify members through the Service or by email. Continuing to use the
        Service after a change means you accept the new Terms.
      </p>

      <h2>13. Contact</h2>
      <p>Email {contact}.</p>
    </>
  )
}
