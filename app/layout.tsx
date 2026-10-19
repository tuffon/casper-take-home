import type { Metadata } from "next";
import Link from "next/link";
import { TimezoneCookie } from "@/practice/timezone-cookie";
import "./globals.css";

export const metadata: Metadata = {
  // Pages set their own title, e.g. "Sign in" becomes "Sign in · Casper Take-Home".
  title: {
    default: "Casper Take-Home",
    template: "%s · Casper Take-Home",
  },
  description: "Engineering take-home project.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-parchment font-sans text-ink">
        <TimezoneCookie />
        {/* A translucent bar that blurs the page scrolling underneath it. */}
        <header className="sticky top-0 z-10 border-b border-black/8 bg-white/80 backdrop-blur-xl">
          <div className="mx-auto flex h-13 max-w-5xl items-center px-6">
            <Link href="/" className="text-[17px] font-semibold">
              Casper Take-Home
            </Link>
          </div>
        </header>

        <main className="flex flex-1 flex-col items-center px-6 py-20">
          {children}
        </main>
      </body>
    </html>
  );
}
