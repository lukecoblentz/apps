import type { Metadata } from "next";
import Link from "next/link";
import { Plus_Jakarta_Sans } from "next/font/google";
import Script from "next/script";
import { getServerSession } from "next-auth";
import AuthProvider from "@/components/AuthProvider";
import AuthStatus from "@/components/AuthStatus";
import AppNav from "@/components/AppNav";
import SignOutButton from "@/components/SignOutButton";
import StudyTrackerLogo from "@/components/StudyTrackerLogo";
import ThemeToggle from "@/components/ThemeToggle";
import { authOptions } from "@/lib/auth";
import "./globals.css";

const themeInitScript = `(function(){try{var k='study-tracker-theme';var t=localStorage.getItem(k);var r=document.documentElement;if(t==='light'||t==='dark')r.setAttribute('data-theme',t);else r.removeAttribute('data-theme');}catch(e){}})();`;

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap"
});

export const metadata: Metadata = {
  title: "Study Tracker",
  description:
    "Habit-building study timer, streaks, analytics, and assignment tracking for students.",
  applicationName: "Study Tracker",
  appleWebApp: {
    capable: true,
    title: "Study Tracker",
    statusBarStyle: "default"
  },
  formatDetection: {
    telephone: false
  }
};

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#4338ca" },
    { media: "(prefers-color-scheme: dark)", color: "#141922" }
  ],
  width: "device-width",
  initialScale: 1
};

export default async function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en" className={plusJakarta.variable} suppressHydrationWarning>
      <body>
        <Script id="study-tracker-theme-init" strategy="beforeInteractive">
          {themeInitScript}
        </Script>
        <AuthProvider>
          <div className="shell">
            <header className="nav">
              <div className="nav-inner">
                <Link href="/" className="nav-brand">
                  <span className="nav-logo-wrap" aria-hidden>
                    <StudyTrackerLogo />
                  </span>
                  <span className="nav-title">Study Tracker</span>
                </Link>
                {session?.user ? <AppNav /> : null}
                <div className="nav-aside">
                  <ThemeToggle />
                  <AuthStatus />
                  {!session?.user ? (
                    <>
                      <Link href="/login" className="btn btn-ghost btn-sm">
                        Log in
                      </Link>
                      <Link href="/register" className="btn btn-primary btn-sm">
                        Sign up
                      </Link>
                    </>
                  ) : (
                    <SignOutButton />
                  )}
                </div>
              </div>
            </header>
            <main className="main">{children}</main>
            {session?.user ? (
              <footer className="app-footer">
                <div className="app-footer-inner">
                  <p className="app-footer-support">
                    Enjoying Study Tracker?{" "}
                    <a
                      href="https://cash.app/$WatchCat7589"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Buy Me a Coffee: $WatchCat7589
                    </a>
                  </p>
                </div>
              </footer>
            ) : null}
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
