import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";

// Brand-consistent text helpers
const H2 = "font-display text-xl md:text-2xl font-semibold text-foreground pt-8";
const P = "text-sm text-muted-foreground leading-relaxed";
const UL = "list-disc pl-5 space-y-1.5 text-sm text-muted-foreground leading-relaxed";
const A = "text-primary hover:underline";

export default function Privacy() {
  return (
    <div className="min-h-screen gradient-hero">

      {/* NAV */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16 px-4">
          <Link to="/"><Logo size="sm" /></Link>
          <Link to="/" className="text-sm text-muted-foreground hover:text-primary transition-colors">
            ← Back to home
          </Link>
        </div>
      </header>

      <main className="container px-4 max-w-3xl mx-auto py-12 space-y-4">

        <div className="space-y-2">
          <h1 className="font-display text-3xl md:text-4xl font-semibold text-foreground">
            Privacy &amp; Cookies Policy
          </h1>
          <p className="text-sm text-muted-foreground">
            Effective Date: 25th August 2025 · Last Updated: 25th August 2025
          </p>
        </div>

        <p className={P}>
          LUMA CIRCLE LTD (“Company,” “we,” “us,” or “our”) respects your privacy and is committed to
          protecting your personal data. This Privacy &amp; Cookies Policy explains how we collect, use,
          and safeguard your information in compliance with the UK GDPR, EU GDPR, and applicable data
          protection laws.
        </p>

        <h2 className={H2}>1. Data Controller</h2>
        <p className={P}>The data controller within the meaning of the GDPR is:</p>
        <p className={P}>
          LUMA CIRCLE LTD<br />
          71–75 Shelton Street<br />
          Covent Garden<br />
          London WC2H 9JQ<br />
          United Kingdom<br />
          Company No.: 16666936<br />
          Email: <a className={A} href="mailto:hello@lumacircle.co">hello@lumacircle.co</a>
        </p>

        <h2 className={H2}>2. Personal Data We Collect</h2>
        <p className={P}>We may collect and process the following personal data:</p>
        <ul className={UL}>
          <li>Contact data (name, email address, telephone number)</li>
          <li>Application and program data (information submitted via forms, surveys, or applications, including through Tally)</li>
          <li>Payment and transaction data (processed securely by third-party providers; we do not store full payment card details)</li>
          <li>Technical and usage data (IP address, browser type, operating system, referring URLs, device identifiers, pages visited, time spent — via cookies, Google Analytics, Hotjar)</li>
          <li>Marketing and communication data (email preferences, engagement with our newsletters, interactions with advertising via Brevo and Google Ads)</li>
        </ul>

        <h2 className={H2}>3. How We Collect Your Data</h2>
        <ul className={UL}>
          <li>Directly from you when you sign up, apply, or contact us</li>
          <li>Through cookies and analytics when you use our website</li>
          <li>Via integrations between tools (e.g. Tally forms connected via Zapier into Brevo)</li>
        </ul>

        <h2 className={H2}>4. Legal Bases for Processing</h2>
        <p className={P}>We process personal data only where a legal basis applies under Article 6 GDPR:</p>
        <ul className={UL}>
          <li>Consent (Art. 6(1)(a)): e.g. newsletter subscriptions, marketing cookies</li>
          <li>Contract (Art. 6(1)(b)): providing services, processing applications or purchases</li>
          <li>Legal obligation (Art. 6(1)(c)): record-keeping for tax and accounting purposes</li>
          <li>Legitimate interest (Art. 6(1)(f)): improving services, running advertising campaigns, ensuring site security</li>
        </ul>

        <h2 className={H2}>5. Purposes of Processing</h2>
        <p className={P}>Your data may be used for:</p>
        <ul className={UL}>
          <li>Processing applications and delivering services</li>
          <li>Managing program registrations and communication</li>
          <li>Sending newsletters, updates, and marketing (with consent)</li>
          <li>Running advertising campaigns (Google Ads, Brevo)</li>
          <li>Improving website performance and user experience (analytics, Hotjar)</li>
          <li>Automating business workflows (Zapier)</li>
          <li>Complying with legal obligations</li>
        </ul>

        <h2 className={H2}>6. Third-Party Processors</h2>
        <p className={P}>We may share your data with the following service providers:</p>
        <ul className={UL}>
          <li>Vercel Inc. – website hosting</li>
          <li>Supabase Inc. – database hosting and backend infrastructure</li>
          <li>Google LLC – analytics and advertising (Analytics, Ads)</li>
          <li>Brevo – email marketing and automation</li>
          <li>Hotjar Ltd. – user experience insights</li>
          <li>Tally – online forms and surveys</li>
          <li>Zapier, Inc. – workflow automation</li>
        </ul>
        <p className={P}>
          Some providers are located outside the UK/EU (e.g. US). In such cases, transfers are
          safeguarded by Standard Contractual Clauses (SCCs) or equivalent mechanisms.
        </p>

        <h2 className={H2}>7. Data Retention</h2>
        <p className={P}>We retain personal data only as long as necessary:</p>
        <ul className={UL}>
          <li>Contact data: until you unsubscribe or request deletion</li>
          <li>Application and program data: retained for service delivery, then archived or deleted after 2 years</li>
          <li>Transaction records: minimum of 6 years (legal obligation)</li>
          <li>Analytics data: 14–26 months (depending on provider settings)</li>
        </ul>

        <h2 className={H2}>8. Your Rights</h2>
        <p className={P}>Under GDPR, you have the right to:</p>
        <ul className={UL}>
          <li>Access your personal data (Art. 15)</li>
          <li>Rectify inaccurate data (Art. 16)</li>
          <li>Request deletion (“right to be forgotten”) (Art. 17)</li>
          <li>Restrict processing (Art. 18)</li>
          <li>Data portability (Art. 20)</li>
          <li>Object to processing (Art. 21)</li>
          <li>Withdraw consent at any time (Art. 7(3))</li>
        </ul>
        <p className={P}>You may also lodge a complaint with a supervisory authority:</p>
        <ul className={UL}>
          <li>
            UK: Information Commissioner’s Office (ICO) –{" "}
            <a className={A} href="https://www.ico.org.uk" target="_blank" rel="noopener noreferrer">www.ico.org.uk</a>
          </li>
          <li>
            Portugal: Comissão Nacional de Proteção de Dados (CNPD) –{" "}
            <a className={A} href="https://www.cnpd.pt" target="_blank" rel="noopener noreferrer">www.cnpd.pt</a>
          </li>
        </ul>
        <p className={P}>
          To exercise your rights, contact us at{" "}
          <a className={A} href="mailto:hello@lumacircle.co">hello@lumacircle.co</a>.
        </p>

        <h2 className={H2}>9. Cookies</h2>
        <h3 className="font-display text-base font-medium text-foreground pt-2">What Are Cookies?</h3>
        <p className={P}>
          Cookies are small text files stored on your device when you visit our website. They help us
          provide functionality, improve site performance, and deliver relevant advertising.
        </p>
        <h3 className="font-display text-base font-medium text-foreground pt-2">Types of Cookies We Use</h3>
        <ul className={UL}>
          <li>Strictly Necessary Cookies (essential for website operation; cannot be disabled)</li>
          <li>Analytics Cookies (Google Analytics, Hotjar – help us understand how visitors use the site)</li>
          <li>Marketing Cookies (Google Ads, Brevo – help us deliver relevant advertising)</li>
        </ul>
        <h3 className="font-display text-base font-medium text-foreground pt-2">Managing Cookies</h3>
        <p className={P}>
          On your first visit, you will see a cookie banner allowing you to accept or reject
          non-essential cookies. You can also manage cookies through your browser settings or withdraw
          consent at any time.
        </p>
        <p className={P}>
          For more information on cookies and how to control them, visit{" "}
          <a className={A} href="https://www.aboutcookies.org" target="_blank" rel="noopener noreferrer">www.aboutcookies.org</a>.
        </p>

        <h2 className={H2}>10. Data Security</h2>
        <p className={P}>
          We apply appropriate technical and organizational measures to safeguard personal data,
          including secure hosting, encryption, and restricted access.
        </p>

        <h2 className={H2}>11. Updates to this Policy</h2>
        <p className={P}>
          We may update this Privacy &amp; Cookies Policy from time to time. Any material changes will be
          posted on this page with an updated revision date.
        </p>

        <h2 className={H2}>Contact</h2>
        <p className={P}>
          For questions regarding this policy or your data rights, please contact us at:{" "}
          <a className={A} href="mailto:hello@lumacircle.co">hello@lumacircle.co</a>
        </p>

      </main>

      <footer className="border-t border-border/50 py-6 text-center">
        <p className="text-sm text-muted-foreground">© 2026 Luma Circle. All rights reserved.</p>
      </footer>

    </div>
  );
}
