import type { Metadata } from 'next'
import Link from 'next/link'
import { LEGAL, formatEffectiveDate } from '@/lib/legal'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How Chapter Connect collects, uses, and protects member information.',
}

export default function PrivacyPolicyPage() {
  const contact = <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>

  return (
    <>
      <h1>Privacy Policy</h1>
      <p className="legal-meta">Effective {formatEffectiveDate(LEGAL.effectiveDate)}</p>

      <div className="legal-summary">
        <p>
          <strong>The short version.</strong> Chapter Connect is a private directory for members of
          participating fraternity chapters. We collect what is needed to show you to other approved
          brothers and to let chapter admins confirm you are who you say you are. We do not sell your
          information, we do not show ads, and you control which contact details other members can see.
        </p>
      </div>

      <h2>Who we are</h2>
      <p>
        {LEGAL.operatorName} (“we”, “us”) operates the Chapter Connect website and service (the
        “Service”). If you have questions about this policy or your information, email {contact}.
      </p>

      <h2>Information we collect</h2>
      <h3>Information you give us</h3>
      <ul>
        <li>
          <strong>Account details:</strong> your name, email address, and a password. If you sign in
          with Google, we receive your name, email address, and Google profile picture from Google
          instead of a password.
        </li>
        <li>
          <strong>Membership details:</strong> your chapter, whether you are a current undergraduate or
          a graduate, and your graduation year.
        </li>
        <li>
          <strong>Phone number:</strong> required at signup. Chapter admins use it to verify your
          identity before approving your account. You choose whether other members can see it.
        </li>
        <li>
          <strong>Profile content:</strong> a photo, a short bio, your work history (job titles,
          employers, career fields, and years), and optionally a LinkedIn URL.
        </li>
        <li>
          <strong>Messages:</strong> messages you send to other members through the Service.
        </li>
        <li>
          <strong>Chapter requests:</strong> if you ask us to add a chapter, the chapter and school
          names and your contact details.
        </li>
      </ul>

      <h3>Information collected automatically</h3>
      <ul>
        <li>
          <strong>Session cookies</strong> that keep you signed in. These are strictly necessary for
          the Service to work.
        </li>
        <li>
          <strong>Usage and performance data</strong> through Vercel Analytics and Vercel Speed
          Insights: page views, approximate location at the country or region level, device and browser
          type, and page load timings. These tools do not use cross-site tracking cookies and do not
          build advertising profiles.
        </li>
        <li>
          <strong>Server logs</strong> such as IP address, request time, and the page requested, kept
          briefly for security and troubleshooting.
        </li>
      </ul>

      <h3>Optional LinkedIn PDF import</h3>
      <p>
        You can upload a PDF export of your LinkedIn profile to fill in your work history faster. When
        you do, the PDF is sent to Anthropic’s API, which extracts job titles, employers, and dates and
        returns them to you to review before anything is saved. We do not store the PDF itself.
        Anthropic processes it under its commercial API terms, which do not permit using the content to
        train its models. If you prefer not to use this, enter your work history by hand.
      </p>

      <h2>How we use information</h2>
      <ul>
        <li>To create and secure your account and keep you signed in.</li>
        <li>To let chapter admins review and approve new members.</li>
        <li>To show your profile to other approved members, subject to your privacy settings.</li>
        <li>To deliver messages between members.</li>
        <li>To understand how the Service is used and keep it fast and reliable.</li>
        <li>To respond when you contact us.</li>
      </ul>
      <p>We do not sell personal information and we do not use it for advertising.</p>

      <h2>Who can see your information</h2>
      <ul>
        <li>
          <strong>Other approved members.</strong> Your name, photo, chapter, class year, bio, and work
          history are visible to approved members, either within your chapter or across the fraternity
          depending on your settings. Your email, phone, and LinkedIn are shown only if you turn their
          visibility on. The Service requires at least one visible contact method so brothers can reach
          you.
        </li>
        <li>
          <strong>Pending members</strong> who have not yet been approved cannot see other members’
          profiles or contact details.
        </li>
        <li>
          <strong>Chapter admins</strong> for your chapter can see your phone number and signup details
          in order to verify and approve you, and can suspend accounts.
        </li>
        <li>
          <strong>Platform administrators</strong> who operate the Service can access data as needed
          to run it, support users, and investigate abuse.
        </li>
      </ul>

      <h2>Service providers</h2>
      <p>We rely on a small number of providers to run the Service. Each receives only what it needs:</p>
      <ul>
        <li>
          <strong>Supabase</strong> hosts our database, authentication, and file storage (including
          profile photos).
        </li>
        <li>
          <strong>Vercel</strong> hosts the website and provides the analytics and performance tools
          described above.
        </li>
        <li>
          <strong>Google</strong> provides optional sign-in. Our use of information received from Google
          APIs follows the{' '}
          <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer">
            Google API Services User Data Policy
          </a>
          , including its Limited Use requirements.
        </li>
        <li>
          <strong>Anthropic</strong> processes LinkedIn PDFs only when you choose the import feature.
        </li>
      </ul>
      <p>
        We may also disclose information if required by law, or to protect the rights, safety, or
        property of our members or the Service.
      </p>

      <h2>Your choices and rights</h2>
      <ul>
        <li>
          <strong>Edit</strong> your profile and contact details at any time from your Profile page.
        </li>
        <li>
          <strong>Control visibility</strong> of your contact details and who can see your profile from
          Settings.
        </li>
        <li>
          <strong>Google access:</strong> you can revoke Chapter Connect’s access from your{' '}
          <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer">
            Google Account permissions
          </a>{' '}
          at any time.
        </li>
        <li>
          <strong>Delete your account:</strong> email {contact} and we will remove your profile,
          contact details, and photo. Messages you sent may remain visible to their recipients.
        </li>
        <li>
          <strong>Access or correct</strong> the information we hold about you by contacting us.
        </li>
      </ul>

      <h2>Data retention</h2>
      <p>
        We keep your information for as long as your account is active. If your account is deleted or
        your membership request is declined, we remove profile and contact data within a reasonable
        period, except where we need to keep limited records for security or legal reasons. Server logs
        and analytics data are kept for a short, rolling window.
      </p>

      <h2>Security</h2>
      <p>
        Data is encrypted in transit, access to member data is enforced at the database level, and only
        approved members can view other members. No system is perfectly secure, so please use a strong
        password and tell us right away if you believe your account has been accessed without
        permission.
      </p>

      <h2>Children</h2>
      <p>
        The Service is for current and former members of participating college fraternity chapters. It
        is not directed to children under 13, and we do not knowingly collect information from them.
      </p>

      <h2>Changes to this policy</h2>
      <p>
        If we make material changes, we will update the effective date above and, where appropriate,
        notify members through the Service or by email.
      </p>

      <h2>Contact</h2>
      <p>
        Email {contact}. See also our <Link href="/terms">Terms of Service</Link>.
      </p>
    </>
  )
}
