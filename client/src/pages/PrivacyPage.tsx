import { LegalPageLayout, type LegalSection } from "@/components/legal/LegalPageLayout";
import { buildPageTitle, usePageMetadata } from "@/lib/seo";

/**
 * PrivacyPage — the Privacy Policy for the SCS platform.
 *
 * Grounded in how the platform actually handles data: account records and
 * content in MongoDB, HTTP-only session cookies (no ad/tracking cookies),
 * uploads on Cloudflare R2, hosting on Vercel, privacy-enhanced YouTube
 * embeds, and a rate-limited contact form. Kept in plain language for a
 * student community.
 */

const UPDATED = "September 28, 2026";

const SECTIONS: LegalSection[] = [
  {
    id: "overview",
    heading: "Overview",
    body: (
      <>
        <p>
          This Privacy Policy explains what data the <strong>Society of Computer Science (SCS)</strong>{" "}
          platform collects, why we collect it, and what happens to it. It applies to this
          website and every community feature on it — accounts, the community feed, blog,
          events, gallery, watch, and the contact form.
        </p>
        <p>
          The short version: <strong>we collect the minimum we need to run a student society
          website, we do not run ads or trackers, and we do not sell your data</strong> — ever.
          Everything else on this page is the detail behind that promise.
        </p>
      </>
    ),
  },
  {
    id: "data-we-collect",
    heading: "Data we collect",
    body: (
      <>
        <p>What we collect depends on how you use the platform:</p>
        <ul>
          <li>
            <strong>Account data</strong> — when you sign up: your name, username, email
            address, and password. Passwords are never stored in readable form; they are
            verified using a modern password-hashing algorithm. Your society role (member,
            moderator, or admin) is stored with your account.
          </li>
          <li>
            <strong>Content you create</strong> — feed posts you publish, comments you write,
            and the likes you leave. Comments and posts store your name and username so the
            community can see who wrote what.
          </li>
          <li>
            <strong>Contact messages</strong> — if you use the contact form: your name, email
            address, subject, and message. These go to the society team only.
          </li>
          <li>
            <strong>Basic technical data</strong> — like every website, our hosting provider
            (Vercel) processes standard request information (for example IP address and browser
            type) to serve pages and protect the service. The contact form is rate-limited per
            IP address to stop spam floods; that counter lives only in temporary server memory.
          </li>
        </ul>
        <p>
          We do <strong>not</strong> use advertising networks, cross-site trackers, or
          third-party analytics on the platform. Browsing published pages requires no account
          and leaves no profile with us.
        </p>
      </>
    ),
  },
  {
    id: "how-we-use",
    heading: "How we use your data",
    body: (
      <>
        <p>We use the data above only to:</p>
        <ul>
          <li>Create and maintain your account and keep it secure.</li>
          <li>
            Show community activity — your posts, comments, and likes — to other members and
            visitors, as the platform is designed to do.
          </li>
          <li>Deliver the platform&rsquo;s features and keep them working and fast.</li>
          <li>
            Read and respond to contact-form messages, event questions, and article pitches.
          </li>
          <li>
            Protect the community: moderating content, preventing spam and abuse, and enforcing
            our <a href="/terms">Terms of Service</a>.
          </li>
          <li>
            Send occasional society notices about your account or platform changes — we keep
            these rare and relevant.
          </li>
        </ul>
        <p>
          We do not use your data for profiling, advertising, or any purpose that isn&rsquo;t
          listed here without telling you first.
        </p>
      </>
    ),
  },
  {
    id: "cookies",
    heading: "Cookies and sign-in sessions",
    body: (
      <>
        <p>
          The platform uses exactly <strong>one cookie</strong>: an HTTP-only session cookie
          created when you sign in. It keeps you logged in as you move between pages, cannot be
          read by scripts in your browser, and is deleted when you sign out or when the session
          expires.
        </p>
        <p>
          We set no advertising cookies, no social-media tracking pixels, and no third-party
          analytics cookies. Embedded YouTube videos load in privacy-enhanced mode, which
          avoids setting tracking cookies until you actually press play (see the next
          section).
        </p>
      </>
    ),
  },
  {
    id: "third-parties",
    heading: "Services that process data for us",
    body: (
      <>
        <p>
          A student society cannot run its own data centers, so a small number of established
          providers process data on the platform&rsquo;s behalf:
        </p>
        <ul>
          <li>
            <strong>Vercel</strong> — hosts the website and the platform&rsquo;s API. Processes
            standard request data (IP, user agent) for delivery, caching, and abuse
            protection.
          </li>
          <li>
            <strong>MongoDB Atlas</strong> — stores the platform&rsquo;s database: accounts,
            content, and contact messages.
          </li>
          <li>
            <strong>Cloudflare</strong> — stores uploaded media (such as images for events,
            albums, and videos) on Cloudflare&rsquo;s storage service (R2) and serves it to
            visitors.
          </li>
          <li>
            <strong>YouTube</strong> — videos in the watch section may be embedded in
            privacy-enhanced mode. YouTube receives standard request data when the player
            loads; if you press play, YouTube may set its own cookies under its own policies.
          </li>
          <li>
            <strong>Google Maps</strong> — event and contact pages may link to Google Maps so
            you can find campus venues. Following the link takes you to Google&rsquo;s own
            service.
          </li>
        </ul>
        <p>
          None of these providers may use platform data for their own marketing, and we do not
          share your data with any other third party.
        </p>
      </>
    ),
  },
  {
    id: "public-content",
    heading: "Public content",
    body: (
      <>
        <p>
          The platform is a community website: blog articles, events, gallery albums, videos,
          and the public feed are visible to every visitor, signed in or not. Content you post
          to the community feed, including your display name and username, is public by
          design.
        </p>
        <p>
          Please think before posting: don&rsquo;t share phone numbers, home addresses, private
          photos of others, or anything you wouldn&rsquo;t put on a department notice board.
          Public content may be quoted or reshared within the society&rsquo;s communications.
        </p>
      </>
    ),
  },
  {
    id: "retention",
    heading: "How long we keep data",
    body: (
      <>
        <ul>
          <li>
            <strong>Account data</strong> is kept while your account exists. When you ask us to
            delete your account, we remove it along with your profile information; your
            comments and posts are removed or anonymized so they no longer point to you.
          </li>
          <li>
            <strong>Content you post</strong> stays until you delete it or your account is
            closed, or until a society admin removes it for moderation reasons.
          </li>
          <li>
            <strong>Contact messages</strong> are kept only as long as needed to handle your
            request and keep a record for the society team, after which they are deleted.
          </li>
          <li>
            <strong>Technical request data</strong> processed by our hosting provider is kept
            only per that provider&rsquo;s short retention windows for security and
            reliability.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "your-rights",
    heading: "Your rights and choices",
    body: (
      <>
        <p>You are in control of your data on the platform:</p>
        <ul>
          <li>
            <strong>Access and correct</strong> — you can see and update your profile details
            from your account page at any time.
          </li>
          <li>
            <strong>Delete your content</strong> — you can delete your own posts; comments and
            likes can be removed the same way they were made.
          </li>
          <li>
            <strong>Close your account</strong> — email us at{" "}
            <a href="mailto:scs@szic.edu.pk">scs@szic.edu.pk</a> or send a message through the
            contact page and we will delete your account as described above.
          </li>
          <li>
            <strong>Ask questions</strong> — you can ask us what data we hold about you and how
            it has been used. We will answer honestly and promptly.
          </li>
        </ul>
        <p>
          Society admins can always see and moderate public content — that is their job — but
          they do not have access to your password (nobody does, not even us).
        </p>
      </>
    ),
  },
  {
    id: "security",
    heading: "How we protect your data",
    body: (
      <>
        <ul>
          <li>
            All traffic between your browser and the platform runs over encrypted HTTPS
            connections.
          </li>
          <li>Passwords are stored only as salted, modern password hashes.</li>
          <li>
            Sign-in sessions use HTTP-only cookies that scripts cannot read, and every
            account action is checked server-side against your session.
          </li>
          <li>
            Only the society&rsquo;s designated admins can publish or moderate content, and
            their actions are recorded in an internal audit log.
          </li>
          <li>
            Uploaded media passes server-side checks (file type and size) before it is ever
            stored or served.
          </li>
        </ul>
        <p>
          No system is perfect, but we design for least data, least access — and we will tell
          you promptly if anything ever goes wrong that affects you.
        </p>
      </>
    ),
  },
  {
    id: "children",
    heading: "Eligibility",
    body: (
      <>
        <p>
          The platform is built for university students, alumni, and the SZIC community. It is
          not directed at children, and we do not knowingly collect data from anyone under 13.
          If you believe a minor has created an account, contact us and we will remove it.
        </p>
      </>
    ),
  },
  {
    id: "changes",
    heading: "Changes to this policy",
    body: (
      <>
        <p>
          As the platform gains features, this policy will be updated to describe them. The
          current version always lives on this page with its &ldquo;last updated&rdquo; date,
          and significant changes will be announced on the platform.
        </p>
      </>
    ),
  },
  {
    id: "contact",
    heading: "Contact us",
    body: (
      <>
        <p>
          Privacy questions, data requests, and account deletion requests go to{" "}
          <a href="mailto:scs@szic.edu.pk">scs@szic.edu.pk</a> or the platform&rsquo;s contact
          page. You can also find us in person at SZIC, University of Peshawar, Peshawar,
          Khyber Pakhtunkhwa.
        </p>
      </>
    ),
  },
];

export default function PrivacyPage() {
  usePageMetadata({
    title: buildPageTitle("Privacy Policy"),
    description:
      "How the Society of Computer Science platform collects, uses, and protects your data — accounts, content, sessions, and the services that help us run the site.",
  });

  return (
    <LegalPageLayout
      eyebrow="Legal"
      title={
        <>
          Privacy{" "}
          <span className="bg-gradient-to-r from-gold-300 via-gold-400 to-gold-500 bg-clip-text text-transparent">
            Policy
          </span>
        </>
      }
      description="What the Society of Computer Science platform collects, why, and what we do — and never do — with it. Written to be read, not skimmed past."
      updated={UPDATED}
      intro={
        <>
          <p>
            Your privacy matters to us. This policy describes, in plain language, every kind of
            data the platform handles — from your account and posts to the contact form — and
            the small set of trusted services that help us run the site.
          </p>
          <p>
            The one-paragraph summary: <strong>minimal data, no trackers, no ads, no selling
            your information</strong> — just what a student society needs to keep the community
            running.
          </p>
        </>
      }
      sections={SECTIONS}
    />
  );
}
