import type { Metadata, Viewport } from "next";
import { Header } from "@/components/Header";
import { VerifyBanner } from "@/components/VerifyBanner";
import { OG_SITE } from "@/lib/seo";
import { appUrl } from "@/lib/site";
import "./globals.css";

const DESCRIPTION = "Search movies, filter by genre, watch trailers and build your personal watchlist.";

export async function generateMetadata(): Promise<Metadata> {
  const base = appUrl();
  return {
    // Absolute URLs in link previews and canonical links come from APP_URL
    ...(base ? { metadataBase: new URL(base) } : {}),
    title: { default: "CineMind AI — the world of cinema", template: "%s · CineMind AI" },
    description: DESCRIPTION,
    applicationName: "CineMind AI",
    openGraph: { ...OG_SITE, type: "website", title: "CineMind AI — the world of cinema", description: DESCRIPTION },
    twitter: { card: "summary" },
  };
}

export const viewport: Viewport = { themeColor: "#0b0c10" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Header />
        <VerifyBanner />
        <main>{children}</main>
        <footer className="footer">
          <div className="container footer-inner">
            <span>© {new Date().getFullYear()} CineMind AI</span>
            <span>Movie data: local catalogue and TMDB</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
