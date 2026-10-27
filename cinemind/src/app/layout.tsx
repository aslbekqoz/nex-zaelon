import type { Metadata, Viewport } from "next";
import { Header } from "@/components/Header";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "CineMind AI — kino olami", template: "%s · CineMind AI" },
  description: "Filmlarni qidiring, janrlar bo'yicha saralang, treylerlarni ko'ring va shaxsiy ro'yxatingizni tuzing.",
};

export const viewport: Viewport = { themeColor: "#0b0c10" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz">
      <body>
        <Header />
        <main>{children}</main>
        <footer className="footer">
          <div className="container footer-inner">
            <span>© {new Date().getFullYear()} CineMind AI</span>
            <span>Film ma&apos;lumotlari: mahalliy katalog va TMDB</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
