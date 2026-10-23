import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell, StatusPill } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { listTestRuns, runScenarios } from "@/lib/reissue/reissue.functions";

const q = queryOptions({ queryKey: ["tests"], queryFn: () => listTestRuns() });

export const Route = createFileRoute("/tests")({
  head: () => ({
    meta: [
      { title: "Official test runs – Reissue Guide" },
      { name: "description", content: "TC1–TC4 scenario runs with input, expected and actual results and evidence." },
      { property: "og:title", content: "Official test runs – Reissue Guide" },
      { property: "og:description", content: "TC1–TC4 scenario runs with evidence." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(q),
  component: Tests,
});

function Tests() {
  const { data } = useSuspenseQuery(q);
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  return (
    <AppShell>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl">Official test runs</h1>
          <p className="text-muted-foreground">Each run keeps its input, expected result, actual result and evidence. Failures are shown as failures.</p>
        </div>
        <Button disabled={busy} onClick={async () => {
          setBusy(true);
          try { await runScenarios(); toast.success("All 4 scenarios ran"); } catch (e) { toast.error((e as Error).message); }
          finally { setBusy(false); qc.invalidateQueries({ queryKey: ["tests"] }); }
        }}>{busy ? "Running…" : "Run TC1–TC4"}</Button>
      </div>
      <div className="mt-6 space-y-4">
        {data.length === 0 && <p className="text-muted-foreground">No runs yet.</p>}
        {data.map((r) => (
          <details key={r.id} className="rounded-xl border bg-card p-5">
            <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3">
              <span><b className="font-mono">{r.tc}</b> · {r.scenario}</span>
              <span className="flex items-center gap-3 text-xs text-muted-foreground">{new Date(r.ran_at).toLocaleString()}<StatusPill value={r.passed ? "pass" : "fail"} /></span>
            </summary>
            <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
              <div><dt className="text-muted-foreground">Expected</dt><dd>{r.expected}</dd></div>
              <div><dt className="text-muted-foreground">Actual</dt><dd>{r.actual}</dd></div>
              <div className="md:col-span-2"><dt className="text-muted-foreground">Explanation</dt><dd>{r.explanation}</dd></div>
            </dl>
            <pre className="mt-3 max-h-64 overflow-auto rounded bg-muted p-3 text-xs">{JSON.stringify({ input: r.input, evidence: r.evidence }, null, 2)}</pre>
          </details>
        ))}
      </div>
    </AppShell>
  );
}
