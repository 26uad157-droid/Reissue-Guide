import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { AppShell, StatusPill } from "@/components/AppShell";
import { listPortalRequests } from "@/lib/reissue/reissue.functions";
import { SERVICES, STATES, officialFee } from "@/lib/reissue/portal";

const q = queryOptions({ queryKey: ["portal"], queryFn: () => listPortalRequests() });

export const Route = createFileRoute("/portal")({
  head: () => ({
    meta: [
      { title: "Mock government portal – Reissue Guide" },
      { name: "description", content: "The mock government portal: reissue services, fees and received requests." },
      { property: "og:title", content: "Mock government portal" },
      { property: "og:description", content: "Reissue services, fees and received requests." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(q),
  component: Portal,
});

function Portal() {
  const { data } = useSuspenseQuery(q);
  return (
    <AppShell>
      <h1 className="text-3xl">Mock government portal</h1>
      <p className="text-muted-foreground">Official domain: services.&lt;state&gt;.gov.mock — the demo target.</p>
      <div className="mt-6 overflow-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left"><tr><th className="p-3">Service</th><th className="p-3">Form</th><th className="p-3">Authority</th>{STATES.map((s) => <th key={s.id} className="p-3">{s.id} fee</th>)}</tr></thead>
          <tbody>
            {SERVICES.map((s) => (
              <tr key={s.serviceId} className="border-t"><td className="p-3">{s.title}</td><td className="p-3 font-mono">{s.formId}</td><td className="p-3">{s.authority}</td>{STATES.map((st) => <td key={st.id} className="p-3 font-mono">₹{officialFee(s, st.id)}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
      <h2 className="mt-10 text-2xl">Requests received</h2>
      <div className="mt-4 overflow-hidden rounded-xl border bg-card">
        {data.length === 0 && <p className="p-6 text-muted-foreground">None yet.</p>}
        {data.map((r) => (
          <div key={r.request_number} className="flex flex-wrap items-center justify-between gap-2 border-b px-5 py-3 last:border-0 text-sm">
            <span className="font-mono">{r.request_number}</span><span>{r.service_id}</span><span>{r.slot}</span><span className="font-mono">₹{r.fee_paid}</span><StatusPill value={r.status} />
          </div>
        ))}
      </div>
    </AppShell>
  );
}
