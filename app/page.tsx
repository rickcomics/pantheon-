// app/page.tsx
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="landing-root">
      <div className="landing-block">
        <h1 className="landing-title">Your mind deserves company.</h1>
        <p className="landing-subtitle">
          A gallery of digital companions. Minimalism, archetypes, inner worlds.
        </p>
        <Link href="/pantheon" className="landing-button">
          Enter the Pantheon
        </Link>
      </div>
    </div>
  );
}
