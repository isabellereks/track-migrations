import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About · Track Migrations",
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-8 py-24">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-ink transition-colors mb-16"
        >
          ← Back
        </Link>

        <div className="text-[13px] font-medium text-muted tracking-tight mb-3">
          About
        </div>
        <h1 className="text-4xl md:text-5xl font-semibold text-ink tracking-tight leading-[1.05] mb-10">
          What this is
        </h1>

        <div className="text-base text-ink/80 leading-relaxed space-y-5">
          <p>
            I built{" "}
            <a
              href="/"
              className="text-ink underline underline-offset-2 hover:text-muted transition-colors"
            >
              Track Migrations
            </a>{" "}
            because the numbers in the immigration debate rarely come with
            context. A headline says &ldquo;2.4 million encounters&rdquo;
            and most people have no frame of reference for what that means,
            where those people came from, or what happened to them after
            they arrived.
          </p>
          <p>
            This site tries to make the data tangible. Each dot on the map
            represents roughly 300 people. The editorial sections below the
            map reframe the numbers around real contributions: taxes paid,
            industries sustained, GDP growth. The goal is to show both the
            scale and the humanity behind immigration data without taking
            a political position.
          </p>
          <p>
            The data comes from US government sources: CBP for border
            encounters, Census ACS for settlement patterns, USCIS for
            legal admissions, and several research institutions for
            economic impact. Full sourcing is on the{" "}
            <Link
              href="/methodology"
              className="text-ink underline underline-offset-2 hover:text-muted transition-colors"
            >
              methodology
            </Link>{" "}
            page.
          </p>
          <p>
            Track Migrations is a sister project to{" "}
            <a
              href="https://trackpolicy.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-ink underline underline-offset-2 hover:text-muted transition-colors"
            >
              Track Policy
            </a>
            , which maps AI and data center legislation. Both projects
            share the same premise: make public data accessible enough
            that people can form their own opinions with real information
            in front of them.
          </p>

          <div className="pt-5 mt-5 border-t border-black/[.06]">
            <p className="text-muted">
              This is still early. If you spot an error or think something
              is missing, please{" "}
              <Link
                href="/contact"
                className="text-ink underline underline-offset-2 hover:text-muted transition-colors"
              >
                reach out
              </Link>
              .
            </p>
          </div>
        </div>

        <div className="mt-16 pt-10 border-t border-black/[.06]">
          <div className="text-[13px] font-medium text-muted tracking-tight mb-4">
            Credits
          </div>
          <ul className="text-sm text-ink/80 leading-relaxed space-y-2">
            <li>
              Icons by{" "}
              <a
                href="https://remixicon.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-ink underline underline-offset-2 hover:text-muted transition-colors"
              >
                Remix Icon
              </a>
            </li>
            <li>
              Globe by{" "}
              <a
                href="https://cobe.vercel.app"
                target="_blank"
                rel="noopener noreferrer"
                className="text-ink underline underline-offset-2 hover:text-muted transition-colors"
              >
                COBE
              </a>
            </li>
            <li>
              Built by{" "}
              <a
                href="https://isabellereks.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-ink underline underline-offset-2 hover:text-muted transition-colors"
              >
                Isabelle Reksopuro
              </a>
            </li>
            <li className="pt-2 text-muted">
              Full data sources are listed on the{" "}
              <Link
                href="/methodology"
                className="text-ink underline underline-offset-2 hover:text-muted transition-colors"
              >
                methodology
              </Link>{" "}
              page.
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}
