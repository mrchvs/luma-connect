import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";

// Brand-consistent text helpers
const H2 = "font-display text-xl md:text-2xl font-semibold text-foreground pt-8";
const P = "text-sm text-muted-foreground leading-relaxed";
const A = "text-primary hover:underline";

export default function Legal() {
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

        <h1 className="font-display text-3xl md:text-4xl font-semibold text-foreground">
          Legal Notice
        </h1>

        <h2 className={H2}>Company Information</h2>
        <p className={P}>
          LUMA CIRCLE LTD<br />
          Company number: 16666936<br />
          Company type: Private Limited by Shares<br />
          Companies House submission number: 109-535130
        </p>

        <h2 className={H2}>Registered Office &amp; Service Address</h2>
        <p className={P}>
          71–75 Shelton Street<br />
          Covent Garden<br />
          London<br />
          WC2H 9JQ<br />
          United Kingdom
        </p>

        <h2 className={H2}>Director responsible for content</h2>
        <p className={P}>
          Marie Chauvois
        </p>

        <h2 className={H2}>Contact</h2>
        <p className={P}>
          Email: <a className={A} href="mailto:hello@lumacircle.co">hello@lumacircle.co</a>
        </p>

        <h2 className={H2}>Hosting Provider</h2>
        <p className={P}>
          Vercel Inc.<br />
          340 S Lemon Ave #4133<br />
          Walnut, CA 91789<br />
          United States<br />
          <a className={A} href="https://vercel.com" target="_blank" rel="noopener noreferrer">vercel.com</a>
        </p>

        <h2 className={H2}>Disclaimer</h2>
        <p className={P}>
          While we carefully check external links, we assume no liability for the content of third-party
          websites. The operators of linked sites are solely responsible for their content.
        </p>

        <h2 className={H2}>Copyright</h2>
        <p className={P}>
          All content on this website, including text, images, and graphics, is protected by copyright.
          Use, reproduction, or distribution requires prior written consent from LUMA CIRCLE LTD.
        </p>

        <h2 className={H2}>Privacy Policy</h2>
        <p className={P}>
          For details on how we process personal data, please see our{" "}
          <Link className={A} to="/privacy">Privacy Policy</Link>.
        </p>

      </main>

      <footer className="border-t border-border/50 py-6 text-center">
        <p className="text-sm text-muted-foreground">© 2026 Luma Circle. All rights reserved.</p>
      </footer>

    </div>
  );
}
