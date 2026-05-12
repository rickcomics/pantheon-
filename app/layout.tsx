// app/layout.tsx
import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "Pantheon — A gallery of digital companions",
  description: "Minimalist temple of digital personalities.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="pantheon-body">
        <div className="pantheon-shell">
          <header className="pantheon-header">
            <div className="pantheon-logo">Pantheon</div>
          </header>
          <main className="pantheon-main">{children}</main>
        </div>
      </body>
    </html>
  );
}
