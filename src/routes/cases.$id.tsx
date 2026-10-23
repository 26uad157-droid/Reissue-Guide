import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell, StatusPill } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { decideAction, executeAction, getCase, getSmsInbox, payFee, sendOtp, verifyAction, verifyOtp } from "@/lib/reissue/reissue.functions";
import type { Payload } from "@/lib/reissue/agent";
import { DOC_TYPES, STATES } from "@/lib/reissue/portal";

const q = (id: string) => queryOptions({ queryKey: ["case", id], queryFn: () => getCase({ data: { id } }) });

export const Route = createFileRoute("/cases/$id")({
  head: () => ({
    meta: [
      { title: "Case result – Reissue Guide" },
      { name: "description", content: "Steps, request number and documents needed for this reissue case." },
      { property: "og:title", content: "Case result – Reissue Guide" },
      { property: "og:description", content: "Steps, request number and documents needed." },
    ],
  }),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(q(params.id)),
  component: CasePage,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border bg-card p-6">
      <h2 className="text-xl">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function CasePage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { data } = useSuspenseQuery(q(id));
  const c = data.case;
  const plan = c.plan;
  const action = data.actions[0];
  const proposed = (action?.proposed ?? {}) as Payload;
  const slots = (proposed.slotOptions as string[]) ?? [];
  const [slot, setSlot] = useState<string>(slots[0] ?? "");
  const [busy, setBusy] = useState(false);
  const [otp, setOtp] = useState("");
  const [card, setCard] = useState({ number: "", name: "", expiry: "", cvv: "" });
  const sms = useQuery({ queryKey: ["sms", id], queryFn: () => getSmsInbox({ data: { caseId: id } }) });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["case", id] }); qc.invalidateQueries({ queryKey: ["sms", id] }); };

  async function run(fn: () => Promise<unknown>, ok: string) {
    setBusy(true);
    try {
      await fn();
      toast.success(ok);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
      refresh();
    }
  }

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="font-mono text-sm text-muted-foreground">{c.case_code}</div>
          <h1 className="text-3xl">{plan?.title ?? DOC_TYPES.find((d) => d.id === c.doc_type)?.label}</h1>
          <p className="text-muted-foreground">
            {STATES.find((s) => s.id === c.state)?.label} · {plan?.authority ?? "Authority unknown"} · applicant {c.applicant_name}
          </p>
        </div>
        <StatusPill value={c.status} />
      </div>

      {plan && plan.unresolved.length > 0 && (
        <div className="mt-6 rounded-xl border border-warning bg-warning/20 p-5">
          <h3 className="font-semibold">Unresolved – needs your attention</h3>
          <ul className="mt-2 list-disc pl-5 text-sm">{plan.unresolved.map((u) => <li key={u}>{u}</li>)}</ul>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Section title="Steps">
          <ol className="space-y-2">
            {(plan?.steps ?? []).map((s, i) => (
              <li key={s} className="flex gap-3 text-sm"><span className="font-mono text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>{s}</li>
            ))}
          </ol>
          <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-muted-foreground">Official form</dt><dd className="font-mono">{plan?.formId ?? "—"}</dd></div>
            <div><dt className="text-muted-foreground">Official fee</dt><dd className="font-mono">{plan?.fee != null ? `₹${plan.fee}` : "—"}</dd></div>
          </dl>
        </Section>

        <Section title="Documents needed">
          <ul className="space-y-2 text-sm">
            {(plan?.documentsNeeded ?? []).map((d) => (
              <li key={d.id} className="flex items-center justify-between">
                <span>{d.label} {d.required ? "" : <span className="text-muted-foreground">(optional)</span>}</span>
                <StatusPill value={d.have ? "pass" : d.required ? "fail" : "pending"} />
              </li>
            ))}
          </ul>
        </Section>
      </div>

      <div className="mt-6">
        <Section title="Take action – human approval required">
          {!action && <p className="text-sm text-muted-foreground">No request was pre-filled because the plan is uncertain. Add the missing proofs and start a new case.</p>}
          {action && (
            <div className="space-y-4 text-sm">
              <div className="flex items-center gap-3"><span className="text-muted-foreground">Status</span><StatusPill value={action.status} /></div>
              <div><span className="text-muted-foreground">Destination: </span><span className="font-mono break-all">{action.destination}</span></div>
              <pre className="overflow-auto rounded-md bg-muted p-3 font-mono text-xs">{JSON.stringify(action.approved_payload ?? { ...proposed, slotOptions: undefined }, null, 2)}</pre>
              {action.status === "awaiting_approval" && (
                <>
                  <p>This will submit the request and pay <b>₹{String(proposed.fee)}</b>. Choose a slot:</p>
                  <div className="flex flex-wrap gap-2">
                    {slots.map((s) => (
                      <button key={s} onClick={() => setSlot(s)} className={`rounded-md border px-3 py-1.5 ${slot === s ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}>{s}</button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">Any OTP or CAPTCHA on the real portal must be completed by you manually.</p>
                  <div className="flex gap-2">
                    <Button disabled={busy || !slot} onClick={() => run(() => decideAction({ data: { actionId: action.id, approve: true, slot } }), "Approved")}>Approve fee & slot</Button>
                    <Button variant="outline" disabled={busy} onClick={() => run(() => decideAction({ data: { actionId: action.id, approve: false } }), "Rejected")}>Reject</Button>
                  </div>
                </>
              )}
              {action.status === "approved" && !action.otp_verified_at && (
                <div className="space-y-3 rounded-lg border border-warning bg-warning/10 p-4">
                  <p className="font-medium">Step needs you: confirm with the OTP sent to your phone</p>
                  <Button variant="secondary" disabled={busy} onClick={() => run(() => sendOtp({ data: { actionId: action.id } }), "OTP sent to your phone")}>{sms.data?.length ? "Resend OTP" : "Send OTP"}</Button>
                  <div className="flex max-w-xs gap-2">
                    <Input inputMode="numeric" maxLength={6} placeholder="6-digit OTP" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} />
                    <Button disabled={busy || otp.length !== 6} onClick={() => run(() => verifyOtp({ data: { actionId: action.id, code: otp } }), "OTP verified")}>Verify</Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Valid for 5 minutes, 3 tries. The agent never reads or enters this code for you.</p>
                </div>
              )}
              {action.status === "approved" && action.otp_verified_at && !action.paid_at && (
                <div className="max-w-md space-y-3 rounded-lg border p-4">
                  <p className="font-medium">Pay the approved fee — ₹{String(proposed.fee)} (demo gateway, no real money)</p>
                  <Input placeholder="Card number (try 4242 4242 4242 4242)" inputMode="numeric" value={card.number} onChange={(e) => setCard({ ...card, number: e.target.value })} />
                  <Input placeholder="Name on card" value={card.name} onChange={(e) => setCard({ ...card, name: e.target.value })} />
                  <div className="flex gap-2">
                    <Input placeholder="MM/YY" className="w-24" value={card.expiry} onChange={(e) => setCard({ ...card, expiry: e.target.value })} />
                    <Input placeholder="CVV" className="w-20" inputMode="numeric" maxLength={3} value={card.cvv} onChange={(e) => setCard({ ...card, cvv: e.target.value.replace(/\D/g, "") })} />
                  </div>
                  <Button disabled={busy} onClick={() => run(() => payFee({ data: { actionId: action.id, ...card } }), "Payment successful")}>Pay ₹{String(proposed.fee)}</Button>
                  <p className="text-xs text-muted-foreground">Demo only — no real charge. Card 4000 0000 0000 0002 simulates a decline.</p>
                </div>
              )}
              {action.paid_at && (
                <div className="rounded-lg border border-primary/40 bg-primary/5 p-3 text-sm">
                  Fee paid · {data.payments[0] ? <>₹{String(data.payments[0].amount)} via card •••• {data.payments[0].card_last4} · ref <span className="font-mono">{data.payments[0].transaction_ref}</span></> : "recorded"}
                </div>
              )}
              {action.status === "approved" && action.otp_verified_at && action.paid_at && (
                <Button disabled={busy} onClick={() => run(() => executeAction({ data: { actionId: action.id } }), "Submitted to portal")}>Submit request & book slot</Button>
              )}
              {(sms.data?.length ?? 0) > 0 && (
                <div className="max-w-sm rounded-2xl border-4 border-foreground/80 bg-background p-3">
                  <div className="text-xs text-muted-foreground">Your phone (demo) · Messages</div>
                  {sms.data!.map((m) => (
                    <div key={m.id} className="mt-2 rounded-lg bg-muted p-2 text-xs">{m.body}<div className="mt-1 text-[10px] text-muted-foreground">{new Date(m.sent_at).toLocaleTimeString()}</div></div>
                  ))}
                </div>
              )}
              {action.request_number && (
                <div className="rounded-lg border-2 border-primary p-4">
                  <div className="text-muted-foreground">Request number</div>
                  <div className="font-mono text-2xl">{action.request_number}</div>
                  <div className="mt-1">Slot: {action.slot}</div>
                  <Button className="mt-3" variant="secondary" disabled={busy} onClick={() => run(() => verifyAction({ data: { actionId: action.id } }), "Checked with portal")}>Check request number on portal</Button>
                </div>
              )}
            </div>
          )}
        </Section>
      </div>

      {data.verifications.length > 0 && (
        <div className="mt-6">
          <Section title="Verification (checked separately from the action)">
            <ul className="space-y-3 text-sm">
              {data.verifications.map((v) => (
                <li key={v.id} className="rounded-md border p-3">
                  <div className="flex items-center justify-between"><StatusPill value={v.result} /><span className="text-xs text-muted-foreground">{new Date(v.checked_at).toLocaleString()}</span></div>
                  <p className="mt-2">{v.note}</p>
                  <div className="mt-2 grid gap-2 md:grid-cols-2">
                    <pre className="overflow-auto rounded bg-muted p-2 text-xs">intended {JSON.stringify(v.intended, null, 1)}</pre>
                    <pre className="overflow-auto rounded bg-muted p-2 text-xs">observed {JSON.stringify(v.observed, null, 1)}</pre>
                  </div>
                </li>
              ))}
            </ul>
          </Section>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Section title="Decisions & reasons">
          <ul className="space-y-3 text-sm">
            {data.decisions.map((d) => (
              <li key={d.id}>
                <div className="flex items-center justify-between gap-2"><b>{d.rule}</b><StatusPill value={d.outcome} /></div>
                <p className="text-muted-foreground">{d.reason}</p>
                <code className="block truncate text-xs text-muted-foreground">{JSON.stringify(d.inputs)}</code>
              </li>
            ))}
          </ul>
        </Section>
        <Section title="Sources checked">
          <ul className="space-y-3 text-sm">
            {data.evidence.map((e) => (
              <li key={e.id}>
                <div className="flex items-center justify-between gap-2"><span className="font-medium">{e.title}</span><StatusPill value={e.used ? "pass" : e.is_official ? "pending" : "rejected"} /></div>
                <div className="break-all font-mono text-xs text-muted-foreground">{e.source_id} · {e.url}</div>
                <div className="text-xs">{e.reason} · retrieved {new Date(e.retrieved_at).toLocaleString()}</div>
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </AppShell>
  );
}
