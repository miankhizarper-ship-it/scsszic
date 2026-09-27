import { LegalPageLayout, type LegalSection } from "@/components/legal/LegalPageLayout";
import { buildPageTitle, usePageMetadata } from "@/lib/seo";

/**
 * TermsPage — the Terms of Service for the SCS platform.
 *
 * Written for a student society context: plain language, grounded in how
 * the platform actually works (accounts, community feed, likes/comments,
 * admin-managed content, contact form). The university's own policies and
 * code of conduct sit above this document.
 */

const UPDATED = "September 28, 2026";

const SECTIONS: LegalSection[] = [
  {
    id: "about",
    heading: "About these terms",
    body: (
      <>
        <p>
          These Terms of Service (&ldquo;terms&rdquo;) explain the rules that apply when you use
          the Society of Computer Science platform — this website and any community features it
          offers, including the community feed, blog, events, gallery, and watch sections
          (together, the &ldquo;platform&rdquo;).
        </p>
        <p>
          By creating an account, posting, commenting, liking, or otherwise using the platform,
          you agree to these terms. If you do not agree with them, please stop using the
          platform and contact us — we will help you close your account.
        </p>
        <p>
          These terms are written by a student society, for students. We have kept them as short
          and plain as we can, but they are still a binding agreement between you and the
          society, so please read them.
        </p>
      </>
    ),
  },
  {
    id: "who-we-are",
    heading: "Who we are",
    body: (
      <>
        <p>
          The platform is operated by the <strong>Society of Computer Science (SCS)</strong>, the
          student computer science society of the Shaikh Zayed Islamic Centre (SZIC), University
          of Peshawar, Peshawar, Khyber Pakhtunkhwa, Pakistan.
        </p>
        <p>
          SCS is a student-run organization. The platform is maintained by the society&rsquo;s
          student team with support from designated society administrators (&ldquo;admins&rdquo;)
          who manage published content and member accounts.
        </p>
        <p>
          As a university society, our activities are also guided by the rules and policies of
          SZIC and the University of Peshawar. Where these terms are silent, those policies
          apply to your conduct on the platform.
        </p>
      </>
    ),
  },
  {
    id: "accounts",
    heading: "Accounts and membership",
    body: (
      <>
        <p>
          Some parts of the platform — liking feed posts, joining discussions, and receiving
          member features — require an account. Anyone can browse published content without
          one.
        </p>
        <p>When you create an account, you agree to:</p>
        <ul>
          <li>
            <strong>Give accurate information.</strong> Use your real name (or a name the
            society recognizes you by) and an email address you actually control.
          </li>
          <li>
            <strong>Keep your credentials safe.</strong> You are responsible for activity that
            happens under your account. Use a strong password and never share it.
          </li>
          <li>
            <strong>One person, one account.</strong> Do not create duplicate accounts, accounts
            for other people, or accounts with misleading identities.
          </li>
          <li>
            <strong>Be reachable.</strong> We may send account notices to your email — keep it
            current.
          </li>
        </ul>
        <p>
          You may stop using the platform at any time and ask us to delete your account (see{" "}
          <a href="#changes">Changes to these terms</a> and the contact section below). We may
          suspend or remove accounts that break these terms.
        </p>
      </>
    ),
  },
  {
    id: "your-content",
    heading: "Your content",
    body: (
      <>
        <p>
          &ldquo;Your content&rdquo; means anything you submit to the platform: feed posts,
          comments, likes, replies, and anything similar the society adds over time.
        </p>
        <p>
          <strong>You keep ownership</strong> of the content you write. We claim no copyright
          over your words, images, or ideas.
        </p>
        <p>
          However, by posting content to the platform you <strong>give the society a
          non-exclusive, royalty-free license</strong> to store, display, and share that content
          on the platform and in the society&rsquo;s communications (for example, quoting a
          community discussion in an event recap). This license exists only so the platform can
          function; it ends when your content is deleted from the platform.
        </p>
        <p>
          You are responsible for the content you submit. Make sure you have the right to share
          it — do not post other people&rsquo;s work, private photos, or personal data without
          permission.
        </p>
      </>
    ),
  },
  {
    id: "community-rules",
    heading: "Community rules",
    body: (
      <>
        <p>
          The platform exists for learning, sharing, and building together. To keep it safe and
          useful for everyone, you agree <strong>not</strong> to:
        </p>
        <ul>
          <li>Harass, threaten, bully, or demean other members or any person or group.</li>
          <li>Post hateful, violent, sexually explicit, or otherwise harmful material.</li>
          <li>
            Impersonate others, misrepresent your affiliation with the society or the
            university, or post under a false identity.
          </li>
          <li>
            Post spam, scams, phishing links, unsolicited advertising, or paid promotion.
          </li>
          <li>
            Share malware, attempt to break the platform&rsquo;s security, probe for
            vulnerabilities without permission, or disrupt the service for others.
          </li>
          <li>
            Scrape or harvest the platform in bulk, or reuse member data for anything outside
            the society.
          </li>
          <li>Use the platform for anything illegal under Pakistani law or university policy.</li>
        </ul>
        <p>
          Society admins may review, edit, move, or remove content, and may suspend or ban
          accounts, when these rules are broken — with or without prior notice where the
          situation requires it.
        </p>
      </>
    ),
  },
  {
    id: "published-content",
    heading: "Content we publish",
    body: (
      <>
        <p>
          Articles in the blog, event pages, gallery albums, videos in the watch section, and
          alumni profiles are published by the society through its admin team. We work to keep
          published content accurate and appropriate, but it is provided for informational and
          community purposes only.
        </p>
        <p>
          Tutorial articles, career advice, and opinions published on the blog reflect the views
          of their authors — not necessarily an official position of the society or the
          university. Technical content is not a substitute for formal coursework or
          professional advice.
        </p>
        <p>
          Event details (dates, venues, schedules, registration) can change. The event page or
          the society&rsquo;s official announcements are the authoritative source on the day.
        </p>
      </>
    ),
  },
  {
    id: "external",
    heading: "External services and embeds",
    body: (
      <>
        <p>
          The platform links to and embeds third-party services to bring content to you — for
          example, videos hosted on YouTube (embedded in privacy-enhanced mode), location links
          to Google Maps, and profile images or media stored on Cloudflare&rsquo;s storage
          network. The platform itself runs on Vercel, with its data stored in MongoDB&rsquo;s
          cloud database service.
        </p>
        <p>
          When you interact with an embedded video or follow a link to another service, that
          provider handles your data under <strong>its own</strong> privacy policy and terms.
          We do not control third-party services and are not responsible for their content or
          practices. See our <a href="/privacy">Privacy Policy</a> for details on what each
          service may receive.
        </p>
      </>
    ),
  },
  {
    id: "availability",
    heading: "Availability and changes",
    body: (
      <>
        <p>
          We work to keep the platform available and quick, but it is a student-run service. It
          is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis, without
          promises of uninterrupted uptime. Maintenance, deployments, third-party outages, and
          university schedules can interrupt it.
        </p>
        <p>
          The society is continuously improving the platform. We may add, change, or retire
          features at any time to serve the community better.
        </p>
      </>
    ),
  },
  {
    id: "moderation",
    heading: "Moderation and removal",
    body: (
      <>
        <p>
          Society admins moderate the platform. We may edit or remove content, and suspend or
          terminate accounts, if we reasonably believe a user has broken these terms, abused
          the community, or created risk for members or the university.
        </p>
        <p>
          Where practical we will tell you why action was taken, and you can always write to us
          to ask for a review. We do not sell member data or hand it to third parties beyond the
          services described in our <a href="/privacy">Privacy Policy</a>.
        </p>
      </>
    ),
  },
  {
    id: "disclaimers",
    heading: "Disclaimers",
    body: (
      <>
        <p>
          To the fullest extent permitted by law, the platform — including all content,
          features, and community posts — is provided without warranties of any kind, whether
          express or implied, including any implied warranties of merchantability, fitness for a
          particular purpose, and non-infringement.
        </p>
        <p>
          The society does not warrant that the platform will be error-free or secure, that
          defects will be corrected, or that content will always be complete or up to date.
        </p>
      </>
    ),
  },
  {
    id: "liability",
    heading: "Limits on liability",
    body: (
      <>
        <p>
          To the fullest extent permitted by law, the Society of Computer Science, its student
          officers, and its administrators will not be liable for any indirect, incidental,
          special, consequential, or punitive damages — including lost data, lost opportunities,
          or personal inconvenience — arising from your use of, or inability to use, the
          platform.
        </p>
        <p>
          Where liability cannot be excluded, it is limited to the smallest amount permitted by
          law. Nothing in these terms excludes liability that cannot be excluded under
          applicable law.
        </p>
      </>
    ),
  },
  {
    id: "changes",
    heading: "Changes to these terms",
    body: (
      <>
        <p>
          We may update these terms as the platform and the society evolve. The current version
          is always published on this page with a &ldquo;last updated&rdquo; date at the top.
        </p>
        <p>
          For significant changes that affect your rights, we will also announce them on the
          platform (for example, a notice in the community feed). Continuing to use the platform
          after an update means you accept the revised terms; if you disagree, contact us and we
          will close your account.
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
          Questions about these terms, your account, or reported content can be sent to{" "}
          <a href="mailto:scs@szic.edu.pk">scs@szic.edu.pk</a> or submitted through the
          platform&rsquo;s contact page. You can also find the society at SZIC, University of
          Peshawar, Peshawar, Khyber Pakhtunkhwa.
        </p>
        <p>
          We are students running this alongside our studies — thank you for your patience, and
          for being part of the community.
        </p>
      </>
    ),
  },
];

export default function TermsPage() {
  usePageMetadata({
    title: buildPageTitle("Terms of Service"),
    description:
      "The Terms of Service for the Society of Computer Science platform — accounts, community rules, your content, moderation, and liability, in plain language.",
  });

  return (
    <LegalPageLayout
      eyebrow="Legal"
      title={
        <>
          Terms of{" "}
          <span className="bg-gradient-to-r from-gold-300 via-gold-400 to-gold-500 bg-clip-text text-transparent">
            Service
          </span>
        </>
      }
      description="The agreement between you and the Society of Computer Science for using this platform — what you can expect from us, and what we expect from our members."
      updated={UPDATED}
      intro={
        <>
          <p>
            Welcome to the Society of Computer Science platform. These terms set out the ground
            rules for using the site: how accounts work, what happens to the content you post,
            and how the community is kept a safe and useful place for everyone at SZIC.
          </p>
          <p>
            They are deliberately written in plain language. If anything is unclear, the
            <strong> contact section</strong> at the end tells you how to reach a human.
          </p>
        </>
      }
      sections={SECTIONS}
    />
  );
}
