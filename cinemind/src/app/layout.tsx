import type { Metadata, Viewport } from "next";
import { Header } from "@/components/Header";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "CineMind AI — the world of cinema", template: "%s · CineMind AI" },
  description: "Search movies, filter by genre, watch trailers and build your personal watchlist.",
};

export const viewport: Viewport = { themeColor: "#0b0c10" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Header />
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
