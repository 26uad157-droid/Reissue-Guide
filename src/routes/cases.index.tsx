import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { AppShell, StatusPill } from "@/components/AppShell";
import { listCases } from "@/lib/reissue/reissue.functions";
import { DOC_TYPES, STATES } from "@/lib/reissue/portal";

const q = queryOptions({ queryKey: ["cases"], queryFn: () => listCases() });

export const Route = createFileRoute("/cases/")({
  head: () => ({
    meta: [
      { title: "Cases – Reissue Guide" },
      { name: "description", content: "All reissue cases with their current status." },
      { property: "og:title", content: "Cases – Reissue Guide" },
      { property: "og:description", content: "All reissue cases with their current status." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(q),
  component: Cases,
});

function Cases() {
  const { data } = useSuspenseQuery(q);
  return (
    <AppShell>
      <h1 className="text-3xl">Cases</h1>
      <div className="mt-6 overflow-hidden rounded-xl border bg-card">
        {data.length === 0 && <p className="p-6 text-muted-foreground">No cases yet.</p>}
        {data.map((c) => (
          <Link key={c.id} to="/cases/$id" params={{ id: c.id }} className="flex items-center justify-between border-b px-5 py-3 last:border-0 hover:bg-muted">
            <div>
              <div className="font-mono text-sm">{c.case_code}</div>
              <div className="text-sm text-muted-foreground">
                {DOC_TYPES.find((d) => d.id === c.doc_type)?.label} · {STATES.find((s) => s.id === c.state)?.label}
              </div>
            </div>
            <StatusPill value={c.status} />
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
