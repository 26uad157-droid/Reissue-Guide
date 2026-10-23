import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

const nav = [
  { to: "/", label: "New case" },
  { to: "/cases", label: "Cases" },
  { to: "/tests", label: "Test runs" },
  { to: "/portal", label: "Mock portal" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="bg-seal text-primary-foreground">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <Link to="/" className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-full border-2 border-accent font-display text-lg text-accent">R</span>
            <span className="font-display text-xl">Reissue Guide</span>
          </Link>
          <nav className="flex gap-1 text-sm">
            {nav.map((n) => (
              <Link key={n.to} to={n.to} className="rounded-md px-3 py-1.5 opacity-80 hover:opacity-100" activeProps={{ className: "bg-primary-foreground/15 opacity-100" }} activeOptions={{ exact: true }}>
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="h-1 bg-accent" />
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
      <footer className="mx-auto max-w-6xl px-6 pb-10 text-xs text-muted-foreground">
        Demo against a mock government portal. Synthetic data only. No OTP or CAPTCHA is bypassed — such steps are shown as manual.
      </footer>
    </div>
  );
}

const tone: Record<string, string> = {
  pass: "bg-success text-success-foreground",
  confirmed: "bg-success text-success-foreground",
  executed: "bg-success text-success-foreground",
  request_received: "bg-success text-success-foreground",
  fail: "bg-destructive text-destructive-foreground",
  failed: "bg-destructive text-destructive-foreground",
  rejected: "bg-destructive text-destructive-foreground",
  mismatch: "bg-destructive text-destructive-foreground",
  uncertain: "bg-warning text-warning-foreground",
  awaiting_approval: "bg-warning text-warning-foreground",
  pending: "bg-warning text-warning-foreground",
};

export function StatusPill({ value }: { value: string }) {
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${tone[value] ?? "bg-secondary text-secondary-foreground"}`}>{value.replace(/_/g, " ")}</span>;
}
